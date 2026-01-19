import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId, getAuthUserId } from './utils';

// Get annotations for a specific context (courseId_unitId)
export const getByContext = query({
  args: {
    contextKey: v.string(), // Format: "courseId_unitId"
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const { contextKey } = args;

    // OPTIMIZATION: Limit annotations per context to prevent excessive queries
    const MAX_ANNOTATIONS_PER_CONTEXT = 500;
    const annotations = await ctx.db
      .query('annotations')
      .withIndex('by_user_context', q => q.eq('userId', userId).eq('contextKey', contextKey))
      .take(MAX_ANNOTATIONS_PER_CONTEXT);

    return annotations.map(a => ({
      id: a._id,
      text: a.text,
      note: a.note,
      color: a.color,
      startOffset: a.startOffset,
      endOffset: a.endOffset,
      createdAt: a.createdAt,
    }));
  },
});

// Save a new annotation
export const save = mutation({
  args: {
    contextKey: v.string(),
    text: v.string(),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    startOffset: v.optional(v.number()),
    endOffset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { contextKey, text, note, color, startOffset, endOffset } = args;

    const annotationId = await ctx.db.insert('annotations', {
      userId,
      contextKey,
      targetType: 'TEXTBOOK',
      text,
      note,
      color,
      startOffset,
      endOffset,
      createdAt: Date.now(),
    });

    return { id: annotationId, success: true };
  },
});

// Delete an annotation
export const remove = mutation({
  args: {
    annotationId: v.id('annotations'),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.annotationId);
    return { success: true };
  },
});

// Update an annotation
export const update = mutation({
  args: {
    annotationId: v.id('annotations'),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { annotationId, note, color } = args;

    const updates: { note?: string; color?: string } = {};
    if (note !== undefined) updates.note = note;
    if (color !== undefined) updates.color = color;

    await ctx.db.patch(annotationId, updates);
    return { success: true };
  },
});
