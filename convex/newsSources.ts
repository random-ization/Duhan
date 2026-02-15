'use node';

import Parser from 'rss-parser';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { internalAction } from './_generated/server';
import { v } from 'convex/values';
import { toErrorMessage } from './errors';
import { NEWS_SOURCES, type NewsSourceDefinition } from './newsConfig';

type NormalizedArticleInput = {
  sourceGuid?: string;
  sourceUrl: string;
  canonicalUrl?: string;
  title: string;
  summary?: string;
  bodyText?: string;
  bodyHtml?: string;
  section?: string;
  tags?: string[];
  author?: string;
  publishedAt?: number;
};

type IngestBatchArgs = {
  sourceKey: string;
  sourceType: string;
  articles: NormalizedArticleInput[];
};

type IngestBatchResult = {
  fetched: number;
  inserted: number;
  updated: number;
  deduped: number;
  failed: number;
  errors: string[];
};

type LogFetchRunArgs = {
  sourceKey: string;
  runAt: number;
  durationMs: number;
  fetched: number;
  inserted: number;
  updated: number;
  deduped: number;
  failed: number;
  status: string;
  errorSample?: string[];
};

type UpdateSourceHealthArgs = {
  sourceKey: string;
  status: 'ok' | 'partial' | 'error';
  lastRunAt: number;
  lastError?: string;
};

type PollSourceResult = {
  sourceKey: string;
  fetched: number;
  inserted: number;
  updated: number;
  deduped: number;
  failed: number;
  durationMs: number;
  status: 'ok' | 'partial' | 'error';
  errors: string[];
};

type RssFeedItem = {
  title?: string;
  link?: string;
  guid?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  categories?: string[];
  category?: string;
};

type NaverItem = {
  title: string;
  originallink?: string;
  link: string;
  description?: string;
  pubDate?: string;
};

type NaverResponse = {
  items?: NaverItem[];
};

type WikiCategoryMember = {
  pageid: number;
  title: string;
};

type WikiCategoryMembersResponse = {
  query?: {
    categorymembers?: WikiCategoryMember[];
  };
};

type WikiPageCategory = {
  title?: string;
};

type WikiPageDetail = {
  pageid?: number;
  title?: string;
  fullurl?: string;
  canonicalurl?: string;
  touched?: string;
  extract?: string;
  categories?: WikiPageCategory[];
};

type WikiPageDetailResponse = {
  query?: {
    pages?: WikiPageDetail[];
  };
};

const ingestBatchMutation = makeFunctionReference<'mutation', IngestBatchArgs, IngestBatchResult>(
  'newsIngestion:ingestBatch'
) as unknown as FunctionReference<'mutation', 'internal', IngestBatchArgs, IngestBatchResult>;

const logFetchRunMutation = makeFunctionReference<'mutation', LogFetchRunArgs, void>(
  'newsIngestion:logFetchRun'
) as unknown as FunctionReference<'mutation', 'internal', LogFetchRunArgs, void>;

const updateSourceHealthMutation = makeFunctionReference<'mutation', UpdateSourceHealthArgs, void>(
  'newsAdmin:updateSourceHealth'
) as unknown as FunctionReference<'mutation', 'internal', UpdateSourceHealthArgs, void>;

export const pollSource = internalAction({
  args: {
    sourceKey: v.string(),
  },
  handler: async (ctx, args): Promise<PollSourceResult> => {
    const source = NEWS_SOURCES.find(item => item.key === args.sourceKey && item.enabled);
    if (!source) {
      throw new Error(`Unknown or disabled source key: ${args.sourceKey}`);
    }

    const runAt = Date.now();
    let durationMs = 0;
    try {
      const articles = await pullSourceArticles(source);
      const ingest = await ctx.runMutation(ingestBatchMutation, {
        sourceKey: source.key,
        sourceType: source.type,
        articles,
      });
      durationMs = Date.now() - runAt;
      const status: PollSourceResult['status'] = ingest.failed > 0 ? 'partial' : 'ok';

      await ctx.runMutation(logFetchRunMutation, {
        sourceKey: source.key,
        runAt,
        durationMs,
        fetched: ingest.fetched,
        inserted: ingest.inserted,
        updated: ingest.updated,
        deduped: ingest.deduped,
        failed: ingest.failed,
        status,
        errorSample: ingest.errors,
      });
      await ctx.runMutation(updateSourceHealthMutation, {
        sourceKey: source.key,
        status,
        lastRunAt: runAt,
        lastError: ingest.errors[0],
      });

      return {
        sourceKey: source.key,
        fetched: ingest.fetched,
        inserted: ingest.inserted,
        updated: ingest.updated,
        deduped: ingest.deduped,
        failed: ingest.failed,
        durationMs,
        status,
        errors: ingest.errors,
      };
    } catch (error: unknown) {
      durationMs = Date.now() - runAt;
      const message = toErrorMessage(error);
      await ctx.runMutation(logFetchRunMutation, {
        sourceKey: source.key,
        runAt,
        durationMs,
        fetched: 0,
        inserted: 0,
        updated: 0,
        deduped: 0,
        failed: 1,
        status: 'error',
        errorSample: [message],
      });
      await ctx.runMutation(updateSourceHealthMutation, {
        sourceKey: source.key,
        status: 'error',
        lastRunAt: runAt,
        lastError: message,
      });
      return {
        sourceKey: source.key,
        fetched: 0,
        inserted: 0,
        updated: 0,
        deduped: 0,
        failed: 1,
        durationMs,
        status: 'error',
        errors: [message],
      };
    }
  },
});

async function pullSourceArticles(source: NewsSourceDefinition): Promise<NormalizedArticleInput[]> {
  if (source.key === 'wiki_ko_featured') {
    return pullFromWikipediaFeatured(source);
  }
  if (source.key === 'naver_news_search') {
    return pullFromNaver(source);
  }
  if (source.type === 'rss') {
    return pullFromRss(source);
  }
  return [];
}

async function pullFromRss(source: NewsSourceDefinition): Promise<NormalizedArticleInput[]> {
  const parser = new Parser<Record<string, unknown>, RssFeedItem>({
    timeout: 10_000,
    customFields: {
      item: ['category', 'creator'],
    },
  });
  const feed = await parser.parseURL(source.endpoint);
  const items = (feed.items || []).slice(0, 25);

  const rows = await Promise.all(
    items.map(async item => {
      const sourceUrl = (item.link || '').trim();
      if (!sourceUrl) return null;

      const title = normalizeText(stripHtml(decodeHtml(item.title || '')));
      if (!title) return null;

      const summaryRaw = item.contentSnippet || item.content || '';
      const summary = normalizeText(stripHtml(decodeHtml(summaryRaw)));
      const body = await fetchArticleBody(sourceUrl, summary);
      const publishedAt = parseDateMs(item.isoDate || item.pubDate);
      const section = inferSection(item.categories, sourceUrl, item.category);

      return {
        sourceGuid: item.guid || `${source.key}:${sourceUrl}`,
        sourceUrl,
        canonicalUrl: sourceUrl,
        title,
        summary: summary || undefined,
        bodyText: body || summary || title,
        section,
        author: item.creator,
        publishedAt,
      } satisfies NormalizedArticleInput;
    })
  );

  const normalized: NormalizedArticleInput[] = [];
  for (const row of rows) {
    if (row) normalized.push(row);
  }
  return normalized;
}

async function pullFromNaver(source: NewsSourceDefinition): Promise<NormalizedArticleInput[]> {
  const clientId = process.env.NAVER_CLIENT_ID?.trim();
  const clientSecret = process.env.NAVER_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    return [];
  }

  const queries = ['한국 뉴스', '한국 경제', '한국 사회'];
  const unique = new Map<string, NormalizedArticleInput>();

  for (const query of queries) {
    const url = new URL(source.endpoint);
    url.searchParams.set('query', query);
    url.searchParams.set('display', '20');
    url.searchParams.set('sort', 'date');

    const response = await fetchWithTimeout(url.toString(), {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!response.ok) continue;

    const json = (await response.json()) as NaverResponse;
    for (const item of json.items || []) {
      const sourceUrl = (item.originallink || item.link || '').trim();
      if (!sourceUrl) continue;
      if (!sourceUrl.startsWith('http')) continue;

      const title = normalizeText(stripHtml(decodeHtml(item.title || '')));
      if (!title) continue;

      const summary = normalizeText(stripHtml(decodeHtml(item.description || '')));
      const body = await fetchArticleBody(sourceUrl, summary);

      unique.set(sourceUrl, {
        sourceGuid: sourceUrl,
        sourceUrl,
        canonicalUrl: sourceUrl,
        title,
        summary: summary || undefined,
        bodyText: body || summary || title,
        publishedAt: parseDateMs(item.pubDate),
      });
    }
  }

  return [...unique.values()];
}

async function pullFromWikipediaFeatured(
  source: NewsSourceDefinition
): Promise<NormalizedArticleInput[]> {
  const categoryMembers = await fetchWikipediaFeaturedMembers(source.endpoint);
  if (categoryMembers.length === 0) {
    return [];
  }

  const sampled = pickDailyMembers(categoryMembers, 1);
  const rows = await Promise.all(
    sampled.map(member => fetchWikipediaPageDetail(source.endpoint, member.title))
  );

  const normalized: NormalizedArticleInput[] = [];
  for (const page of rows) {
    if (!page) continue;

    const title = normalizeText(page.title || '');
    if (!title) continue;

    const sourceUrl = (page.fullurl || page.canonicalurl || '').trim();
    if (!sourceUrl) continue;

    const body = cleanupArticleText(page.extract || '');
    if (!isUsableArticleText(body)) continue;

    const summary = summarizeBody(body);
    const section = inferWikipediaSection(page.categories);

    normalized.push({
      sourceGuid: String(page.pageid || title),
      sourceUrl,
      canonicalUrl: page.canonicalurl || sourceUrl,
      title,
      summary: summary || undefined,
      bodyText: body.slice(0, 12000),
      section: section || '위키백과 알찬 글',
      publishedAt: parseDateMs(page.touched),
    });
  }

  return normalized;
}

async function fetchWikipediaFeaturedMembers(endpoint: string): Promise<WikiCategoryMember[]> {
  const url = new URL(endpoint);
  url.searchParams.set('action', 'query');
  url.searchParams.set('list', 'categorymembers');
  url.searchParams.set('cmtitle', 'Category:알찬 글');
  url.searchParams.set('cmnamespace', '0');
  url.searchParams.set('cmtype', 'page');
  url.searchParams.set('cmlimit', '120');
  url.searchParams.set('format', 'json');

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        'User-Agent': 'HangyeolNewsBot/1.0 (+https://hangyeol.com)',
      },
    },
    10_000
  );
  if (!response.ok) return [];

  const json = (await response.json()) as WikiCategoryMembersResponse;
  return (json.query?.categorymembers || [])
    .filter(item => typeof item.pageid === 'number' && Boolean(item.title))
    .sort((a, b) => a.title.localeCompare(b.title, 'ko'));
}

async function fetchWikipediaPageDetail(
  endpoint: string,
  title: string
): Promise<WikiPageDetail | null> {
  const url = new URL(endpoint);
  url.searchParams.set('action', 'query');
  url.searchParams.set('prop', 'extracts|info|categories');
  url.searchParams.set('titles', title);
  url.searchParams.set('inprop', 'url');
  url.searchParams.set('clshow', '!hidden');
  url.searchParams.set('cllimit', '10');
  url.searchParams.set('explaintext', '1');
  url.searchParams.set('exsectionformat', 'plain');
  url.searchParams.set('exchars', '9000');
  url.searchParams.set('format', 'json');
  url.searchParams.set('formatversion', '2');

  const response = await fetchWithTimeout(
    url.toString(),
    {
      headers: {
        'User-Agent': 'HangyeolNewsBot/1.0 (+https://hangyeol.com)',
      },
    },
    10_000
  );
  if (!response.ok) return null;

  const json = (await response.json()) as WikiPageDetailResponse;
  const page = json.query?.pages?.[0];
  if (!page || !page.title) return null;
  return page;
}

function pickDailyMembers(list: WikiCategoryMember[], count: number): WikiCategoryMember[] {
  if (list.length === 0 || count <= 0) return [];
  if (list.length <= count) return [...list];

  const kstDayNumber = Math.floor((Date.now() + 9 * 60 * 60 * 1000) / 86_400_000);
  const selected: WikiCategoryMember[] = [];
  for (let offset = 0; offset < count; offset += 1) {
    const index = (kstDayNumber + offset) % list.length;
    selected.push(list[index]);
  }
  return selected;
}

function summarizeBody(body: string): string {
  const sentences = body
    .split(/(?<=[.!?。！？])\s+/)
    .map(item => item.trim())
    .filter(Boolean);
  return sentences.slice(0, 2).join(' ').slice(0, 280).trim();
}

function inferWikipediaSection(categories?: WikiPageCategory[]): string | undefined {
  const names = (categories || [])
    .map(item => normalizeText((item.title || '').replace(/^분류:/, '')))
    .filter(Boolean);
  const candidate = names.find(
    value => !/알찬 글|위키백과|출처|문서|정리 필요|분류 필요|일반 문서|좋은 글|분야별/i.test(value)
  );
  return candidate;
}

const SOURCE_BODY_MARKERS: Record<string, string[]> = {
  'khan.co.kr': [
    'id=["\']articleBody["\']',
    'class=["\'][^"\']*(art_body|article_body|news_view|content_view)[^"\']*["\']',
  ],
  'donga.com': [
    'id=["\']article_txt["\']',
    'class=["\'][^"\']*(article_txt|news_view|article_body)[^"\']*["\']',
  ],
  'hankyung.com': [
    'id=["\']articletxt["\']',
    'class=["\'][^"\']*(article-body|article_txt|news-view)[^"\']*["\']',
  ],
  'mk.co.kr': [
    'class=["\'][^"\']*(news_cnt_detail_wrap|news_detail|art_txt)[^"\']*["\']',
    'id=["\']article_body["\']',
  ],
  'it.donga.com': [
    'class=["\'][^"\']*(view_text|article_txt|article_body)[^"\']*["\']',
    'id=["\']article_txt["\']',
  ],
  'voakorea.com': [
    'class=["\'][^"\']*(body-container|wsw|article-content)[^"\']*["\']',
    'id=["\']article-content["\']',
  ],
};

async function fetchArticleBody(url: string, fallback: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'User-Agent': 'HangyeolNewsBot/1.0 (+https://hangyeol.com)',
      },
    });
    if (!response.ok) {
      return fallback;
    }
    const html = await response.text();
    const text = extractBodyText(url, html, fallback);
    if (text.length < 80) return fallback;
    return text.slice(0, 12000);
  } catch {
    return fallback;
  }
}

async function fetchWithTimeout(
  url: string,
  init: Parameters<typeof fetch>[1],
  timeoutMs: number = 8_000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function parseDateMs(value?: string): number {
  if (!value) return Date.now();
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function inferSection(
  categories: string[] | undefined,
  sourceUrl: string,
  fallback?: string
): string | undefined {
  if (categories && categories.length > 0) {
    const fromCategory = normalizeText(categories[0] || '');
    if (fromCategory) return fromCategory;
  }
  if (fallback) {
    const normalizedFallback = normalizeText(fallback);
    if (normalizedFallback) return normalizedFallback;
  }
  try {
    const pathname = new URL(sourceUrl).pathname.split('/').filter(Boolean);
    return pathname[0] || undefined;
  } catch {
    return undefined;
  }
}

function extractBodyText(url: string, html: string, fallback: string): string {
  const byJsonLd = extractFromJsonLd(html);
  if (isUsableArticleText(byJsonLd)) {
    return byJsonLd;
  }

  const host = normalizeHost(url);
  const markers = SOURCE_BODY_MARKERS[host] || [];
  for (const marker of markers) {
    const byMarker = extractByMarkerWindow(html, marker);
    if (isUsableArticleText(byMarker)) {
      return byMarker;
    }
  }

  const byArticleTag = extractFromTagBlock(html, 'article');
  if (isUsableArticleText(byArticleTag)) {
    return byArticleTag;
  }

  const byMainTag = extractFromTagBlock(html, 'main');
  if (isUsableArticleText(byMainTag)) {
    return byMainTag;
  }

  const wholePage = cleanupArticleText(stripHtml(html));
  if (isUsableArticleText(wholePage)) {
    return wholePage;
  }

  return cleanupArticleText(fallback);
}

function normalizeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function extractFromJsonLd(html: string): string {
  const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const candidates: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html))) {
    const raw = decodeHtml((match[1] || '').trim());
    if (!raw) continue;
    const parsed = safeJsonParse(raw);
    if (!parsed) continue;
    collectJsonLdArticleBodies(parsed, candidates, 0);
  }

  let best = '';
  for (const candidate of candidates) {
    const cleaned = cleanupArticleText(candidate);
    if (cleaned.length > best.length) {
      best = cleaned;
    }
  }
  return best;
}

function collectJsonLdArticleBodies(node: unknown, out: string[], depth: number) {
  if (depth > 8 || !node) return;
  if (typeof node === 'string') return;

  if (Array.isArray(node)) {
    for (const item of node) {
      collectJsonLdArticleBodies(item, out, depth + 1);
    }
    return;
  }

  if (typeof node === 'object') {
    const record = node as Record<string, unknown>;
    const articleBody = record.articleBody;
    if (typeof articleBody === 'string' && articleBody.trim().length > 40) {
      out.push(articleBody);
    }

    const text = record.text;
    const type = typeof record['@type'] === 'string' ? String(record['@type']).toLowerCase() : '';
    if (type.includes('article') && typeof text === 'string' && text.trim().length > 120) {
      out.push(text);
    }

    for (const value of Object.values(record)) {
      collectJsonLdArticleBodies(value, out, depth + 1);
    }
  }
}

function safeJsonParse(value: string): unknown | null {
  const trimmed = value.trim().replace(/^\uFEFF/, '');
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    // Some pages append trailing semicolons.
    try {
      return JSON.parse(trimmed.replace(/;+$/, ''));
    } catch {
      return null;
    }
  }
}

function extractByMarkerWindow(html: string, markerPattern: string): string {
  let markerIndex = -1;
  try {
    const regex = new RegExp(markerPattern, 'i');
    const found = regex.exec(html);
    markerIndex = found?.index ?? -1;
  } catch {
    markerIndex = html.indexOf(markerPattern);
  }

  if (markerIndex < 0) return '';
  const start = Math.max(0, markerIndex - 1500);
  const end = Math.min(html.length, markerIndex + 32000);
  return cleanupArticleText(stripHtml(html.slice(start, end)));
}

function extractFromTagBlock(html: string, tagName: 'article' | 'main'): string {
  const regex = new RegExp(`<${tagName}\\b[^>]*>[\\s\\S]{120,}?</${tagName}>`, 'gi');
  let best = '';
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html))) {
    const text = cleanupArticleText(stripHtml(match[0]));
    if (text.length > best.length) {
      best = text;
    }
  }
  return best;
}

function cleanupArticleText(value: string): string {
  return normalizeText(decodeHtml(value))
    .replace(/(copyright|저작권자|무단전재|재배포 금지)[^ ]*/gi, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function isUsableArticleText(value: string): boolean {
  if (!value) return false;
  if (value.length < 180) return false;
  const sentenceCount = value.split(/[.!?。！？\n]+/).filter(Boolean).length;
  return sentenceCount >= 2;
}

function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ');
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}
