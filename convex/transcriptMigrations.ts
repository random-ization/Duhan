import { mutation } from './_generated/server';
import { v } from 'convex/values';
import { requireAdmin } from './utils';
import { replaceTextbookUnitTranscriptChunks, replaceVideoTranscriptChunks } from './transcriptStorage';

const MAX_BATCH_SIZE = 200;

function resolveBatchSize(limit: number | undefined): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) return 50;
  return Math.min(Math.max(Math.floor(limit), 1), MAX_BATCH_SIZE);
}

export const migrateTextbookUnitInlineTranscripts = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const batchSize = resolveBatchSize(args.limit);

    const units = await ctx.db.query('textbook_units').collect();
    const allCandidates = units.filter(
      unit =>
        unit.transcriptStorage !== 'chunked' &&
        Array.isArray(unit.transcriptData) &&
        unit.transcriptData.length > 0
    );
    const candidates = allCandidates.slice(0, batchSize);

    let migrated = 0;
    for (const unit of candidates) {
      const transcriptWrite = await replaceTextbookUnitTranscriptChunks(
        ctx,
        unit._id,
        unit.transcriptData ?? null
      );
      await ctx.db.patch(unit._id, {
        transcriptData: [],
        transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
        transcriptChunkCount: transcriptWrite.chunkCount,
        transcriptSegmentCount: transcriptWrite.segmentCount,
      });
      migrated += 1;
    }

    return {
      migrated,
      remainingEstimate: Math.max(allCandidates.length - migrated, 0),
      batchSize,
    };
  },
});

export const migrateVideoInlineTranscripts = mutation({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const batchSize = resolveBatchSize(args.limit);

    const videos = await ctx.db.query('videos').collect();
    const allCandidates = videos.filter(
      video =>
        video.transcriptStorage !== 'chunked' &&
        Array.isArray(video.transcriptData) &&
        video.transcriptData.length > 0
    );
    const candidates = allCandidates.slice(0, batchSize);

    let migrated = 0;
    for (const video of candidates) {
      const transcriptWrite = await replaceVideoTranscriptChunks(
        ctx,
        video._id,
        video.transcriptData ?? null
      );
      await ctx.db.patch(video._id, {
        transcriptData: [],
        transcriptStorage: transcriptWrite.chunkCount > 0 ? 'chunked' : 'inline',
        transcriptChunkCount: transcriptWrite.chunkCount,
        transcriptSegmentCount: transcriptWrite.segmentCount,
      });
      migrated += 1;
    }

    return {
      migrated,
      remainingEstimate: Math.max(allCandidates.length - migrated, 0),
      batchSize,
    };
  },
});
