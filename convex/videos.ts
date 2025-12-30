import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    args: {
        level: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        let videos;
        if (args.level) {
            videos = await ctx.db
                .query("videos")
                .withIndex("by_level", (q) => q.eq("level", args.level!))
                .collect();
        } else {
            videos = await ctx.db.query("videos").collect();
        }

        // Sort by newest first
        return videos.sort((a, b) => b.createdAt - a.createdAt).map(v => ({
            ...v,
            id: v._id,
        }));
    },
});

export const get = query({
    args: { id: v.id("videos") },
    handler: async (ctx, args) => {
        const video = await ctx.db.get(args.id);
        if (!video) return null;
        return {
            ...video,
            id: video._id,
        };
    },
});
