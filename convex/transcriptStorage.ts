import { ConvexError } from 'convex/values';
import { Id } from './_generated/dataModel';
import { MutationCtx, QueryCtx } from './_generated/server';
import { TranscriptSegment } from './transcriptSchema';

const MAX_TRANSCRIPT_CHUNK_BYTES = 180_000;
const textEncoder = new TextEncoder();

type TranscriptWriteResult = {
  chunkCount: number;
  segmentCount: number;
};

function estimateJsonBytes(value: unknown): number {
  return textEncoder.encode(JSON.stringify(value)).length;
}

function splitTranscriptIntoChunks(
  transcriptData: TranscriptSegment[]
): Array<{ chunkIndex: number; segments: TranscriptSegment[]; approxBytes: number }> {
  const chunks: Array<{ chunkIndex: number; segments: TranscriptSegment[]; approxBytes: number }> =
    [];

  let current: TranscriptSegment[] = [];
  let currentBytes = 2; // "[]"

  for (const segment of transcriptData) {
    const segmentBytes = estimateJsonBytes(segment);
    if (segmentBytes > MAX_TRANSCRIPT_CHUNK_BYTES) {
      throw new ConvexError({
        code: 'TRANSCRIPT_SEGMENT_TOO_LARGE',
        message: 'Single transcript segment exceeds safe chunk size',
      });
    }

    const projectedBytes = current.length === 0 ? currentBytes + segmentBytes : currentBytes + 1 + segmentBytes; // +1 for comma
    if (projectedBytes > MAX_TRANSCRIPT_CHUNK_BYTES && current.length > 0) {
      chunks.push({
        chunkIndex: chunks.length,
        segments: current,
        approxBytes: currentBytes,
      });
      current = [segment];
      currentBytes = 2 + segmentBytes;
      continue;
    }

    current.push(segment);
    currentBytes = projectedBytes;
  }

  if (current.length > 0) {
    chunks.push({
      chunkIndex: chunks.length,
      segments: current,
      approxBytes: currentBytes,
    });
  }

  return chunks;
}

export async function replaceTextbookUnitTranscriptChunks(
  ctx: MutationCtx,
  unitId: Id<'textbook_units'>,
  transcriptData: TranscriptSegment[] | null
): Promise<TranscriptWriteResult> {
  const existingChunks = await ctx.db
    .query('textbook_unit_transcript_chunks')
    .withIndex('by_unit', q => q.eq('unitId', unitId))
    .collect();

  await Promise.all(existingChunks.map(chunk => ctx.db.delete(chunk._id)));

  if (!transcriptData || transcriptData.length === 0) {
    return { chunkCount: 0, segmentCount: 0 };
  }

  const chunks = splitTranscriptIntoChunks(transcriptData);
  const now = Date.now();

  for (const chunk of chunks) {
    await ctx.db.insert('textbook_unit_transcript_chunks', {
      unitId,
      chunkIndex: chunk.chunkIndex,
      segments: chunk.segments,
      segmentCount: chunk.segments.length,
      approxBytes: chunk.approxBytes,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    chunkCount: chunks.length,
    segmentCount: transcriptData.length,
  };
}

export async function loadTextbookUnitTranscript(
  ctx: QueryCtx,
  unit: {
    _id: Id<'textbook_units'>;
    transcriptData?: TranscriptSegment[];
    transcriptStorage?: 'inline' | 'chunked';
    transcriptChunkCount?: number;
  }
): Promise<TranscriptSegment[]> {
  const shouldReadChunks =
    unit.transcriptStorage === 'chunked' || (unit.transcriptChunkCount ?? 0) > 0;

  if (!shouldReadChunks) {
    return Array.isArray(unit.transcriptData) ? unit.transcriptData : [];
  }

  const chunks = await ctx.db
    .query('textbook_unit_transcript_chunks')
    .withIndex('by_unit', q => q.eq('unitId', unit._id))
    .collect();

  if (chunks.length === 0) {
    return Array.isArray(unit.transcriptData) ? unit.transcriptData : [];
  }

  return chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .flatMap(chunk => chunk.segments);
}

export async function replaceVideoTranscriptChunks(
  ctx: MutationCtx,
  videoId: Id<'videos'>,
  transcriptData: TranscriptSegment[] | null
): Promise<TranscriptWriteResult> {
  const existingChunks = await ctx.db
    .query('video_transcript_chunks')
    .withIndex('by_video', q => q.eq('videoId', videoId))
    .collect();

  await Promise.all(existingChunks.map(chunk => ctx.db.delete(chunk._id)));

  if (!transcriptData || transcriptData.length === 0) {
    return { chunkCount: 0, segmentCount: 0 };
  }

  const chunks = splitTranscriptIntoChunks(transcriptData);
  const now = Date.now();

  for (const chunk of chunks) {
    await ctx.db.insert('video_transcript_chunks', {
      videoId,
      chunkIndex: chunk.chunkIndex,
      segments: chunk.segments,
      segmentCount: chunk.segments.length,
      approxBytes: chunk.approxBytes,
      createdAt: now,
      updatedAt: now,
    });
  }

  return {
    chunkCount: chunks.length,
    segmentCount: transcriptData.length,
  };
}

export async function loadVideoTranscript(
  ctx: QueryCtx,
  video: {
    _id: Id<'videos'>;
    transcriptData?: TranscriptSegment[];
    transcriptStorage?: 'inline' | 'chunked';
    transcriptChunkCount?: number;
  }
): Promise<TranscriptSegment[]> {
  const shouldReadChunks =
    video.transcriptStorage === 'chunked' || (video.transcriptChunkCount ?? 0) > 0;

  if (!shouldReadChunks) {
    return Array.isArray(video.transcriptData) ? video.transcriptData : [];
  }

  const chunks = await ctx.db
    .query('video_transcript_chunks')
    .withIndex('by_video', q => q.eq('videoId', video._id))
    .collect();

  if (chunks.length === 0) {
    return Array.isArray(video.transcriptData) ? video.transcriptData : [];
  }

  return chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .flatMap(chunk => chunk.segments);
}

export async function deleteVideoTranscriptChunks(
  ctx: MutationCtx,
  videoId: Id<'videos'>
): Promise<void> {
  const chunks = await ctx.db
    .query('video_transcript_chunks')
    .withIndex('by_video', q => q.eq('videoId', videoId))
    .collect();

  await Promise.all(chunks.map(chunk => ctx.db.delete(chunk._id)));
}
