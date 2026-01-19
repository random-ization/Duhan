import { mutation } from './_generated/server';
import { v, ConvexError } from 'convex/values';

import { getAuthUserId } from './utils';
import { asId } from './id';

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
    sectionScores: v.optional(v.any()), // JSON object
    duration: v.optional(v.number()),
    answers: v.optional(v.any()), // JSON record of questionId -> optionIndex
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError({ code: 'USER_NOT_FOUND' });

    const { examId, score, sectionScores, duration } = args;

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
      } catch (e) {
        void e;
      }
    }

    if (!exam)
      throw new ConvexError({ code: 'EXAM_NOT_FOUND', message: `Exam not found: ${examId}` });

    // Resolve total questions if not provided
    let totalQuestions = args.totalQuestions;
    if (!totalQuestions) {
      const questions = await ctx.db
        .query('topik_questions')
        .withIndex('by_exam', q => q.eq('examId', exam!._id))
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
      answers: args.answers,
      createdAt: Date.now(),
    });

    return { success: true, attemptId };
  },
});

// Log User Activity
export const logActivity = mutation({
  args: {
    activityType: v.string(), // VOCAB, READING, LISTENING, EXAM
    duration: v.optional(v.number()),
    itemsStudied: v.optional(v.number()),
    metadata: v.optional(v.any()),
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
    if (lastInstitute) updates.lastInstitute = lastInstitute;
    if (lastLevel) updates.lastLevel = lastLevel;
    if (lastUnit !== undefined) updates.lastUnit = lastUnit;
    if (lastModule) updates.lastModule = lastModule;

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
