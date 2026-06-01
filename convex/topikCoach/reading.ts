/**
 * TOPIK Reading Coach — analyzes user's reading exam performance
 * and surfaces patterns in wrong answers.
 *
 * Data sources:
 * - `exam_attempts` — per-exam scores and answer records
 * - `topik_questions` — question metadata (type, correct answer)
 * - `topik_exams` — exam metadata (type: READING/LISTENING)
 */

import { query } from '../_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from '../utils';
import type { TopikWeaknessProfile } from './shared';

const MAX_ATTEMPTS_SCAN = 50;

/**
 * Get the user's reading exam performance summary.
 * Aggregates accuracy across attempts and identifies weak question ranges.
 */
export const getReadingPerformance = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const limit = args.limit ?? 10;

    // Fetch recent exam attempts
    const attempts = await ctx.db
      .query('exam_attempts')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(MAX_ATTEMPTS_SCAN);

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        avgAccuracy: 0,
        recentAttempts: [],
        weaknesses: null,
      };
    }

    // Resolve exam types to filter reading-only
    const examIds = [...new Set(attempts.map(a => a.examId))];
    const exams = await Promise.all(examIds.map(id => ctx.db.get(id)));
    const readingExamIds = new Set(exams.filter(e => e && e.type === 'READING').map(e => e!._id));

    const readingAttempts = attempts.filter(a => readingExamIds.has(a.examId));

    if (readingAttempts.length === 0) {
      return {
        totalAttempts: 0,
        avgScore: 0,
        avgAccuracy: 0,
        recentAttempts: [],
        weaknesses: null,
      };
    }

    const avgScore = readingAttempts.reduce((s, a) => s + a.score, 0) / readingAttempts.length;
    const avgAccuracy =
      readingAttempts.reduce((s, a) => s + (a.accuracy ?? 0), 0) / readingAttempts.length;

    // Build section score breakdown
    const sectionBreakdown: Record<string, { total: number; count: number }> = {};
    for (const attempt of readingAttempts) {
      if (!attempt.sectionScores) continue;
      for (const [section, score] of Object.entries(attempt.sectionScores)) {
        const bucket = sectionBreakdown[section] || { total: 0, count: 0 };
        bucket.total += score;
        bucket.count += 1;
        sectionBreakdown[section] = bucket;
      }
    }

    const sectionAverages = Object.entries(sectionBreakdown).map(([section, data]) => ({
      section,
      avgScore: Math.round((data.total / data.count) * 10) / 10,
      attempts: data.count,
    }));

    return {
      totalAttempts: readingAttempts.length,
      avgScore: Math.round(avgScore * 10) / 10,
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      sectionAverages,
      recentAttempts: readingAttempts
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map(a => ({
          examId: a.examId,
          score: a.score,
          accuracy: a.accuracy,
          totalQuestions: a.totalQuestions,
          correctCount: a.correctCount,
          createdAt: a.createdAt,
        })),
    };
  },
});

/**
 * Get combined TOPIK weakness profile across reading + writing.
 */
export const getCombinedWeaknesses = query({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, _args): Promise<TopikWeaknessProfile[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const profiles: TopikWeaknessProfile[] = [];

    // Reading weakness from exam_attempts
    const readingAttempts = await ctx.db
      .query('exam_attempts')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(30);

    if (readingAttempts.length > 0) {
      const avgAcc =
        readingAttempts.reduce((s, a) => s + (a.accuracy ?? 0), 0) / readingAttempts.length;
      profiles.push({
        section: 'READING',
        totalAttempts: readingAttempts.length,
        avgAccuracy: Math.round(avgAcc * 10) / 10,
        weakQuestionTypes: [],
      });
    }

    // Writing weakness from topik_writing_attempts
    const writingAttempts = await ctx.db
      .query('topik_writing_attempts')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .take(30);

    if (writingAttempts.length > 0) {
      const avgScore =
        writingAttempts.reduce((s, a) => s + (a.estimatedScore ?? 0), 0) / writingAttempts.length;

      // Group by task type to find weak areas
      const taskTypeGroups = new Map<string, { errors: number; total: number }>();
      for (const attempt of writingAttempts) {
        const type = attempt.taskType || 'unknown';
        const bucket = taskTypeGroups.get(type) || { errors: 0, total: 0 };
        bucket.total += 1;
        // If score is below 60% of max, count as weak
        const maxScore = type === '54' ? 50 : type === '53' ? 30 : 10;
        if ((attempt.estimatedScore ?? 0) < maxScore * 0.6) {
          bucket.errors += 1;
        }
        taskTypeGroups.set(type, bucket);
      }

      profiles.push({
        section: 'WRITING',
        totalAttempts: writingAttempts.length,
        avgAccuracy: Math.round((avgScore / 50) * 100 * 10) / 10, // Normalize to %
        weakQuestionTypes: Array.from(taskTypeGroups.entries()).map(([type, data]) => ({
          type: `Q${type}`,
          errorCount: data.errors,
          totalCount: data.total,
          errorRate: Math.round((data.errors / data.total) * 100),
        })),
      });
    }

    return profiles;
  },
});
