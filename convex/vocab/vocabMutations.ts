/**
 * Vocabulary mutation functions
 * Extracted from convex/vocab.ts for better organization
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, requireAdmin } from '../utils';

import { vocabLogger } from '../logger';
import {
  cleanupUndefinedFields,
} from '../vocabHelpers';

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

