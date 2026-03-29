import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { Doc, Id } from './_generated/dataModel';
import { v, ConvexError } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { MAX_INSTITUTES_FALLBACK } from './queryLimits';
import { requireAdmin } from './utils';
import {
  buildExamScoreInfo,
  countCorrectAnswers,
  normalizeExamAttemptAnswers,
} from './examAttemptMetrics';
import {
  buildManagedPlanPatch,
  canExposeViewerRecord,
  compareAdminUsers,
  isEmailVerified,
  matchesAdminUserFilters,
  normalizeAccountStatus,
  resolveAdminPlan,
  resolveSubscriptionStatus,
  type AdminUserAccountStatus,
  type AdminUserActivityWindow,
  type AdminUserBillingCycle,
  type AdminUserEmailVerificationFilter,
  type AdminUserListFilters,
  type AdminUserManagedPlan,
  type AdminUserResolvedPlan,
  type AdminUserSortBy,
} from './adminUserUtils';
import { LEARNING_MODULE_VALUES, normalizeLastModuleValue } from './analytics';

const SCAN_PAGE_SIZE = 500;
const ADMIN_USER_LIST_SCAN_LIMIT = 5000;
const ADMIN_USER_SCAN_BATCH_SIZE = 250;
const ADMIN_USER_ACTIVITY_PREVIEW_LIMIT = 10;
const ADMIN_USER_NOTE_PREVIEW_LIMIT = 20;
const ADMIN_USER_AUDIT_PREVIEW_LIMIT = 20;
const AI_USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
const ADMIN_OVERVIEW_USERS_LIMIT = 5000;
const ADMIN_OVERVIEW_GRAMMAR_LIMIT = 2000;
const ADMIN_OVERVIEW_UNITS_LIMIT = 2000;
const ADMIN_OVERVIEW_EXAMS_LIMIT = 2000;
const ADMIN_OVERVIEW_INSTITUTES_LIMIT = 500;
const ADMIN_BACKFILL_BATCH_LIMIT = 25;

const formatCappedCount = (count: number, limit: number): number | string =>
  count > limit ? `${limit}+` : count;

const adminUserRoleValidator = v.union(v.literal('ADMIN'), v.literal('STUDENT'));
const adminUserAccountStatusValidator = v.union(v.literal('ACTIVE'), v.literal('DISABLED'));
const adminUserPlanValidator = v.union(v.literal('FREE'), v.literal('PRO'), v.literal('LIFETIME'));
const adminUserEmailVerifiedValidator = v.union(v.literal('VERIFIED'), v.literal('UNVERIFIED'));
const adminUserKycValidator = v.union(v.literal('NONE'), v.literal('VERIFIED'));
const adminUserActivityWindowValidator = v.union(
  v.literal('ACTIVE_7_DAYS'),
  v.literal('INACTIVE_30_DAYS')
);
const adminUserSortByValidator = v.union(
  v.literal('NEWEST'),
  v.literal('OLDEST'),
  v.literal('LAST_ACTIVE_DESC'),
  v.literal('LAST_LOGIN_DESC'),
  v.literal('TOTAL_STUDY_DESC')
);
const adminUserBillingCycleValidator = v.union(
  v.literal('MONTHLY'),
  v.literal('QUARTERLY'),
  v.literal('SEMIANNUAL'),
  v.literal('ANNUAL'),
  v.literal('LIFETIME')
);

type AdminAuditAction =
  | 'USER_PROFILE_UPDATED'
  | 'USER_ROLE_CHANGED'
  | 'USER_PLAN_CHANGED'
  | 'USER_EMAIL_VERIFIED_CHANGED'
  | 'USER_KYC_CHANGED'
  | 'USER_DISABLED'
  | 'USER_RESTORED'
  | 'USER_NOTE_ADDED';

type AuditMetadata = Record<string, string | number | boolean>;

type AdminUserListItem = {
  id: Id<'users'>;
  name?: string;
  email: string;
  avatar?: string;
  role: 'ADMIN' | 'STUDENT';
  accountStatus: AdminUserAccountStatus;
  resolvedPlan: AdminUserResolvedPlan;
  subscriptionType?: string;
  subscriptionExpiry?: string;
  subscriptionStatus: string;
  emailVerified: boolean;
  kycStatus: 'NONE' | 'VERIFIED';
  createdAt?: number;
  lastLoginAt?: number;
  lastActivityAt?: number;
  lastActivityType?: string;
  lastInstitute?: string;
  lastLevel?: number;
  lastUnit?: number;
  lastModule?: string;
  savedWordsCount: number;
  mistakesCount: number;
  totalStudyMinutes: number;
};

const toAdminUserListItem = (user: Doc<'users'>): AdminUserListItem => ({
  id: user._id,
  name: user.name,
  email: user.email,
  avatar: user.avatar,
  role: user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT',
  accountStatus: normalizeAccountStatus(user.accountStatus),
  resolvedPlan: resolveAdminPlan(user),
  subscriptionType: user.subscriptionType,
  subscriptionExpiry: user.subscriptionExpiry,
  subscriptionStatus: resolveSubscriptionStatus(user),
  emailVerified: isEmailVerified(user),
  kycStatus: user.kycStatus === 'VERIFIED' ? 'VERIFIED' : 'NONE',
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
  lastActivityAt: user.lastActivityAt,
  lastActivityType: user.lastActivityType,
  lastInstitute: user.lastInstitute,
  lastLevel: user.lastLevel,
  lastUnit: user.lastUnit,
  lastModule: user.lastModule,
  savedWordsCount: user.savedWordsCount || 0,
  mistakesCount: user.mistakesCount || 0,
  totalStudyMinutes: user.totalStudyMinutes || 0,
});

function parseAdminCursor(cursor: string | null): number {
  if (!cursor) return 0;
  const parsed = Number.parseInt(cursor, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function compactAuditMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>
): AuditMetadata | undefined {
  const result: AuditMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (value !== null && value !== undefined) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

async function insertAdminAuditLog(
  ctx: MutationCtx,
  userId: Id<'users'>,
  actorUserId: Id<'users'>,
  action: AdminAuditAction,
  metadata?: AuditMetadata
) {
  await ctx.db.insert('admin_user_audit_logs', {
    userId,
    actorUserId,
    action,
    metadata,
    createdAt: Date.now(),
  });
}

async function collectAdminUsers(ctx: QueryCtx) {
  const users: Doc<'users'>[] = [];
  let cursor: string | null = null;

  do {
    const batch = await ctx.db
      .query('users')
      .order('desc')
      .paginate({ cursor, numItems: ADMIN_USER_SCAN_BATCH_SIZE });
    users.push(...batch.page);
    if (batch.isDone || users.length >= ADMIN_USER_LIST_SCAN_LIMIT) {
      break;
    }
    cursor = batch.continueCursor;
  } while (cursor !== null);

  return users.slice(0, ADMIN_USER_LIST_SCAN_LIMIT);
}

async function loadUsersById(ctx: QueryCtx | MutationCtx, ids: Id<'users'>[]) {
  const uniqueIds = [...new Set(ids.map(id => id.toString()))].map(id => id as Id<'users'>);
  const docs = await Promise.all(uniqueIds.map(id => ctx.db.get(id)));
  const map = new Map<string, Doc<'users'>>();
  for (const doc of docs) {
    if (doc) {
      map.set(doc._id.toString(), doc);
    }
  }
  return map;
}

async function loadInstituteNames(ctx: QueryCtx, courseIds: string[]) {
  const uniqueCourseIds = [...new Set(courseIds.filter(Boolean))];
  const institutes = await Promise.all(
    uniqueCourseIds.map(courseId =>
      ctx.db
        .query('institutes')
        .withIndex('by_legacy_id', q => q.eq('id', courseId))
        .first()
    )
  );
  const map = new Map<string, string>();
  institutes.forEach(institute => {
    if (institute) {
      map.set(institute.id, institute.name);
    }
  });
  return map;
}

function roundToOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

// Get all users with operational filters and manual pagination.
export const getUsers = query({
  args: {
    paginationOpts: paginationOptsValidator,
    search: v.optional(v.string()),
    role: v.optional(adminUserRoleValidator),
    accountStatus: v.optional(adminUserAccountStatusValidator),
    plan: v.optional(adminUserPlanValidator),
    emailVerified: v.optional(adminUserEmailVerifiedValidator),
    kycStatus: v.optional(adminUserKycValidator),
    activityWindow: v.optional(adminUserActivityWindowValidator),
    sortBy: v.optional(adminUserSortByValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const now = Date.now();
    const filters: AdminUserListFilters = {
      search: args.search,
      role: args.role,
      accountStatus: args.accountStatus,
      plan: args.plan,
      emailVerified: args.emailVerified as AdminUserEmailVerificationFilter | undefined,
      kycStatus: args.kycStatus,
      activityWindow: args.activityWindow as AdminUserActivityWindow | undefined,
      sortBy: args.sortBy as AdminUserSortBy | undefined,
    };

    const allUsers = await collectAdminUsers(ctx);
    const filtered = allUsers
      .filter(user => matchesAdminUserFilters(user, filters, now))
      .sort((left, right) => compareAdminUsers(left, right, filters.sortBy || 'NEWEST'))
      .map(toAdminUserListItem);

    const start = parseAdminCursor(args.paginationOpts.cursor);
    const end = start + args.paginationOpts.numItems;

    return {
      page: filtered.slice(start, end),
      isDone: end >= filtered.length,
      continueCursor: end >= filtered.length ? null : String(end),
    };
  },
});

export const getUserDetail = query({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const now = Date.now();
    const aiSince = now - AI_USAGE_WINDOW_MS;

    const [
      vocabProgress,
      grammarProgress,
      courseProgress,
      notePages,
      noteReviewQueue,
      annotations,
      examAttempts,
      typingRecords,
      podcastSubscriptions,
      listeningHistory,
      recentActivityLogs,
      recentLearningEvents,
      recentNotes,
      recentAuditLogs,
      badges,
      aiUsage,
    ] = await Promise.all([
      ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('user_grammar_progress')
        .withIndex('by_user_grammar', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('user_course_progress')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('note_pages')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('note_review_queue')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('annotations')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('exam_attempts')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('typing_records')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('podcast_subscriptions')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('listening_history')
        .withIndex('by_user_playedAt', q => q.eq('userId', args.userId))
        .order('desc')
        .take(5),
      ctx.db
        .query('activity_logs')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .order('desc')
        .take(ADMIN_USER_ACTIVITY_PREVIEW_LIMIT),
      ctx.db
        .query('learning_events')
        .withIndex('by_user_eventAt', q => q.eq('userId', args.userId))
        .order('desc')
        .take(ADMIN_USER_ACTIVITY_PREVIEW_LIMIT),
      ctx.db
        .query('admin_user_notes')
        .withIndex('by_user_createdAt', q => q.eq('userId', args.userId))
        .order('desc')
        .take(ADMIN_USER_NOTE_PREVIEW_LIMIT),
      ctx.db
        .query('admin_user_audit_logs')
        .withIndex('by_user_createdAt', q => q.eq('userId', args.userId))
        .order('desc')
        .take(ADMIN_USER_AUDIT_PREVIEW_LIMIT),
      ctx.db
        .query('user_badges')
        .withIndex('by_user', q => q.eq('userId', args.userId))
        .collect(),
      ctx.db
        .query('ai_usage_logs')
        .withIndex('by_user_createdAt', q => q.eq('userId', args.userId).gte('createdAt', aiSince))
        .collect(),
    ]);

    const instituteNames = await loadInstituteNames(
      ctx,
      [user.lastInstitute || '', ...courseProgress.map(progress => progress.courseId)].filter(
        Boolean
      )
    );
    const recentExamAttempts = examAttempts
      .slice()
      .sort((left, right) => right.createdAt - left.createdAt)
      .slice(0, 5);
    const examDocs = await Promise.all(
      recentExamAttempts.map(attempt => ctx.db.get(attempt.examId))
    );
    const examNameMap = new Map<string, string>();
    examDocs.forEach(exam => {
      if (exam) {
        examNameMap.set(exam._id.toString(), exam.title);
      }
    });

    let vocabMastered = 0;
    let vocabDueReviews = 0;
    let vocabSaved = 0;
    for (const progress of vocabProgress) {
      if (progress.status === 'MASTERED') vocabMastered += 1;
      const dueAt = progress.nextReviewAt || progress.due;
      if (dueAt && dueAt <= now) vocabDueReviews += 1;
      if (progress.savedByUser) vocabSaved += 1;
    }

    let grammarMastered = 0;
    for (const progress of grammarProgress) {
      if (progress.status === 'MASTERED') grammarMastered += 1;
    }

    const totalCompletedUnits = courseProgress.reduce(
      (sum, progress) => sum + (progress.completedUnits || []).length,
      0
    );
    const recentCourse = courseProgress
      .slice()
      .sort((left, right) => (right.lastAccessAt || 0) - (left.lastAccessAt || 0))[0];

    const activeNotePages = notePages.filter(page => !page.isArchived && !page.isTemplate);
    const archivedNotePages = notePages.filter(page => page.isArchived);
    const templateNotePages = notePages.filter(page => page.isTemplate);
    const queuedReviews = noteReviewQueue.filter(item => item.status !== 'done');

    const examAverage =
      examAttempts.length > 0
        ? roundToOneDecimal(
            examAttempts.reduce((sum, attempt) => sum + attempt.score, 0) / examAttempts.length
          )
        : 0;
    const bestTypingWpm = typingRecords.reduce((max, record) => Math.max(max, record.wpm || 0), 0);
    const averageTypingAccuracy =
      typingRecords.length > 0
        ? roundToOneDecimal(
            typingRecords.reduce((sum, record) => sum + (record.accuracy || 0), 0) /
              typingRecords.length
          )
        : 0;
    const aiCost = aiUsage.reduce((sum, row) => sum + (row.costUsd || 0), 0);
    const aiTokens = aiUsage.reduce((sum, row) => sum + (row.totalTokens || 0), 0);
    const moduleBreakdownMap = new Map<string, { minutes: number; sessions: Set<string> }>();
    for (const module of LEARNING_MODULE_VALUES) {
      moduleBreakdownMap.set(module, { minutes: 0, sessions: new Set<string>() });
    }
    for (const event of recentLearningEvents) {
      const summary = moduleBreakdownMap.get(event.module);
      if (!summary) continue;
      summary.minutes += (event.durationSec || 0) / 60;
      summary.sessions.add(event.sessionId);
    }

    const actorMap = await loadUsersById(ctx, [
      ...recentNotes.map(note => note.authorUserId),
      ...recentAuditLogs.map(log => log.actorUserId),
      ...(user.disabledBy ? [user.disabledBy] : []),
    ]);

    return {
      user: {
        ...toAdminUserListItem(user),
        phoneRegion: user.phoneRegion || 'OTHER',
        isRegionalPromoEligible: Boolean(user.isRegionalPromoEligible),
        disabledAt: user.disabledAt,
        disabledReason: user.disabledReason,
        disabledBy:
          user.disabledBy && actorMap.get(user.disabledBy.toString())
            ? {
                id: user.disabledBy,
                name: actorMap.get(user.disabledBy.toString())?.name,
                email: actorMap.get(user.disabledBy.toString())?.email,
              }
            : null,
      },
      membership: {
        plan: resolveAdminPlan(user),
        subscriptionType: user.subscriptionType || null,
        subscriptionStatus: resolveSubscriptionStatus(user),
        subscriptionExpiry: user.subscriptionExpiry || null,
        isViewerAccessible: canExposeViewerRecord(user),
      },
      learning: {
        currentPointer: {
          instituteId: user.lastInstitute || null,
          instituteName: user.lastInstitute ? instituteNames.get(user.lastInstitute) || null : null,
          level: user.lastLevel || null,
          unit: user.lastUnit || null,
          module: user.lastModule || null,
        },
        vocab: {
          total: vocabProgress.length,
          mastered: vocabMastered,
          dueReviews: vocabDueReviews,
          savedByUser: vocabSaved,
        },
        grammar: {
          total: grammarProgress.length,
          mastered: grammarMastered,
        },
        courses: {
          totalCourses: courseProgress.length,
          totalCompletedUnits,
          recentCourseId: recentCourse?.courseId || null,
          recentCourseName: recentCourse
            ? instituteNames.get(recentCourse.courseId) || recentCourse.courseId
            : null,
          recentCourseLastAccessAt: recentCourse?.lastAccessAt || null,
        },
        notes: {
          totalPages: activeNotePages.length,
          archivedPages: archivedNotePages.length,
          templates: templateNotePages.length,
          queuedReviewCount: queuedReviews.length,
        },
        annotations: {
          total: annotations.length,
        },
        exams: {
          totalAttempts: examAttempts.length,
          averageScore: examAverage,
          latestAttemptAt: recentExamAttempts[0]?.createdAt || null,
        },
        typing: {
          totalRecords: typingRecords.length,
          bestWpm: bestTypingWpm,
          averageAccuracy: averageTypingAccuracy,
        },
        podcasts: {
          subscriptions: podcastSubscriptions.length,
          listeningSessions: listeningHistory.length,
          latestPlayedAt: listeningHistory[0]?.playedAt || null,
        },
        ai: {
          callsLast30Days: aiUsage.length,
          totalTokensLast30Days: aiTokens,
          totalCostLast30Days: roundToOneDecimal(aiCost),
        },
        badges: {
          total: badges.length,
          new: badges.filter(badge => badge.isNew).length,
        },
        moduleBreakdown: Array.from(moduleBreakdownMap.entries())
          .map(([module, summary]) => ({
            module,
            minutes: roundToOneDecimal(summary.minutes),
            sessions: summary.sessions.size,
          }))
          .filter(item => item.minutes > 0 || item.sessions > 0),
        health: {
          invalidLastModule: Boolean(user.lastModule && !normalizeLastModuleValue(user.lastModule)),
          lastActivityCacheMismatch:
            Boolean(recentActivityLogs[0]) &&
            (user.lastActivityAt !== recentActivityLogs[0].createdAt ||
              user.lastActivityType !== recentActivityLogs[0].activityType),
        },
      },
      recentActivity: recentActivityLogs.map(log => ({
        id: log._id,
        activityType: log.activityType,
        duration: log.duration || 0,
        itemsStudied: log.itemsStudied || 0,
        createdAt: log.createdAt,
      })),
      recentLearningSessions: recentLearningEvents.map(event => ({
        id: event._id,
        sessionId: event.sessionId,
        module: event.module,
        eventName: event.eventName,
        durationSec: event.durationSec || 0,
        itemCount: event.itemCount || 0,
        result: event.result || null,
        createdAt: event.eventAt,
      })),
      recentExamAttempts: recentExamAttempts.map(attempt => ({
        id: attempt._id,
        examId: attempt.examId,
        examTitle: examNameMap.get(attempt.examId.toString()) || 'TOPIK',
        score: attempt.score,
        maxScore: attempt.maxScore || 0,
        correctCount: attempt.correctCount || 0,
        createdAt: attempt.createdAt,
      })),
      recentListeningHistory: listeningHistory.map(item => ({
        id: item._id,
        episodeTitle: item.episodeTitle,
        channelName: item.channelName,
        progress: item.progress,
        duration: item.duration || 0,
        playedAt: item.playedAt,
      })),
      adminNotes: recentNotes.map(note => ({
        id: note._id,
        body: note.body,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        author: actorMap.get(note.authorUserId.toString())
          ? {
              id: note.authorUserId,
              name: actorMap.get(note.authorUserId.toString())?.name,
              email: actorMap.get(note.authorUserId.toString())?.email,
            }
          : null,
      })),
      auditLogs: recentAuditLogs.map(log => ({
        id: log._id,
        action: log.action,
        metadata: log.metadata || {},
        createdAt: log.createdAt,
        actor: actorMap.get(log.actorUserId.toString())
          ? {
              id: log.actorUserId,
              name: actorMap.get(log.actorUserId.toString())?.name,
              email: actorMap.get(log.actorUserId.toString())?.email,
            }
          : null,
      })),
    };
  },
});

export const getDataHealth = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);

    const users = await collectAdminUsers(ctx);
    const recentLearningEvents = await ctx.db.query('learning_events').order('desc').take(2000);
    const recentActivityLogs = await ctx.db.query('activity_logs').order('desc').take(2000);

    let invalidLastModuleUsers = 0;
    let missingActivityCache = 0;
    let missingStudyMinuteCache = 0;
    for (const user of users) {
      if (user.lastModule && !normalizeLastModuleValue(user.lastModule)) {
        invalidLastModuleUsers += 1;
      }
      if (user.lastActivityAt && !user.lastActivityType) {
        missingActivityCache += 1;
      }
      if ((user.totalStudyMinutes || 0) === 0 && user.lastActivityAt) {
        missingStudyMinuteCache += 1;
      }
    }

    return {
      usersScanned: users.length,
      learningEventsScanned: recentLearningEvents.length,
      recentActivityLogsScanned: recentActivityLogs.length,
      missingSessionIdCount: recentActivityLogs.filter(log => !log.sessionId).length,
      invalidModuleCount: recentLearningEvents.filter(
        event =>
          !LEARNING_MODULE_VALUES.includes(event.module as (typeof LEARNING_MODULE_VALUES)[number])
      ).length,
      invalidLastModuleUsers,
      missingActivityCache,
      missingStudyMinuteCache,
      recentSummaryEvents: recentLearningEvents.filter(
        event =>
          event.eventName === 'session_progress' ||
          event.eventName === 'review_completed' ||
          event.eventName === 'content_completed' ||
          event.eventName === 'exam_submitted' ||
          event.eventName === 'exam_auto_submitted'
      ).length,
    };
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.id('users'),
    updates: v.object({
      name: v.optional(v.string()),
      role: v.optional(adminUserRoleValidator),
      emailVerified: v.optional(v.boolean()),
      kycStatus: v.optional(adminUserKycValidator),
      plan: v.optional(adminUserPlanValidator),
      subscriptionType: v.optional(adminUserBillingCycleValidator),
      subscriptionExpiry: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ code: 'USER_NOT_FOUND' });
    }

    const updates = args.updates;
    const patch: Partial<Doc<'users'>> = {};
    const changedFields: string[] = [];

    if (
      (updates.subscriptionType !== undefined || updates.subscriptionExpiry !== undefined) &&
      updates.plan === undefined
    ) {
      throw new ConvexError({ code: 'INVALID_PLAN_UPDATE' });
    }

    if (updates.name !== undefined) {
      const nextName = updates.name.trim() || undefined;
      if (nextName !== user.name) {
        patch.name = nextName;
        changedFields.push('name');
      }
    }

    if (updates.role && updates.role !== (user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT')) {
      patch.role = updates.role;
      changedFields.push('role');
      await insertAdminAuditLog(
        ctx,
        args.userId,
        actor._id,
        'USER_ROLE_CHANGED',
        compactAuditMetadata({
          previousRole: user.role || 'STUDENT',
          nextRole: updates.role,
        })
      );
    }

    if (updates.emailVerified !== undefined) {
      const currentEmailVerified = isEmailVerified(user);
      if (currentEmailVerified !== updates.emailVerified) {
        patch.emailVerificationTime = updates.emailVerified ? Date.now() : undefined;
        patch.isVerified = updates.emailVerified;
        changedFields.push('emailVerified');
        await insertAdminAuditLog(
          ctx,
          args.userId,
          actor._id,
          'USER_EMAIL_VERIFIED_CHANGED',
          compactAuditMetadata({
            previousEmailVerified: currentEmailVerified,
            nextEmailVerified: updates.emailVerified,
          })
        );
      }
    }

    if (
      updates.kycStatus &&
      updates.kycStatus !== (user.kycStatus === 'VERIFIED' ? 'VERIFIED' : 'NONE')
    ) {
      patch.kycStatus = updates.kycStatus;
      changedFields.push('kycStatus');
      await insertAdminAuditLog(
        ctx,
        args.userId,
        actor._id,
        'USER_KYC_CHANGED',
        compactAuditMetadata({
          previousKycStatus: user.kycStatus || 'NONE',
          nextKycStatus: updates.kycStatus,
        })
      );
    }

    if (updates.plan) {
      let planPatch: {
        tier: string;
        subscriptionType: AdminUserBillingCycle | undefined;
        subscriptionExpiry: string | undefined;
      };
      try {
        planPatch = buildManagedPlanPatch({
          plan: updates.plan as AdminUserManagedPlan,
          subscriptionType: updates.subscriptionType,
          subscriptionExpiry: updates.subscriptionExpiry,
        });
      } catch (error) {
        throw new ConvexError({
          code: 'INVALID_PLAN_UPDATE',
          message: (error as Error).message,
        });
      }

      const currentPlan = resolveAdminPlan(user);
      const currentSubscriptionType = user.subscriptionType || undefined;
      const currentSubscriptionExpiry = user.subscriptionExpiry || undefined;
      if (
        currentPlan !== updates.plan ||
        currentSubscriptionType !== planPatch.subscriptionType ||
        currentSubscriptionExpiry !== planPatch.subscriptionExpiry ||
        (user.tier || 'FREE') !== planPatch.tier
      ) {
        patch.tier = planPatch.tier;
        patch.subscriptionType = planPatch.subscriptionType;
        patch.subscriptionExpiry = planPatch.subscriptionExpiry;
        changedFields.push('plan');
        await insertAdminAuditLog(
          ctx,
          args.userId,
          actor._id,
          'USER_PLAN_CHANGED',
          compactAuditMetadata({
            previousPlan: currentPlan,
            nextPlan: updates.plan,
            previousSubscriptionType: currentSubscriptionType || 'NONE',
            nextSubscriptionType: planPatch.subscriptionType || 'NONE',
          })
        );
      }
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.userId, patch);
      await insertAdminAuditLog(
        ctx,
        args.userId,
        actor._id,
        'USER_PROFILE_UPDATED',
        compactAuditMetadata({
          changedFields: changedFields.join(','),
        })
      );
    }

    return { success: true, changedFields };
  },
});

export const setUserAccountStatus = mutation({
  args: {
    userId: v.id('users'),
    status: adminUserAccountStatusValidator,
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ code: 'USER_NOT_FOUND' });
    }

    const currentStatus = normalizeAccountStatus(user.accountStatus);
    if (currentStatus === args.status) {
      return { success: true, status: currentStatus };
    }

    const now = Date.now();
    if (args.status === 'DISABLED') {
      const reason = args.reason?.trim();
      if (!reason) {
        throw new ConvexError({ code: 'DISABLE_REASON_REQUIRED' });
      }

      await ctx.db.patch(args.userId, {
        accountStatus: 'DISABLED',
        disabledReason: reason,
        disabledAt: now,
        disabledBy: actor._id,
      });
      await insertAdminAuditLog(
        ctx,
        args.userId,
        actor._id,
        'USER_DISABLED',
        compactAuditMetadata({ reason })
      );
      return { success: true, status: 'DISABLED' as const };
    }

    await ctx.db.patch(args.userId, {
      accountStatus: 'ACTIVE',
      disabledReason: undefined,
      disabledAt: undefined,
      disabledBy: undefined,
    });
    await insertAdminAuditLog(ctx, args.userId, actor._id, 'USER_RESTORED');

    return { success: true, status: 'ACTIVE' as const };
  },
});

export const addUserNote = mutation({
  args: {
    userId: v.id('users'),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ code: 'USER_NOT_FOUND' });
    }

    const body = args.body.trim();
    if (!body) {
      throw new ConvexError({ code: 'NOTE_BODY_REQUIRED' });
    }

    const now = Date.now();
    const noteId = await ctx.db.insert('admin_user_notes', {
      userId: args.userId,
      authorUserId: actor._id,
      body,
      createdAt: now,
      updatedAt: now,
    });
    await insertAdminAuditLog(
      ctx,
      args.userId,
      actor._id,
      'USER_NOTE_ADDED',
      compactAuditMetadata({
        bodyPreview: body.slice(0, 80),
      })
    );

    return { success: true, noteId };
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
    try {
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
    } catch (error) {
      // In local dev, hot reloads can invalidate a pagination cursor mid-scan.
      // Return whatever was aggregated so the admin dashboard still renders.
      console.warn('admin:getAiUsageStats pagination degraded', error);
    }

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
      const patch: {
        accountStatus?: 'ACTIVE';
        savedWordsCount?: number;
        mistakesCount?: number;
        lastActivityAt?: number;
        lastActivityType?: string;
        totalStudyMinutes?: number;
        lastModule?: string;
      } = {};

      const savedWords = await ctx.db
        .query('saved_words')
        .withIndex('by_user', q => q.eq('userId', user._id))
        .collect();
      if ((user.savedWordsCount || 0) !== savedWords.length) {
        patch.savedWordsCount = savedWords.length;
      }

      const mistakes = await ctx.db
        .query('mistakes')
        .withIndex('by_user', q => q.eq('userId', user._id))
        .collect();
      if ((user.mistakesCount || 0) !== mistakes.length) {
        patch.mistakesCount = mistakes.length;
      }

      if (!user.accountStatus) {
        patch.accountStatus = 'ACTIVE';
      }

      const learningEvents = await ctx.db
        .query('learning_events')
        .withIndex('by_user_eventAt', q => q.eq('userId', user._id))
        .collect();
      const activityLogs = await ctx.db
        .query('activity_logs')
        .withIndex('by_user', q => q.eq('userId', user._id))
        .collect();
      const latestLearningEvent = learningEvents
        .slice()
        .sort((left, right) => right.eventAt - left.eventAt)[0];
      const latestActivity = activityLogs
        .slice()
        .sort((left, right) => right.createdAt - left.createdAt)[0];
      const totalStudyMinutes = roundToOneDecimal(
        learningEvents.length > 0
          ? learningEvents.reduce((sum, event) => sum + (event.durationSec || 0) / 60, 0)
          : activityLogs.reduce((sum, log) => sum + (log.duration || 0), 0)
      );

      if ((user.totalStudyMinutes || 0) !== totalStudyMinutes) {
        patch.totalStudyMinutes = totalStudyMinutes;
      }

      const latestActivityAt = latestLearningEvent?.eventAt ?? latestActivity?.createdAt;
      const latestActivityType = latestLearningEvent?.module ?? latestActivity?.activityType;
      if (
        latestActivityAt &&
        (user.lastActivityAt !== latestActivityAt || user.lastActivityType !== latestActivityType)
      ) {
        patch.lastActivityAt = latestActivityAt;
        patch.lastActivityType = latestActivityType;
      }

      const normalizedLastModule = normalizeLastModuleValue(user.lastModule);
      if (user.lastModule && normalizedLastModule && normalizedLastModule !== user.lastModule) {
        patch.lastModule = normalizedLastModule;
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
