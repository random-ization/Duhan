import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

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
