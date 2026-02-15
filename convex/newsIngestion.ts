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
  wiki_ko_featured: 8,
};

const BODY_NOISE_TOKENS = [
  'addeventlistener(',
  'tlistener(',
  'oncontentready',
  'contentaudio.load',
  "soundobj.attr('data-on'",
  'audioplayer.pause',
  'location.href',
  'membership/login',
  'onclick=',
  'function(',
  'var ',
  'const ',
  '=>',
];

const BODY_TRAILING_MARKERS = [
  '트렌드뉴스 많이 본 댓글 순',
  '많이 본 뉴스',
  '많이 본 기사',
  '무단 전재',
  '재배포 금지',
];

const BLOCKED_TOPIC_PATTERNS = [
  /정치|국회|대통령|청와대|정당|총선|대선|지방선거|여야|국정감사|탄핵|청문회/i,
  /사설|오피니언|칼럼|기고|논평|시론|editorial|opinion|column/i,
];

const BLOCKED_URL_PATTERNS = [
  /\/politics?\//i,
  /\/opinion\//i,
  /\/editorial\//i,
  /\/column\//i,
  /\/정치\//i,
  /\/사설\//i,
  /\/오피니언\//i,
];

const MIN_ARTICLE_BODY_LENGTH = 220;
const MIN_ARTICLE_HANGUL_COUNT = 100;
const MIN_ARTICLE_SENTENCE_COUNT = 3;

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

        const rawBody = raw.bodyText || raw.summary || title;
        const bodyText = cleanArticleBodyText(rawBody);
        const summary = raw.summary ? normalizeWhitespace(raw.summary) : undefined;
        const section = raw.section ? normalizeWhitespace(raw.section) : undefined;
        const publishedAt = raw.publishedAt || now;
        const normalizedTitle = normalizeTitle(title);
        const simhash = computeSimhash(bodyText);
        const difficulty = scoreDifficulty(section, bodyText, args.sourceKey);
        const urlHash = hash32(canonicalUrl);
        const contentPolicy = evaluateContentPolicy({
          title,
          section,
          tags: raw.tags,
          sourceUrl: raw.sourceUrl,
          canonicalUrl,
          bodyText,
        });

        const existingByUrl = await ctx.db
          .query('news_articles')
          .withIndex('by_url_hash', q => q.eq('urlHash', urlHash))
          .first();

        if (!contentPolicy.allowed) {
          if (existingByUrl && existingByUrl.status !== 'filtered') {
            const policyReason = `content_policy:${contentPolicy.reason}`;
            const mergedReasons = [...(existingByUrl.difficultyReason || []), policyReason];
            await ctx.db.patch(existingByUrl._id, {
              status: 'filtered',
              fetchedAt: now,
              difficultyReason: [...new Set(mergedReasons)],
            });
            updated += 1;
          }
          continue;
        }

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
    sourceKey: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 100);
    const effectiveDifficulty = args.difficultyLevel || undefined;
    const effectiveSource = args.sourceKey || undefined;

    if (effectiveSource) {
      const rows = await ctx.db
        .query('news_articles')
        .withIndex('by_source_published', q => q.eq('sourceKey', effectiveSource))
        .order('desc')
        .take(Math.min(limit * 4, 320));

      return rows
        .filter(
          row =>
            row.status === 'active' &&
            (!effectiveDifficulty || row.difficultyLevel === effectiveDifficulty)
        )
        .slice(0, limit);
    }

    const rows = effectiveDifficulty
      ? await ctx.db
          .query('news_articles')
          .withIndex('by_difficulty_published', q => q.eq('difficultyLevel', effectiveDifficulty))
          .order('desc')
          .take(limit)
      : await ctx.db.query('news_articles').withIndex('by_published').order('desc').take(limit);

    return rows.filter(row => row.status === 'active');
  },
});

export const getById = query({
  args: {
    articleId: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedId = ctx.db.normalizeId('news_articles', args.articleId);
    if (!normalizedId) return null;
    const row = await ctx.db.get(normalizedId);
    if (!row) return null;
    if (row.status !== 'active') return null;
    return row;
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

function isNoiseChunk(chunk: string): boolean {
  const lower = chunk.toLowerCase();
  if (BODY_NOISE_TOKENS.some(token => lower.includes(token))) return true;

  const hangulCount = (chunk.match(/[가-힣]/g) || []).length;
  const latinCount = (chunk.match(/[A-Za-z]/g) || []).length;
  const symbolCount = (chunk.match(/[{};=_<>]/g) || []).length;

  if (/https?:\/\/\S+/i.test(chunk) && hangulCount < 12) return true;
  if (symbolCount >= 4 && hangulCount < 20) return true;
  if (latinCount > hangulCount * 2 && hangulCount < 10) return true;

  return false;
}

function cleanArticleBodyText(rawText: string): string {
  const plain = rawText
    .replace(/\r\n/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return normalizeWhitespace(rawText);

  const chunks = plain
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(chunk => chunk.trim())
    .filter(Boolean);
  const filteredChunks = chunks.filter(chunk => !isNoiseChunk(chunk));

  let cleaned = normalizeWhitespace(filteredChunks.join(' '));
  if (!cleaned) cleaned = normalizeWhitespace(plain);

  for (const marker of BODY_TRAILING_MARKERS) {
    const markerIndex = cleaned.indexOf(marker);
    if (markerIndex > 0) {
      cleaned = cleaned.slice(0, markerIndex).trim();
      break;
    }
  }

  const firstHangulIndex = cleaned.search(/[가-힣]/);
  if (firstHangulIndex > 40) {
    cleaned = cleaned.slice(firstHangulIndex).trim();
  }

  return cleaned || normalizeWhitespace(rawText);
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

function evaluateContentPolicy(input: {
  title: string;
  section?: string;
  tags?: string[];
  sourceUrl: string;
  canonicalUrl: string;
  bodyText: string;
}): { allowed: boolean; reason?: string } {
  const sectionText = (input.section || '').toLowerCase();
  const titleText = input.title.toLowerCase();
  const tagsText = (input.tags || []).join(' ').toLowerCase();
  const metadataText = `${sectionText} ${tagsText}`.trim();
  const urlText = `${input.sourceUrl} ${input.canonicalUrl}`.toLowerCase();

  if (matchesAnyPattern(metadataText, BLOCKED_TOPIC_PATTERNS)) {
    return { allowed: false, reason: 'blocked_topic_section_or_tags' };
  }
  if (matchesAnyPattern(titleText, BLOCKED_TOPIC_PATTERNS)) {
    return { allowed: false, reason: 'blocked_topic_title' };
  }
  if (matchesAnyPattern(urlText, BLOCKED_URL_PATTERNS)) {
    return { allowed: false, reason: 'blocked_topic_url' };
  }

  if (isArticleTooShort(input.bodyText)) {
    return { allowed: false, reason: 'body_too_short' };
  }

  return { allowed: true };
}

function matchesAnyPattern(value: string, patterns: RegExp[]): boolean {
  if (!value) return false;
  return patterns.some(pattern => pattern.test(value));
}

function isArticleTooShort(bodyText: string): boolean {
  const normalized = normalizeWhitespace(bodyText);
  if (!normalized) return true;

  const sentenceCount = normalized.split(/[.!?。！？\n]+/).filter(Boolean).length;
  const hangulCount = (normalized.match(/[가-힣]/g) || []).length;
  const textLength = normalized.length;

  if (textLength < MIN_ARTICLE_BODY_LENGTH) {
    return true;
  }

  if (hangulCount < MIN_ARTICLE_HANGUL_COUNT && sentenceCount < MIN_ARTICLE_SENTENCE_COUNT) {
    return true;
  }

  if (sentenceCount <= 1 && textLength < 320) {
    return true;
  }

  return false;
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
