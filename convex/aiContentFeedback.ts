/**
 * AI Content Feedback — user reports on AI-generated content quality.
 *
 * PRD section 20.2: "用户可以反馈解释问题"
 *
 * When AI generates an explanation, translation, or suggestion that is
 * inaccurate, users can submit feedback so we can track quality issues
 * and improve prompts over time.
 *
 * Feedback types:
 * - translation_wrong — 翻译不准
 * - grammar_wrong — 语法解释不对
 * - word_wrong — 单词识别不对
 * - missing_info — 缺少重要信息
 * - other — 其他问题
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

// ── Queries ──────────────────────────────────────────────────────

/**
 * Get feedback for a specific AI content target (admin use).
 */
export const getFeedbackForTarget = query({
  args: {
    targetType: v.string(),
    targetId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('ai_content_feedback')
      .withIndex('by_target', q =>
        q.eq('targetType', args.targetType).eq('targetId', args.targetId)
      )
      .take(50);
  },
});

/**
 * Get open feedback items for admin review dashboard.
 */
export const getOpenFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('ai_content_feedback')
      .withIndex('by_status', q => q.eq('status', 'open'))
      .take(args.limit ?? 50);
  },
});

/**
 * Get feedback stats across all types.
 */
export const getFeedbackStats = query({
  args: {},
  handler: async ctx => {
    const open = await ctx.db
      .query('ai_content_feedback')
      .withIndex('by_status', q => q.eq('status', 'open'))
      .take(1000);

    const resolved = await ctx.db
      .query('ai_content_feedback')
      .withIndex('by_status', q => q.eq('status', 'resolved'))
      .take(1000);

    const dismissed = await ctx.db
      .query('ai_content_feedback')
      .withIndex('by_status', q => q.eq('status', 'dismissed'))
      .take(1000);

    // Group open by feedbackType
    const byType: Record<string, number> = {};
    for (const f of open) {
      byType[f.feedbackType] = (byType[f.feedbackType] ?? 0) + 1;
    }

    return {
      open: open.length,
      resolved: resolved.length,
      dismissed: dismissed.length,
      openByType: byType,
    };
  },
});

/**
 * Get current user's submitted feedback.
 */
export const getMyFeedback = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query('ai_content_feedback')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(args.limit ?? 20);
  },
});

// ── Mutations ────────────────────────────────────────────────────

/**
 * Submit feedback on an AI-generated content item.
 * User-facing — called from "解释有问题？" button.
 */
export const submitFeedback = mutation({
  args: {
    targetType: v.string(), // "sentence_explanation" | "word_enrichment" | "grammar_explanation" | "writing_feedback"
    targetId: v.string(), // ID of the AI-generated content
    feedbackType: v.string(), // "translation_wrong" | "grammar_wrong" | "word_wrong" | "missing_info" | "other"
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    return await ctx.db.insert('ai_content_feedback', {
      userId,
      targetType: args.targetType,
      targetId: args.targetId,
      feedbackType: args.feedbackType,
      comment: args.comment,
      status: 'open',
      createdAt: Date.now(),
    });
  },
});

/**
 * Resolve or dismiss feedback (admin use).
 */
export const resolveFeedback = mutation({
  args: {
    feedbackId: v.id('ai_content_feedback'),
    status: v.union(v.literal('resolved'), v.literal('dismissed')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) return null;

    await ctx.db.patch(args.feedbackId, {
      status: args.status,
      resolvedBy: userId,
      resolvedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Batch resolve feedback items (admin use).
 */
export const batchResolveFeedback = mutation({
  args: {
    feedbackIds: v.array(v.id('ai_content_feedback')),
    status: v.union(v.literal('resolved'), v.literal('dismissed')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    let updated = 0;
    for (const feedbackId of args.feedbackIds) {
      const feedback = await ctx.db.get(feedbackId);
      if (!feedback) continue;

      await ctx.db.patch(feedbackId, {
        status: args.status,
        resolvedBy: userId,
        resolvedAt: now,
      });
      updated++;
    }

    return { updated };
  },
});
