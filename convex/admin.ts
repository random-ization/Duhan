import { mutation, query } from './_generated/server';
import { v, ConvexError } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { MAX_USER_SEARCH_SCAN, MAX_INSTITUTES_FALLBACK } from './queryLimits';
import { requireAdmin } from './utils';
import {
  buildExamScoreInfo,
  countCorrectAnswers,
  normalizeExamAttemptAnswers,
} from './examAttemptMetrics';

const SCAN_PAGE_SIZE = 500;
const ADMIN_OVERVIEW_USERS_LIMIT = 5000;
const ADMIN_OVERVIEW_GRAMMAR_LIMIT = 2000;
const ADMIN_OVERVIEW_UNITS_LIMIT = 2000;
const ADMIN_OVERVIEW_EXAMS_LIMIT = 2000;
const ADMIN_OVERVIEW_INSTITUTES_LIMIT = 500;
const ADMIN_BACKFILL_BATCH_LIMIT = 25;

const formatCappedCount = (count: number, limit: number): number | string =>
  count > limit ? `${limit}+` : count;

const toAdminUserListItem = (u: {
  _id: unknown;
  email?: string;
  name?: string;
  role?: string;
  tier?: string;
  avatar?: string;
  isVerified?: boolean;
  createdAt?: number;
  subscriptionType?: string;
  subscriptionExpiry?: string;
}) => ({
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
});

// Get all users with real database pagination
export const getUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const results = await ctx.db.query('users').order('desc').paginate(args.paginationOpts);

    return {
      ...results,
      page: results.page.map(toAdminUserListItem),
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
    await requireAdmin(ctx);
    const limit = args.limit || 20;
    const searchTerm = args.search.trim();
    const searchLower = searchTerm.toLowerCase();

    if (searchTerm.includes('@')) {
      const exactMatches = new Map<string, ReturnType<typeof toAdminUserListItem>>();
      const exactCandidates = [searchTerm];
      if (searchLower !== searchTerm) {
        exactCandidates.push(searchLower);
      }

      for (const email of exactCandidates) {
        const exactUser = await ctx.db
          .query('users')
          .withIndex('email', q => q.eq('email', email))
          .unique();
        if (exactUser) {
          exactMatches.set(exactUser._id.toString(), toAdminUserListItem(exactUser));
        }
      }

      if (exactMatches.size > 0) {
        return [...exactMatches.values()].slice(0, limit);
      }
    }

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
      .map(toAdminUserListItem);

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
    await requireAdmin(ctx);
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
    levels: v.array(v.union(v.number(), v.object({ level: v.number(), units: v.number() }))),
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
    await requireAdmin(ctx);
    const users = await ctx.db.query('users').take(ADMIN_OVERVIEW_USERS_LIMIT + 1);
    const userCount = formatCappedCount(users.length, ADMIN_OVERVIEW_USERS_LIMIT);

    const visibleInstitutes = await Promise.all([
      ctx.db
        .query('institutes')
        .withIndex('by_archived', q => q.eq('isArchived', false))
        .collect(),
      ctx.db
        .query('institutes')
        .withIndex('by_archived', q => q.eq('isArchived', undefined))
        .take(ADMIN_OVERVIEW_INSTITUTES_LIMIT + 1),
    ]);
    const instituteIds = new Set<string>();
    for (const batch of visibleInstitutes) {
      for (const institute of batch) {
        instituteIds.add(institute._id.toString());
      }
    }
    const instituteCount = formatCappedCount(instituteIds.size, ADMIN_OVERVIEW_INSTITUTES_LIMIT);

    // Count vocabulary words (master dictionary, capped)
    const vocabLimit = 10000;
    const vocabProbe = await ctx.db.query('words').take(vocabLimit + 1);
    const vocabCount = vocabProbe.length > vocabLimit ? `${vocabLimit}+` : vocabProbe.length;

    // Count grammar points
    const grammarPoints = await ctx.db
      .query('grammar_points')
      .take(ADMIN_OVERVIEW_GRAMMAR_LIMIT + 1);
    const grammarCount = formatCappedCount(grammarPoints.length, ADMIN_OVERVIEW_GRAMMAR_LIMIT);

    // Count textbook units
    const units = await ctx.db
      .query('textbook_units')
      .withIndex('by_archived', q => q.eq('isArchived', false))
      .take(ADMIN_OVERVIEW_UNITS_LIMIT + 1);
    const unitCount = formatCappedCount(units.length, ADMIN_OVERVIEW_UNITS_LIMIT);

    // Count TOPIK exams
    const exams = await ctx.db.query('topik_exams').take(ADMIN_OVERVIEW_EXAMS_LIMIT + 1);
    const examCount = formatCappedCount(exams.length, ADMIN_OVERVIEW_EXAMS_LIMIT);

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

// Get AI usage stats aggregated from ai_usage_logs
export const getAiUsageStats = query({
  args: {
    days: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const start = Date.now() - args.days * 24 * 60 * 60 * 1000;

    const summary = {
      totalCalls: 0,
      totalTokens: 0,
      totalCost: 0,
    };

    const byFeature: Record<string, { calls: number; tokens: number; cost: number }> = {};
    const dailyMap = new Map<
      string,
      { date: string; calls: number; tokens: number; cost: number }
    >();

    let cursor: string | null = null;
    do {
      const batch = await ctx.db
        .query('ai_usage_logs')
        .withIndex('by_createdAt', q => q.gte('createdAt', start))
        .paginate({ numItems: SCAN_PAGE_SIZE, cursor });

      for (const log of batch.page) {
        const tokens = log.totalTokens || 0;
        const cost = log.costUsd || 0;
        summary.totalCalls += 1;
        summary.totalTokens += tokens;
        summary.totalCost += cost;

        const feature = log.feature || 'unknown';
        byFeature[feature] = byFeature[feature] || { calls: 0, tokens: 0, cost: 0 };
        byFeature[feature].calls += 1;
        byFeature[feature].tokens += tokens;
        byFeature[feature].cost += cost;

        const date = new Date(log.createdAt).toISOString().slice(0, 10);
        const daily = dailyMap.get(date) || { date, calls: 0, tokens: 0, cost: 0 };
        daily.calls += 1;
        daily.tokens += tokens;
        daily.cost += cost;
        dailyMap.set(date, daily);
      }

      cursor = batch.isDone ? null : batch.continueCursor;
    } while (cursor);

    const daily = [...dailyMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1));

    return {
      period: `${args.days} days`,
      summary,
      byFeature,
      daily,
    };
  },
});

export const backfillCachedMetrics = mutation({
  args: {
    limit: v.optional(v.number()),
    userCursor: v.optional(v.string()),
    examAttemptCursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const limit = Math.max(1, Math.min(args.limit ?? ADMIN_BACKFILL_BATCH_LIMIT, 100));

    const usersBatch = await ctx.db
      .query('users')
      .paginate({ numItems: limit, cursor: args.userCursor ?? null });
    let usersUpdated = 0;

    for (const user of usersBatch.page) {
      const patch: { savedWordsCount?: number; mistakesCount?: number } = {};

      if (typeof user.savedWordsCount !== 'number') {
        const savedWords = await ctx.db
          .query('saved_words')
          .withIndex('by_user', q => q.eq('userId', user._id))
          .collect();
        patch.savedWordsCount = savedWords.length;
      }

      if (typeof user.mistakesCount !== 'number') {
        const mistakes = await ctx.db
          .query('mistakes')
          .withIndex('by_user', q => q.eq('userId', user._id))
          .collect();
        patch.mistakesCount = mistakes.length;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(user._id, patch);
        usersUpdated += 1;
      }
    }

    const examAttemptsBatch = await ctx.db
      .query('exam_attempts')
      .paginate({ numItems: limit, cursor: args.examAttemptCursor ?? null });
    let examAttemptsUpdated = 0;
    const examScoreCache = new Map<string, ReturnType<typeof buildExamScoreInfo>>();

    for (const attempt of examAttemptsBatch.page) {
      if (typeof attempt.maxScore === 'number' && typeof attempt.correctCount === 'number') {
        continue;
      }

      const cacheKey = attempt.examId.toString();
      let scoreInfo = examScoreCache.get(cacheKey);
      if (!scoreInfo) {
        const questions = await ctx.db
          .query('topik_questions')
          .withIndex('by_exam', q => q.eq('examId', attempt.examId))
          .collect();
        scoreInfo = buildExamScoreInfo(questions);
        examScoreCache.set(cacheKey, scoreInfo);
      }

      const { answersByNumber } = normalizeExamAttemptAnswers(
        (attempt.answers || {}) as Record<string, number>,
        scoreInfo
      );

      await ctx.db.patch(attempt._id, {
        maxScore: scoreInfo.totalScore,
        correctCount: countCorrectAnswers(answersByNumber, scoreInfo.correctAnswerMap),
      });
      examAttemptsUpdated += 1;
    }

    return {
      usersScanned: usersBatch.page.length,
      usersUpdated,
      nextUserCursor: usersBatch.isDone ? null : usersBatch.continueCursor,
      examAttemptsScanned: examAttemptsBatch.page.length,
      examAttemptsUpdated,
      nextExamAttemptCursor: examAttemptsBatch.isDone ? null : examAttemptsBatch.continueCursor,
      done: usersBatch.isDone && examAttemptsBatch.isDone,
    };
  },
});

// Get recent activity for admin dashboard
export const getRecentActivity = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
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
