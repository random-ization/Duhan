import { internalMutation, internalQuery } from './_generated/server';
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

export const logInvocation = internalMutation({
  args: {
    userId: v.id('users'),
    feature: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('ai_usage_logs', {
      userId: args.userId,
      feature: args.feature,
      model: 'invocation',
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const countRecentByUser = internalQuery({
  args: {
    userId: v.id('users'),
    windowMs: v.number(),
  },
  handler: async (ctx, args) => {
    const since = Date.now() - Math.max(1_000, args.windowMs);
    const recent = await ctx.db
      .query('ai_usage_logs')
      .withIndex('by_createdAt', q => q.gte('createdAt', since))
      .collect();
    const count = recent.filter(log => log.userId === args.userId).length;
    return { count };
  },
});
