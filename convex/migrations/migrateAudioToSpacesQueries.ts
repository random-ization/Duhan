import { internalMutation, internalQuery } from '../_generated/server';
import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';

const TableNameValidator = v.union(
  v.literal('textbook_units'),
  v.literal('topik_exams'),
  v.literal('words')
);

type TableName = 'textbook_units' | 'topik_exams' | 'words';

type AudioRecord = {
  id: string;
  audioUrl?: string | null;
};

const MAX_BATCH = 50;

export const listAudioRecords = internalQuery({
  args: {
    table: TableNameValidator,
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit ?? MAX_BATCH, MAX_BATCH);
    const results = await ctx.db
      .query(args.table)
      .paginate({ cursor: args.cursor ?? null, numItems: limit });

    const items: AudioRecord[] = results.page.map(doc => ({
      id: doc._id,
      audioUrl: (doc as { audioUrl?: string | null }).audioUrl ?? null,
    }));

    return {
      items,
      isDone: results.isDone,
      nextCursor: results.continueCursor ?? null,
    };
  },
});

export const updateAudioUrl = internalMutation({
  args: {
    table: TableNameValidator,
    id: v.string(),
    audioUrl: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id as Id<TableName>, { audioUrl: args.audioUrl });
    return { success: true };
  },
});

export const getStorageUrl = internalQuery({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const url = await ctx.storage.getUrl(args.storageId as Id<'_storage'>);
    return url ?? null;
  },
});
