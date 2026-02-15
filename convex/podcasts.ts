import { query, mutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

// ============================================
// Queries
// ============================================

// Get Trending Podcasts
export const getTrending = query({
  args: {},
  handler: async ctx => {
    // 1. Internal: Rank channels by total episode views
    const allEpisodes = await ctx.db.query('podcast_episodes').collect();
    const channelStats = new Map<
      string,
      { channelId: (typeof allEpisodes)[number]['channelId']; views: number; latestAt: number }
    >();

    for (const ep of allEpisodes) {
      const key = ep.channelId.toString();
      const entry = channelStats.get(key) ?? {
        channelId: ep.channelId,
        views: 0,
        latestAt: 0,
      };
      entry.views += ep.views || 0;
      const latestAt = ep.pubDate || ep.createdAt || 0;
      if (latestAt > entry.latestAt) entry.latestAt = latestAt;
      channelStats.set(key, entry);
    }

    const rankedChannels = Array.from(channelStats.values())
      .sort((a, b) => {
        const viewsDiff = b.views - a.views;
        if (viewsDiff !== 0) return viewsDiff;
        return b.latestAt - a.latestAt;
      })
      .slice(0, 12);

    const channelDocs = await Promise.all(rankedChannels.map(stat => ctx.db.get(stat.channelId)));
    const internal = rankedChannels
      .map((stat, idx) => {
        const channel = channelDocs[idx];
        if (!channel) return null;
        return {
          ...channel,
          id: channel._id,
          views: stat.views,
        };
      })
      .filter(Boolean);

    // 2. External: Featured channels
    const featuredChannels = await ctx.db
      .query('podcast_channels')
      .withIndex('by_featured', q => q.eq('isFeatured', true))
      .collect();

    const external = featuredChannels
      .slice()
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
      .slice(0, 12)
      .map(channel => ({
        ...channel,
        id: channel._id,
      }));

    return {
      internal,
      external,
    };
  },
});

// Get Subscriptions
export const getSubscriptions = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const subs = await ctx.db
      .query('podcast_subscriptions')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    // OPTIMIZATION: Batch fetch channels
    const channelIds = [...new Set(subs.map(sub => sub.channelId))];
    const channelsArray = await Promise.all(channelIds.map(id => ctx.db.get(id)));
    const channelsMap = new Map(channelsArray.filter(Boolean).map(c => [c!._id.toString(), c!]));

    const channels = subs.map(sub => {
      const channel = channelsMap.get(sub.channelId.toString());
      return channel ? { ...channel, id: channel._id } : null;
    });

    return channels.filter(c => c !== null);
  },
});

// Get History
export const getHistory = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const history = await ctx.db
      .query('listening_history')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('desc') // Most recent first (if index creation supports it, otherwise manual sort)
      .take(20);

    // Note: index "by_user" allows simple filtering. Ordering by time requires specific index logic
    // or doing memory sort if result set is small.
    // Let's manually sort for safety if index isn't composed with time.
    return history
      .slice()
      .sort((a, b) => b.playedAt - a.playedAt)
      .map(h => ({
        ...h,
        id: h._id,
      }));
  },
});

// Record Listening History (Upsert)
export const recordHistory = mutation({
  args: {
    episodeGuid: v.string(),
    episodeTitle: v.string(),
    episodeUrl: v.string(),
    channelName: v.string(),
    channelImage: v.optional(v.string()),
    progress: v.number(),
    duration: v.optional(v.number()),
    episodeId: v.optional(v.id('podcast_episodes')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { episodeGuid, ...rest } = args;
    const now = Date.now();

    // Check existing
    const existing = await ctx.db
      .query('listening_history')
      .withIndex('by_user_episode', q => q.eq('userId', userId).eq('episodeGuid', episodeGuid))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...rest,
        playedAt: now,
      });
    } else {
      await ctx.db.insert('listening_history', {
        userId: userId,
        episodeGuid,
        ...rest,
        playedAt: now,
      });
    }
  },
});

export const removeHistoryRecord = mutation({
  args: {
    historyId: v.id('listening_history'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.historyId);
    if (!row) return { success: false, error: 'Not found' };
    if (row.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
    await ctx.db.delete(args.historyId);
    return { success: true };
  },
});

// Toggle Subscription
export const toggleSubscription = mutation({
  args: {
    channel: v.object({
      itunesId: v.optional(v.string()),
      title: v.string(),
      author: v.string(),
      feedUrl: v.string(),
      artworkUrl: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { channel } = args;

    // First, find or create the channel
    let existingChannel = await ctx.db
      .query('podcast_channels')
      .withIndex('by_feedUrl', q => q.eq('feedUrl', channel.feedUrl))
      .first();

    if (!existingChannel) {
      // Create the channel
      const channelId = await ctx.db.insert('podcast_channels', {
        title: channel.title,
        author: channel.author,
        feedUrl: channel.feedUrl,
        artworkUrl: channel.artworkUrl,
        itunesId: channel.itunesId,
        isFeatured: false,
        createdAt: Date.now(),
      });
      existingChannel = await ctx.db.get(channelId);
    }

    if (!existingChannel) {
      throw new ConvexError({ code: 'CHANNEL_CREATION_FAILED' });
    }

    // Check if subscription exists
    const existingSub = await ctx.db
      .query('podcast_subscriptions')
      .withIndex('by_user_channel', q =>
        q.eq('userId', userId).eq('channelId', existingChannel._id)
      )
      .first();

    if (existingSub) {
      // Unsubscribe
      await ctx.db.delete(existingSub._id);
      return { success: true, isSubscribed: false };
    } else {
      // Subscribe
      await ctx.db.insert('podcast_subscriptions', {
        userId: userId,
        channelId: existingChannel._id,
        createdAt: Date.now(),
      });
      return { success: true, isSubscribed: true };
    }
  },
});

// Track View (Find or Create Episode and increment views)
export const trackView = mutation({
  args: {
    guid: v.string(),
    title: v.string(),
    audioUrl: v.string(),
    duration: v.optional(v.any()), // number or string
    pubDate: v.optional(v.any()), // string or number
    channel: v.object({
      itunesId: v.optional(v.string()),
      title: v.string(),
      author: v.optional(v.string()),
      feedUrl: v.optional(v.string()),
      artworkUrl: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { guid, title, audioUrl, duration, pubDate, channel: channelInfo } = args;

    // 1. Find or Create Channel
    const channelId = await resolvePodcastChannel(ctx, channelInfo);

    if (!channelId) return { success: false, error: 'Missing channel identifier' };

    // 2. Find or Create Episode
    let episode = await ctx.db
      .query('podcast_episodes')
      .withIndex('by_channel', q => q.eq('channelId', channelId))
      .filter(q => q.eq(q.field('guid'), guid))
      .first();

    episode ??= await ctx.db
      .query('podcast_episodes')
      .filter(q => q.eq(q.field('audioUrl'), audioUrl))
      .first();

    if (episode) {
      await ctx.db.patch(episode._id, {
        views: (episode.views || 0) + 1,
      });
      return { success: true, views: episode.views + 1 };
    } else {
      // Create new episode
      await ctx.db.insert('podcast_episodes', {
        channelId,
        guid,
        title,
        audioUrl,
        duration: typeof duration === 'number' ? duration : 0,
        pubDate: pubDate ? new Date(pubDate).getTime() : Date.now(),
        views: 1,
        likes: 0,
        createdAt: Date.now(),
      });
      return { success: true, views: 1 };
    }
  },
});

// Save Podcast Progress
export const saveProgress = mutation({
  args: {
    episodeGuid: v.string(),
    progress: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { episodeGuid, progress } = args;

    const existing = await ctx.db
      .query('listening_history')
      .withIndex('by_user_episode', q => q.eq('userId', userId).eq('episodeGuid', episodeGuid))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { progress, playedAt: Date.now() });
    }

    return { success: true };
  },
});

// Helper for resolving podcast channels in podcasts.ts
async function resolvePodcastChannel(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  channelInfo: {
    itunesId?: string;
    title: string;
    author?: string;
    feedUrl?: string;
    artworkUrl?: string;
  }
) {
  const normalizedFeedUrl = channelInfo.feedUrl?.trim() || undefined;
  const normalizedItunesId = channelInfo.itunesId?.trim() || undefined;

  if (normalizedFeedUrl) {
    const existingChannel = await ctx.db
      .query('podcast_channels')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_feedUrl', (q: any) => q.eq('feedUrl', normalizedFeedUrl))
      .first();

    if (existingChannel) {
      return existingChannel._id;
    } else {
      return await ctx.db.insert('podcast_channels', {
        title: channelInfo.title,
        author: channelInfo.author || 'Unknown',
        feedUrl: normalizedFeedUrl,
        artworkUrl: channelInfo.artworkUrl,
        itunesId: channelInfo.itunesId,
        isFeatured: false,
        createdAt: Date.now(),
      });
    }
  } else if (normalizedItunesId) {
    const pseudoFeedUrl = `itunes:${normalizedItunesId}`;
    const existingChannel = await ctx.db
      .query('podcast_channels')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex('by_feedUrl', (q: any) => q.eq('feedUrl', pseudoFeedUrl))
      .first();

    if (existingChannel) {
      return existingChannel._id;
    } else {
      return await ctx.db.insert('podcast_channels', {
        title: channelInfo.title,
        author: channelInfo.author || 'Unknown',
        feedUrl: pseudoFeedUrl,
        artworkUrl: channelInfo.artworkUrl,
        itunesId: normalizedItunesId,
        isFeatured: false,
        createdAt: Date.now(),
      });
    }
  } else {
    // Fallback: Try to find by title if no feedUrl
    const existingChannel = await ctx.db
      .query('podcast_channels')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((q: any) => q.eq(q.field('title'), channelInfo.title))
      .first();
    if (existingChannel) return existingChannel._id;
  }
  return null;
}
