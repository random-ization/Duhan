/**
 * Vocabulary mutation functions
 * Extracted from convex/vocab.ts for better organization
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, requireAdmin } from '../utils';

import { vocabLogger } from '../logger';
import { cleanupUndefinedFields } from '../vocabHelpers';

// Save word to vocabulary
export const saveWord = mutation({
  args: {
    word: v.string(),
    meaning: v.string(),
    meaningZh: v.string(),
    meaningVi: v.string(),
    meaningMn: v.string(),
    example: v.optional(v.string()),
    exampleZh: v.optional(v.string()),
    exampleVi: v.optional(v.string()),
    exampleMn: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    partOfSpeech: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    // Check if word already exists
    const existing = await ctx.db
      .query('words')
      .withIndex('by_word', q => q.eq('word', args.word))
      .first();

    if (existing) {
      // Update existing word
      const updates = cleanupUndefinedFields({
        meaning: args.meaning,
        meaningEn: args.meaningZh,
        meaningVi: args.meaningVi,
        meaningMn: args.meaningMn,
        audioUrl: args.audioUrl,
        partOfSpeech: args.partOfSpeech,
        updatedAt: Date.now(),
      }) as Record<string, unknown>;

      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    // Create new word
    const wordId = await ctx.db.insert('words', {
      word: args.word,
      meaning: args.meaning,
      meaningEn: args.meaningZh,
      meaningVi: args.meaningVi,
      meaningMn: args.meaningMn,
      audioUrl: args.audioUrl,
      partOfSpeech: args.partOfSpeech,
    });

    return wordId;
  },
});

// Update vocabulary progress
export const updateProgress = mutation({
  args: {
    wordId: v.id('words'),
    status: v.string(),
    proficiency: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const existing = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', args.wordId))
      .first();

    const now = Date.now();
    const updates = {
      status: args.status,
      proficiency: args.proficiency,
      last_review: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert('user_vocab_progress', {
        userId,
        wordId: args.wordId,
        ...updates,
      });
    }

    return { success: true };
  },
});

// Add word to review list
export const addToReview = mutation({
  args: {
    word: v.string(),
    meaning: v.string(),
    meaningZh: v.string(),
    meaningVi: v.string(),
    meaningMn: v.string(),
    context: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    vocabLogger.debug(`addToReview called for word: ${args.word}, source: ${args.source}`);
    const userId = await getAuthUserId(ctx);
    vocabLogger.debug(`addToReview userId: ${userId}`);

    // Check if word exists in master dictionary
    const existingWord = await ctx.db
      .query('words')
      .withIndex('by_word', q => q.eq('word', args.word))
      .unique();

    let wordId;
    if (existingWord) {
      wordId = existingWord._id;
    } else {
      // Create new word entry
      wordId = await ctx.db.insert('words', {
        word: args.word,
        meaning: args.meaning,
        meaningEn: args.meaningZh,
        meaningVi: args.meaningVi,
        meaningMn: args.meaningMn,
        partOfSpeech: 'noun',
      });
    }

    // Check if user already has progress for this word
    const existingProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', wordId))
      .first();

    if (!existingProgress) {
      // Create new progress entry
      await ctx.db.insert('user_vocab_progress', {
        userId,
        wordId,
        status: 'NEW',
        savedByUser: true,
      });
    }

    return { success: true, wordId };
  },
});

// Set mastery status
export const setMastery = mutation({
  args: {
    wordId: v.id('words'),
    mastered: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const existing = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', args.wordId))
      .first();

    const now = Date.now();
    const updates = {
      status: args.mastered ? 'MASTERED' : 'REVIEW',
      last_review: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert('user_vocab_progress', {
        userId,
        wordId: args.wordId,
        ...updates,
      });
    }

    return { success: true };
  },
});

export const upsertLearningSession = mutation({
  args: {
    instituteId: v.string(),
    unitId: v.number(),
    mode: v.union(v.literal('FLASHCARD'), v.literal('LEARN'), v.literal('TEST')),
    snapshot: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const sessions = await ctx.db
      .query('vocab_learning_sessions')
      .withIndex('by_user_scope_mode', q =>
        q
          .eq('userId', userId)
          .eq('instituteId', args.instituteId)
          .eq('unitId', args.unitId)
          .eq('mode', args.mode)
      )
      .collect();

    const active = sessions
      .filter(session => session.status === 'ACTIVE')
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

    if (active) {
      await ctx.db.patch(active._id, {
        snapshot: args.snapshot,
        updatedAt: now,
      });
      return { success: true, sessionId: active._id, action: 'updated' as const };
    }

    const sessionId = await ctx.db.insert('vocab_learning_sessions', {
      userId,
      instituteId: args.instituteId,
      unitId: args.unitId,
      mode: args.mode,
      status: 'ACTIVE',
      snapshot: args.snapshot,
      startedAt: now,
      updatedAt: now,
    });

    return { success: true, sessionId, action: 'created' as const };
  },
});

export const completeLearningSession = mutation({
  args: {
    sessionId: v.id('vocab_learning_sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      return { success: false, reason: 'not_found' as const };
    }

    const now = Date.now();
    await ctx.db.patch(args.sessionId, {
      status: 'COMPLETED',
      completedAt: now,
      updatedAt: now,
    });

    return { success: true };
  },
});

export const abandonLearningSession = mutation({
  args: {
    sessionId: v.id('vocab_learning_sessions'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const session = await ctx.db.get(args.sessionId);
    if (!session || session.userId !== userId) {
      return { success: false, reason: 'not_found' as const };
    }

    await ctx.db.patch(args.sessionId, {
      status: 'ABANDONED',
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const setMasteryBulk = mutation({
  args: {
    wordIds: v.array(v.id('words')),
    mastered: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const uniqueWordIds = Array.from(new Set(args.wordIds.map(id => String(id))));
    let updated = 0;

    for (const wordIdValue of uniqueWordIds) {
      const wordId = ctx.db.normalizeId('words', wordIdValue);
      if (!wordId) continue;

      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;
      const existingProgress = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', wordId))
        .unique();

      if (args.mastered) {
        const due = now + 365 * oneDay;
        const patch = {
          status: 'MASTERED',
          interval: 365,
          streak: existingProgress?.streak ?? existingProgress?.reps ?? 0,
          nextReviewAt: due,
          lastReviewedAt: now,
          state: 2,
          due,
          stability: Math.max(existingProgress?.stability ?? 0, 31),
          scheduled_days: 365,
          reps: (existingProgress?.reps ?? 0) + 1,
          last_review: now,
          savedByUser: true,
        };

        if (existingProgress) {
          await ctx.db.patch(existingProgress._id, patch);
        } else {
          await ctx.db.insert('user_vocab_progress', {
            userId,
            wordId,
            lapses: 0,
            learning_steps: 0,
            elapsed_days: 0,
            difficulty: 5,
            ...patch,
          });
        }
        updated += 1;
        continue;
      }

      if (existingProgress) {
        const due = now + oneDay;
        await ctx.db.patch(existingProgress._id, {
          status: 'LEARNING',
          interval: 1,
          streak: 0,
          nextReviewAt: due,
          lastReviewedAt: now,
          state: 1,
          due,
          scheduled_days: 1,
          elapsed_days: 0,
          last_review: now,
          savedByUser: true,
        });
        updated += 1;
      }
    }

    return { success: true, updated };
  },
});

export const removeFromVocabBookBulk = mutation({
  args: {
    wordIds: v.array(v.id('words')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const uniqueWordIds = Array.from(new Set(args.wordIds.map(id => String(id))));
    let removed = 0;

    for (const wordIdValue of uniqueWordIds) {
      const wordId = ctx.db.normalizeId('words', wordIdValue);
      if (!wordId) continue;

      const progress = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', wordId))
        .unique();
      if (!progress || progress.savedByUser !== true) continue;

      await ctx.db.delete(progress._id);
      removed += 1;
    }

    return { success: true, removed };
  },
});

// Admin: Update vocabulary
export const updateVocab = mutation({
  args: {
    wordId: v.id('words'),
    word: v.string(),
    meaning: v.string(),
    meaningZh: v.string(),
    meaningVi: v.string(),
    meaningMn: v.string(),
    example: v.optional(v.string()),
    exampleZh: v.optional(v.string()),
    exampleVi: v.optional(v.string()),
    exampleMn: v.optional(v.string()),
    audioUrl: v.optional(v.string()),
    partOfSpeech: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const updates = cleanupUndefinedFields({
      word: args.word,
      meaning: args.meaning,
      meaningEn: args.meaningZh,
      meaningVi: args.meaningVi,
      meaningMn: args.meaningMn,
      audioUrl: args.audioUrl,
      partOfSpeech: args.partOfSpeech,
      updatedAt: Date.now(),
    }) as Record<string, unknown>;

    await ctx.db.patch(args.wordId, updates);
    return { success: true };
  },
});
