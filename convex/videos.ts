import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const list = query({
  args: {
    level: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let videos;
    if (args.level) {
      videos = await ctx.db
        .query('videos')
        .withIndex('by_level', q => q.eq('level', args.level!))
        .collect();
    } else {
      videos = await ctx.db.query('videos').collect();
    }

    // Sort by newest first, return metadata only (exclude transcriptData)
    return videos
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(v => ({
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
  args: { id: v.id('videos') },
  handler: async (ctx, args) => {
    const video = await ctx.db.get(args.id);
    if (!video) return null;
    return {
      ...video,
      id: video._id,
    };
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    level: v.string(),
    duration: v.optional(v.number()),
    transcriptData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const id = await ctx.db.insert('videos', {
      title: args.title,
      description: args.description,
      videoUrl: args.videoUrl ?? '',
      thumbnailUrl: args.thumbnailUrl,
      level: args.level,
      duration: args.duration,
      transcriptData: args.transcriptData,
      views: 0,
      createdAt: now,
    });
    return { id };
  },
});

export const update = mutation({
  args: {
    id: v.id('videos'),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    level: v.optional(v.string()),
    duration: v.optional(v.number()),
    transcriptData: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { id, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new Error('Video not found');
    await ctx.db.patch(id, rest);
    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id('videos') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return { id: args.id };
  },
});
