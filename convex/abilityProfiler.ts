/**
 * Ability Profiler — computes and stores periodic snapshots of a learner's
 * abilities across five dimensions: vocabulary, grammar, reading, writing,
 * and listening.
 *
 * Each dimension score is 0-100. An estimated TOPIK level (1-6) is derived
 * from the weighted overall score.
 *
 * Data sources:
 * - vocabulary: user_vocab_progress (FSRS state, mastery ratio, lapses)
 * - grammar: user_grammar_progress (proficiency), user_grammar_saved
 * - reading: exam_attempts (READING type), imported_contents engagement
 * - writing: topik_writing_attempts (estimated scores)
 * - listening: listening_history (completion ratio), exam_attempts (LISTENING)
 */

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

/** Maximum items to scan per dimension */
const SCAN_LIMIT = 500;

/** TOPIK level thresholds (overall score → TOPIK level) */
const TOPIK_THRESHOLDS = [
  { minScore: 85, level: 6 },
  { minScore: 70, level: 5 },
  { minScore: 55, level: 4 },
  { minScore: 40, level: 3 },
  { minScore: 25, level: 2 },
  { minScore: 0, level: 1 },
] as const;

function estimateTopikLevel(overallScore: number): number {
  for (const t of TOPIK_THRESHOLDS) {
    if (overallScore >= t.minScore) return t.level;
  }
  return 1;
}

/** Clamp a value to [0, 100] and round to 1 decimal */
function clampScore(score: number): number {
  return Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;
}

/**
 * Get the latest ability snapshot for the current user.
 */
export const getLatestSnapshot = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const snapshot = await ctx.db
      .query('ability_snapshots')
      .withIndex('by_user_takenAt', q => q.eq('userId', userId))
      .order('desc')
      .first();

    return snapshot;
  },
});

/**
 * Get all snapshots for trend visualization.
 */
export const getSnapshotHistory = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = args.limit ?? 20;

    const snapshots = await ctx.db
      .query('ability_snapshots')
      .withIndex('by_user_takenAt', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);

    return snapshots.reverse(); // Chronological order for charts
  },
});

/**
 * Compute and store a new ability snapshot.
 *
 * This reads from multiple tables to build a composite profile:
 * - Vocabulary: FSRS mastery ratio + stability-weighted score
 * - Grammar: proficiency average from user_grammar_progress
 * - Reading: exam accuracy (READING type) + imported content count
 * - Writing: TOPIK writing attempt scores normalized to 100
 * - Listening: listening completion ratio + exam accuracy (LISTENING type)
 */
export const computeSnapshot = mutation({
  args: {
    trigger: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const trigger = args.trigger ?? 'manual';

    // ── 1. Vocabulary dimension ──
    const vocabProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(SCAN_LIMIT);

    let vocabScore = 0;
    const vocabCount = vocabProgress.length;
    if (vocabCount > 0) {
      let masteredCount = 0;
      let totalStability = 0;
      let stabilityCount = 0;

      for (const row of vocabProgress) {
        const state = row.state ?? 0;
        if (state === 2 || row.status === 'MASTERED') masteredCount++;

        if (typeof row.stability === 'number' && row.stability > 0) {
          totalStability += Math.min(row.stability, 365); // Cap at 1 year
          stabilityCount++;
        }
      }

      // Mastery ratio (0-60 points)
      const masteryRatio = masteredCount / vocabCount;
      const masteryPoints = masteryRatio * 60;

      // Stability bonus (0-20 points) — higher avg stability = better retention
      const avgStability = stabilityCount > 0 ? totalStability / stabilityCount : 0;
      const stabilityPoints = Math.min(20, (avgStability / 30) * 20); // 30 days = max

      // Volume bonus (0-20 points) — more words studied = broader knowledge
      const volumePoints = Math.min(20, (vocabCount / 200) * 20); // 200 words = max

      vocabScore = masteryPoints + stabilityPoints + volumePoints;
    }

    // ── 2. Grammar dimension ──
    const grammarProgress = await ctx.db
      .query('user_grammar_progress')
      .withIndex('by_user_grammar', q => q.eq('userId', userId))
      .take(SCAN_LIMIT);

    let grammarScore = 0;
    const grammarCount = grammarProgress.length;
    if (grammarCount > 0) {
      const totalProficiency = grammarProgress.reduce((sum, g) => sum + (g.proficiency ?? 0), 0);
      // Average proficiency (0-70 points)
      const avgProficiency = totalProficiency / grammarCount;
      const proficiencyPoints = (avgProficiency / 100) * 70;

      // Volume bonus (0-30 points) — more grammar points studied = broader coverage
      const volumePoints = Math.min(30, (grammarCount / 50) * 30); // 50 grammar points = max

      grammarScore = proficiencyPoints + volumePoints;
    }

    // ── 3. Reading dimension ──
    const examAttempts = await ctx.db
      .query('exam_attempts')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(SCAN_LIMIT);

    // Resolve exam types
    const examIds = [...new Set(examAttempts.map(a => a.examId))];
    const exams = await Promise.all(examIds.map(id => ctx.db.get(id)));
    const examTypeMap = new Map<string, string>();
    for (const e of exams) {
      if (e) examTypeMap.set(e._id, e.type as string);
    }

    const readingAttempts = examAttempts.filter(a => examTypeMap.get(a.examId) === 'READING');

    let readingScore = 0;
    const readingCount = readingAttempts.length;
    if (readingCount > 0) {
      const avgAccuracy = readingAttempts.reduce((s, a) => s + (a.accuracy ?? 0), 0) / readingCount;

      // Accuracy score (0-70 points)
      const accuracyPoints = (avgAccuracy / 100) * 70;

      // Volume bonus (0-30 points)
      const volumePoints = Math.min(30, (readingCount / 10) * 30);

      readingScore = accuracyPoints + volumePoints;
    }

    // ── 4. Writing dimension ──
    const writingAttempts = await ctx.db
      .query('topik_writing_attempts')
      .withIndex('by_user_createdAt', q => q.eq('userId', userId))
      .take(SCAN_LIMIT);

    let writingScore = 0;
    const writingCount = writingAttempts.length;
    if (writingCount > 0) {
      // Normalize scores: task 51/52 max=10, task 53 max=30, task 54 max=50
      let normalizedTotal = 0;
      for (const attempt of writingAttempts) {
        const maxScore = attempt.taskType === '54' ? 50 : attempt.taskType === '53' ? 30 : 10;
        const normalized = ((attempt.estimatedScore ?? 0) / maxScore) * 100;
        normalizedTotal += Math.min(100, normalized);
      }
      const avgNormalized = normalizedTotal / writingCount;

      // Score (0-70 points)
      const scorePoints = (avgNormalized / 100) * 70;

      // Volume bonus (0-30 points)
      const volumePoints = Math.min(30, (writingCount / 10) * 30);

      writingScore = scorePoints + volumePoints;
    }

    // ── 5. Listening dimension ──
    const listeningAttempts = examAttempts.filter(a => examTypeMap.get(a.examId) === 'LISTENING');

    const listeningHistory = await ctx.db
      .query('listening_history')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(SCAN_LIMIT);

    let listeningScore = 0;
    const listeningExamCount = listeningAttempts.length;
    const listeningHistoryCount = listeningHistory.length;

    if (listeningExamCount > 0 || listeningHistoryCount > 0) {
      // Exam accuracy (0-40 points)
      let examPoints = 0;
      if (listeningExamCount > 0) {
        const avgAccuracy =
          listeningAttempts.reduce((s, a) => s + (a.accuracy ?? 0), 0) / listeningExamCount;
        examPoints = (avgAccuracy / 100) * 40;
      }

      // Listening history completion ratio (0-30 points)
      let historyPoints = 0;
      if (listeningHistoryCount > 0) {
        let completedCount = 0;
        for (const h of listeningHistory) {
          if (h.duration && h.duration > 0 && h.progress / h.duration >= 0.7) {
            completedCount++;
          }
        }
        const completionRate = completedCount / listeningHistoryCount;
        historyPoints = completionRate * 30;
      }

      // Volume bonus (0-30 points)
      const totalListeningItems = listeningExamCount + listeningHistoryCount;
      const volumePoints = Math.min(30, (totalListeningItems / 20) * 30);

      listeningScore = examPoints + historyPoints + volumePoints;
    }

    // ── Compute overall score ──
    const dimensions = {
      vocabulary: clampScore(vocabScore),
      grammar: clampScore(grammarScore),
      reading: clampScore(readingScore),
      writing: clampScore(writingScore),
      listening: clampScore(listeningScore),
    };

    // Weighted average: vocab and grammar count more for general proficiency
    const overallScore = clampScore(
      dimensions.vocabulary * 0.25 +
        dimensions.grammar * 0.25 +
        dimensions.reading * 0.2 +
        dimensions.writing * 0.15 +
        dimensions.listening * 0.15
    );

    const estimatedTopikLevel = estimateTopikLevel(overallScore);

    const snapshotId = await ctx.db.insert('ability_snapshots', {
      userId,
      takenAt: now,
      overallScore,
      dimensions,
      estimatedTopikLevel,
      dataCounts: {
        vocabItems: vocabCount,
        grammarItems: grammarCount,
        readingAttempts: readingCount,
        writingAttempts: writingCount,
        listeningAttempts: listeningExamCount + listeningHistoryCount,
      },
      trigger,
    });

    return {
      _id: snapshotId,
      overallScore,
      dimensions,
      estimatedTopikLevel,
    };
  },
});

/**
 * Get current ability scores computed live (without creating a snapshot).
 * Lighter version for dashboard display when you don't need persistence.
 */
export const getLiveAbilityScores = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    // Fast: just get the latest snapshot if recent (within 7 days)
    const latestSnapshot = await ctx.db
      .query('ability_snapshots')
      .withIndex('by_user_takenAt', q => q.eq('userId', userId))
      .order('desc')
      .first();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    if (latestSnapshot && latestSnapshot.takenAt > sevenDaysAgo) {
      return {
        source: 'snapshot' as const,
        overallScore: latestSnapshot.overallScore,
        dimensions: latestSnapshot.dimensions,
        estimatedTopikLevel: latestSnapshot.estimatedTopikLevel,
        takenAt: latestSnapshot.takenAt,
      };
    }

    // No recent snapshot — compute a lightweight estimate from key metrics
    const [vocabProgress, grammarProgress] = await Promise.all([
      ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(300),
      ctx.db
        .query('user_grammar_progress')
        .withIndex('by_user_grammar', q => q.eq('userId', userId))
        .take(300),
    ]);

    const vocabCount = vocabProgress.length;
    const masteredVocab = vocabProgress.filter(
      r => r.state === 2 || r.status === 'MASTERED'
    ).length;
    const vocabScore =
      vocabCount > 0
        ? clampScore((masteredVocab / vocabCount) * 60 + Math.min(20, (vocabCount / 200) * 20))
        : 0;

    const grammarCount = grammarProgress.length;
    const avgProficiency =
      grammarCount > 0
        ? grammarProgress.reduce((s, g) => s + (g.proficiency ?? 0), 0) / grammarCount
        : 0;
    const grammarScore =
      grammarCount > 0
        ? clampScore((avgProficiency / 100) * 70 + Math.min(30, (grammarCount / 50) * 30))
        : 0;

    // For reading/writing/listening, use last snapshot values if available
    const dimensions = {
      vocabulary: vocabScore,
      grammar: grammarScore,
      reading: latestSnapshot?.dimensions.reading ?? 0,
      writing: latestSnapshot?.dimensions.writing ?? 0,
      listening: latestSnapshot?.dimensions.listening ?? 0,
    };

    const overallScore = clampScore(
      dimensions.vocabulary * 0.25 +
        dimensions.grammar * 0.25 +
        dimensions.reading * 0.2 +
        dimensions.writing * 0.15 +
        dimensions.listening * 0.15
    );

    return {
      source: 'live_estimate' as const,
      overallScore,
      dimensions,
      estimatedTopikLevel: estimateTopikLevel(overallScore),
      takenAt: Date.now(),
    };
  },
});
