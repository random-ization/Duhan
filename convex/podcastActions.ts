'use node';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import Parser from 'rss-parser';
import { getPath, isRecord, readString } from './validation';

// RSS Parser instance
const parser = new Parser();

const readImageUrl = (value: unknown, path: readonly string[]): string | undefined => {
  const raw = getPath(value, path);
  if (typeof raw === 'string') return raw;
  if (isRecord(raw)) {
    const href = raw.href ?? raw.url;
    if (typeof href === 'string') return href;
  }
  return undefined;
};

const extractImageUrl = (value: unknown): string => {
  return (
    readImageUrl(value, ['image', 'url']) ||
    readImageUrl(value, ['image']) ||
    readImageUrl(value, ['itunes', 'image', 'href']) ||
    readImageUrl(value, ['itunes', 'image']) ||
    readImageUrl(value, ['itunes:image', 'href']) ||
    readImageUrl(value, ['itunes:image']) ||
    readImageUrl(value, ['media:thumbnail', 'url']) ||
    readImageUrl(value, ['media:thumbnail']) ||
    ''
  );
};

const readFeedLanguage = async (feedUrl: string): Promise<string | undefined> => {
  try {
    const feed = await parser.parseURL(feedUrl);
    return readString(feed as unknown, ['language']);
  } catch {
    return undefined;
  }
};

const isKoreanLanguage = (language: string | undefined) => {
  if (!language) return true;
  return language.toLowerCase().startsWith('ko');
};

// ============================================
// Actions (External API calls)
// ============================================

/**
 * Search podcasts using iTunes API
 */
export const searchPodcasts = action({
  args: { term: v.string() },
  handler: async (ctx, args) => {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(args.term)}&media=podcast&entity=podcast&limit=15`;

    const response = await fetch(url);
    const data: unknown = await response.json();

    if (!isRecord(data) || !Array.isArray(data.results)) return [];

    return data.results
      .map(
        (
          item
        ): {
          id: string;
          title: string;
          author: string;
          feedUrl: string;
          artwork: string;
          description: string;
        } => {
          if (!isRecord(item)) {
            return {
              id: '',
              title: 'Unknown',
              author: 'Unknown',
              feedUrl: '',
              artwork: '',
              description: '',
            };
          }
          const idValue = item.collectionId;
          let id = '';
          if (typeof idValue === 'string') {
            id = idValue;
          } else if (typeof idValue === 'number') {
            id = String(idValue);
          }
          const title = typeof item.collectionName === 'string' ? item.collectionName : 'Unknown';
          const author = typeof item.artistName === 'string' ? item.artistName : 'Unknown';
          const feedUrl = typeof item.feedUrl === 'string' ? item.feedUrl : '';
          const artworkUrl600 = typeof item.artworkUrl600 === 'string' ? item.artworkUrl600 : '';
          const artworkUrl100 = typeof item.artworkUrl100 === 'string' ? item.artworkUrl100 : '';
          const artwork = artworkUrl600 || artworkUrl100 || '';
          return {
            id,
            title,
            author,
            feedUrl,
            artwork,
            description: title,
          };
        }
      )
      .filter(p => p.feedUrl);
  },
});

/**
 * Get episodes from a podcast RSS feed
 */
export const getEpisodes = action({
  args: { feedUrl: v.string() },
  handler: async (ctx, args) => {
    try {
      const feed = await parser.parseURL(args.feedUrl);
      const channelImage = extractImageUrl(feed);

      const episodes = feed.items.slice(0, 50).map(item => ({
        title: item.title || 'Untitled Episode',
        audioUrl: item.enclosure?.url,
        pubDate: item.pubDate,
        duration:
          readString(item as unknown, ['itunes', 'duration']) ??
          readString(item as unknown, ['itunes:duration']),
        description: item.contentSnippet || item.content || '',
        guid: item.guid || item.link || item.title,
        image: extractImageUrl(item) || channelImage,
      }));

      return {
        channel: {
          title: feed.title,
          description: feed.description,
          image:
            channelImage || feed.image?.url || readString(feed as unknown, ['itunes', 'image']),
          author: readString(feed as unknown, ['itunes', 'author']),
        },
        episodes: episodes.filter(ep => ep.audioUrl),
      };
    } catch (error) {
      console.error('[RSS Parse Error]', error);
      throw new ConvexError({ code: 'RSS_PARSE_FAILED' });
    }
  },
});

/**
 * Fetch top podcasts from Apple charts (KR storefront) and filter Korean language feeds.
 */
export const getTopKoreanPodcasts = action({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50);
    const chartUrl = 'https://rss.marketingtools.apple.com/api/v2/kr/podcasts/top/50/podcasts.json';

    const chartResponse = await fetch(chartUrl);
    if (!chartResponse.ok) {
      throw new ConvexError({ code: 'CHART_FETCH_FAILED' });
    }
    const chartData: unknown = await chartResponse.json();

    if (!isRecord(chartData)) return [];
    const feed = chartData.feed;
    if (!isRecord(feed) || !Array.isArray(feed.results)) return [];

    const results = feed.results as Array<Record<string, unknown>>;
    const collected: Array<{
      id: string;
      itunesId: string;
      title: string;
      author: string;
      feedUrl: string;
      artworkUrl?: string;
    }> = [];

    for (const item of results) {
      if (collected.length >= limit) break;

      const idValue = item.id;
      const itunesId =
        typeof idValue === 'string' ? idValue : typeof idValue === 'number' ? String(idValue) : '';
      if (!itunesId) continue;

      const lookupUrl = `https://itunes.apple.com/lookup?id=${encodeURIComponent(itunesId)}`;
      const lookupResponse = await fetch(lookupUrl);
      if (!lookupResponse.ok) continue;
      const lookupData: unknown = await lookupResponse.json();

      if (!isRecord(lookupData) || !Array.isArray(lookupData.results)) continue;

      const lookupItem = lookupData.results.find(
        entry => isRecord(entry) && typeof entry.feedUrl === 'string'
      ) as Record<string, unknown> | undefined;

      const feedUrl =
        lookupItem && typeof lookupItem.feedUrl === 'string' ? lookupItem.feedUrl : '';
      if (!feedUrl) continue;

      const language = await readFeedLanguage(feedUrl);
      if (!isKoreanLanguage(language)) continue;

      const title =
        typeof item.name === 'string'
          ? item.name
          : lookupItem && typeof lookupItem.collectionName === 'string'
            ? lookupItem.collectionName
            : 'Unknown';
      const author =
        typeof item.artistName === 'string'
          ? item.artistName
          : lookupItem && typeof lookupItem.artistName === 'string'
            ? lookupItem.artistName
            : 'Unknown';

      const artworkUrl =
        (lookupItem && typeof lookupItem.artworkUrl600 === 'string' && lookupItem.artworkUrl600) ||
        (lookupItem && typeof lookupItem.artworkUrl100 === 'string' && lookupItem.artworkUrl100) ||
        (typeof item.artworkUrl100 === 'string' ? item.artworkUrl100 : undefined);

      collected.push({
        id: itunesId,
        itunesId,
        title,
        author,
        feedUrl,
        artworkUrl,
      });
    }

    return collected;
  },
});
