import { internalMutation, query } from './_generated/server';
import { v } from 'convex/values';
import { toErrorMessage } from './errors';

const normalizedArticleValidator = v.object({
  sourceGuid: v.optional(v.string()),
  sourceUrl: v.string(),
  canonicalUrl: v.optional(v.string()),
  title: v.string(),
  summary: v.optional(v.string()),
  bodyText: v.optional(v.string()),
  bodyHtml: v.optional(v.string()),
  section: v.optional(v.string()),
  tags: v.optional(v.array(v.string())),
  author: v.optional(v.string()),
  publishedAt: v.optional(v.number()),
});

type DifficultyLevel = 'L1' | 'L2' | 'L3';

type DifficultyResult = {
  level: DifficultyLevel;
  score: number;
  reasons: string[];
};

const DEDUPE_WINDOW_MS = 48 * 60 * 60 * 1000;
const SOURCE_PRIORITY: Record<string, number> = {
  khan: 1,
  donga: 2,
  hankyung: 3,
  mk: 4,
  itdonga: 5,
  voa_ko: 6,
  naver_news_search: 7,
};

export const ingestBatch = internalMutation({
  args: {
    sourceKey: v.string(),
    sourceType: v.string(),
    articles: v.array(normalizedArticleValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let fetched = args.articles.length;
    let inserted = 0;
    let updated = 0;
    let deduped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const raw of args.articles) {
      try {
        const title = normalizeWhitespace(raw.title);
        if (!title) {
          failed += 1;
          continue;
        }

        const canonicalUrl = normalizeUrl(raw.canonicalUrl || raw.sourceUrl);
        if (!canonicalUrl) {
          failed += 1;
          continue;
        }

        const bodyText = normalizeWhitespace(raw.bodyText || raw.summary || title);
        const summary = raw.summary ? normalizeWhitespace(raw.summary) : undefined;
        const section = raw.section ? normalizeWhitespace(raw.section) : undefined;
        const publishedAt = raw.publishedAt || now;
        const normalizedTitle = normalizeTitle(title);
        const simhash = computeSimhash(bodyText);
        const difficulty = scoreDifficulty(section, bodyText, args.sourceKey);
        const urlHash = hash32(canonicalUrl);

        const existingByUrl = await ctx.db
          .query('news_articles')
          .withIndex('by_url_hash', q => q.eq('urlHash', urlHash))
          .first();

        if (existingByUrl) {
          await ctx.db.patch(existingByUrl._id, {
            title,
            summary,
            bodyText,
            bodyHtml: raw.bodyHtml,
            section,
            tags: raw.tags,
            author: raw.author,
            publishedAt,
            fetchedAt: now,
            difficultyLevel: difficulty.level,
            difficultyScore: difficulty.score,
            difficultyReason: difficulty.reasons,
            normalizedTitle,
            simhash,
          });
          updated += 1;
          continue;
        }

        const potentials = await ctx.db
          .query('news_articles')
          .withIndex('by_published', q =>
            q
              .gte('publishedAt', publishedAt - DEDUPE_WINDOW_MS)
              .lte('publishedAt', publishedAt + DEDUPE_WINDOW_MS)
          )
          .collect();

        let duplicate: (typeof potentials)[number] | null = null;
        for (const candidate of potentials) {
          if (candidate.normalizedTitle && candidate.normalizedTitle === normalizedTitle) {
            duplicate = pickCanonical(duplicate, candidate);
            continue;
          }
          if (candidate.simhash && hammingDistance(candidate.simhash, simhash) <= 3) {
            duplicate = pickCanonical(duplicate, candidate);
          }
        }

        const dedupeClusterId = duplicate?.dedupeClusterId || urlHash;
        const status = duplicate ? 'filtered' : 'active';

        await ctx.db.insert('news_articles', {
          sourceKey: args.sourceKey,
          sourceType: args.sourceType,
          sourceGuid: raw.sourceGuid,
          sourceUrl: raw.sourceUrl,
          canonicalUrl,
          urlHash,
          title,
          summary,
          bodyText,
          bodyHtml: raw.bodyHtml,
          language: 'ko',
          section,
          tags: raw.tags,
          author: raw.author,
          publishedAt,
          fetchedAt: now,
          difficultyLevel: difficulty.level,
          difficultyScore: difficulty.score,
          difficultyReason: difficulty.reasons,
          dedupeClusterId,
          normalizedTitle,
          simhash,
          status,
          licenseTier: 'unknown',
        });

        if (duplicate) {
          deduped += 1;
        } else {
          inserted += 1;
        }
      } catch (error: unknown) {
        failed += 1;
        if (errors.length < 5) {
          errors.push(toErrorMessage(error));
        }
      }
    }

    return {
      fetched,
      inserted,
      updated,
      deduped,
      failed,
      errors,
    };
  },
});

export const logFetchRun = internalMutation({
  args: {
    sourceKey: v.string(),
    runAt: v.number(),
    durationMs: v.number(),
    fetched: v.number(),
    inserted: v.number(),
    updated: v.number(),
    deduped: v.number(),
    failed: v.number(),
    status: v.string(),
    errorSample: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('news_fetch_logs', args);
  },
});

export const listRecent = query({
  args: {
    difficultyLevel: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
    const rows = args.difficultyLevel
      ? await ctx.db
          .query('news_articles')
          .withIndex('by_difficulty_published', q =>
            q.eq('difficultyLevel', args.difficultyLevel as string)
          )
          .order('desc')
          .take(limit)
      : await ctx.db.query('news_articles').withIndex('by_published').order('desc').take(limit);

    return rows.filter(row => row.status === 'active');
  },
});

function pickCanonical<T extends { sourceKey: string }>(a: T | null, b: T): T {
  if (!a) return b;
  const aPriority = SOURCE_PRIORITY[a.sourceKey] ?? Number.MAX_SAFE_INTEGER;
  const bPriority = SOURCE_PRIORITY[b.sourceKey] ?? Number.MAX_SAFE_INTEGER;
  return bPriority < aPriority ? b : a;
}

function normalizeUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    const blockedParams = new Set(['fbclid', 'gclid']);
    const keys = [...url.searchParams.keys()];
    for (const key of keys) {
      if (key.startsWith('utm_') || blockedParams.has(key)) {
        url.searchParams.delete(key);
      }
    }
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function normalizeTitle(title: string): string {
  return normalizeWhitespace(title)
    .replace(/\[[^\]]+\]/g, '')
    .replace(/\([^)]+\)$/g, '')
    .toLowerCase();
}

function scoreDifficulty(
  section: string | undefined,
  bodyText: string,
  sourceKey: string
): DifficultyResult {
  let score = 0;
  const reasons: string[] = [];

  const sectionNorm = (section || '').toLowerCase();
  if (/생활|문화|연예|스포츠/.test(sectionNorm) || sourceKey === 'voa_ko') {
    score += 15;
    reasons.push('section_l1_hint');
  }
  if (/사회|국제|it/.test(sectionNorm)) {
    score += 45;
    reasons.push('section_l2_hint');
  }
  if (/정치|경제|사설|오피니언/.test(sectionNorm)) {
    score += 75;
    reasons.push('section_l3_hint');
  }

  const sentences = bodyText.split(/[.!?。！？\n]+/).filter(Boolean);
  const avgSentenceLength =
    sentences.length > 0
      ? Math.round(sentences.reduce((acc, s) => acc + s.length, 0) / sentences.length)
      : 0;
  if (avgSentenceLength >= 70) {
    score += 25;
    reasons.push('long_sentences');
  } else if (avgSentenceLength >= 45) {
    score += 15;
    reasons.push('medium_sentences');
  } else {
    score += 5;
    reasons.push('short_sentences');
  }

  const connectiveMatches = bodyText.match(/그러나|또한|반면에|따라서|즉|다만|게다가/g);
  const connectiveDensity = (connectiveMatches?.length ?? 0) / Math.max(bodyText.length / 200, 1);
  if (connectiveDensity >= 2) {
    score += 20;
    reasons.push('high_connective_density');
  } else if (connectiveDensity >= 1) {
    score += 10;
    reasons.push('medium_connective_density');
  }

  const numberDensity = (bodyText.match(/[0-9]/g)?.length ?? 0) / Math.max(bodyText.length, 1);
  if (numberDensity > 0.05) {
    score += 10;
    reasons.push('number_dense');
  }

  score = Math.max(0, Math.min(100, score));
  const level = score <= 33 ? 'L1' : score <= 66 ? 'L2' : 'L3';
  return { level, score, reasons };
}

function hash32(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function computeSimhash(text: string): string {
  const tokens = normalizeWhitespace(text)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(t => t.length >= 2)
    .slice(0, 512);
  if (tokens.length === 0) return '0'.repeat(16);

  const bits = new Array<number>(64).fill(0);
  for (const token of tokens) {
    const tokenHash = hash64(token);
    for (let i = 0; i < 64; i += 1) {
      const bit = (tokenHash >> BigInt(i)) & 1n;
      bits[i] += bit === 1n ? 1 : -1;
    }
  }

  let result = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (bits[i] > 0) {
      result |= 1n << BigInt(i);
    }
  }

  return result.toString(16).padStart(16, '0');
}

function hash64(value: string): bigint {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= BigInt(value.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash;
}

function hammingDistance(aHex: string, bHex: string): number {
  const a = BigInt(`0x${aHex}`);
  const b = BigInt(`0x${bHex}`);
  let x = a ^ b;
  let count = 0;
  while (x !== 0n) {
    x &= x - 1n;
    count += 1;
  }
  return count;
}
