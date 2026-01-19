import { mutation, query } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { MAX_USER_SEARCH_SCAN, MAX_INSTITUTES_FALLBACK } from './queryLimits';
import { requireAdmin } from './utils';

// Get all users with real database pagination
export const getUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const results = await ctx.db.query('users').order('desc').paginate(args.paginationOpts);

    return {
      ...results,
      page: results.page.map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        tier: u.tier,
        avatar: u.avatar,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        subscriptionType: u.subscriptionType,
        subscriptionExpiry: u.subscriptionExpiry,
      })),
    };
  },
});

// Search users (separate query for search functionality)
export const searchUsers = query({
  args: {
    search: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 20;
    const searchLower = args.search.toLowerCase();

    // OPTIMIZATION: Limit collection to prevent full table scan
    // Collect with a reasonable maximum to prevent query explosion
    const allUsers = await ctx.db
      .query('users')
      .order('desc') // Get most recent users first
      .take(MAX_USER_SEARCH_SCAN);

    const filtered = allUsers
      .filter(
        u =>
          (u.email || '').toLowerCase().includes(searchLower) ||
          (u.name || '').toLowerCase().includes(searchLower)
      )
      .slice(0, limit)
      .map(u => ({
        id: u._id,
        email: u.email,
        name: u.name,
        role: u.role,
        tier: u.tier,
        avatar: u.avatar,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        subscriptionType: u.subscriptionType,
        subscriptionExpiry: u.subscriptionExpiry,
      }));

    return filtered;
  },
});

// Update user
export const updateUser = mutation({
  args: {
    userId: v.id('users'),
    updates: v.object({
      name: v.optional(v.string()),
      role: v.optional(v.string()),
      tier: v.optional(v.string()),
      isVerified: v.optional(v.boolean()),
      subscriptionType: v.optional(v.string()), // "MONTHLY", "ANNUAL", "LIFETIME"
      subscriptionExpiry: v.optional(v.string()), // ISO Date string
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { userId, updates } = args;

    await ctx.db.patch(userId, updates);

    return { success: true };
  },
});

// Delete user
export const deleteUser = mutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.userId);
    return { success: true };
  },
});

// Get institutes with real database pagination - excludes archived
export const getInstitutes = query({
  args: {
    paginationOpts: v.optional(paginationOptsValidator),
  },
  handler: async (ctx, args) => {
    // If pagination is provided, use it
    if (args.paginationOpts) {
      const results = await ctx.db.query('institutes').paginate(args.paginationOpts);

      return {
        ...results,
        // Filter out archived items (but include undefined/null isArchived)
        page: results.page
          .filter(i => i.isArchived !== true)
          .map(i => ({
            ...i,
            _id: undefined,
            id: i.id || i._id,
          })),
      };
    }

    // OPTIMIZATION: Always use pagination, even for backwards compatibility
    // This prevents full table scans
    const results = await ctx.db
      .query('institutes')
      .paginate({ numItems: MAX_INSTITUTES_FALLBACK, cursor: null });

    // Return just the page array for backwards compatibility
    // Filter out archived items (but include undefined/null isArchived)
    return results.page
      .filter(i => i.isArchived !== true)
      .map(i => ({
        ...i,
        _id: undefined,
        id: i.id || i._id,
      }));
  },
});

// Create institute
export const createInstitute = mutation({
  args: {
    id: v.string(),
    name: v.string(),
    nameZh: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    nameVi: v.optional(v.string()),
    nameMn: v.optional(v.string()),
    levels: v.any(), // Array of level objects
    coverUrl: v.optional(v.string()),
    themeColor: v.optional(v.string()),
    publisher: v.optional(v.string()),
    displayLevel: v.optional(v.string()),
    totalUnits: v.optional(v.number()),
    volume: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existing = await ctx.db
      .query('institutes')
      .withIndex('by_name', q => q.eq('name', args.name))
      .first();
    if (existing && existing.isArchived !== true) {
      throw new ConvexError({ code: 'INSTITUTE_NAME_EXISTS' });
    }
    const instituteId = await ctx.db.insert('institutes', args);
    return { id: instituteId, success: true };
  },
});

// Update institute
export const updateInstitute = mutation({
  args: {
    legacyId: v.string(),
    updates: v.object({
      name: v.optional(v.string()),
      nameZh: v.optional(v.string()),
      nameEn: v.optional(v.string()),
      nameVi: v.optional(v.string()),
      nameMn: v.optional(v.string()),
      levels: v.optional(v.string()),
      coverUrl: v.optional(v.string()),
      themeColor: v.optional(v.string()),
      publisher: v.optional(v.string()),
      displayLevel: v.optional(v.string()),
      totalUnits: v.optional(v.number()),
      volume: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { legacyId, updates } = args;

    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', legacyId))
      .first();

    if (!institute) {
      throw new ConvexError({ code: 'INSTITUTE_NOT_FOUND' });
    }

    if (updates.name && updates.name !== institute.name) {
      const existing = await ctx.db
        .query('institutes')
        .withIndex('by_name', q => q.eq('name', updates.name as string))
        .first();
      if (existing && existing._id !== institute._id && existing.isArchived !== true) {
        throw new ConvexError({ code: 'INSTITUTE_NAME_EXISTS' });
      }
    }

    // @ts-expect-error: Fix build error
    await ctx.db.patch(institute._id, updates);
    return { success: true };
  },
});

// Delete institute (soft delete)
export const deleteInstitute = mutation({
  args: {
    legacyId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const institute = await ctx.db
      .query('institutes')
      .withIndex('by_legacy_id', q => q.eq('id', args.legacyId))
      .first();

    if (institute) {
      // Soft delete - set isArchived to true
      await ctx.db.patch(institute._id, { isArchived: true });
    }

    return { success: true };
  },
});

// Get overview stats for admin dashboard
export const getOverviewStats = query({
  args: {},
  handler: async ctx => {
    // Count users
    const users = await ctx.db.query('users').collect();
    const userCount = users.length;

    // Count institutes (not archived)
    const institutes = await ctx.db
      .query('institutes')
      .withIndex('by_archived', q => q.eq('isArchived', false))
      .collect();
    const instituteCount = institutes.length;

    // Count vocabulary words (master dictionary)
    const vocabWords = await ctx.db.query('words').take(10000);
    const vocabCount = vocabWords.length >= 10000 ? '10000+' : vocabWords.length;

    // Count grammar points
    const grammarPoints = await ctx.db.query('grammar_points').take(1000);
    const grammarCount = grammarPoints.length;

    // Count textbook units
    const units = await ctx.db
      .query('textbook_units')
      .withIndex('by_archived', q => q.eq('isArchived', false))
      .take(1000);
    const unitCount = units.length;

    // Count TOPIK exams
    const exams = await ctx.db.query('topik_exams').collect();
    const examCount = exams.length;

    return {
      users: userCount,
      institutes: instituteCount,
      vocabulary: vocabCount,
      grammar: grammarCount,
      units: unitCount,
      exams: examCount,
    };
  },
});

// Get AI usage stats (placeholder - can be enhanced with actual AI logging)
export const getAiUsageStats = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, args) => {
    // This is a placeholder implementation
    // In a real implementation, you would have an ai_usage_logs table
    return {
      period: `${args.days} days`,
      summary: {
        totalCalls: 0,
        totalTokens: 0,
        totalCost: 0,
      },
      byFeature: {},
      daily: [],
    };
  },
});

// Get recent activity for admin dashboard
export const getRecentActivity = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get recent activity logs
    const activityLogs = await ctx.db.query('activity_logs').order('desc').take(args.limit);

    // Summarize by activity type
    const summary: Record<string, number> = {};
    for (const log of activityLogs) {
      const type = log.activityType || 'unknown';
      summary[type] = (summary[type] || 0) + 1;
    }

    return {
      recent: activityLogs,
      summary,
    };
  },
});
