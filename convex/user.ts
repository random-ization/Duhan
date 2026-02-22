import { mutation, query } from './_generated/server';
import { v, ConvexError } from 'convex/values';

import { getAuthUserId } from './utils';
import { asId } from './id';
import { normalizeAnswerMap, normalizeFiniteNumberMap } from './validation';

// Save a word to user's personal list
export const saveSavedWord = mutation({
  args: {
    korean: v.string(),
    english: v.string(),
    exampleSentence: v.optional(v.string()),
    exampleTranslation: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const { korean, english, exampleSentence, exampleTranslation } = args;

    await ctx.db.insert('saved_words', {
      userId,
      korean,
      english,
      exampleSentence,
      exampleTranslation,
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

export const getSavedWords = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limit = args.limit ?? 200;

    const rows = await ctx.db
      .query('saved_words')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(limit);

    return rows
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(r => ({
        id: r._id,
        korean: r.korean,
        english: r.english,
        exampleSentence: r.exampleSentence,
        exampleTranslation: r.exampleTranslation,
        createdAt: r.createdAt,
      }));
  },
});

export const getSavedWordsCount = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query('saved_words')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    return { count: rows.length };
  },
});

export const getMistakes = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limit = args.limit ?? 200;

    const rows = await ctx.db
      .query('mistakes')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(limit);

    return rows
      .slice()
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(r => ({
        id: r._id,
        korean: r.korean,
        english: r.english,
        context: r.context,
        createdAt: r.createdAt,
      }));
  },
});

export const getMistakesCount = query({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query('mistakes')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    return { count: rows.length };
  },
});

export const getExamAttempts = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const limit = args.limit ?? 200;

    const attempts = await ctx.db
      .query('exam_attempts')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(limit);

    const sorted = attempts.slice().sort((a, b) => b.createdAt - a.createdAt);
    const examIds = [...new Set(sorted.map(a => a.examId))];

    const examsArray = await Promise.all(examIds.map(id => ctx.db.get(id)));
    const examsMap = new Map(examsArray.filter(Boolean).map(e => [e!._id.toString(), e!]));

    const scoreMap = new Map<
      string,
      {
        totalScore: number;
        correctAnswerMap: Map<number, number>;
        indexToNumber: number[];
        numberToIndex: Map<number, number>;
      }
    >();
    await Promise.all(
      examIds.map(async examId => {
        const questions = await ctx.db
          .query('topik_questions')
          .withIndex('by_exam', q => q.eq('examId', examId))
          .collect();
        const sortedQuestions = questions.slice().sort((a, b) => a.number - b.number);
        const totalScore = sortedQuestions.reduce((sum, q) => sum + (q.score || 0), 0);
        const correctAnswerMap = new Map<number, number>(
          sortedQuestions.map(q => [q.number, q.correctAnswer])
        );
        const indexToNumber = sortedQuestions.map(q => q.number);
        const numberToIndex = new Map<number, number>(
          sortedQuestions.map((q, idx) => [q.number, idx])
        );
        scoreMap.set(examId.toString(), {
          totalScore,
          correctAnswerMap,
          indexToNumber,
          numberToIndex,
        });
      })
    );

    return sorted
      .map(a => {
        const exam = examsMap.get(a.examId.toString());
        if (!exam) return null;

        const answers = (a.answers || {}) as Record<string, number>;
        const entries = Object.entries(answers)
          .map(([k, v]) => [Number(k), v] as const)
          .filter(([k]) => Number.isFinite(k));

        const scoreInfo = scoreMap.get(a.examId.toString());
        const totalScore = scoreInfo?.totalScore ?? 0;
        const correctAnswerMap = scoreInfo?.correctAnswerMap ?? new Map<number, number>();
        const indexToNumber = scoreInfo?.indexToNumber ?? [];
        const numberToIndex = scoreInfo?.numberToIndex ?? new Map<number, number>();

        const numericKeys = entries.map(([k]) => k);
        const maxKey = numericKeys.length > 0 ? Math.max(...numericKeys) : -1;
        const hasZero = numericKeys.includes(0);
        const isZeroBased =
          hasZero || (numericKeys.length > 0 && maxKey <= Math.max(indexToNumber.length - 1, 0));

        const answersByNumber = new Map<number, number>();
        const userAnswers: Record<number, number> = {};

        for (const [key, value] of entries) {
          if (isZeroBased) {
            const idx = key;
            userAnswers[idx] = value;
            const qNum = indexToNumber[idx] ?? idx + 1;
            if (Number.isFinite(qNum)) {
              answersByNumber.set(qNum, value);
            }
          } else {
            const qNum = key;
            answersByNumber.set(qNum, value);
            const idx = numberToIndex.get(qNum);
            if (idx !== undefined) {
              userAnswers[idx] = value;
            } else if (qNum > 0) {
              userAnswers[qNum - 1] = value;
            }
          }
        }

        let correctCount = 0;
        for (const [qNum, ans] of answersByNumber.entries()) {
          if (correctAnswerMap.get(qNum) === ans) correctCount++;
        }

        return {
          id: a._id,
          examId: exam.legacyId,
          examTitle: exam.title,
          score: a.score,
          maxScore: totalScore,
          correctCount,
          timestamp: a.createdAt,
          userAnswers,
          totalQuestions: a.totalQuestions,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  },
});

// Log a mistake
export const saveMistake = mutation({
  args: {
    wordId: v.optional(v.id('words')), // ID if from vocab
    korean: v.string(),
    english: v.string(),
    context: v.optional(v.string()), // e.g. "ToPIK Exam"
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const { wordId, korean, english, context } = args;

    await ctx.db.insert('mistakes', {
      userId,
      wordId,
      korean,
      english,
      context,
      reviewCount: 0,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Save Exam Attempt (Robust version with legacy ID support)
export const saveExamAttempt = mutation({
  args: {
    examId: v.string(), // Legacy ID or Convex ID
    score: v.number(),
    totalQuestions: v.optional(v.number()),
    sectionScores: v.optional(v.record(v.string(), v.number())),
    duration: v.optional(v.number()),
    answers: v.optional(v.record(v.string(), v.number())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const { examId, score, duration } = args;
    let sectionScores: Record<string, number> | undefined;
    let answers: Record<string, number> | undefined;
    try {
      sectionScores =
        args.sectionScores === undefined ? undefined : normalizeFiniteNumberMap(args.sectionScores);
      answers = args.answers === undefined ? undefined : normalizeAnswerMap(args.answers);
    } catch (error) {
      throw new ConvexError({
        code: 'INVALID_EXAM_ATTEMPT_PAYLOAD',
        message: (error as Error).message,
      });
    }

    // Resolve Exam ID
    let exam = await ctx.db
      .query('topik_exams')
      .withIndex('by_legacy_id', q => q.eq('legacyId', examId))
      .first();

    if (!exam) {
      try {
        const doc = await ctx.db.get(asId<'topik_exams'>(examId));
        if (doc) {
          exam = doc;
        }
      } catch {
        // Ignored
      }
    }

    if (!exam)
      throw new ConvexError({ code: 'EXAM_NOT_FOUND', message: `Exam not found: ${examId}` });

    // Resolve total questions if not provided
    let totalQuestions = args.totalQuestions;
    if (!totalQuestions) {
      const questions = await ctx.db
        .query('topik_questions')
        .withIndex('by_exam', q => q.eq('examId', exam._id))
        .collect();
      totalQuestions = questions.length;
    }

    const attemptId = await ctx.db.insert('exam_attempts', {
      userId,
      examId: exam._id,
      score,
      totalQuestions,
      sectionScores,
      duration,
      answers,
      createdAt: Date.now(),
    });

    return { success: true, attemptId };
  },
});

export const removeSavedWord = mutation({
  args: { savedWordId: v.id('saved_words') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.savedWordId);
    if (!row) return { success: false, error: 'Not found' };
    if (row.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
    await ctx.db.delete(args.savedWordId);
    return { success: true };
  },
});

export const clearMistakes = mutation({
  args: {},
  handler: async ctx => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query('mistakes')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();
    await Promise.all(rows.map(r => ctx.db.delete(r._id)));
    return { success: true, deleted: rows.length };
  },
});

export const removeMistake = mutation({
  args: { mistakeId: v.id('mistakes') },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const row = await ctx.db.get(args.mistakeId);
    if (!row) return { success: false, error: 'Not found' };
    if (row.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
    await ctx.db.delete(args.mistakeId);
    return { success: true };
  },
});

// Log User Activity
export const logActivity = mutation({
  args: {
    activityType: v.string(), // VOCAB, READING, LISTENING, EXAM
    duration: v.optional(v.number()),
    itemsStudied: v.optional(v.number()),
    metadata: v.optional(v.record(v.string(), v.union(v.string(), v.number(), v.boolean()))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const { activityType, duration, itemsStudied, metadata } = args;

    await ctx.db.insert('activity_logs', {
      userId,
      activityType,
      duration,
      itemsStudied,
      metadata,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

// Update Learning Progress (Last Accessed)
export const updateLearningProgress = mutation({
  args: {
    lastInstitute: v.optional(v.string()),
    lastLevel: v.optional(v.number()),
    lastUnit: v.optional(v.number()),
    lastModule: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const { lastInstitute, lastLevel, lastUnit, lastModule } = args;

    const updates: {
      lastInstitute?: string;
      lastLevel?: number;
      lastUnit?: number;
      lastModule?: string;
    } = {};
    if (lastInstitute !== undefined) updates.lastInstitute = lastInstitute;
    if (lastLevel !== undefined) updates.lastLevel = lastLevel;
    if (lastUnit !== undefined) updates.lastUnit = lastUnit;
    if (lastModule !== undefined) updates.lastModule = lastModule;

    await ctx.db.patch(user._id, updates);

    return { success: true };
  },
});

// Delete Exam Attempt
// Delete Exam Attempt
export const deleteExamAttempt = mutation({
  args: {
    attemptId: v.id('exam_attempts'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    // 2. Fetch Attempt
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) {
      return { success: false, error: 'Attempt not found' };
    }

    // 3. Verify Ownership
    if (attempt.userId !== userId) {
      throw new ConvexError({
        code: 'FORBIDDEN',
        message: 'You can only delete your own attempts',
      });
    }

    // 4. Delete
    await ctx.db.delete(args.attemptId);
    return { success: true };
  },
});
