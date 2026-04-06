/**
 * Vocabulary query functions
 * Extracted from convex/vocab.ts for better organization
 */

import { query, mutation } from '../_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAdmin } from '../utils';
import { DEFAULT_VOCAB_LIMIT } from '../queryLimits';
import { vocabLogger } from '../logger';
import type {
  VocabStatsDto,
  VocabReviewDeckDto,
  VocabReviewSummaryDto,
} from './vocabTypes';




// Get vocabulary statistics for a course
export const getStats = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<VocabStatsDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);

      const courseId = args.courseId.trim();
      if (!courseId) return { total: 0, mastered: 0 };

      vocabLogger.debug(`getStats courseId=${courseId}`);

      // IMPORTANT: This query must be bounded to avoid Convex timeouts when datasets grow.
      const MAX_UNIQUE_WORDS = 2500;
      const MAX_APPEARANCE_DOCS = 8000;
      const MAX_PROGRESS_DOCS = 12000;

      // 1) Scan appearances (bounded) and collect unique wordIds.
      const courseWordIds = new Set<string>();
      const appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', courseId))
        .order('desc')
        .take(MAX_APPEARANCE_DOCS);

      for (const app of appearances) {
        courseWordIds.add(app.wordId.toString());
        if (courseWordIds.size >= MAX_UNIQUE_WORDS) break;
      }

      const total = courseWordIds.size;
      if (!userId || total === 0) return { total, mastered: 0 };

      // 2) Count mastered progress (bounded).
      let mastered = 0;
      const progressDocs = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .order('desc')
        .take(MAX_PROGRESS_DOCS);

      for (const p of progressDocs) {
        if (p.status === 'MASTERED' && courseWordIds.has(p.wordId.toString())) mastered++;
        if (mastered >= total) break;
      }

      return { total, mastered };
    } catch (err) {
      vocabLogger.error('getStats failed', err);
      return { total: 0, mastered: 0 };
    }
  },
});

// Get daily phrase
export const getDailyPhrase = query({
  args: {
    language: v.optional(v.string()), // 'zh', 'en', 'vi', 'mn'
  },
  handler: async (ctx, args) => {
    const phrase = await ctx.db.query('daily_phrases').order('desc').first();
    if (!phrase) return null;

    const base = {
      id: phrase._id,
      korean: phrase.korean,
      romanization: phrase.romanization,
      translation: phrase.translation,
    };

    switch (args.language) {
      case 'zh':
        return { ...base, translationZh: phrase.translationZh };
      case 'vi':
        return { ...base, translationVi: phrase.translationVi };
      case 'mn':
        return { ...base, translationMn: phrase.translationMn };
      default:
        return base;
    }
  },
});

// Get vocabulary for review deck
export const getReviewDeck = query({
  args: {
    courseId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VocabReviewDeckDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) return [];

      const limit = args.limit ?? DEFAULT_VOCAB_LIMIT;
      const courseId = args.courseId.trim();
      if (!courseId) return [];

      // Get appearances for this course
      const appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', courseId))
        .order('desc')
        .take(limit);

      // Batch fetch words
      const wordIds = [...new Set(appearances.map(a => a.wordId))];
      const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
      const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

      // Batch fetch progress
      const progressArray = await Promise.all(
        wordIds.map(id => 
          ctx.db
            .query('user_vocab_progress')
            .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', id))
            .first()
        )
      );
      const progressMap = new Map(
        progressArray.filter(Boolean).map(p => [p!.wordId.toString(), p!])
      );

      // Build response
      const rows = appearances.map(app => {
        const word = wordsMap.get(app.wordId.toString());
        if (!word) return null;

        const progress = progressMap.get(app.wordId.toString());
        
        return {
          id: app._id,
          wordId: word._id,
          word: word.word,
          meaning: app.meaning || word.meaning,
          meaningZh: app.meaning || word.meaning,
          meaningVi: app.meaningVi || word.meaningVi,
          meaningMn: app.meaningMn || word.meaningMn,
          example: app.exampleSentence,
          exampleZh: app.exampleMeaning,
          exampleVi: app.exampleMeaningVi,
          exampleMn: app.exampleMeaningMn,
          audio: word.audioUrl,
          image: undefined,
          tags: undefined,
          level: undefined,
          frequency: undefined,
          status: progress?.status || 'NOT_STARTED',
          proficiency: 0,
          last_review: progress?.last_review,
          next_review: progress?.due || progress?.nextReviewAt,
          lapses: progress?.lapses || 0,
          elapsed_days: progress?.elapsed_days || 0,
          scheduled_days: progress?.scheduled_days || 0,
          learning_steps: progress?.learning_steps || 0,
          reps: progress?.reps || 0,
          mastered: progress?.status === 'MASTERED' || false,
          courseId: app.courseId,
          unitId: app.unitId,
          displayOrder: 0,
          customNote: undefined,
          customNoteZh: undefined,
          customNoteVi: undefined,
          customNoteMn: undefined,
          isImportant: false,
        };
      });

      return rows.filter((w): w is NonNullable<typeof w> => w !== null) as VocabReviewDeckDto[];
    } catch (err) {
      vocabLogger.error('getReviewDeck failed', err);
      return [];
    }
  },
});

// Get review summary
export const getReviewSummary = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<VocabReviewSummaryDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) {
        return {
          total: 0,
          dueTotal: 0,
          dueNow: 0,
          unlearned: 0,
          mastered: 0,
          learning: 0,
          recommendedToday: 0,
        };
      }

      const courseId = args.courseId.trim();
      if (!courseId) {
        return {
          total: 0,
          dueTotal: 0,
          dueNow: 0,
          unlearned: 0,
          mastered: 0,
          learning: 0,
          recommendedToday: 0,
        };
      }

      const now = Date.now();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayMs = todayStart.getTime();

      // Get all appearances for this course
      const appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', courseId))
        .collect();

      const wordIds = [...new Set(appearances.map(a => a.wordId))];
      const total = wordIds.length;

      // Batch fetch progress
      const progressArray = await Promise.all(
        wordIds.map(id => 
          ctx.db
            .query('user_vocab_progress')
            .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', id))
            .first()
        )
      );

      let dueTotal = 0;
      let dueNow = 0;
      let unlearned = 0;
      let mastered = 0;
      let learning = 0;
      let recommendedToday = 0;

      for (const progress of progressArray) {
        if (!progress) {
          unlearned++;
          continue;
        }

        switch (progress.status) {
          case 'MASTERED':
            mastered++;
            break;
          case 'NOT_STARTED':
            unlearned++;
            if (progress.due && progress.due <= now) {
              dueTotal++;
              dueNow++;
              recommendedToday++;
            }
            break;
          case 'LEARNING':
          case 'REVIEW':
            learning++;
            if (progress.due && progress.due <= now) {
              dueTotal++;
              dueNow++;
              recommendedToday++;
            } else if (progress.due && progress.due <= todayMs + 24 * 60 * 60 * 1000) {
              recommendedToday++;
            }
            break;
        }
      }

      return {
        total,
        dueTotal,
        dueNow,
        unlearned,
        mastered,
        learning,
        recommendedToday,
      };
    } catch (err) {
      vocabLogger.error('getReviewSummary failed', err);
      return {
        total: 0,
        dueTotal: 0,
        dueNow: 0,
        unlearned: 0,
        mastered: 0,
        learning: 0,
        recommendedToday: 0,
      };
    }
  },
});

// Admin: Bulk import vocabulary
export const bulkImport = mutation({
  args: {
    items: v.array(
      v.object({
        word: v.string(),
        meaning: v.string(),
        meaningZh: v.optional(v.string()),
        meaningVi: v.optional(v.string()),
        meaningMn: v.optional(v.string()),
        meaningEn: v.optional(v.string()),
        partOfSpeech: v.string(),
        audioUrl: v.optional(v.string()),
        courseId: v.optional(v.string()),
        unitId: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    
    const results = [];
    for (const item of args.items) {
      try {
        // Check if word already exists
        const existing = await ctx.db
          .query('words')
          .withIndex('by_word', q => q.eq('word', item.word))
          .first();

        if (existing) {
          // Update existing word
          const updates = {
            meaning: item.meaning,
            meaningEn: item.meaningZh || item.meaningEn,
            meaningVi: item.meaningVi,
            meaningMn: item.meaningMn,
            audioUrl: item.audioUrl,
            partOfSpeech: item.partOfSpeech,
            updatedAt: Date.now(),
          } as Record<string, unknown>;

          await ctx.db.patch(existing._id, updates);
          results.push({ id: existing._id, action: 'updated' });
        } else {
          // Create new word
          const wordId = await ctx.db.insert('words', {
            word: item.word,
            meaning: item.meaning,
            meaningEn: item.meaningZh || item.meaningEn,
            meaningVi: item.meaningVi,
            meaningMn: item.meaningMn,
            audioUrl: item.audioUrl,
            partOfSpeech: item.partOfSpeech,
          });
          results.push({ id: wordId, action: 'created' });
        }
      } catch (error) {
        vocabLogger.error('Failed to import word', { word: item.word, error });
        results.push({ word: item.word, action: 'error', error });
      }
    }

    return { success: true, results };
  },
});
