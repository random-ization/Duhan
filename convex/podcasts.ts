"use node";
import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import Parser from "rss-parser";

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
        const data = await response.json();

        if (!data.results) return [];

        return data.results
            .map((item: any) => ({
                id: item.collectionId?.toString() || "",
                title: item.collectionName || "Unknown",
                author: item.artistName || "Unknown",
                feedUrl: item.feedUrl || "",
                artwork: item.artworkUrl600 || item.artworkUrl100 || "",
                description: item.collectionName || "",
            }))
            .filter((p: any) => p.feedUrl);
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
                title: item.title || "Untitled Episode",
                audioUrl: item.enclosure?.url,
                pubDate: item.pubDate,
                duration: (item as any).itunes?.duration || (item as any)["itunes:duration"],
                description: item.contentSnippet || item.content || "",
                guid: item.guid || item.link || item.title,
            }));

            return {
                channel: {
                    title: feed.title,
                    description: feed.description,
                    image: feed.image?.url || (feed as any).itunes?.image,
                    author: (feed as any).itunes?.author,
                },
                episodes: episodes.filter(ep => ep.audioUrl),
            };
        } catch (error) {
            console.error("[RSS Parse Error]", error);
            throw new Error("FAILED_TO_PARSE_RSS");
        }
    },
});

// ============================================
// Queries
// ============================================

// Get Trending Podcasts
export const getTrending = query({
    args: {},
    handler: async (ctx) => {
        // 1. Internal: Get episodes sorted by views (descending)
        // Note: Convex doesn't support direct sorting by non-indexed fields efficiently without an index.
        // We'll trust the "views" field and maybe add an index later for perf if needed.
        // For now, let's fetch all and sort top 10 (assuming not massive scale yet).
        const allEpisodes = await ctx.db.query("podcast_episodes").collect();
        const internal = allEpisodes
            .sort((a, b) => b.views - a.views)
            .slice(0, 10)
            .map(ep => ({
                ...ep,
                id: ep._id,
                // Resolving channel details would require a separate lookup or join
                // For simplicity in list view, we assume channel info is fetched or we do a promise.all
                // But actually, we need channel info.
            }));

        // Populate channel for internal items
        const internalWithChannel = await Promise.all(internal.map(async (ep) => {
            const channel = await ctx.db.get(ep.channelId);
            return {
                ...ep,
                channel: channel ? { ...channel, id: channel._id } : null
            };
        }));

        // 2. External: Placeholder for now (or fetch from a curated lists table if we had one)
        // Legacy API likely fetched from iTunes or a "Featured" DB table.
        // We'll return empty for now or populate if we have data.
        const external: any[] = [];

        return {
            internal: internalWithChannel,
            external
        };
    },
});

// Get Subscriptions
export const getSubscriptions = query({
    args: { userId: v.optional(v.string()) }, // Should be v.id("users") ideally
    handler: async (ctx, args) => {
        if (!args.userId) return [];

        const subs = await ctx.db
            .query("podcast_subscriptions")
            .withIndex("by_user", q => q.eq("userId", args.userId as any))
            .collect();

        const channels = await Promise.all(subs.map(async (sub) => {
            const channel = await ctx.db.get(sub.channelId);
            return channel ? { ...channel, id: channel._id } : null;
        }));

        return channels.filter(c => c !== null);
    }
});

// Get History
export const getHistory = query({
    args: { userId: v.optional(v.string()) },
    handler: async (ctx, args) => {
        if (!args.userId) return [];

        const history = await ctx.db
            .query("listening_history")
            .withIndex("by_user", q => q.eq("userId", args.userId as any))
            .order("desc") // Most recent first (if index creation supports it, otherwise manual sort)
            .take(20);

        // Note: index "by_user" allows simple filtering. Ordering by time requires specific index logic 
        // or doing memory sort if result set is small.
        // Let's manually sort for safety if index isn't composed with time.
        return history.sort((a, b) => b.playedAt - a.playedAt).map(h => ({
            ...h,
            id: h._id
        }));
    }
});

// Record Listening History (Upsert)
export const recordHistory = mutation({
    args: {
        userId: v.string(), // v.id("users")
        episodeGuid: v.string(),
        episodeTitle: v.string(),
        episodeUrl: v.string(),
        channelName: v.string(),
        channelImage: v.optional(v.string()),
        progress: v.number(),
        duration: v.optional(v.number()),
        episodeId: v.optional(v.id("podcast_episodes"))
    },
    handler: async (ctx, args) => {
        const { userId, episodeGuid, ...rest } = args;
        const now = Date.now();

        // Check existing
        const existing = await ctx.db
            .query("listening_history")
            .withIndex("by_user_episode", q => q.eq("userId", userId as any).eq("episodeGuid", episodeGuid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...rest,
                playedAt: now
            });
        } else {
            await ctx.db.insert("listening_history", {
                userId: userId as any,
                episodeGuid,
                ...rest,
                playedAt: now
            });
        }
    }
});

// Toggle Subscription
export const toggleSubscription = mutation({
    args: {
        userId: v.string(),
        channel: v.object({
            itunesId: v.optional(v.string()),
            title: v.string(),
            author: v.string(),
            feedUrl: v.string(),
            artworkUrl: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const { userId, channel } = args;

        // First, find or create the channel
        let existingChannel = await ctx.db.query("podcast_channels")
            .filter(q => q.eq(q.field("feedUrl"), channel.feedUrl))
            .first();

        if (!existingChannel) {
            // Create the channel
            const channelId = await ctx.db.insert("podcast_channels", {
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
            throw new Error("Failed to create channel");
        }

        // Check if subscription exists
        const existingSub = await ctx.db.query("podcast_subscriptions")
            .withIndex("by_user_channel", q => q.eq("userId", userId as any).eq("channelId", existingChannel!._id))
            .first();

        if (existingSub) {
            // Unsubscribe
            await ctx.db.delete(existingSub._id);
            return { success: true, isSubscribed: false };
        } else {
            // Subscribe
            await ctx.db.insert("podcast_subscriptions", {
                userId: userId as any,
                channelId: existingChannel._id,
                createdAt: Date.now(),
            });
            return { success: true, isSubscribed: true };
        }
    }
});

// Track View (increment episode views)
export const trackView = mutation({
    args: {
        episodeId: v.id("podcast_episodes"),
    },
    handler: async (ctx, args) => {
        const episode = await ctx.db.get(args.episodeId);
        if (episode) {
            await ctx.db.patch(args.episodeId, {
                views: (episode.views || 0) + 1,
            });
            return { success: true, views: episode.views + 1 };
        }
        return { success: false, views: 0 };
    }
});

// Save Podcast Progress
export const saveProgress = mutation({
    args: {
        episodeGuid: v.string(),
        userId: v.string(),
        progress: v.number(),
    },
    handler: async (ctx, args) => {
        const { userId, episodeGuid, progress } = args;

        const existing = await ctx.db.query("listening_history")
            .withIndex("by_user_episode", q => q.eq("userId", userId as any).eq("episodeGuid", episodeGuid))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { progress, playedAt: Date.now() });
        }

        return { success: true };
    }
});
