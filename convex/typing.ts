import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
import { paginationOptsValidator } from 'convex/server';
import { requireAdmin } from './utils';

// --- Queries ---

export const listTexts = query({
  args: {
    type: v.optional(v.string()), // "WORD" | "SENTENCE" | "ARTICLE"
    category: v.optional(v.string()),
    onlyPublic: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    let q;

    if (args.type) {
      q = ctx.db.query('typing_texts').withIndex('by_type', q => q.eq('type', args.type as string));
    } else if (args.category) {
      q = ctx.db
        .query('typing_texts')
        .withIndex('by_category', q => q.eq('category', args.category as string));
    } else {
      q = ctx.db.query('typing_texts').withIndex('by_createdAt');
    }

    // Filter by public status if requested
    if (args.onlyPublic && !args.type && !args.category) {
      // If no other specific index is used, we can potentially use by_public,
      // but we already chose by_createdAt above.
      // To use by_public more effectively we would need to restructure.
      // For now, let's just stick to the index chosen above and filter in memory if mixed,
      // or if it was the default path, we could have chosen by_public.
      // However, let's keep it simple and filter results page for safety, or use filter() if Query supports it (Convex Query supports .filter() but only for full table scans or after index).
      // Note: .filter() in Convex is powerful.
      q = q.filter(q => q.eq(q.field('isPublic'), true));
    }

    const results = await q.order('desc').paginate(args.paginationOpts);

    // In-memory filter for combinations that might be missed by simple .filter() or if complex
    if (args.onlyPublic) {
      return {
        ...results,
        page: results.page.filter(text => text.isPublic === true),
      };
    }

    return results;
  },
});

export const getText = query({
  args: { id: v.id('typing_texts') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const listCategories = query({
  args: {},
  handler: async ctx => {
    // Aggregate unique categories
    // Note: Convex doesn't have distinct(), so we fetch all and distinct in memory
    // (Assuming volume isn't massive yet, or use a separate categories table logic)
    const texts = await ctx.db.query('typing_texts').collect();
    const categories = new Set<string>();
    texts.forEach(t => {
      if (t.category) categories.add(t.category);
    });
    return Array.from(categories).sort((a, b) => a.localeCompare(b));
  },
});

// --- Mutations ---

export const createText = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    type: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.number()),
    isPublic: v.boolean(),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Basic permissions check
    await requireAdmin(ctx);

    const textId = await ctx.db.insert('typing_texts', {
      ...args,
      createdAt: Date.now(),
    });
    return textId;
  },
});

export const updateText = mutation({
  args: {
    id: v.id('typing_texts'),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    type: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    difficulty: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { id, ...updates } = args;
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

export const deleteText = mutation({
  args: { id: v.id('typing_texts') },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.id);
  },
});

// --- User Stats & Recording ---

export const saveRecord = mutation({
  args: {
    practiceMode: v.string(), // "sentence" | "word" | "article"
    categoryId: v.string(),
    wpm: v.number(),
    accuracy: v.number(),
    errorCount: v.number(),
    duration: v.number(),
    charactersTyped: v.number(),
    sentencesCompleted: v.number(),
    targetWpm: v.number(),
    isTargetAchieved: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('Unauthorized');

    const userRecord =
      (await ctx.db
        .query('users')
        .withIndex('by_token', q => q.eq('token', identity.tokenIdentifier))
        .first()) ||
      (await ctx.db
        .query('users')
        .filter(q => q.eq(q.field('email'), identity.email))
        .first());

    if (!userRecord) throw new Error('User not found');

    await ctx.db.insert('typing_records', {
      userId: userRecord._id,
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const getUserStats = query({
  args: {},
  handler: async ctx => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const userRecord =
      (await ctx.db
        .query('users')
        .withIndex('by_token', q => q.eq('token', identity.tokenIdentifier))
        .first()) ||
      (await ctx.db
        .query('users')
        .filter(q => q.eq(q.field('email'), identity.email))
        .first());

    if (!userRecord) return null;

    const records = await ctx.db
      .query('typing_records')
      .withIndex('by_user', q => q.eq('userId', userRecord._id))
      .order('desc')
      .take(100);

    if (records.length === 0) {
      return {
        totalTests: 0,
        averageWpm: 0,
        highestWpm: 0,
        totalTime: 0,
        recentWpm: [],
      };
    }

    const totalTests = await ctx.db
      .query('typing_records')
      .withIndex('by_user', q => q.eq('userId', userRecord._id))
      .collect()
      .then(res => res.length);

    const totalTime = records.reduce((acc, r) => acc + r.duration, 0);
    const highestWpm = Math.max(...records.map(r => r.wpm));
    const averageWpm = Math.round(records.reduce((acc, r) => acc + r.wpm, 0) / records.length);

    return {
      totalTests,
      averageWpm,
      highestWpm,
      totalTime,
      recentWpm: records.slice(0, 10).map(r => ({ wpm: r.wpm, date: r.createdAt })),
    };
  },
});
