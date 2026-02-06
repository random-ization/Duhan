'use node';

import { action } from '../_generated/server';
import { v } from 'convex/values';
import { internal } from '../_generated/api';
import { createPresignedUploadUrl } from '../storagePresign';

const TableNameValidator = v.union(
  v.literal('textbook_units'),
  v.literal('topik_exams'),
  v.literal('words')
);

type TableName = 'textbook_units' | 'topik_exams' | 'words';

const MAX_BATCH = 50;

const isHttpUrl = (value: string) => value.startsWith('http://') || value.startsWith('https://');

const isConvexStorageUrl = (value: string) => {
  const lower = value.toLowerCase();
  return (
    (lower.includes('convex.cloud') || lower.includes('convex.site')) &&
    lower.includes('/api/storage/')
  );
};

const isSpacesUrl = (value: string) => {
  const lower = value.toLowerCase();
  if (lower.includes('digitaloceanspaces.com')) return true;
  const cdn = process.env.SPACES_CDN_URL;
  if (cdn && value.startsWith(cdn)) return true;

  const endpoint = process.env.SPACES_ENDPOINT;
  const bucket = process.env.SPACES_BUCKET;
  if (endpoint && bucket) {
    try {
      const host = new URL(endpoint).host;
      return value.includes(`${bucket}.${host}`);
    } catch {
      return false;
    }
  }
  return false;
};

const inferExtension = (contentType: string | null) => {
  if (!contentType) return 'mp3';
  if (contentType.includes('mpeg')) return 'mp3';
  if (contentType.includes('mp4')) return 'm4a';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  if (contentType.includes('webm')) return 'webm';
  return 'mp3';
};

const sanitizeFilename = (value: string) =>
  value
    .replaceAll(/\s+/g, '-')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 120);

const buildFilename = (sourceUrl: string, contentType: string | null, fallback: string) => {
  try {
    const base = decodeURIComponent(new URL(sourceUrl).pathname.split('/').pop() || '');
    const cleaned = sanitizeFilename(base);
    if (cleaned && cleaned.includes('.')) return cleaned;
  } catch {
    // Ignore URL parse errors.
  }

  const ext = inferExtension(contentType);
  return sanitizeFilename(`${fallback}.${ext}`);
};

type BatchResult = {
  items: Array<{ id: string; audioUrl?: string | null }>;
  isDone: boolean;
  nextCursor: string | null;
};

type MigrateResult = {
  table: TableName;
  processed: number;
  migrated: number;
  skipped: number;
  failed: number;
  dryRun: boolean;
  isDone: boolean;
  nextCursor: string | null;
  errors: string[];
};

export const migrateAudioToSpaces = action({
  args: {
    table: TableNameValidator,
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<MigrateResult> => {
    const limit = Math.min(args.limit ?? MAX_BATCH, MAX_BATCH);
    const dryRun = args.dryRun ?? false;

    const batch: BatchResult = await ctx.runQuery(
      internal.migrations.migrateAudioToSpacesQueries.listAudioRecords,
      {
        table: args.table,
        cursor: args.cursor,
        limit,
      }
    );

    const sourceCache = new Map<string, string>();
    const results: MigrateResult = {
      table: args.table as TableName,
      processed: 0,
      migrated: 0,
      skipped: 0,
      failed: 0,
      dryRun,
      isDone: batch.isDone,
      nextCursor: batch.nextCursor,
      errors: [] as string[],
    };

    for (const item of batch.items) {
      results.processed += 1;
      const raw = item.audioUrl?.trim();
      if (!raw) {
        results.skipped += 1;
        continue;
      }

      let sourceUrl = raw;
      if (!isHttpUrl(sourceUrl)) {
        const resolved = await ctx.runQuery(
          internal.migrations.migrateAudioToSpacesQueries.getStorageUrl,
          { storageId: sourceUrl }
        );
        if (!resolved) {
          results.skipped += 1;
          results.errors.push(`[${item.id}] storageId not found`);
          continue;
        }
        sourceUrl = resolved;
      }

      if (!isConvexStorageUrl(sourceUrl)) {
        results.skipped += 1;
        continue;
      }

      if (isSpacesUrl(sourceUrl)) {
        results.skipped += 1;
        continue;
      }

      try {
        let targetUrl = sourceCache.get(sourceUrl);
        if (!targetUrl) {
          const sourceRes = await fetch(sourceUrl);
          if (!sourceRes.ok) {
            results.failed += 1;
            results.errors.push(`[${item.id}] fetch failed: ${sourceRes.status}`);
            continue;
          }

          const contentType = sourceRes.headers.get('content-type') ?? 'audio/mpeg';
          const filename = buildFilename(sourceUrl, contentType, `${args.table}-${item.id}`);
          const key = `audio/${args.table}/${item.id}-${filename}`;
          const presigned = createPresignedUploadUrl({
            filename,
            contentType,
            folder: 'audio',
            key,
          });

          const buffer = await sourceRes.arrayBuffer();
          const uploadRes = await fetch(presigned.uploadUrl, {
            method: 'PUT',
            headers: presigned.headers,
            body: buffer,
          });

          if (!uploadRes.ok) {
            results.failed += 1;
            results.errors.push(`[${item.id}] upload failed: ${uploadRes.status}`);
            continue;
          }

          targetUrl = presigned.publicUrl;
          sourceCache.set(sourceUrl, targetUrl);
        }

        if (!dryRun) {
          await ctx.runMutation(internal.migrations.migrateAudioToSpacesQueries.updateAudioUrl, {
            table: args.table,
            id: item.id,
            audioUrl: targetUrl,
          });
        }

        results.migrated += 1;
      } catch (err) {
        results.failed += 1;
        results.errors.push(`[${item.id}] ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    return results;
  },
});
