import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId, requireAdmin } from './utils';
import { hasActiveSubscription } from './subscription';
import { transcriptInputValidator } from './transcriptSchema';
import {
  deleteVideoTranscriptChunks,
  loadVideoTranscript,
  replaceVideoTranscriptChunks,
} from './transcriptStorage';

const PREMIUM_LEVELS = new Set(['ADVANCED', 'C1', 'C2', 'TOPIK5', 'TOPIK6']);

function normalizeLevel(level: string | undefined): string {
  return (level || '')
    .trim()
    .toUpperCase()
    .replaceAll(' ', '')
    .replaceAll('_', '')
    .replaceAll('-', '');
}

function isPremiumVideoLevel(level: string | undefined): boolean {
  const normalized = normalizeLevel(level);
  if (!normalized) return false;
  if (PREMIUM_LEVELS.has(normalized)) return true;
  return (
    normalized.includes('ADVANCED') ||
    normalized.includes('TOPIK5') ||
    normalized.includes('TOPIK6')
  );
}

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
      .slice()
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
    const userId = await getAuthUserId(ctx);
    const video = await ctx.db.get(args.id);
    if (!video) return null;

    if (isPremiumVideoLevel(video.level)) {
      const user = await ctx.db.get(userId);
      if (!hasActiveSubscription(user)) {
        throw new ConvexError('SUBSCRIPTION_REQUIRED');
      }
    }

    const transcriptData = await loadVideoTranscript(ctx, video);

    return {
      ...video,
      transcriptData,
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
    transcriptData: v.optional(transcriptInputValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const id = await ctx.db.insert('videos', {
      title: args.title,
      description: args.description,
      videoUrl: args.videoUrl ?? '',
      thumbnailUrl: args.thumbnailUrl,
      level: args.level,
      duration: args.duration,
      transcriptData: [],
      transcriptStorage: 'inline',
      transcriptChunkCount: 0,
      transcriptSegmentCount: 0,
      views: 0,
      createdAt: now,
    });

    if (args.transcriptData !== undefined) {
      const transcriptWrite = await replaceVideoTranscriptChunks(ctx, id, args.transcriptData ?? null);
      await ctx.db.patch(id, {
        transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
        transcriptChunkCount: transcriptWrite.chunkCount,
        transcriptSegmentCount: transcriptWrite.segmentCount,
      });
    }

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
    transcriptData: v.optional(transcriptInputValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, transcriptData, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: 'VIDEO_NOT_FOUND' });

    if (transcriptData === undefined) {
      await ctx.db.patch(id, rest);
      return { id };
    }

    const transcriptWrite = await replaceVideoTranscriptChunks(ctx, id, transcriptData ?? null);
    await ctx.db.patch(id, {
      ...rest,
      transcriptData: [],
      transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
      transcriptChunkCount: transcriptWrite.chunkCount,
      transcriptSegmentCount: transcriptWrite.segmentCount,
    });

    return { id };
  },
});

export const remove = mutation({
  args: { id: v.id('videos') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await deleteVideoTranscriptChunks(ctx, args.id);
    await ctx.db.delete(args.id);
    return { id: args.id };
  },
});
