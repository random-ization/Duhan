import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { getAuthUserId } from './utils';
import { startOfDay } from './userStatsHelpers';
import { KAGAS_ERROR_TYPES, type KagasErrorType } from './topikWritingValidators';
import type { GoalProfileDto } from './onboarding/index';

export type WeeklyReportKagasItem = {
  type: string;
  labelKo: string;
  labelZh: string;
  count: number;
};

export type WeeklyReportMistakeItem = {
  originalText: string;
  correctedText: string;
  explanation: string;
  type: string;
  kagasType?: string;
};

export type WeeklyReportData = {
  weekStart: number;
  weekEnd: number;
  stats: {
    totalMinutes: number;
    sessionsCount: number;
    wordsMastered: number;
    grammarMastered: number;
    writingAttemptsCount: number;
    avgWritingScore: number;
  };
  moduleBreakdown: Record<string, number>;
  weakPoints: {
    errorTypeFrequency: Record<string, number>;
    kagasRanked: WeeklyReportKagasItem[];
    topMistakes: WeeklyReportMistakeItem[];
  };
  assetSummary: {
    wordsSaved: number;
    sentencesSaved: number;
    grammarSaved: number;
    sentenceReviewDue: number;
    grammarReviewDue: number;
  };
  suggestions: {
    focusSuggestion: string;
    nextWeekGoal: string;
  };
};

export type WeeklyFocusStrategy = {
  key: string;
  label: string;
  weights: {
    review: number;
    grammar: number;
    writing: number;
    vocab: number;
    listening: number;
  };
};

export type WeeklyFocusTaskAdjustment = {
  taskId: string;
  kind: string;
  title: string;
  beforeIndex: number;
  afterIndex: number;
  beforeTargetCount?: number;
  afterTargetCount?: number;
  priorityWeight: number;
  reason: string;
};

export type WeeklyFocusApplyResult =
  | {
      success: false;
      message: string;
    }
  | {
      success: true;
      checklist: string[];
      rationale: string;
      planDate: string;
      strategy: WeeklyFocusStrategy;
      adjustments: WeeklyFocusTaskAdjustment[];
    };

/**
 * P1-3 Weekly Learning Report and Weakness Analysis
 * Enhanced with KAGAS error taxonomy and cross-dimensional insights.
 */

async function buildWeeklyReportForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  weekOffset: number
): Promise<WeeklyReportData> {
  const now = Date.now();

  // Calculate week bounds
  const endOfCurrentDay = startOfDay(now) + 24 * 60 * 60 * 1000 - 1;
  const weekEnd = endOfCurrentDay - weekOffset * 7 * 24 * 60 * 60 * 1000;
  const weekStart = weekEnd - 7 * 24 * 60 * 60 * 1000 + 1;

  // 1. Study Sessions & Time
  const events = await ctx.db
    .query('learning_events')
    .withIndex('by_user_eventAt', q =>
      q.eq('userId', userId).gte('eventAt', weekStart).lte('eventAt', weekEnd)
    )
    .collect();

  const totalMinutes = events.reduce((sum, event) => sum + (event.durationSec || 0), 0) / 60;
  const sessionsCount = events.length;

  const moduleBreakdown: Record<string, number> = {};
  events.forEach(event => {
    const moduleKey = event.module || 'OTHER';
    moduleBreakdown[moduleKey] = (moduleBreakdown[moduleKey] || 0) + (event.durationSec || 0) / 60;
  });

  // 2. Vocabulary & Grammar Progress
  const vocabProgress = await ctx.db
    .query('user_vocab_progress')
    .withIndex('by_user', q => q.eq('userId', userId))
    .collect();

  const wordsMasteredThisWeek = vocabProgress.filter(
    progress =>
      progress.status === 'MASTERED' &&
      (progress.lastReviewedAt ?? 0) >= weekStart &&
      (progress.lastReviewedAt ?? 0) <= weekEnd
  ).length;

  const grammarProgress = await ctx.db
    .query('user_grammar_progress')
    .withIndex('by_user_grammar', q => q.eq('userId', userId))
    .collect();

  const grammarMasteredThisWeek = grammarProgress.filter(
    progress =>
      progress.status === 'MASTERED' &&
      (progress.lastStudiedAt ?? 0) >= weekStart &&
      (progress.lastStudiedAt ?? 0) <= weekEnd
  ).length;

  const wordsSavedThisWeek = vocabProgress.filter(
    progress =>
      progress.savedByUser === true &&
      (progress.createdAt ?? 0) >= weekStart &&
      (progress.createdAt ?? 0) <= weekEnd
  ).length;

  const savedSentences = await ctx.db
    .query('user_saved_sentences')
    .withIndex('by_user_createdAt', q => q.eq('userId', userId))
    .collect();
  const savedGrammar = await ctx.db
    .query('user_grammar_saved')
    .withIndex('by_user_createdAt', q => q.eq('userId', userId))
    .collect();
  const sentencesSavedThisWeek = savedSentences.filter(
    item => item.createdAt >= weekStart && item.createdAt <= weekEnd
  ).length;
  const grammarSavedThisWeek = savedGrammar.filter(
    item => item.createdAt >= weekStart && item.createdAt <= weekEnd
  ).length;
  const sentenceReviewDue = savedSentences.filter(
    item => (item.fsrsDue ?? 0) > 0 && (item.fsrsDue ?? 0) <= now
  ).length;
  const grammarReviewDue = savedGrammar.filter(
    item => (item.fsrsDue ?? 0) > 0 && (item.fsrsDue ?? 0) <= now
  ).length;

  // 3. TOPIK Writing Performance
  const writingAttempts = await ctx.db
    .query('topik_writing_attempts')
    .withIndex('by_user_createdAt', q =>
      q.eq('userId', userId).gte('createdAt', weekStart).lte('createdAt', weekEnd)
    )
    .collect();

  const avgWritingScore =
    writingAttempts.length > 0
      ? writingAttempts.reduce((sum, attempt) => sum + (attempt.estimatedScore || 0), 0) /
        writingAttempts.length
      : 0;

  // 4. Weakness Analysis (from user_mistakes)
  const mistakes = await ctx.db
    .query('user_mistakes')
    .withIndex('by_user_createdAt', q =>
      q.eq('userId', userId).gte('createdAt', weekStart).lte('createdAt', weekEnd)
    )
    .collect();

  const errorTypeFrequency: Record<string, number> = {};
  const kagasFrequency: Record<string, number> = {};
  mistakes.forEach(mistake => {
    errorTypeFrequency[mistake.errorType] = (errorTypeFrequency[mistake.errorType] || 0) + 1;
    const kagasType = mistake.errorTypeKagas || mistake.errorType;
    kagasFrequency[kagasType] = (kagasFrequency[kagasType] || 0) + 1;
  });

  const kagasRanked = Object.entries(kagasFrequency)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 5)
    .map(([type, count]) => {
      const info = KAGAS_ERROR_TYPES[type as KagasErrorType];
      return {
        type,
        labelKo: info?.ko || type,
        labelZh: info?.zh || type,
        count,
      };
    });

  const topMistakes = mistakes
    .sort((left, right) => {
      if (left.severity === 'HIGH' && right.severity !== 'HIGH') return -1;
      if (left.severity !== 'HIGH' && right.severity === 'HIGH') return 1;
      return right.createdAt - left.createdAt;
    })
    .slice(0, 5)
    .map(mistake => ({
      originalText: mistake.originalText,
      correctedText: mistake.correctedText,
      explanation: mistake.explanationZh,
      type: mistake.errorType,
      kagasType: mistake.errorTypeKagas,
    }));

  // 5. Suggestions — enhanced with KAGAS insights
  let focusSuggestion = '继续保持学习节奏！';
  const grammarErrors = errorTypeFrequency.GRAMMAR || 0;
  const vocabErrors = errorTypeFrequency.VOCAB || 0;
  const josaErrors = kagasFrequency.JOSA_ERR || 0;
  const eomiErrors = kagasFrequency.EOMI_ERR || 0;
  const spellingErrors = kagasFrequency.SPELLING_ERR || 0;

  if (josaErrors >= 3) {
    focusSuggestion = '本周助词（조사）错误较多，建议重点复习은/는, 이/가, 을/를 的使用规则。';
  } else if (eomiErrors >= 3) {
    focusSuggestion = '本周语尾（어미）错误较多，建议复习连接语尾和终结语尾的使用。';
  } else if (grammarErrors > vocabErrors) {
    focusSuggestion = '本周语法错误较多，建议重点复习推荐的语法点。';
  } else if (vocabErrors > 3) {
    focusSuggestion = '词汇准确性有待提高，建议多进行单词拼写和用法练习。';
  } else if (spellingErrors >= 3) {
    focusSuggestion = '拼写错误较频繁，建议练习韩语打字和常见拼写规则。';
  } else if (writingAttempts.length === 0) {
    focusSuggestion = '本周还未进行写作练习，建议尝试一篇 TOPIK 51/52 题。';
  }

  return {
    weekStart,
    weekEnd,
    stats: {
      totalMinutes: Math.round(totalMinutes),
      sessionsCount,
      wordsMastered: wordsMasteredThisWeek,
      grammarMastered: grammarMasteredThisWeek,
      writingAttemptsCount: writingAttempts.length,
      avgWritingScore: Math.round(avgWritingScore),
    },
    moduleBreakdown,
    weakPoints: {
      errorTypeFrequency,
      kagasRanked,
      topMistakes,
    },
    assetSummary: {
      wordsSaved: wordsSavedThisWeek,
      sentencesSaved: sentencesSavedThisWeek,
      grammarSaved: grammarSavedThisWeek,
      sentenceReviewDue,
      grammarReviewDue,
    },
    suggestions: {
      focusSuggestion,
      nextWeekGoal: '尝试完成 2 篇写作练习并复习 20 个生词',
    },
  };
}

export const getWeeklyReport = query({
  args: {
    weekOffset: v.optional(v.number()), // 0 for current week, 1 for last week
  },
  handler: async (ctx, args): Promise<WeeklyReportData | null> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) return null;

    return buildWeeklyReportForUser(ctx, userId, args.weekOffset ?? 0);
  },
});

function buildWeeklyFocusChecklist(report: WeeklyReportData): string[] {
  const checklist: string[] = [];
  if (report.assetSummary.sentenceReviewDue > 0) {
    checklist.push(`先完成 ${report.assetSummary.sentenceReviewDue} 句句子复习`);
  }
  if (report.assetSummary.grammarReviewDue > 0) {
    checklist.push(`复盘 ${report.assetSummary.grammarReviewDue} 条语法复习项`);
  }
  if (report.weakPoints.kagasRanked.length > 0) {
    checklist.push(`针对 ${report.weakPoints.kagasRanked[0].labelZh} 做 1 轮写作修正练习`);
  }
  if (report.assetSummary.wordsSaved > 0) {
    checklist.push(`复习本周新增词汇中的高频项（至少 10 个）`);
  }
  return checklist.slice(0, 4);
}

function buildWeeklyFocusStrategy(args: {
  report: WeeklyReportData;
  profile: GoalProfileDto | null;
}): WeeklyFocusStrategy {
  const focus = args.profile?.studyFocus.map(item => item.toLowerCase()) ?? [];
  const hasTopikGoal =
    (args.profile?.targetExam ?? '').toUpperCase().includes('TOPIK') ||
    focus.some(item => item.includes('topik') || item.includes('exam') || item.includes('写作'));
  const hasImportedAssets =
    args.report.assetSummary.sentencesSaved > 0 ||
    args.report.assetSummary.grammarSaved > 0 ||
    args.report.assetSummary.sentenceReviewDue > 0 ||
    args.report.assetSummary.grammarReviewDue > 0;

  if (hasTopikGoal && args.report.weakPoints.kagasRanked.length > 0) {
    return {
      key: 'topik_weakness_first',
      label: 'TOPIK 弱点优先',
      weights: { review: 45, grammar: 32, writing: 58, vocab: 24, listening: 8 },
    };
  }

  if (hasImportedAssets) {
    return {
      key: 'imported_asset_loop',
      label: '导入内容资产优先',
      weights: { review: 56, grammar: 44, writing: 22, vocab: 32, listening: 8 },
    };
  }

  return {
    key: 'balanced_weekly_focus',
    label: '均衡周计划',
    weights: { review: 30, grammar: 26, writing: 24, vocab: 26, listening: 18 },
  };
}

function buildTaskPriorityWeight(args: {
  report: WeeklyReportData;
  strategy: WeeklyFocusStrategy;
  task: {
    kind: string;
  };
}): number {
  let weight = 10;
  const hasTopikWeakness = args.report.weakPoints.kagasRanked.length > 0;

  if (args.task.kind === 'note_review') {
    weight +=
      args.report.assetSummary.sentenceReviewDue + args.report.assetSummary.grammarReviewDue > 0
        ? args.strategy.weights.review
        : 0;
  }
  if (args.task.kind === 'grammar_drill') {
    weight += args.report.assetSummary.grammarReviewDue > 0 ? args.strategy.weights.grammar : 0;
    weight += hasTopikWeakness ? Math.round(args.strategy.weights.grammar / 2) : 0;
  }
  if (args.task.kind === 'typing_wpm') {
    weight += hasTopikWeakness ? args.strategy.weights.writing : 0;
  }
  if (args.task.kind === 'vocab_20') {
    weight += args.report.assetSummary.wordsSaved > 0 ? args.strategy.weights.vocab : 0;
  }
  if (args.task.kind === 'listening_10min' && args.report.stats.totalMinutes < 60) {
    weight += args.strategy.weights.listening;
  }

  return weight;
}

function adjustTaskTargetCount(args: {
  report: WeeklyReportData;
  task: {
    kind: string;
    targetCount?: number;
  };
}): number | undefined {
  const currentTarget = args.task.targetCount;
  if (typeof currentTarget !== 'number' || !Number.isFinite(currentTarget)) {
    return currentTarget;
  }

  if (args.task.kind === 'note_review') {
    const dueTotal =
      args.report.assetSummary.sentenceReviewDue + args.report.assetSummary.grammarReviewDue;
    const boostedTarget = Math.min(
      6,
      Math.max(currentTarget, dueTotal >= 15 ? 4 : dueTotal >= 6 ? 3 : 2)
    );
    return boostedTarget;
  }
  if (args.task.kind === 'grammar_drill' && args.report.assetSummary.grammarReviewDue > 0) {
    return Math.max(currentTarget, 2);
  }
  if (args.task.kind === 'typing_wpm' && args.report.weakPoints.kagasRanked.length > 0) {
    return Math.max(currentTarget, 2);
  }
  if (args.task.kind === 'vocab_20' && args.report.assetSummary.wordsSaved >= 20) {
    return Math.max(currentTarget, 30);
  }
  return currentTarget;
}

function buildTaskAdjustmentReason(args: {
  report: WeeklyReportData;
  task: {
    kind: string;
  };
  strategy: WeeklyFocusStrategy;
}): string {
  if (args.task.kind === 'note_review') {
    const dueTotal =
      args.report.assetSummary.sentenceReviewDue + args.report.assetSummary.grammarReviewDue;
    return dueTotal > 0 ? `句子/语法待复习 ${dueTotal} 项` : args.strategy.label;
  }
  if (args.task.kind === 'typing_wpm' && args.report.weakPoints.kagasRanked.length > 0) {
    return `TOPIK 高频错误：${args.report.weakPoints.kagasRanked[0].labelZh}`;
  }
  if (args.task.kind === 'grammar_drill' && args.report.assetSummary.grammarReviewDue > 0) {
    return `语法资产待复习 ${args.report.assetSummary.grammarReviewDue} 项`;
  }
  if (args.task.kind === 'vocab_20' && args.report.assetSummary.wordsSaved > 0) {
    return `本周新增词汇 ${args.report.assetSummary.wordsSaved} 个`;
  }
  return args.strategy.label;
}

export const applyWeeklyFocusToTodayPlan = mutation({
  args: {
    weekOffset: v.optional(v.number()),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<WeeklyFocusApplyResult> => {
    const userId = await getAuthUserId(ctx).catch(() => null);
    if (!userId) {
      return { success: false as const, message: 'UNAUTHORIZED' };
    }

    const report = await buildWeeklyReportForUser(ctx, userId, args.weekOffset ?? 0);
    const onboardingState = await ctx.runQuery(api.onboarding.getState, {});
    const strategy = buildWeeklyFocusStrategy({
      report,
      profile: onboardingState.profile,
    });

    const plan = await ctx.runMutation(api.dailyTask.generateTodayPlan, {
      language: args.language,
    });

    const checklist = buildWeeklyFocusChecklist(report);
    const checklistText =
      checklist.length > 0 ? checklist.map((item, index) => `${index + 1}. ${item}`).join(' ') : '';
    const weeklyRationale = `周报回写：${report.suggestions.focusSuggestion}${checklistText ? ` 本周执行：${checklistText}` : ''}`;
    const mergedRationale = plan.rationale
      ? `${plan.rationale} ${weeklyRationale}`
      : weeklyRationale;

    const todayDate = plan.date;
    const persisted = await ctx.db
      .query('daily_task_plan')
      .withIndex('by_user_date', q => q.eq('userId', userId).eq('date', todayDate))
      .first();

    let adjustments: WeeklyFocusTaskAdjustment[] = [];
    if (persisted) {
      const beforeIndexByTaskId = new Map(
        persisted.tasks.map((task, index) => [task.taskId, index] as const)
      );
      const beforeTargetByTaskId = new Map(
        persisted.tasks.map(task => [task.taskId, task.targetCount] as const)
      );
      const reorderedTasks = [...persisted.tasks]
        .map(task => ({
          ...task,
          targetCount: adjustTaskTargetCount({ report, task }),
        }))
        .sort((left, right) => {
          const leftWeight = buildTaskPriorityWeight({ report, strategy, task: left });
          const rightWeight = buildTaskPriorityWeight({ report, strategy, task: right });
          return rightWeight - leftWeight;
        });

      adjustments = reorderedTasks.map((task, afterIndex) => ({
        taskId: task.taskId,
        kind: task.kind,
        title: task.title,
        beforeIndex: beforeIndexByTaskId.get(task.taskId) ?? afterIndex,
        afterIndex,
        beforeTargetCount: beforeTargetByTaskId.get(task.taskId),
        afterTargetCount: task.targetCount,
        priorityWeight: buildTaskPriorityWeight({ report, strategy, task }),
        reason: buildTaskAdjustmentReason({ report, strategy, task }),
      }));

      const allCompleted =
        reorderedTasks.length > 0 && reorderedTasks.every(task => task.completed);
      await ctx.db.patch(persisted._id, {
        tasks: reorderedTasks,
        status: allCompleted ? 'completed' : 'ready',
        rationale: mergedRationale,
        updatedAt: Date.now(),
        completedAt: allCompleted ? (persisted.completedAt ?? Date.now()) : undefined,
      });
    }

    return {
      success: true as const,
      checklist,
      rationale: mergedRationale,
      planDate: todayDate,
      strategy,
      adjustments,
    };
  },
});
