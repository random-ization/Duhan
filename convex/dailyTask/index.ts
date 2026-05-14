import { ConvexError, v } from 'convex/values';
import { api } from '../_generated/api';
import type { Doc, Id } from '../_generated/dataModel';
import {
  mutation,
  query,
  type ActionCtx,
  type MutationCtx,
  type QueryCtx,
} from '../_generated/server';
import { getAuthUserId } from '../utils';
import type { GoalProfileDto } from '../onboarding/index';
import {
  buildDailyTaskPlan,
  DAILY_TASK_VERSION,
  type DailyTaskBuildSignals,
  type DailyTaskItemDto,
  type DailyTaskKind,
  type DailyTaskPlanDto,
} from './shared';

type DailyTaskReadCtx = QueryCtx & Pick<ActionCtx, 'runQuery'>;
type DailyTaskWriteCtx = MutationCtx & Pick<ActionCtx, 'runQuery'>;
type DailyTaskCtx = DailyTaskReadCtx | DailyTaskWriteCtx;

function toPlanDto(doc: Doc<'daily_task_plan'>): DailyTaskPlanDto {
  return {
    id: String(doc._id),
    date: doc.date,
    status: doc.status === 'completed' ? 'completed' : 'ready',
    goalProfileId: doc.goalProfileId ? String(doc.goalProfileId) : undefined,
    taskVersion: doc.taskVersion,
    source: doc.source,
    tasks: doc.tasks.map(task => ({
      taskId: task.taskId,
      kind: task.kind as DailyTaskKind,
      title: task.title,
      description: task.description,
      targetCount: task.targetCount,
      currentCount: task.currentCount,
      completed: task.completed,
      linkPath: task.linkPath,
      assetType: task.assetType,
      assetRefId: task.assetRefId,
      metadata: task.metadata,
    })),
    reviewSummary: doc.reviewSummary,
    generatedAt: doc.generatedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    completedAt: doc.completedAt,
  };
}

async function getPersistedPlanByDate(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  date: string
): Promise<Doc<'daily_task_plan'> | null> {
  return ctx.db
    .query('daily_task_plan')
    .withIndex('by_user_date', q => q.eq('userId', userId).eq('date', date))
    .first();
}

async function getOnboardingProfile(ctx: DailyTaskCtx): Promise<GoalProfileDto | null> {
  const onboardingState = await ctx.runQuery(api.onboarding.getState, {});
  return onboardingState.profile;
}

async function getSignals(ctx: DailyTaskCtx, language?: string): Promise<DailyTaskBuildSignals> {
  const reviewSummary = await ctx.runQuery(api.vocab.getReviewSummary, {});
  const weakGrammarPatterns = await ctx.runQuery(api.weakPoints.getWeakGrammarPatterns, {
    limit: 2,
    language,
  });
  const weakVocabCategories = await ctx.runQuery(api.weakPoints.getWeakVocabCategories, {
    limit: 2,
    language,
  });
  const userId = await getAuthUserId(ctx);
  const queuedNotes = await ctx.db
    .query('note_review_queue')
    .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'queued'))
    .collect();
  const doneNotes = await ctx.db
    .query('note_review_queue')
    .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'done'))
    .collect();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayStartTs = todayStart.getTime();

  return {
    language: language?.startsWith('zh')
      ? 'zh'
      : language?.startsWith('vi')
        ? 'vi'
        : language?.startsWith('mn')
          ? 'mn'
          : 'en',
    reviewSummary,
    dueNoteCount: queuedNotes.length,
    weakGrammarPatterns,
    weakVocabCategories,
    noteReviewDoneToday: doneNotes.filter(
      (item: Doc<'note_review_queue'>) => (item.reviewedAt ?? 0) >= todayStartTs
    ).length,
  };
}

async function buildPlan(ctx: DailyTaskCtx, language?: string): Promise<DailyTaskPlanDto> {
  const userId = await getAuthUserId(ctx);
  const now = Date.now();
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

  const persisted = await getPersistedPlanByDate(ctx, userId, dateKey);
  const profile = await getOnboardingProfile(ctx);
  const signals = await getSignals(ctx, language ?? profile?.preferredLanguage);

  return buildDailyTaskPlan({
    ctx,
    userId,
    now,
    language,
    profile,
    persistedPlan: persisted ? toPlanDto(persisted) : null,
    signals,
  });
}

async function upsertTodayPlan(
  ctx: DailyTaskWriteCtx,
  language?: string
): Promise<DailyTaskPlanDto> {
  const userId = await getAuthUserId(ctx);
  const plan = await buildPlan(ctx, language);
  const existing = await getPersistedPlanByDate(ctx, userId, plan.date);

  const tasks = plan.tasks.map(task => ({
    taskId: task.taskId,
    kind: task.kind,
    title: task.title,
    description: task.description,
    targetCount: task.targetCount,
    currentCount: task.currentCount,
    completed: task.completed,
    linkPath: task.linkPath,
    assetType: task.assetType,
    assetRefId: task.assetRefId,
    metadata: task.metadata,
  }));

  if (existing) {
    await ctx.db.patch(existing._id, {
      status: plan.status,
      goalProfileId: plan.goalProfileId as Id<'user_goal_profile'> | undefined,
      taskVersion: plan.taskVersion ?? DAILY_TASK_VERSION,
      source: plan.source,
      tasks,
      reviewSummary: plan.reviewSummary,
      generatedAt: plan.generatedAt,
      updatedAt: plan.updatedAt ?? Date.now(),
      completedAt: plan.completedAt,
    });
    const updated = await ctx.db.get(existing._id);
    if (!updated) throw new ConvexError({ code: 'DAILY_TASK_PLAN_NOT_FOUND' });
    return toPlanDto(updated);
  }

  const insertedId = await ctx.db.insert('daily_task_plan', {
    userId,
    date: plan.date,
    status: plan.status,
    goalProfileId: plan.goalProfileId as Id<'user_goal_profile'> | undefined,
    taskVersion: plan.taskVersion ?? DAILY_TASK_VERSION,
    source: plan.source,
    tasks,
    reviewSummary: plan.reviewSummary,
    generatedAt: plan.generatedAt,
    createdAt: plan.createdAt ?? Date.now(),
    updatedAt: plan.updatedAt ?? Date.now(),
    completedAt: plan.completedAt,
  });
  const inserted = await ctx.db.get(insertedId);
  if (!inserted) throw new ConvexError({ code: 'DAILY_TASK_PLAN_CREATE_FAILED' });
  return toPlanDto(inserted);
}

export const getTodayPlan = query({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DailyTaskPlanDto> =>
    buildPlan(ctx as DailyTaskCtx, args.language),
});

export const generateTodayPlan = mutation({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DailyTaskPlanDto> =>
    upsertTodayPlan(ctx as DailyTaskWriteCtx, args.language),
});

export const updateTaskCompletion = mutation({
  args: {
    taskId: v.string(),
    completed: v.boolean(),
    currentCount: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<DailyTaskPlanDto> => {
    const plan = await upsertTodayPlan(ctx as DailyTaskWriteCtx);
    const userId = await getAuthUserId(ctx);
    const persisted = await getPersistedPlanByDate(ctx, userId, plan.date);
    if (!persisted) throw new ConvexError({ code: 'DAILY_TASK_PLAN_NOT_FOUND' });

    const updatedTasks: DailyTaskItemDto[] = plan.tasks.map(task => {
      if (task.taskId !== args.taskId) return task;
      const targetCount = task.targetCount ?? 1;
      const nextCurrentCount =
        typeof args.currentCount === 'number'
          ? Math.max(0, args.currentCount)
          : args.completed
            ? Math.max(task.currentCount ?? 0, targetCount)
            : (task.currentCount ?? 0);
      return {
        ...task,
        currentCount: nextCurrentCount,
        completed: args.completed || nextCurrentCount >= targetCount,
      };
    });

    const matched = updatedTasks.some(task => task.taskId === args.taskId);
    if (!matched) {
      throw new ConvexError({
        code: 'DAILY_TASK_NOT_FOUND',
        message: `Unknown task "${args.taskId}"`,
      });
    }

    const completedAt =
      updatedTasks.length > 0 && updatedTasks.every(task => task.completed)
        ? Date.now()
        : undefined;
    await ctx.db.patch(persisted._id, {
      tasks: updatedTasks.map(task => ({
        taskId: task.taskId,
        kind: task.kind,
        title: task.title,
        description: task.description,
        targetCount: task.targetCount,
        currentCount: task.currentCount,
        completed: task.completed,
        linkPath: task.linkPath,
        assetType: task.assetType,
        assetRefId: task.assetRefId,
        metadata: task.metadata,
      })),
      status: completedAt ? 'completed' : 'ready',
      updatedAt: Date.now(),
      completedAt,
    });

    const updated = await ctx.db.get(persisted._id);
    if (!updated) {
      throw new ConvexError({ code: 'DAILY_TASK_PLAN_NOT_FOUND' });
    }
    return toPlanDto(updated);
  },
});
