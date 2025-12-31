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

        // Sort by newest first, return metadata only (exclude transcriptData)
        return videos.sort((a, b) => b.createdAt - a.createdAt).map(v => ({
            id: v._id,
            _id: v._id,
            title: v.title,
            description: v.description,
            videoUrl: v.videoUrl,
            thumbnailUrl: v.thumbnailUrl,
            level: v.level,
            duration: v.duration,
            views: v.views,
            youtubeId: v.youtubeId,
            createdAt: v.createdAt,
            // Exclude: transcriptData (large)
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
