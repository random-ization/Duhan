import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId, getOptionalAuthUserId } from "./utils";

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
        // OPTIMIZATION: Batch fetch channels
        const channelIds = [...new Set(internal.map(ep => ep.channelId))];
        const channelsArray = await Promise.all(channelIds.map(id => ctx.db.get(id)));
        const channelsMap = new Map(channelsArray.filter(Boolean).map(c => [c!._id.toString(), c!]));

        const internalWithChannel = internal.map((ep) => {
            const channel = channelsMap.get(ep.channelId.toString());
            return {
                ...ep,
                channel: channel ? { ...channel, id: channel._id } : null
            };
        });

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
    args: {},
    handler: async (ctx) => {
        const userId = await getOptionalAuthUserId(ctx);
        if (!userId) return [];

        const subs = await ctx.db
            .query("podcast_subscriptions")
            .withIndex("by_user", q => q.eq("userId", userId))
            .collect();

        // OPTIMIZATION: Batch fetch channels
        const channelIds = [...new Set(subs.map(sub => sub.channelId))];
        const channelsArray = await Promise.all(channelIds.map(id => ctx.db.get(id)));
        const channelsMap = new Map(channelsArray.filter(Boolean).map(c => [c!._id.toString(), c!]));

        const channels = subs.map((sub) => {
            const channel = channelsMap.get(sub.channelId.toString());
            return channel ? { ...channel, id: channel._id } : null;
        });

        return channels.filter(c => c !== null);
    }
});

// Get History
export const getHistory = query({
    args: {},
    handler: async (ctx) => {
        const userId = await getOptionalAuthUserId(ctx);
        if (!userId) return [];

        const history = await ctx.db
            .query("listening_history")
            .withIndex("by_user", q => q.eq("userId", userId))
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
        const userId = await getAuthUserId(ctx);

        const { episodeGuid, ...rest } = args;
        const now = Date.now();

        // Check existing
        const existing = await ctx.db
            .query("listening_history")
            .withIndex("by_user_episode", q => q.eq("userId", userId).eq("episodeGuid", episodeGuid))
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                ...rest,
                playedAt: now
            });
        } else {
            await ctx.db.insert("listening_history", {
                userId: userId,
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
        let existingChannel = await ctx.db.query("podcast_channels")
            .withIndex("by_feedUrl", q => q.eq("feedUrl", channel.feedUrl))
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
            throw new ConvexError({ code: "CHANNEL_CREATION_FAILED" });
        }

        // Check if subscription exists
        const existingSub = await ctx.db.query("podcast_subscriptions")
            .withIndex("by_user_channel", q => q.eq("userId", userId).eq("channelId", existingChannel!._id))
            .first();

        if (existingSub) {
            // Unsubscribe
            await ctx.db.delete(existingSub._id);
            return { success: true, isSubscribed: false };
        } else {
            // Subscribe
            await ctx.db.insert("podcast_subscriptions", {
                userId: userId,
                channelId: existingChannel._id,
                createdAt: Date.now(),
            });
            return { success: true, isSubscribed: true };
        }
    }
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
        let channelId;
        if (channelInfo.feedUrl) {
            const existingChannel = await ctx.db.query("podcast_channels")
                .withIndex("by_feedUrl", q => q.eq("feedUrl", channelInfo.feedUrl!))
                .first();

            if (existingChannel) {
                channelId = existingChannel._id;
            } else {
                channelId = await ctx.db.insert("podcast_channels", {
                    title: channelInfo.title,
                    author: channelInfo.author || "Unknown",
                    feedUrl: channelInfo.feedUrl,
                    artworkUrl: channelInfo.artworkUrl,
                    itunesId: channelInfo.itunesId,
                    isFeatured: false,
                    createdAt: Date.now(),
                });
            }
        } else {
            // Fallback: Try to find by title if no feedUrl
            const existingChannel = await ctx.db.query("podcast_channels")
                .filter(q => q.eq(q.field("title"), channelInfo.title))
                .first();
            if (existingChannel) channelId = existingChannel._id;
        }

        if (!channelId) {
            // Create dummy channel if needed or just skip channel linkage strictly? 
            // For now, let's allow episode without strict channel check if we can't find it easily?
            // Actually, listening_history stores channelName string.
            // But podcast_episodes needs channelId.
            // Let's create a placeholder channel if we really have to.
            channelId = await ctx.db.insert("podcast_channels", {
                title: channelInfo.title,
                author: channelInfo.author || "Unknown",
                feedUrl: channelInfo.feedUrl || "",
                artworkUrl: channelInfo.artworkUrl,
                createdAt: Date.now(),
                isFeatured: false
            });
        }

        // 2. Find or Create Episode
        let episode = await ctx.db.query("podcast_episodes")
            .withIndex("by_channel", q => q.eq("channelId", channelId))
            .filter(q => q.eq(q.field("guid"), guid))
            .first();

        if (!episode) {
            // Try match by audioUrl just in case
            episode = await ctx.db.query("podcast_episodes")
                .filter(q => q.eq(q.field("audioUrl"), audioUrl))
                .first();
        }

        if (episode) {
            await ctx.db.patch(episode._id, {
                views: (episode.views || 0) + 1,
            });
            return { success: true, views: episode.views + 1 };
        } else {
            // Create new episode
            await ctx.db.insert("podcast_episodes", {
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
    }
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

        const existing = await ctx.db.query("listening_history")
            .withIndex("by_user_episode", q => q.eq("userId", userId).eq("episodeGuid", episodeGuid))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { progress, playedAt: Date.now() });
        }

        return { success: true };
    }
});
