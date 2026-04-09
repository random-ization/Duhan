import { action, internalMutation, internalQuery, QueryCtx } from './_generated/server';
import { paginationOptsValidator, makeFunctionReference } from 'convex/server';
import { v } from 'convex/values';
import { normalizeStoragePublicUrl } from './spacesConfig';

const TABLES = [
  'institutes',
  'publishers',
  'textbook_units',
  'words',
  'podcast_channels',
  'podcast_episodes',
  'listening_history',
  'topik_exams',
  'topik_questions',
  'videos',
  'reading_books',
  'reading_book_pages',
  'reading_book_sentences',
  'tts_cache',
] as const;

type LegacyAssetTable = (typeof TABLES)[number];

const legacyAssetTableValidator = v.union(
  v.literal('institutes'),
  v.literal('publishers'),
  v.literal('textbook_units'),
  v.literal('words'),
  v.literal('podcast_channels'),
  v.literal('podcast_episodes'),
  v.literal('listening_history'),
  v.literal('topik_exams'),
  v.literal('topik_questions'),
  v.literal('videos'),
  v.literal('reading_books'),
  v.literal('reading_book_pages'),
  v.literal('reading_book_sentences'),
  v.literal('tts_cache')
);

type LegacyPatch = Record<string, unknown>;

const listLegacyAssetDocsQuery = makeFunctionReference<
  'query',
  {
    table: LegacyAssetTable;
    paginationOpts: { numItems: number; cursor: string | null };
  },
  {
    items: Array<{ id: string; patch: LegacyPatch }>;
    continueCursor: string;
    isDone: boolean;
  }
>('assetUrlMigration:listLegacyAssetDocs');

const applyLegacyAssetPatchesMutation = makeFunctionReference<
  'mutation',
  {
    table: LegacyAssetTable;
    items: Array<{ id: string; patch: LegacyPatch }>;
  },
  { updated: number }
>('assetUrlMigration:applyLegacyAssetPatches');

function normalizeValue(value: unknown): unknown {
  if (typeof value === 'string') {
    return normalizeStoragePublicUrl(value) || value;
  }
  if (Array.isArray(value)) {
    return value.map(item =>
      typeof item === 'string' ? normalizeStoragePublicUrl(item) || item : item
    );
  }
  return value;
}

function buildPatchForDoc(
  table: LegacyAssetTable,
  doc: Record<string, unknown>
): LegacyPatch | null {
  const fieldsByTable: Record<LegacyAssetTable, string[]> = {
    institutes: ['coverUrl'],
    publishers: ['imageUrl'],
    textbook_units: ['audioUrl'],
    words: ['audioUrl'],
    podcast_channels: ['artworkUrl'],
    podcast_episodes: ['audioUrl'],
    listening_history: ['episodeUrl', 'channelImage'],
    topik_exams: ['audioUrl'],
    topik_questions: ['image', 'optionImages'],
    videos: ['videoUrl', 'thumbnailUrl'],
    reading_books: ['coverImageUrl'],
    reading_book_pages: ['imageUrl'],
    reading_book_sentences: ['audioUrl'],
    tts_cache: ['url'],
  };

  const fields = fieldsByTable[table];
  const patch: LegacyPatch = {};

  for (const field of fields) {
    const currentValue = doc[field];
    const nextValue = normalizeValue(currentValue);
    if (JSON.stringify(nextValue) !== JSON.stringify(currentValue)) {
      patch[field] = nextValue;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

async function paginateTable(
  ctx: QueryCtx,
  table: LegacyAssetTable,
  paginationOpts: { numItems: number; cursor: string | null }
) {
  switch (table) {
    case 'institutes':
      return ctx.db.query('institutes').paginate(paginationOpts);
    case 'publishers':
      return ctx.db.query('publishers').paginate(paginationOpts);
    case 'textbook_units':
      return ctx.db.query('textbook_units').paginate(paginationOpts);
    case 'words':
      return ctx.db.query('words').paginate(paginationOpts);
    case 'podcast_channels':
      return ctx.db.query('podcast_channels').paginate(paginationOpts);
    case 'podcast_episodes':
      return ctx.db.query('podcast_episodes').paginate(paginationOpts);
    case 'listening_history':
      return ctx.db.query('listening_history').paginate(paginationOpts);
    case 'topik_exams':
      return ctx.db.query('topik_exams').paginate(paginationOpts);
    case 'topik_questions':
      return ctx.db.query('topik_questions').paginate(paginationOpts);
    case 'videos':
      return ctx.db.query('videos').paginate(paginationOpts);
    case 'reading_books':
      return ctx.db.query('reading_books').paginate(paginationOpts);
    case 'reading_book_pages':
      return ctx.db.query('reading_book_pages').paginate(paginationOpts);
    case 'reading_book_sentences':
      return ctx.db.query('reading_book_sentences').paginate(paginationOpts);
    case 'tts_cache':
      return ctx.db.query('tts_cache').paginate(paginationOpts);
  }
}

export const listLegacyAssetDocs = internalQuery({
  args: {
    table: legacyAssetTableValidator,
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const result = await paginateTable(ctx, args.table, args.paginationOpts);
    const items = result.page
      .map(doc => {
        const rawDoc = doc as unknown as Record<string, unknown>;
        const patch = buildPatchForDoc(args.table, rawDoc);
        if (!patch) return null;
        return {
          id: String(rawDoc._id),
          patch,
        };
      })
      .filter((item): item is { id: string; patch: LegacyPatch } => item !== null);

    return {
      items,
      continueCursor: result.continueCursor,
      isDone: result.isDone,
    };
  },
});

export const applyLegacyAssetPatches = internalMutation({
  args: {
    table: legacyAssetTableValidator,
    items: v.array(
      v.object({
        id: v.string(),
        patch: v.any(),
      })
    ),
  },
  handler: async (ctx, args) => {
    let updated = 0;

    for (const item of args.items) {
      const normalizedId = ctx.db.normalizeId(args.table, item.id);
      if (!normalizedId) continue;
      await ctx.db.patch(normalizedId, item.patch as Record<string, unknown>);
      updated += 1;
    }

    return { updated };
  },
});

export const rewriteLegacyPublicUrls = action({
  args: {
    tables: v.optional(v.array(legacyAssetTableValidator)),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const tables = args.tables?.length ? args.tables : [...TABLES];
    const batchSize = Math.max(10, Math.min(args.batchSize ?? 200, 500));
    const results: Array<{ table: LegacyAssetTable; updated: number }> = [];
    let totalUpdated = 0;

    for (const table of tables) {
      let cursor: string | null = null;
      let updatedForTable = 0;

      while (true) {
        const page: {
          items: Array<{ id: string; patch: LegacyPatch }>;
          continueCursor: string;
          isDone: boolean;
        } = await ctx.runQuery(listLegacyAssetDocsQuery, {
          table,
          paginationOpts: {
            numItems: batchSize,
            cursor,
          },
        });

        if (page.items.length > 0) {
          const applied = await ctx.runMutation(applyLegacyAssetPatchesMutation, {
            table,
            items: page.items,
          });
          updatedForTable += applied.updated;
          totalUpdated += applied.updated;
        }

        if (page.isDone) break;
        cursor = page.continueCursor;
      }

      results.push({ table, updated: updatedForTable });
    }

    return {
      success: true,
      totalUpdated,
      results,
    };
  },
});
