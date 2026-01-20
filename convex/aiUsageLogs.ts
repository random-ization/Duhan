import { internalMutation } from './_generated/server';
import { v } from 'convex/values';

export const logUsage = internalMutation({
  args: {
    userId: v.optional(v.id('users')),
    feature: v.string(),
    model: v.string(),
    promptTokens: v.optional(v.number()),
    completionTokens: v.optional(v.number()),
    totalTokens: v.optional(v.number()),
    costUsd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('ai_usage_logs', {
      ...args,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});
