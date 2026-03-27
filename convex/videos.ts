import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId, requireAdmin } from './utils';
import {
  evaluateVideoAccess,
  resolveEntitlementPlan,
  resolveVideoAccessLevel,
} from './entitlements';
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

function mapVideoListItem(video: {
  _id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  level: string;
  duration?: number;
  views: number;
  youtubeId?: string;
  createdAt: number;
  accessLevel?: string;
}) {
  return {
    id: video._id,
    _id: video._id,
    title: video.title,
    description: video.description,
    thumbnailUrl: video.thumbnailUrl,
    level: video.level,
    duration: video.duration,
    views: video.views,
    youtubeId: video.youtubeId,
    createdAt: video.createdAt,
    accessLevel: resolveVideoAccessLevel(video),
  };
}

function mapAdminVideoListItem(video: {
  _id: string;
  title: string;
  description?: string;
  videoUrl: string;
  thumbnailUrl?: string;
  level: string;
  duration?: number;
  views: number;
  youtubeId?: string;
  createdAt: number;
  accessLevel?: string;
}) {
  return {
    ...mapVideoListItem(video),
    videoUrl: video.videoUrl,
  };
}

export const list = query({
  args: {
    level: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const level = args.level;
    let videos;
    if (level) {
      videos = await ctx.db
        .query('videos')
        .withIndex('by_level', q => q.eq('level', level))
        .collect();
    } else {
      videos = await ctx.db.query('videos').collect();
    }

    // Sort by newest first, return metadata only (exclude transcriptData)
    return videos
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(mapVideoListItem);
  },
});

export const listAdmin = query({
  args: {
    level: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const level = args.level;
    let videos;
    if (level) {
      videos = await ctx.db
        .query('videos')
        .withIndex('by_level', q => q.eq('level', level))
        .collect();
    } else {
      videos = await ctx.db.query('videos').collect();
    }

    return videos
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(mapAdminVideoListItem);
  },
});

export const get = query({
  args: { id: v.id('videos') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const video = await ctx.db.get(args.id);
    if (!video) return null;

    const user = await ctx.db.get(userId);
    const plan = resolveEntitlementPlan(user);
    const access = evaluateVideoAccess(plan, video);
    if (!access.allowed) {
      throw new ConvexError({
        code: 'SUBSCRIPTION_REQUIRED',
        reason: access.reason,
        upgradeSource: access.upgradeSource,
      });
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
    accessLevel: v.optional(v.string()),
    duration: v.optional(v.number()),
    transcriptData: v.optional(transcriptInputValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const normalizedAccessLevel =
      (args.accessLevel || '').trim().toUpperCase() === 'FREE'
        ? 'FREE'
        : (args.accessLevel || '').trim().toUpperCase() === 'PRO'
          ? 'PRO'
          : isPremiumVideoLevel(args.level)
            ? 'PRO'
            : 'FREE';
    const id = await ctx.db.insert('videos', {
      title: args.title,
      description: args.description,
      videoUrl: args.videoUrl ?? '',
      thumbnailUrl: args.thumbnailUrl,
      level: args.level,
      accessLevel: normalizedAccessLevel,
      duration: args.duration,
      transcriptData: [],
      transcriptStorage: 'inline',
      transcriptChunkCount: 0,
      transcriptSegmentCount: 0,
      views: 0,
      createdAt: now,
    });

    if (args.transcriptData !== undefined) {
      const transcriptWrite = await replaceVideoTranscriptChunks(
        ctx,
        id,
        args.transcriptData ?? null
      );
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
    accessLevel: v.optional(v.string()),
    duration: v.optional(v.number()),
    transcriptData: v.optional(transcriptInputValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, transcriptData, ...rest } = args;
    const existing = await ctx.db.get(id);
    if (!existing) throw new ConvexError({ code: 'VIDEO_NOT_FOUND' });
    const normalizedAccessLevel =
      args.accessLevel === undefined
        ? existing.accessLevel
        : (args.accessLevel || '').trim().toUpperCase() === 'FREE'
          ? 'FREE'
          : 'PRO';

    if (transcriptData === undefined) {
      await ctx.db.patch(id, { ...rest, accessLevel: normalizedAccessLevel });
      return { id };
    }

    const transcriptWrite = await replaceVideoTranscriptChunks(ctx, id, transcriptData ?? null);
    await ctx.db.patch(id, {
      ...rest,
      accessLevel: normalizedAccessLevel,
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
