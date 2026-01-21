import { internalMutation, internalQuery } from './_generated/server';
import { v } from 'convex/values';

export const getCache = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, args) => {
    const row = await ctx.db
      .query('tts_cache')
      .withIndex('by_key', q => q.eq('key', args.key))
      .first();
    if (!row) return null;
    return { url: row.url, updatedAt: row.updatedAt };
  },
});

export const upsertCache = internalMutation({
  args: { key: v.string(), url: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('tts_cache')
      .withIndex('by_key', q => q.eq('key', args.key))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { url: args.url, updatedAt: Date.now() });
    } else {
      await ctx.db.insert('tts_cache', {
        key: args.key,
        url: args.url,
        updatedAt: Date.now(),
      });
    }
    return { success: true };
  },
});
