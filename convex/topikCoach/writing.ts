/**
 * TOPIK Writing Coach — score prediction & improvement plan generation.
 *
 * Complements the existing `topikWritingCoach.ts` (per-attempt evaluation)
 * with longitudinal analysis across multiple attempts.
 *
 * Data sources:
 * - `topik_writing_attempts` — per-attempt scores and feedback
 * - `user_mistakes` — structured error records with KAGAS types
 * - `topik_score_predictions` — computed predictions
 * - `topik_improvement_plans` — generated plans
 */

import { mutation, query } from '../_generated/server';
import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from '../utils';
import { KAGAS_ERROR_TYPES } from '../topikWritingValidators';

/** Minimum attempts needed for a meaningful prediction */
const MIN_ATTEMPTS_FOR_PREDICTION = 3;
/** Maximum attempts to scan for prediction */
const MAX_ATTEMPTS_SCAN = 20;

/** Task type max scores */
const TASK_MAX_SCORES: Record<string, number> = {
  '51': 10,
  '52': 10,
  '53': 30,
  '54': 50,
};

/** TOPIK writing level thresholds (total out of 100) */
const LEVEL_THRESHOLDS = [
  { minScore: 80, level: 6 },
  { minScore: 65, level: 5 },
  { minScore: 50, level: 4 },
  { minScore: 35, level: 3 },
] as const;

type TopikDimensionBreakdown = {
  taskAccomplishment: number;
  developmentStructure: number;
  languageUse: number;
  wongojiRules: number;
};

type ParsedFeedback = {
  dimensionScores?: Partial<TopikDimensionBreakdown>;
  weaknesses?: string[];
  nextPracticeSuggestion?: string;
  revisionGoals?: TopikWritingRevisionGoal[];
};

export type TopikScorePredictionRecord = Doc<'topik_score_predictions'>;
export type TopikImprovementPlanRecord = Doc<'topik_improvement_plans'>;
export type TopikMistakeBookCategory = {
  type: string;
  count: number;
  severityCounts: Record<string, number>;
  recentExamples: Array<{
    original: string;
    corrected: string;
    explanation: string;
    createdAt: number;
  }>;
  label: string;
  labelZh: string;
  category: string;
};

export type TopikMistakeBookResult = {
  totalErrors: number;
  categories: TopikMistakeBookCategory[];
};

export type TopikHotTopic = {
  taskType: string;
  promptPreview: string;
  count: number;
  avgScore: number;
  totalScore: number;
};

export type TopikWritingProgressTrend = 'improving' | 'declining' | 'stable' | 'insufficient_data';

export type TopikWritingProgressTimelinePoint = {
  attemptId: Id<'topik_writing_attempts'>;
  taskType: string;
  promptPreview: string;
  estimatedScore: number;
  normalizedScore: number;
  createdAt: number;
};

export type TopikWritingRewriteAttemptSnapshot = {
  attemptId: Id<'topik_writing_attempts'>;
  userAnswer: string;
  estimatedScore: number;
  feedbackSummary?: string;
  improvedVersion?: string;
  createdAt: number;
};

export type TopikWritingRetryHistoryPoint = {
  attemptId: Id<'topik_writing_attempts'>;
  estimatedScore: number;
  createdAt: number;
};

export type TopikWritingRevisionGoal = {
  goalId: string;
  title: string;
  target: string;
  source: 'weakness' | 'feedback' | 'default';
};

export type TopikWritingRewriteComparison = {
  promptKey: string;
  taskType: string;
  promptPreview: string;
  attemptCount: number;
  firstScore: number;
  latestScore: number;
  bestScore: number;
  scoreDelta: number;
  lastAttemptAt: number;
  firstAttempt: TopikWritingRewriteAttemptSnapshot;
  latestAttempt: TopikWritingRewriteAttemptSnapshot;
  revisionFocus: string[];
  retryHistory: TopikWritingRetryHistoryPoint[];
  revisionGoals: TopikWritingRevisionGoal[];
};

export type TopikWritingProgressResult = {
  attemptsAnalyzed: number;
  averageScore: number;
  latestScore: number;
  bestScore: number;
  scoreDelta: number;
  trend: TopikWritingProgressTrend;
  timeline: TopikWritingProgressTimelinePoint[];
  rewriteComparisons: TopikWritingRewriteComparison[];
};

export type TopikPredictionResult =
  | {
      error: 'insufficient_data';
      message: string;
    }
  | {
      _id: Id<'topik_score_predictions'>;
      predictedTotal: number;
      estimatedLevel: number;
      dimensionBreakdown: TopikDimensionBreakdown;
      confidence: number;
    };

export type TopikImprovementTask = {
  description: string;
  taskType?: string;
  targetCount: number;
  priority: number;
};

export type TopikImprovementWeek = {
  week: number;
  focus: string;
  tasks: TopikImprovementTask[];
};

export type TopikImprovementPlanResult = {
  _id: Id<'topik_improvement_plans'>;
  targetLevel: number;
  currentLevel: number;
  weakErrorCodes: Array<{ code: string; label: string; labelZh: string }>;
  weeklyTasks: TopikImprovementWeek[];
};

function parseFeedbackJson(raw: string | undefined): ParsedFeedback | null {
  if (!raw) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }

  const dimensionScores = (parsed as Record<string, unknown>).dimensionScores;
  const weaknesses = (parsed as Record<string, unknown>).weaknesses;
  const nextPracticeSuggestion = (parsed as Record<string, unknown>).nextPracticeSuggestion;
  const revisionGoals = (parsed as Record<string, unknown>).revisionGoals;
  const parsedFeedback: ParsedFeedback = {
    weaknesses: Array.isArray(weaknesses)
      ? weaknesses.filter((item): item is string => typeof item === 'string').slice(0, 3)
      : undefined,
    nextPracticeSuggestion:
      typeof nextPracticeSuggestion === 'string' ? nextPracticeSuggestion : undefined,
    revisionGoals: Array.isArray(revisionGoals)
      ? revisionGoals
          .filter(
            (item): item is Record<string, unknown> => typeof item === 'object' && item !== null
          )
          .flatMap((item, index): TopikWritingRevisionGoal[] => {
            if (typeof item.title !== 'string' || typeof item.target !== 'string') {
              return [];
            }
            const source =
              item.source === 'feedback' || item.source === 'default' ? item.source : 'weakness';
            return [
              {
                goalId: typeof item.goalId === 'string' ? item.goalId : `goal:${index}`,
                title: item.title,
                target: item.target,
                source,
              },
            ];
          })
          .slice(0, 3)
      : undefined,
  };

  if (typeof dimensionScores !== 'object' || dimensionScores === null) {
    return parsedFeedback;
  }

  const record = dimensionScores as Record<string, unknown>;
  return {
    ...parsedFeedback,
    dimensionScores: {
      taskAccomplishment:
        typeof record.taskAccomplishment === 'number' ? record.taskAccomplishment : undefined,
      developmentStructure:
        typeof record.developmentStructure === 'number' ? record.developmentStructure : undefined,
      languageUse: typeof record.languageUse === 'number' ? record.languageUse : undefined,
      wongojiRules: typeof record.wongojiRules === 'number' ? record.wongojiRules : undefined,
    },
  };
}

function scoreToLevel(score: number): number {
  for (const t of LEVEL_THRESHOLDS) {
    if (score >= t.minScore) return t.level;
  }
  return 2;
}

function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function getEstimatedScore(attempt: Doc<'topik_writing_attempts'>): number {
  return attempt.estimatedScore ?? 0;
}

function getNormalizedScore(attempt: Doc<'topik_writing_attempts'>): number {
  const maxScore = TASK_MAX_SCORES[attempt.taskType] ?? 50;
  return roundOneDecimal((getEstimatedScore(attempt) / maxScore) * 100);
}

function getPromptPreview(prompt: string): string {
  return prompt.trim().replace(/\s+/g, ' ').slice(0, 100);
}

function getPromptKey(attempt: Doc<'topik_writing_attempts'>): string {
  return `${attempt.taskType}:${getPromptPreview(attempt.prompt).slice(0, 80)}`;
}

function toRewriteAttemptSnapshot(
  attempt: Doc<'topik_writing_attempts'>
): TopikWritingRewriteAttemptSnapshot {
  return {
    attemptId: attempt._id,
    userAnswer: attempt.userAnswer,
    estimatedScore: getEstimatedScore(attempt),
    feedbackSummary: attempt.feedbackSummary,
    improvedVersion: attempt.improvedVersion,
    createdAt: attempt.createdAt,
  };
}

function getRevisionFocus(attempt: Doc<'topik_writing_attempts'>): string[] {
  const feedback = parseFeedbackJson(attempt.fullFeedbackJson);
  const focus = [
    ...(feedback?.weaknesses ?? []),
    ...(feedback?.nextPracticeSuggestion ? [feedback.nextPracticeSuggestion] : []),
  ];
  if (focus.length > 0) {
    return focus.slice(0, 3);
  }
  if (attempt.feedbackSummary) {
    return [attempt.feedbackSummary];
  }
  return ['再次重写时优先补强论点连接、结论呼应和高频语法准确度。'];
}

function summarizeRevisionTitle(text: string): string {
  const compact = text.replace(/[。.!！?？].*$/, '').trim();
  return compact.length > 12 ? compact.slice(0, 12) : compact || '修订目标';
}

function getRevisionGoals(attempt: Doc<'topik_writing_attempts'>): TopikWritingRevisionGoal[] {
  const feedback = parseFeedbackJson(attempt.fullFeedbackJson);
  if (feedback?.revisionGoals && feedback.revisionGoals.length > 0) {
    return feedback.revisionGoals.map((goal, index) => ({
      ...goal,
      goalId: goal.goalId || `${attempt._id}:${index}`,
    }));
  }

  const focus = getRevisionFocus(attempt);
  return focus.slice(0, 3).map((item, index) => ({
    goalId: `${attempt._id}:${index}`,
    title: summarizeRevisionTitle(item),
    target: item,
    source: index === 0 ? 'weakness' : 'feedback',
  }));
}

function getProgressTrend(attemptCount: number, scoreDelta: number): TopikWritingProgressTrend {
  if (attemptCount < 2) return 'insufficient_data';
  if (scoreDelta >= 2) return 'improving';
  if (scoreDelta <= -2) return 'declining';
  return 'stable';
}

// ── Queries ──────────────────────────────────────────────────────

/**
 * Get the latest score prediction for the current user.
 */
export const getScorePrediction = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query('topik_score_predictions')
      .withIndex('by_user_generatedAt', q => q.eq('userId', userId))
      .order('desc')
      .first();
  },
});

/**
 * Get the user's active improvement plan.
 */
export const getImprovementPlan = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query('topik_improvement_plans')
      .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'active'))
      .first();
  },
});

/**
 * Get the user's TOPIK writing mistake book — errors grouped by KAGAS type
 * with frequency, severity, and recent examples.
 */
export const getMistakeBook = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const mistakes = await ctx.db
      .query('user_mistakes')
      .withIndex('by_user_source', q => q.eq('userId', userId).eq('sourceType', 'TOPIK_WRITING'))
      .take(500);

    if (mistakes.length === 0) {
      return { totalErrors: 0, categories: [] } satisfies TopikMistakeBookResult;
    }

    // Group by KAGAS type
    const groups = new Map<
      string,
      {
        type: string;
        count: number;
        severityCounts: Record<string, number>;
        recentExamples: Array<{
          original: string;
          corrected: string;
          explanation: string;
          createdAt: number;
        }>;
      }
    >();

    for (const m of mistakes) {
      const type = m.errorTypeKagas ?? m.errorType;
      const group = groups.get(type) || {
        type,
        count: 0,
        severityCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 },
        recentExamples: [],
      };
      group.count += 1;
      if (m.severity) {
        group.severityCounts[m.severity] = (group.severityCounts[m.severity] || 0) + 1;
      }
      if (group.recentExamples.length < 3) {
        group.recentExamples.push({
          original: m.originalText,
          corrected: m.correctedText,
          explanation: m.explanationZh,
          createdAt: m.createdAt,
        });
      }
      groups.set(type, group);
    }

    const categories = Array.from(groups.values())
      .map(g => {
        const kagasInfo = KAGAS_ERROR_TYPES[g.type as keyof typeof KAGAS_ERROR_TYPES];
        return {
          ...g,
          label: kagasInfo ? kagasInfo.ko : g.type,
          labelZh: kagasInfo ? kagasInfo.zh : g.type,
          category: kagasInfo ? kagasInfo.category : 'OTHER',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, args.limit ?? 20);

    return { totalErrors: mistakes.length, categories };
  },
});

/**
 * Get hot/trending TOPIK writing topics based on recent attempts.
 */
export const getHotTopics = query({
  args: {},
  handler: async ctx => {
    const attempts = await ctx.db.query('topik_writing_attempts').order('desc').take(200);

    // Group by prompt (truncated) + task type
    const topicCounts = new Map<
      string,
      {
        taskType: string;
        promptPreview: string;
        count: number;
        avgScore: number;
        totalScore: number;
      }
    >();

    for (const a of attempts) {
      // Use first 50 chars of prompt as key
      const key = `${a.taskType}:${a.prompt.slice(0, 50)}`;
      const topic = topicCounts.get(key) || {
        taskType: a.taskType,
        promptPreview: a.prompt.slice(0, 100),
        count: 0,
        avgScore: 0,
        totalScore: 0,
      };
      topic.count += 1;
      topic.totalScore += a.estimatedScore ?? 0;
      topicCounts.set(key, topic);
    }

    return Array.from(topicCounts.values())
      .map(t => ({
        ...t,
        avgScore: t.count > 0 ? Math.round((t.totalScore / t.count) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  },
});

/**
 * Get longitudinal TOPIK writing progress for trend and rewrite comparison UI.
 */
export const getWritingProgress = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<TopikWritingProgressResult | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const limit = Math.min(Math.max(args.limit ?? 12, 1), 50);
    const recentAttemptsDesc = await ctx.db
      .query('topik_writing_attempts')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);
    const attempts = [...recentAttemptsDesc].reverse();

    if (attempts.length === 0) {
      return {
        attemptsAnalyzed: 0,
        averageScore: 0,
        latestScore: 0,
        bestScore: 0,
        scoreDelta: 0,
        trend: 'insufficient_data',
        timeline: [],
        rewriteComparisons: [],
      };
    }

    const scores = attempts.map(getEstimatedScore);
    const firstScore = scores[0] ?? 0;
    const latestScore = scores[scores.length - 1] ?? 0;
    const scoreDelta = roundOneDecimal(latestScore - firstScore);
    const averageScore = roundOneDecimal(
      scores.reduce((sum, score) => sum + score, 0) / scores.length
    );
    const bestScore = Math.max(...scores);

    const timeline = attempts.map(
      (attempt): TopikWritingProgressTimelinePoint => ({
        attemptId: attempt._id,
        taskType: attempt.taskType,
        promptPreview: getPromptPreview(attempt.prompt),
        estimatedScore: getEstimatedScore(attempt),
        normalizedScore: getNormalizedScore(attempt),
        createdAt: attempt.createdAt,
      })
    );

    const groups = new Map<string, Doc<'topik_writing_attempts'>[]>();
    for (const attempt of attempts) {
      const key = getPromptKey(attempt);
      const group = groups.get(key) ?? [];
      group.push(attempt);
      groups.set(key, group);
    }

    const rewriteComparisons = Array.from(groups.entries())
      .flatMap(([promptKey, group]): TopikWritingRewriteComparison[] => {
        if (group.length < 2) return [];
        const sortedGroup = [...group].sort((a, b) => a.createdAt - b.createdAt);
        const first = sortedGroup[0];
        const latest = sortedGroup[sortedGroup.length - 1];
        if (!first || !latest) return [];

        const groupScores = sortedGroup.map(getEstimatedScore);
        return [
          {
            promptKey,
            taskType: latest.taskType,
            promptPreview: getPromptPreview(latest.prompt),
            attemptCount: sortedGroup.length,
            firstScore: getEstimatedScore(first),
            latestScore: getEstimatedScore(latest),
            bestScore: Math.max(...groupScores),
            scoreDelta: roundOneDecimal(getEstimatedScore(latest) - getEstimatedScore(first)),
            lastAttemptAt: latest.createdAt,
            firstAttempt: toRewriteAttemptSnapshot(first),
            latestAttempt: toRewriteAttemptSnapshot(latest),
            revisionFocus: getRevisionFocus(latest),
            revisionGoals: getRevisionGoals(latest),
            retryHistory: sortedGroup.map(attempt => ({
              attemptId: attempt._id,
              estimatedScore: getEstimatedScore(attempt),
              createdAt: attempt.createdAt,
            })),
          },
        ];
      })
      .sort((a, b) => b.lastAttemptAt - a.lastAttemptAt)
      .slice(0, 4);

    return {
      attemptsAnalyzed: attempts.length,
      averageScore,
      latestScore,
      bestScore,
      scoreDelta,
      trend: getProgressTrend(attempts.length, scoreDelta),
      timeline,
      rewriteComparisons,
    };
  },
});

// ── Mutations ────────────────────────────────────────────────────

/**
 * Compute and store a TOPIK writing score prediction.
 *
 * Aggregates recent attempts to estimate per-dimension and total scores.
 * Requires at least 3 attempts to generate a prediction.
 */
export const predictScore = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    // Get recent writing attempts
    const attempts = await ctx.db
      .query('topik_writing_attempts')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .order('desc')
      .take(MAX_ATTEMPTS_SCAN);

    if (attempts.length < MIN_ATTEMPTS_FOR_PREDICTION) {
      return {
        error: 'insufficient_data',
        message: `Need at least ${MIN_ATTEMPTS_FOR_PREDICTION} attempts, have ${attempts.length}`,
      };
    }

    // Parse feedback JSON for dimension scores
    const dimensionScores = {
      taskAccomplishment: [] as number[],
      developmentStructure: [] as number[],
      languageUse: [] as number[],
      wongojiRules: [] as number[],
    };

    const attemptIds: string[] = [];

    for (const attempt of attempts) {
      attemptIds.push(attempt._id);

      // Normalize score to 0-100
      const maxScore = TASK_MAX_SCORES[attempt.taskType] ?? 50;
      const normalizedScore = ((attempt.estimatedScore ?? 0) / maxScore) * 100;

      // Try to extract dimension scores from feedback JSON
      const feedback = parseFeedbackJson(attempt.fullFeedbackJson);

      if (feedback?.dimensionScores) {
        const ds = feedback.dimensionScores;
        if (typeof ds.taskAccomplishment === 'number')
          dimensionScores.taskAccomplishment.push(ds.taskAccomplishment);
        if (typeof ds.developmentStructure === 'number')
          dimensionScores.developmentStructure.push(ds.developmentStructure);
        if (typeof ds.languageUse === 'number') dimensionScores.languageUse.push(ds.languageUse);
        if (typeof ds.wongojiRules === 'number') dimensionScores.wongojiRules.push(ds.wongojiRules);
      } else {
        // Fallback: distribute normalized score across dimensions
        dimensionScores.taskAccomplishment.push(normalizedScore);
        dimensionScores.developmentStructure.push(normalizedScore);
        dimensionScores.languageUse.push(normalizedScore);
        dimensionScores.wongojiRules.push(normalizedScore);
      }
    }

    // Weighted average — more recent attempts count more
    function weightedAvg(scores: number[]): number {
      if (scores.length === 0) return 0;
      let totalWeight = 0;
      let weightedSum = 0;
      for (let i = 0; i < scores.length; i++) {
        const weight = scores.length - i; // Most recent = highest weight
        weightedSum += scores[i] * weight;
        totalWeight += weight;
      }
      return Math.round((weightedSum / totalWeight) * 10) / 10;
    }

    const breakdown = {
      taskAccomplishment: weightedAvg(dimensionScores.taskAccomplishment),
      developmentStructure: weightedAvg(dimensionScores.developmentStructure),
      languageUse: weightedAvg(dimensionScores.languageUse),
      wongojiRules: weightedAvg(dimensionScores.wongojiRules),
    };

    const predictedTotal =
      Math.round(
        (breakdown.taskAccomplishment * 0.3 +
          breakdown.developmentStructure * 0.25 +
          breakdown.languageUse * 0.3 +
          breakdown.wongojiRules * 0.15) *
          10
      ) / 10;

    // Confidence based on attempt count and score variance
    const confidence = Math.min(0.95, 0.5 + (attempts.length / MAX_ATTEMPTS_SCAN) * 0.45);

    const predictionId = await ctx.db.insert('topik_score_predictions', {
      userId,
      predictedTotal,
      dimensionBreakdown: breakdown,
      confidence: Math.round(confidence * 100) / 100,
      basedOnAttemptIds: attemptIds,
      attemptCount: attempts.length,
      generatedAt: now,
    });

    return {
      _id: predictionId,
      predictedTotal,
      estimatedLevel: scoreToLevel(predictedTotal),
      dimensionBreakdown: breakdown,
      confidence,
    };
  },
});

/**
 * Generate a personalized improvement plan based on error patterns.
 */
export const generateImprovementPlan = mutation({
  args: {
    targetLevel: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    // Get user's error patterns
    const mistakes = await ctx.db
      .query('user_mistakes')
      .withIndex('by_user_source', q => q.eq('userId', userId).eq('sourceType', 'TOPIK_WRITING'))
      .take(300);

    // Count errors by KAGAS type
    const errorCounts = new Map<string, number>();
    for (const m of mistakes) {
      const type = m.errorTypeKagas ?? m.errorType;
      errorCounts.set(type, (errorCounts.get(type) ?? 0) + 1);
    }

    // Sort by frequency → top weak areas
    const weakErrorCodes = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    // Get latest score prediction for target level estimation
    const latestPrediction = await ctx.db
      .query('topik_score_predictions')
      .withIndex('by_user_generatedAt', q => q.eq('userId', userId))
      .order('desc')
      .first();

    const currentLevel = latestPrediction ? scoreToLevel(latestPrediction.predictedTotal) : 3;
    const targetLevel = args.targetLevel ?? Math.min(6, currentLevel + 1);

    // Generate weekly tasks based on weak areas
    const weeklyTasks: TopikImprovementWeek[] = [];

    // Build 4-week plan
    for (let week = 1; week <= 4; week++) {
      const focusIdx = (week - 1) % weakErrorCodes.length;
      const focusCode = weakErrorCodes[focusIdx] ?? 'GENERAL';
      const kagasInfo = KAGAS_ERROR_TYPES[focusCode as keyof typeof KAGAS_ERROR_TYPES];
      const focusLabel = kagasInfo ? kagasInfo.zh : focusCode;

      const tasks: TopikImprovementTask[] = [];

      // Task 1: Practice the weak area
      tasks.push({
        description: `重点练习：修复${focusLabel}类错误`,
        targetCount: 3,
        priority: 1,
      });

      // Task 2: Write a specific task type
      if (week <= 2) {
        tasks.push({
          description: '完成 53 题（说明文/论述文）练习',
          taskType: '53',
          targetCount: 2,
          priority: 2,
        });
      } else {
        tasks.push({
          description: '完成 54 题（议论文）练习',
          taskType: '54',
          targetCount: 2,
          priority: 2,
        });
      }

      // Task 3: Review past mistakes
      tasks.push({
        description: '复习本周错题本中的错误',
        targetCount: 1,
        priority: 3,
      });

      weeklyTasks.push({
        week,
        focus: focusLabel,
        tasks,
      });
    }

    // Deactivate the existing active plan before creating the replacement.
    const existingPlan = await ctx.db
      .query('topik_improvement_plans')
      .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', 'active'))
      .first();

    if (existingPlan) {
      await ctx.db.patch(existingPlan._id, { status: 'abandoned', updatedAt: now });
    }

    const planId = await ctx.db.insert('topik_improvement_plans', {
      userId,
      targetLevel,
      weakErrorCodes,
      weeklyTasks,
      status: 'active',
      generatedAt: now,
      updatedAt: now,
    });

    return {
      _id: planId,
      targetLevel,
      currentLevel,
      weakErrorCodes: weakErrorCodes.map(code => {
        const info = KAGAS_ERROR_TYPES[code as keyof typeof KAGAS_ERROR_TYPES];
        return { code, label: info?.ko ?? code, labelZh: info?.zh ?? code };
      }),
      weeklyTasks,
    };
  },
});

/**
 * Mark an improvement plan as completed.
 */
export const completeImprovementPlan = mutation({
  args: {
    planId: v.id('topik_improvement_plans'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const plan = await ctx.db.get(args.planId);
    if (!plan || plan.userId !== userId) return null;

    await ctx.db.patch(args.planId, {
      status: 'completed',
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});
