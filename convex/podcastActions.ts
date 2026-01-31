'use node';
import { action } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import Parser from 'rss-parser';
import { isRecord, readString } from './validation';

// RSS Parser instance
const parser = new Parser();

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

      const episodes = feed.items.slice(0, 50).map(item => ({
        title: item.title || 'Untitled Episode',
        audioUrl: item.enclosure?.url,
        pubDate: item.pubDate,
        duration:
          readString(item as unknown, ['itunes', 'duration']) ??
          readString(item as unknown, ['itunes:duration']),
        description: item.contentSnippet || item.content || '',
        guid: item.guid || item.link || item.title,
      }));

      return {
        channel: {
          title: feed.title,
          description: feed.description,
          image: feed.image?.url || readString(feed as unknown, ['itunes', 'image']),
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
