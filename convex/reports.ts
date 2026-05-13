import { ConvexError, v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { getAuthUserId } from './utils';

const REPORT_TARGET_VALIDATOR = v.union(
  v.literal('question'),
  v.literal('answer'),
  v.literal('post'),
  v.literal('comment')
);

const REPORT_STATUS_VALIDATOR = v.union(
  v.literal('open'),
  v.literal('resolved'),
  v.literal('dismissed')
);

export const reportContent = mutation({
  args: {
    target: REPORT_TARGET_VALIDATOR,
    targetId: v.string(),
    reason: v.string(),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reporterId = await getAuthUserId(ctx);
    const reason = args.reason.trim();
    if (!reason) {
      throw new ConvexError({ code: 'INVALID_ARGUMENT', message: 'Reason is required' });
    }

    await ctx.db.insert('content_reports', {
      reporterId,
      target: args.target,
      targetId: args.targetId,
      reason,
      details: args.details?.trim() || undefined,
      status: 'open',
      createdAt: Date.now(),
    });

    return { ok: true as const };
  },
});

export const listReports = query({
  args: {
    status: v.optional(REPORT_STATUS_VALIDATOR),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.max(1, Math.min(args.limit ?? 50, 200));
    const indexedRows = args.status
      ? await ctx.db
          .query('content_reports')
          .withIndex('by_status_createdAt', queryBuilder => queryBuilder.eq('status', args.status!))
          .order('desc')
          .take(limit)
      : await ctx.db.query('content_reports').collect();

    const rows = args.status
      ? indexedRows
      : [...indexedRows].sort((left, right) => right.createdAt - left.createdAt).slice(0, limit);

    return rows.map(row => ({
      _id: row._id,
      target: row.target,
      targetId: row.targetId,
      reason: row.reason,
      details: row.details,
      status: row.status,
      createdAt: row.createdAt,
    }));
  },
});
