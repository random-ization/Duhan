import { mutation, query } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { getOptionalAuthUserId, getAuthUserId } from './utils';

const prefixRangeEnd = (prefix: string) => `${prefix}\uffff`;

const MAX_ANNOTATIONS_PER_CONTEXT = 500;

const normalizeScopeContextKey = (scopeType?: string, scopeId?: string, fallback?: string) => {
  if (fallback && fallback.trim()) return fallback;
  if (scopeType && scopeId) return `${scopeType}:${scopeId}`;
  return 'legacy';
};

const isSameLegacyAnchor = (
  annotation: {
    text: string;
    startOffset?: number;
    endOffset?: number;
  },
  text: string,
  startOffset?: number,
  endOffset?: number
) => {
  if (
    typeof annotation.startOffset === 'number' &&
    typeof annotation.endOffset === 'number' &&
    typeof startOffset === 'number' &&
    typeof endOffset === 'number'
  ) {
    return annotation.startOffset === startOffset && annotation.endOffset === endOffset;
  }
  return annotation.text === text;
};

const mapAnnotationRow = (row: {
  _id: unknown;
  contextKey: string;
  text: string;
  note?: string;
  color?: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: number;
  updatedAt?: number;
  scopeType?: string;
  scopeId?: string;
  blockId?: string;
  quote?: string;
  contextBefore?: string;
  contextAfter?: string;
}) => ({
  id: row._id,
  contextKey: row.contextKey,
  text: row.text,
  note: row.note,
  color: row.color,
  startOffset: row.startOffset,
  endOffset: row.endOffset,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  scopeType: row.scopeType,
  scopeId: row.scopeId,
  blockId: row.blockId,
  quote: row.quote,
  contextBefore: row.contextBefore,
  contextAfter: row.contextAfter,
});

// Get annotations for a specific context (courseId_unitId)
export const getByContext = query({
  args: {
    contextKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const rows = await ctx.db
      .query('annotations')
      .withIndex('by_user_context', q => q.eq('userId', userId).eq('contextKey', args.contextKey))
      .take(MAX_ANNOTATIONS_PER_CONTEXT);

    return rows.map(mapAnnotationRow);
  },
});

export const getByPrefix = query({
  args: {
    prefix: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 2000, 4000));
    const rows = await ctx.db
      .query('annotations')
      .withIndex('by_user_context', q =>
        q
          .eq('userId', userId)
          .gte('contextKey', args.prefix)
          .lt('contextKey', prefixRangeEnd(args.prefix))
      )
      .take(limit);

    return rows.map(mapAnnotationRow);
  },
});

export const listByScope = query({
  args: {
    scopeType: v.string(),
    scopeId: v.string(),
    blockId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 2000, 4000));
    const rows = args.blockId
      ? await ctx.db
          .query('annotations')
          .withIndex('by_user_scope_block', q =>
            q
              .eq('userId', userId)
              .eq('scopeType', args.scopeType)
              .eq('scopeId', args.scopeId)
              .eq('blockId', args.blockId)
          )
          .take(limit)
      : await ctx.db
          .query('annotations')
          .withIndex('by_user_scope', q =>
            q.eq('userId', userId).eq('scopeType', args.scopeType).eq('scopeId', args.scopeId)
          )
          .take(limit);

    return rows
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt))
      .map(mapAnnotationRow);
  },
});

// Legacy save - now idempotent by anchor/text within same context
export const save = mutation({
  args: {
    contextKey: v.string(),
    text: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
    scopeType: v.optional(v.string()),
    scopeId: v.optional(v.string()),
    blockId: v.optional(v.string()),
    quote: v.optional(v.string()),
    contextBefore: v.optional(v.string()),
    contextAfter: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const resolvedColor = args.color === '__none__' ? '' : args.color;

    const candidates = await ctx.db
      .query('annotations')
      .withIndex('by_user_context', q => q.eq('userId', userId).eq('contextKey', args.contextKey))
      .take(MAX_ANNOTATIONS_PER_CONTEXT);

    const existing = candidates.find(row =>
      isSameLegacyAnchor(row, args.text, args.startOffset, args.endOffset)
    );

    if (existing) {
      await ctx.db.patch(existing._id, {
        text: args.text,
        note: args.note,
        color: resolvedColor,
        startOffset: args.startOffset,
        endOffset: args.endOffset,
        scopeType: args.scopeType,
        scopeId: args.scopeId,
        blockId: args.blockId,
        quote: args.quote,
        contextBefore: args.contextBefore,
        contextAfter: args.contextAfter,
        updatedAt: now,
      });
      return { id: existing._id, success: true, upserted: true };
    }

    const annotationId = await ctx.db.insert('annotations', {
      userId,
      contextKey: args.contextKey,
      targetType: 'TEXTBOOK',
      text: args.text,
      note: args.note,
      color: resolvedColor,
      startOffset: args.startOffset,
      endOffset: args.endOffset,
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      blockId: args.blockId,
      quote: args.quote,
      contextBefore: args.contextBefore,
      contextAfter: args.contextAfter,
      createdAt: now,
      updatedAt: now,
    });

    return { id: annotationId, success: true, upserted: false };
  },
});

export const upsertByAnchor = mutation({
  args: {
    scopeType: v.string(),
    scopeId: v.string(),
    blockId: v.string(),
    start: v.number(),
    end: v.number(),
    quote: v.string(),
    contextBefore: v.optional(v.string()),
    contextAfter: v.optional(v.string()),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    targetType: v.optional(v.string()),
    contextKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const resolvedColor = args.color === '__none__' ? '' : args.color;

    const rows = await ctx.db
      .query('annotations')
      .withIndex('by_user_scope_anchor', q =>
        q
          .eq('userId', userId)
          .eq('scopeType', args.scopeType)
          .eq('scopeId', args.scopeId)
          .eq('blockId', args.blockId)
          .eq('startOffset', args.start)
          .eq('endOffset', args.end)
      )
      .take(20);

    const existing = rows.find(row => row.quote === args.quote || row.text === args.quote) || rows[0];

    const basePatch = {
      contextKey: normalizeScopeContextKey(args.scopeType, args.scopeId, args.contextKey),
      targetType: args.targetType || 'TEXTBOOK',
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      blockId: args.blockId,
      text: args.quote,
      quote: args.quote,
      contextBefore: args.contextBefore,
      contextAfter: args.contextAfter,
      note: args.note,
      color: resolvedColor,
      startOffset: args.start,
      endOffset: args.end,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, basePatch);
      return { id: existing._id, success: true, upserted: true };
    }

    const id = await ctx.db.insert('annotations', {
      ...basePatch,
      userId,
      createdAt: now,
    });

    return { id, success: true, upserted: false };
  },
});

export const deleteById = mutation({
  args: {
    annotationId: v.id('annotations'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.annotationId);
    if (!row) return { success: false, error: 'Not found' };
    if (row.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
    await ctx.db.delete(args.annotationId);
    return { success: true };
  },
});

// Backward-compatible alias
export const remove = deleteById;

export const updateNote = mutation({
  args: {
    annotationId: v.id('annotations'),
    note: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.annotationId);
    if (!row) return { success: false, error: 'Not found' };
    if (row.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    await ctx.db.patch(args.annotationId, {
      note: args.note,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Update an annotation (legacy API)
export const update = mutation({
  args: {
    annotationId: v.id('annotations'),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.annotationId);
    if (!row) return { success: false, error: 'Not found' };
    if (row.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const updates: { note?: string; color?: string; updatedAt: number } = {
      updatedAt: Date.now(),
    };
    if (args.note !== undefined) updates.note = args.note;
    if (args.color !== undefined) updates.color = args.color;

    await ctx.db.patch(args.annotationId, updates);
    return { success: true };
  },
});
