import {
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from './_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from './_generated/dataModel';
import { toErrorMessage } from './errors';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

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
const MAX_ARTICLE_BODY_LENGTH = 500;
const MIN_ARTICLE_HANGUL_COUNT = 100;
const MIN_ARTICLE_SENTENCE_COUNT = 3;
const USER_FEED_NEWS_LIMIT = 24;
const USER_FEED_ARTICLE_LIMIT = 12;
const USER_FEED_MAX_NEWS_SCAN = 320;
const USER_FEED_MAX_ARTICLE_SCAN = 120;
const USER_FEED_AUTO_REFRESH_MS = 24 * 60 * 60 * 1000;
const USER_FEED_MANUAL_LIMIT = 3;
const USER_FEED_MANUAL_WINDOW_MS = 24 * 60 * 60 * 1000;
const WIKI_SOURCE_KEY = 'wiki_ko_featured';

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

const userFeedArgsValidator = {
  newsLimit: v.optional(v.number()),
  articleLimit: v.optional(v.number()),
};

type FeedLimits = {
  newsLimit: number;
  articleLimit: number;
};

type ManualWindowState = {
  count: number;
  windowStart: number;
};

type ReadCtx = QueryCtx | MutationCtx;

type UserFeedState = Doc<'reading_user_feeds'>;
type NewsArticleDoc = Doc<'news_articles'>;

export const ensureUserFeed = mutation({
  args: userFeedArgsValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limits = resolveUserFeedLimits(args);
    const now = Date.now();

    const existing = await getUserFeedState(ctx, userId);
    if (existing) {
      const manual = resolveManualWindow(existing, now);
      return {
        created: false,
        hasReadSinceRefresh: existing.hasReadSinceRefresh,
        manualRefreshRemaining: Math.max(0, USER_FEED_MANUAL_LIMIT - manual.count),
      };
    }

    await createUserFeedState(ctx, userId, limits, now);
    return {
      created: true,
      hasReadSinceRefresh: false,
      manualRefreshRemaining: USER_FEED_MANUAL_LIMIT,
    };
  },
});

export const getUserFeed = query({
  args: userFeedArgsValidator,
  handler: async (ctx, args) => {
    const limits = resolveUserFeedLimits(args);
    const now = Date.now();
    const userId = await getOptionalAuthUserId(ctx);

    if (!userId) {
      const selected = await selectFeedCandidates(ctx, limits);
      return {
        news: selected.newsArticles,
        articles: selected.articleArticles,
        refresh: {
          needsInitialization: false,
          hasReadSinceRefresh: false,
          autoRefreshEligible: false,
          nextAutoRefreshAt: null as number | null,
          manualRefreshLimit: USER_FEED_MANUAL_LIMIT,
          manualRefreshUsed: 0,
          manualRefreshRemaining: USER_FEED_MANUAL_LIMIT,
          lastRefreshedAt: null as number | null,
          userScoped: false,
        },
      };
    }

    const state = await getUserFeedState(ctx, userId);
    if (!state) {
      const selected = await selectFeedCandidates(ctx, limits);
      return {
        news: selected.newsArticles,
        articles: selected.articleArticles,
        refresh: {
          needsInitialization: true,
          hasReadSinceRefresh: false,
          autoRefreshEligible: false,
          nextAutoRefreshAt: null as number | null,
          manualRefreshLimit: USER_FEED_MANUAL_LIMIT,
          manualRefreshUsed: 0,
          manualRefreshRemaining: USER_FEED_MANUAL_LIMIT,
          lastRefreshedAt: null as number | null,
          userScoped: true,
        },
      };
    }

    const manual = resolveManualWindow(state, now);
    const news = await hydrateFeedArticles(ctx, state.newsArticleIds, limits.newsLimit, 'news');
    const articles = await hydrateFeedArticles(
      ctx,
      state.articleIds,
      limits.articleLimit,
      'articles'
    );
    const nextAutoRefreshAt = state.lastReadAt
      ? state.lastReadAt + USER_FEED_AUTO_REFRESH_MS
      : null;
    const autoRefreshEligible = Boolean(
      state.hasReadSinceRefresh && nextAutoRefreshAt && now >= nextAutoRefreshAt
    );

    return {
      news,
      articles,
      refresh: {
        needsInitialization: false,
        hasReadSinceRefresh: state.hasReadSinceRefresh,
        autoRefreshEligible,
        nextAutoRefreshAt,
        manualRefreshLimit: USER_FEED_MANUAL_LIMIT,
        manualRefreshUsed: manual.count,
        manualRefreshRemaining: Math.max(0, USER_FEED_MANUAL_LIMIT - manual.count),
        lastRefreshedAt: state.lastRefreshedAt,
        userScoped: true,
      },
    };
  },
});

export const refreshUserFeedIfEligible = mutation({
  args: userFeedArgsValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limits = resolveUserFeedLimits(args);
    const now = Date.now();

    const state =
      (await getUserFeedState(ctx, userId)) ||
      (await createUserFeedState(ctx, userId, limits, now));
    const nextAutoRefreshAt = state.lastReadAt
      ? state.lastReadAt + USER_FEED_AUTO_REFRESH_MS
      : null;
    const eligible = Boolean(
      state.hasReadSinceRefresh && nextAutoRefreshAt && now >= nextAutoRefreshAt
    );
    if (!eligible) {
      return {
        refreshed: false,
        reason: 'NOT_ELIGIBLE' as const,
        nextAutoRefreshAt,
      };
    }

    await refreshFeedState(ctx, state, limits, now);
    return {
      refreshed: true,
      reason: 'OK' as const,
      nextAutoRefreshAt: null as number | null,
    };
  },
});

export const manualRefreshUserFeed = mutation({
  args: userFeedArgsValidator,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limits = resolveUserFeedLimits(args);
    const now = Date.now();

    const state =
      (await getUserFeedState(ctx, userId)) ||
      (await createUserFeedState(ctx, userId, limits, now));
    const manual = resolveManualWindow(state, now);
    if (manual.count >= USER_FEED_MANUAL_LIMIT) {
      return {
        refreshed: false,
        reason: 'DAILY_LIMIT' as const,
        manualRefreshRemaining: 0,
      };
    }

    await refreshFeedState(ctx, state, limits, now, {
      manualRefreshCount: manual.count + 1,
      manualRefreshWindowStart: manual.windowStart,
    });

    return {
      refreshed: true,
      reason: 'OK' as const,
      manualRefreshRemaining: Math.max(0, USER_FEED_MANUAL_LIMIT - (manual.count + 1)),
    };
  },
});

export const markArticleRead = mutation({
  args: {
    articleId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const normalizedId = ctx.db.normalizeId('news_articles', args.articleId);
    if (!normalizedId) {
      return { marked: false };
    }
    const article = await ctx.db.get(normalizedId);
    if (!article || article.status !== 'active') {
      return { marked: false };
    }

    const now = Date.now();
    const state =
      (await getUserFeedState(ctx, userId)) ||
      (await createUserFeedState(ctx, userId, resolveUserFeedLimits({}), now));
    await ctx.db.patch(state._id, {
      hasReadSinceRefresh: true,
      lastReadAt: now,
      updatedAt: now,
    });
    return { marked: true };
  },
});

async function getUserFeedState(ctx: ReadCtx, userId: Id<'users'>): Promise<UserFeedState | null> {
  return ctx.db
    .query('reading_user_feeds')
    .withIndex('by_user', q => q.eq('userId', userId))
    .first();
}

async function createUserFeedState(
  ctx: MutationCtx,
  userId: Id<'users'>,
  limits: FeedLimits,
  now: number
): Promise<UserFeedState> {
  const selected = await selectFeedCandidates(ctx, limits);
  const id = await ctx.db.insert('reading_user_feeds', {
    userId,
    newsArticleIds: selected.newsIds,
    articleIds: selected.articleIds,
    hasReadSinceRefresh: false,
    lastReadAt: undefined,
    lastRefreshedAt: now,
    manualRefreshCount: 0,
    manualRefreshWindowStart: now,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (!created) {
    throw new Error('Failed to initialize user reading feed');
  }
  return created;
}

async function refreshFeedState(
  ctx: MutationCtx,
  state: UserFeedState,
  limits: FeedLimits,
  now: number,
  options?: {
    manualRefreshCount?: number;
    manualRefreshWindowStart?: number;
  }
) {
  const selected = await selectFeedCandidates(ctx, limits, {
    avoidNewsIds: state.newsArticleIds,
    avoidArticleIds: state.articleIds,
  });
  await ctx.db.patch(state._id, {
    newsArticleIds: selected.newsIds,
    articleIds: selected.articleIds,
    hasReadSinceRefresh: false,
    lastRefreshedAt: now,
    manualRefreshCount: options?.manualRefreshCount ?? state.manualRefreshCount,
    manualRefreshWindowStart: options?.manualRefreshWindowStart ?? state.manualRefreshWindowStart,
    updatedAt: now,
  });
}

function resolveUserFeedLimits(args: { newsLimit?: number; articleLimit?: number }): FeedLimits {
  return {
    newsLimit: Math.min(Math.max(args.newsLimit ?? USER_FEED_NEWS_LIMIT, 1), USER_FEED_NEWS_LIMIT),
    articleLimit: Math.min(
      Math.max(args.articleLimit ?? USER_FEED_ARTICLE_LIMIT, 1),
      USER_FEED_ARTICLE_LIMIT
    ),
  };
}

function resolveManualWindow(state: UserFeedState, now: number): ManualWindowState {
  if (now - state.manualRefreshWindowStart >= USER_FEED_MANUAL_WINDOW_MS) {
    return { count: 0, windowStart: now };
  }
  return {
    count: Math.max(0, state.manualRefreshCount || 0),
    windowStart: state.manualRefreshWindowStart,
  };
}

async function hydrateFeedArticles(
  ctx: ReadCtx,
  ids: Id<'news_articles'>[],
  limit: number,
  kind: 'news' | 'articles'
): Promise<NewsArticleDoc[]> {
  const loaded = await loadActiveArticlesByIds(ctx, ids);
  if (loaded.length >= limit) {
    return loaded.slice(0, limit);
  }

  const candidates =
    kind === 'news'
      ? await fetchNewsCandidates(ctx, Math.max(limit * 4, USER_FEED_NEWS_LIMIT))
      : await fetchArticleCandidates(ctx, Math.max(limit * 4, USER_FEED_ARTICLE_LIMIT));
  const seen = new Set(loaded.map(item => String(item._id)));
  for (const candidate of candidates) {
    if (loaded.length >= limit) break;
    const key = String(candidate._id);
    if (seen.has(key)) continue;
    loaded.push(candidate);
    seen.add(key);
  }

  return loaded.slice(0, limit);
}

async function selectFeedCandidates(
  ctx: ReadCtx,
  limits: FeedLimits,
  options?: {
    avoidNewsIds?: Id<'news_articles'>[];
    avoidArticleIds?: Id<'news_articles'>[];
  }
) {
  const [newsCandidates, articleCandidates] = await Promise.all([
    fetchNewsCandidates(ctx, Math.max(limits.newsLimit * 4, USER_FEED_NEWS_LIMIT)),
    fetchArticleCandidates(ctx, Math.max(limits.articleLimit * 4, USER_FEED_ARTICLE_LIMIT)),
  ]);

  const newsIds = pickFeedIds(newsCandidates, limits.newsLimit, options?.avoidNewsIds);
  const articleIds = pickFeedIds(articleCandidates, limits.articleLimit, options?.avoidArticleIds);
  const [newsArticles, articleArticles] = await Promise.all([
    loadActiveArticlesByIds(ctx, newsIds),
    loadActiveArticlesByIds(ctx, articleIds),
  ]);

  return {
    newsIds,
    articleIds,
    newsArticles,
    articleArticles,
  };
}

async function fetchNewsCandidates(ctx: ReadCtx, limit: number): Promise<NewsArticleDoc[]> {
  const rows = await ctx.db
    .query('news_articles')
    .withIndex('by_status_published', q => q.eq('status', 'active'))
    .order('desc')
    .take(Math.min(Math.max(limit, USER_FEED_NEWS_LIMIT), USER_FEED_MAX_NEWS_SCAN));

  return rows.filter(
    row => row.sourceKey !== WIKI_SOURCE_KEY && (row.bodyText?.length ?? 0) <= MAX_ARTICLE_BODY_LENGTH
  );
}

async function fetchArticleCandidates(ctx: ReadCtx, limit: number): Promise<NewsArticleDoc[]> {
  const rows = await ctx.db
    .query('news_articles')
    .withIndex('by_source_published', q => q.eq('sourceKey', WIKI_SOURCE_KEY))
    .order('desc')
    .take(Math.min(Math.max(limit, USER_FEED_ARTICLE_LIMIT), USER_FEED_MAX_ARTICLE_SCAN));
  return rows.filter(
    row => row.status === 'active' && (row.bodyText?.length ?? 0) <= MAX_ARTICLE_BODY_LENGTH
  );
}

function pickFeedIds(
  candidates: NewsArticleDoc[],
  limit: number,
  avoidIds?: Id<'news_articles'>[]
): Id<'news_articles'>[] {
  const picked: Id<'news_articles'>[] = [];
  const seen = new Set<string>();
  const avoid = new Set((avoidIds || []).map(id => String(id)));

  for (const row of candidates) {
    const id = row._id as Id<'news_articles'>;
    const key = String(id);
    if (seen.has(key) || avoid.has(key)) continue;
    seen.add(key);
    picked.push(id);
    if (picked.length >= limit) return picked;
  }

  for (const row of candidates) {
    const id = row._id as Id<'news_articles'>;
    const key = String(id);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(id);
    if (picked.length >= limit) return picked;
  }

  return picked;
}

async function loadActiveArticlesByIds(
  ctx: ReadCtx,
  ids: Id<'news_articles'>[]
): Promise<NewsArticleDoc[]> {
  if (ids.length === 0) return [];
  const rows = await Promise.all(ids.map(id => ctx.db.get(id)));
  return rows.filter((row): row is NewsArticleDoc => Boolean(row && row.status === 'active'));
}

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

  if (isArticleTooLong(input.bodyText)) {
    return { allowed: false, reason: 'body_too_long' };
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

function isArticleTooLong(bodyText: string): boolean {
  const normalized = normalizeWhitespace(bodyText);
  return normalized.length > MAX_ARTICLE_BODY_LENGTH;
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
