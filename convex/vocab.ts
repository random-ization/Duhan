import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId, requireAdmin } from './utils';
import { DEFAULT_VOCAB_LIMIT } from './queryLimits';
import type { Id } from './_generated/dataModel';
import { toErrorMessage } from './errors';

export type VocabStatsDto = {
  total: number;
  mastered: number;
};

// ... DTOs ...
export type VocabTips = {
  synonyms?: string[];
  antonyms?: string[];
  nuance?: string;
};

export type VocabWordDto = {
  _id: Id<'words'>;
  // ... metadata ...
  creationTime: number; // Aliased from _creationTime

  // Core Data
  word: string;
  meaning: string;
  pronunciation?: string;
  audioUrl?: string; // Derived from word if not present?
  hanja?: string;
  partOfSpeech: string;
  unitId: number;

  // Rich Content
  exampleSentence?: string;
  exampleMeaning?: string;

  // Translations
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;

  // User Progress (Joined)
  progress?: {
    id: Id<'user_vocab_progress'>;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number | null;
    lastReviewedAt?: number | null;
    // FSRS Fields
    state?: number;
    stability?: number;
    difficulty?: number;
    elapsed_days?: number;
    scheduled_days?: number;
    reps?: number;
    lapses?: number;
    last_review?: number | null;
  } | null;
  mastered?: boolean;
  tips?: VocabTips;
};

export type DailyPhraseDto = {
  id: Id<'words'>;
  korean: string;
  romanization: string;
  translation: string;
};

export type VocabReviewItemDto = {
  id: Id<'words'>;
  word: string;
  meaning: string;
  partOfSpeech: string;
  hanja?: string;
  pronunciation?: string;
  audioUrl?: string;
  progress: {
    id: Id<'user_vocab_progress'>;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number | null;
    lastReviewedAt: number | null;
  };
};

export type VocabBookItemDto = {
  id: Id<'words'>;
  word: string;
  meaning: string;
  partOfSpeech: string;
  hanja?: string;
  pronunciation?: string;
  audioUrl?: string;
  exampleSentence?: string;
  exampleMeaning?: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  progress: {
    id: Id<'user_vocab_progress'>;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number | null;
    lastReviewedAt: number | null;
    state?: number;
    due?: number;
    stability?: number;
    difficulty?: number;
    elapsed_days?: number;
    scheduled_days?: number;
    learning_steps?: number;
    reps?: number;
    lapses?: number;
    last_review?: number | null;
  };
};

// Get Vocabulary Stats (Dashboard)
// Get Vocabulary Stats (Dashboard)
export const getStats = query({
  args: {
    courseId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<VocabStatsDto> => {
    const userId = await getOptionalAuthUserId(ctx);

    // 1. Get total words (all courses if courseId is empty, otherwise specific course)
    let appearances;
    if (args.courseId) {
      appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', args.courseId!))
        .collect();
    } else {
      // Count ALL vocabulary appearances across all courses
      appearances = await ctx.db.query('vocabulary_appearances').collect();
    }

    const total = appearances.length;

    // 2. Get user progress count
    let mastered = 0;
    if (userId) {
      const progress = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user_word', q => q.eq('userId', userId))
        .collect();

      const courseWordIds = new Set(appearances.map(a => a.wordId));
      mastered = progress.filter(
        p => courseWordIds.has(p.wordId) && p.status === 'MASTERED'
      ).length;
    }

    return { total, mastered };
  },
});

import { paginationOptsValidator } from 'convex/server';

// Get all vocabulary (Paginated) - Replaces getAll for scalability
export const getAllPaginated = query({
  args: {
    paginationOpts: paginationOptsValidator,
    courseId: v.optional(v.string()), // Optional filter by course
  },
  handler: async (ctx, args) => {
    // 1. Get all institutes for course name lookup (small collection, cacheable)
    const institutes = await ctx.db.query('institutes').collect();
    const courseNameMap = new Map(institutes.map(i => [i.id, i.name]));
    // Note: courseNameMap uses _id as key.
    // In existing getAll, it used i.id ?? i._id. Let's assume _id for join consistency.

    let result;
    if (args.courseId) {
      result = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', args.courseId!))
        .paginate(args.paginationOpts);
    } else {
      result = await ctx.db
        .query('vocabulary_appearances')
        .order('desc')
        .paginate(args.paginationOpts);
    }

    // 3. Batch fetch words for the page
    const wordIds = [...new Set(result.page.map(a => a.wordId))];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    // 4. Map results
    const page = result.page
      .map(app => {
        const word = wordsMap.get(app.wordId.toString());
        if (!word) return null;

        return {
          _id: word._id, // Use word ID as key? Or appearance ID? Dashboard uses _id as key.
          // If we want to support unique keys for multiple appearances, use appearance ID or composite.
          // But Dashboard edit expects wordId.
          // Let's keep structure similar to getAll but verify uniqueness.
          // If we use appearance ID as key, updateVocab handles appearanceId.

          // Let's expose appearance ID distinct from word ID
          id: word._id,
          wordId: word._id,
          word: word.word,
          // Per-course meanings (fallback to word if appearance doesn't have it)
          meaning: app.meaning || word.meaning,
          meaningEn: app.meaningEn || word.meaningEn,
          meaningVi: app.meaningVi || word.meaningVi,
          meaningMn: app.meaningMn || word.meaningMn,
          partOfSpeech: word.partOfSpeech,
          hanja: word.hanja,
          pronunciation: word.pronunciation,
          audioUrl: word.audioUrl,
          courseId: app.courseId,
          courseName: courseNameMap.get(app.courseId) || app.courseId,
          unitId: app.unitId || 0,
          exampleSentence: app.exampleSentence,
          exampleMeaning: app.exampleMeaning,
          exampleMeaningEn: app.exampleMeaningEn,
          exampleMeaningVi: app.exampleMeaningVi,
          exampleMeaningMn: app.exampleMeaningMn,
          appearanceId: app._id,
        };
      })
      .filter(Boolean);

    return {
      ...result,
      page: page as NonNullable<(typeof page)[number]>[],
    };
  },
});

// Get all vocabulary (Admin Dashboard - shows all words with course info)
export const getAll = query({
  args: {
    limit: v.optional(v.number()),
    courseId: v.optional(v.string()), // Optional filter by course
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 1000;

    // 1. Get all institutes for course name lookup
    const institutes = await ctx.db.query('institutes').collect();
    const courseNameMap = new Map(institutes.map(i => [i.id, i.name]));

    // 2. If courseId is provided, filter via appearances FIRST (before limit)
    if (args.courseId) {
      const appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', args.courseId!))
        .take(limit);

      // Fetch unique words for these appearances
      const wordIds = [...new Set(appearances.map(a => a.wordId))];
      const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
      const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

      // Return one entry PER APPEARANCE (not per unique word)
      return appearances
        .map(app => {
          const word = wordsMap.get(app.wordId.toString());
          if (!word) return null;
          return {
            _id: word._id,
            id: word._id,
            word: word.word,
            // Per-course meanings (fallback to word if appearance doesn't have it)
            meaning: app.meaning || word.meaning,
            meaningEn: app.meaningEn || word.meaningEn,
            meaningVi: app.meaningVi || word.meaningVi,
            meaningMn: app.meaningMn || word.meaningMn,
            partOfSpeech: word.partOfSpeech,
            hanja: word.hanja,
            pronunciation: word.pronunciation,
            audioUrl: word.audioUrl,
            courseId: args.courseId,
            courseName: courseNameMap.get(args.courseId!) || args.courseId,
            unitId: app.unitId || 0,
            exampleSentence: app.exampleSentence,
            exampleMeaning: app.exampleMeaning,
            exampleMeaningEn: app.exampleMeaningEn,
            exampleMeaningVi: app.exampleMeaningVi,
            exampleMeaningMn: app.exampleMeaningMn,
            appearanceId: app._id,
          };
        })
        .filter(Boolean);
    }

    // 3. No courseId filter: get all words with course associations
    const words = await ctx.db.query('words').take(limit);
    const appearances = await ctx.db.query('vocabulary_appearances').collect();

    // Build word -> appearance data map (use first appearance for display)
    const wordAppMap = new Map<string, (typeof appearances)[0]>();
    const wordCourseMap = new Map<
      string,
      { courseId: string; courseName: string; unitId: number }[]
    >();
    for (const app of appearances) {
      const wordId = app.wordId.toString();
      if (!wordAppMap.has(wordId)) {
        wordAppMap.set(wordId, app);
      }
      if (!wordCourseMap.has(wordId)) {
        wordCourseMap.set(wordId, []);
      }
      wordCourseMap.get(wordId)!.push({
        courseId: app.courseId,
        courseName: courseNameMap.get(app.courseId) || app.courseId,
        unitId: app.unitId,
      });
    }

    return words.map(word => {
      const app = wordAppMap.get(word._id.toString());
      return {
        _id: word._id,
        id: word._id,
        word: word.word,
        meaning: word.meaning,
        meaningEn: word.meaningEn,
        meaningVi: word.meaningVi,
        meaningMn: word.meaningMn,
        partOfSpeech: word.partOfSpeech,
        hanja: word.hanja,
        pronunciation: word.pronunciation,
        audioUrl: word.audioUrl,
        courses: wordCourseMap.get(word._id.toString()) || [],
        courseId: wordCourseMap.get(word._id.toString())?.[0]?.courseId || '',
        courseName: wordCourseMap.get(word._id.toString())?.[0]?.courseName || '未分类',
        unitId: wordCourseMap.get(word._id.toString())?.[0]?.unitId || 0,
        exampleSentence: app?.exampleSentence,
        exampleMeaning: app?.exampleMeaning,
        exampleMeaningEn: app?.exampleMeaningEn,
        exampleMeaningVi: app?.exampleMeaningVi,
        exampleMeaningMn: app?.exampleMeaningMn,
        appearanceId: app?._id,
      };
    });
  },
});

// Get all vocabulary for a course (Admin List or Module view)
// OPTIMIZATION: Added limit to prevent excessive queries + batch queries with Maps
// Get all vocabulary for a course (Admin List or Module view)
// OPTIMIZATION: Added limit to prevent excessive queries + batch queries with Maps
export const getOfCourse = query({
  args: {
    courseId: v.string(),
    unitId: v.optional(v.union(v.number(), v.string())),
    limit: v.optional(v.number()), // Optional limit
  },
  handler: async (ctx, args): Promise<VocabWordDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    let effectiveCourseId = args.courseId;
    const instituteId = ctx.db.normalizeId('institutes', args.courseId);
    if (instituteId) {
      const institute = await ctx.db.get(instituteId);
      if (institute) {
        effectiveCourseId = institute.id || institute._id;
      }
    }

    // 1. Get appearances with optional limit
    const limit = args.limit || DEFAULT_VOCAB_LIMIT;
    const normalizedUnitId =
      args.unitId === undefined
        ? undefined
        : typeof args.unitId === 'number'
          ? args.unitId
          : Number(args.unitId);
    if (normalizedUnitId !== undefined && Number.isNaN(normalizedUnitId)) {
      return [];
    }

    let appearances = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_course_unit', q =>
        normalizedUnitId !== undefined
          ? q.eq('courseId', effectiveCourseId).eq('unitId', normalizedUnitId)
          : q.eq('courseId', effectiveCourseId)
      )
      .take(limit);

    // Fallback: If no appearances found and we are querying a specific unit, try offset +10
    // This handles cases where Vol 2 is stored as Unit 11-20 but requested as Unit 1-10
    if (appearances.length === 0 && normalizedUnitId !== undefined && normalizedUnitId <= 20) {
      const offsetUnitId = normalizedUnitId + 10;
      const fallbackAppearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q =>
          q.eq('courseId', effectiveCourseId).eq('unitId', offsetUnitId)
        )
        .take(limit);

      if (fallbackAppearances.length > 0) {
        appearances = fallbackAppearances;
      }
    }

    if (appearances.length === 0) {
      return [];
    }

    // 2. OPTIMIZATION: Batch fetch words and progress data
    // Get unique word IDs and batch fetch
    const wordIds = [
      ...new Set(
        appearances
          .map(a => ctx.db.normalizeId('words', a.wordId))
          .filter((id): id is Id<'words'> => id !== null)
      ),
    ];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    // Batch fetch user progress if userId exists
    let progressMap = new Map();
    if (userId) {
      const allProgress = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user_word', q => q.eq('userId', userId))
        .collect();
      progressMap = new Map(allProgress.map(p => [p.wordId.toString(), p]));
    }

    // 3. Assemble data in memory
    const wordsWithData: (VocabWordDto | null)[] = appearances.map(app => {
      const wordId = ctx.db.normalizeId('words', app.wordId);
      if (!wordId) return null;
      const word = wordsMap.get(wordId.toString());
      if (!word) return null;

      const progress = progressMap.get(wordId.toString());

      return {
        _id: word._id,
        creationTime: word._creationTime,
        id: word._id,
        word: word.word,
        // Merge appearance data - appearance meanings take priority over word meanings
        meaning: app.meaning || word.meaning,
        meaningEn: app.meaningEn || word.meaningEn,
        meaningVi: app.meaningVi || word.meaningVi,
        meaningMn: app.meaningMn || word.meaningMn,
        partOfSpeech: word.partOfSpeech,
        hanja: word.hanja,
        pronunciation: word.pronunciation,
        audioUrl: word.audioUrl,

        // Appearance Context
        appearanceId: app._id,
        courseId: app.courseId,
        unitId: app.unitId,
        exampleSentence: app.exampleSentence,
        exampleMeaning: app.exampleMeaning,
        exampleMeaningEn: app.exampleMeaningEn,
        exampleMeaningVi: app.exampleMeaningVi,
        exampleMeaningMn: app.exampleMeaningMn,
        tips: word.tips,

        // Merge progress data (normalized structure for frontend)
        progress: progress
          ? {
              id: progress._id,
              status: progress.status,
              interval: progress.interval,
              streak: progress.streak,
              nextReviewAt: progress.nextReviewAt,
              lastReviewedAt: progress.lastReviewedAt,
              // FSRS Fields (Optional, may be undefined for legacy data)
              state: progress.state,
              stability: progress.stability,
              difficulty: progress.difficulty,
              elapsed_days: progress.elapsed_days,
              scheduled_days: progress.scheduled_days,
              reps: progress.reps,
              lapses: progress.lapses,
              last_review: progress.last_review,
            }
          : null,
        mastered: progress?.status === 'MASTERED' || false,
      };
    });

    return wordsWithData.filter((w): w is VocabWordDto => w !== null);
  },
});

// Get Daily Phrase (Word of the day)
export const getDailyPhrase = query({
  args: {
    language: v.optional(v.string()), // 'zh', 'en', 'vi', 'mn'
  },
  handler: async (ctx, args): Promise<DailyPhraseDto | null> => {
    const lang = args.language || 'zh';

    // 1. Get total words to pick one deterministically by date
    const allWords = await ctx.db.query('words').take(100); // Take a subset for random selection
    if (allWords.length === 0) return null;

    // 2. Deterministic selection based on day
    const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const index = day % allWords.length;
    const word = allWords[index];

    // 3. Map translation based on language
    let translation = word.meaning;
    if (lang === 'en' && word.meaningEn) translation = word.meaningEn;
    if (lang === 'vi' && word.meaningVi) translation = word.meaningVi;
    if (lang === 'mn' && word.meaningMn) translation = word.meaningMn;

    return {
      id: word._id,
      korean: word.word,
      romanization: word.pronunciation || '',
      translation: translation,
    };
  },
});

// Save a word (Upsert Logic - Admin)
export const saveWord = mutation({
  args: {
    word: v.string(),
    meaning: v.string(),
    partOfSpeech: v.string(),
    hanja: v.optional(v.string()),
    pronunciation: v.optional(v.string()),

    // Appearance context
    courseId: v.string(),
    unitId: v.number(),
    exampleSentence: v.optional(v.string()),
    exampleMeaning: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // 1. Check if Word exists (Master Dictionary)
    const existingWord = await ctx.db
      .query('words')
      .withIndex('by_word', q => q.eq('word', args.word))
      .unique();

    let wordId;
    if (existingWord) {
      wordId = existingWord._id;
      // Optional: Update meaning if needed? For now, assume master word is stable or update it
      await ctx.db.patch(wordId, {
        meaning: args.meaning,
        partOfSpeech: args.partOfSpeech,
        hanja: args.hanja,
        pronunciation: args.pronunciation,
      });
    } else {
      wordId = await ctx.db.insert('words', {
        word: args.word,
        meaning: args.meaning,
        partOfSpeech: args.partOfSpeech,
        hanja: args.hanja,
        pronunciation: args.pronunciation,
      });
    }

    // 2. Upsert Appearance (Link to Course/Unit)
    const existingApp = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_word_course_unit', q =>
        q.eq('wordId', wordId).eq('courseId', args.courseId).eq('unitId', args.unitId)
      )
      .unique();

    if (existingApp) {
      await ctx.db.patch(existingApp._id, {
        exampleSentence: args.exampleSentence,
        exampleMeaning: args.exampleMeaning,
      });
    } else {
      await ctx.db.insert('vocabulary_appearances', {
        wordId,
        courseId: args.courseId,
        unitId: args.unitId,
        exampleSentence: args.exampleSentence,
        exampleMeaning: args.exampleMeaning,
        createdAt: Date.now(),
      });
    }
  },
});

// Update User Progress (SRS)
export const updateProgress = mutation({
  args: {
    wordId: v.id('words'),
    quality: v.number(), // 0-5
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    const { wordId, quality } = args;
    const now = Date.now();

    const existingProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', wordId))
      .unique();

    let status = 'LEARNING';
    let interval = 1;
    let streak = 0;
    let nextReviewAt = now + interval * 24 * 60 * 60 * 1000;

    // Simple SRS Logic
    if (existingProgress) {
      // Update existing
      if (quality >= 4) {
        // Correct
        streak = (existingProgress.streak ?? 0) + 1;
        interval = (existingProgress.interval ?? 1) * 2; // Simple exponential
        status = interval > 30 ? 'MASTERED' : 'REVIEW';
      } else {
        // Wrong
        streak = 0;
        interval = 1;
        status = 'LEARNING';
      }

      nextReviewAt = now + interval * 24 * 60 * 60 * 1000;
      await ctx.db.patch(existingProgress._id, {
        status,
        interval,
        streak,
        lastReviewedAt: now,
        nextReviewAt,
      });

      return {
        success: true,
        progress: {
          id: existingProgress._id,
          status,
          interval,
          streak,
          lastReviewedAt: now,
          nextReviewAt,
        },
      };
    } else {
      // Create new
      if (quality >= 4) {
        streak = 1;
        interval = 1; // Start with 1 day
        status = 'LEARNING';
      } else {
        streak = 0;
        interval = 0.5; // Half day for immediate fail
        status = 'NEW';
      }

      nextReviewAt = now + interval * 24 * 60 * 60 * 1000;
      const progressId = await ctx.db.insert('user_vocab_progress', {
        userId: userId,
        wordId,
        status,
        interval,
        streak,
        lastReviewedAt: now,
        nextReviewAt,
      });

      return {
        success: true,
        progress: {
          id: progressId,
          status,
          interval,
          streak,
          lastReviewedAt: now,
          nextReviewAt,
        },
      };
    }
  },
});

// Update User Progress using FSRS Algorithm (V2)
// Rating: 1=Again, 2=Hard, 3=Good, 4=Easy
export const updateProgressV2 = mutation({
  args: {
    wordId: v.id('words'),
    rating: v.number(), // 1-4 (FSRS Rating enum)
    // FSRS card state from action calculation
    fsrsState: v.object({
      state: v.number(),
      due: v.number(),
      stability: v.number(),
      difficulty: v.number(),
      elapsed_days: v.number(),
      scheduled_days: v.number(),
      learning_steps: v.number(),
      reps: v.number(),
      lapses: v.number(),
      last_review: v.union(v.number(), v.null()),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const { wordId, fsrsState } = args;
    const now = Date.now();

    // Map FSRS state to legacy status for backward compatibility
    const stateToStatus = (state: number): string => {
      switch (state) {
        case 0:
          return 'NEW';
        case 1:
          return 'LEARNING';
        case 2:
          return fsrsState.stability > 30 ? 'MASTERED' : 'REVIEW';
        case 3:
          return 'LEARNING'; // Relearning → LEARNING
        default:
          return 'LEARNING';
      }
    };

    const existingProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', wordId))
      .unique();

    const progressData = {
      // FSRS fields
      state: fsrsState.state,
      due: fsrsState.due,
      stability: fsrsState.stability,
      difficulty: fsrsState.difficulty,
      elapsed_days: fsrsState.elapsed_days,
      scheduled_days: fsrsState.scheduled_days,
      learning_steps: fsrsState.learning_steps,
      reps: fsrsState.reps,
      lapses: fsrsState.lapses,
      last_review: fsrsState.last_review ?? now,
      // Legacy fields for backward compatibility
      status: stateToStatus(fsrsState.state),
      interval: fsrsState.scheduled_days,
      streak: fsrsState.reps,
      nextReviewAt: fsrsState.due,
      lastReviewedAt: now,
    };

    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, progressData);
      return {
        success: true,
        progress: {
          id: existingProgress._id,
          ...progressData,
        },
      };
    } else {
      const progressId = await ctx.db.insert('user_vocab_progress', {
        userId,
        wordId,
        ...progressData,
      });
      return {
        success: true,
        progress: {
          id: progressId,
          ...progressData,
        },
      };
    }
  },
});

export const resetProgress = mutation({
  args: {
    wordId: v.id('words'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const existingProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', args.wordId))
      .unique();

    if (!existingProgress) return { success: true };
    await ctx.db.delete(existingProgress._id);
    return { success: true };
  },
});

// Bulk Import (Admin) - Optimized for N+1
export const bulkImport = mutation({
  args: {
    items: v.array(
      v.object({
        word: v.string(),
        meaning: v.string(),
        partOfSpeech: v.string(),
        hanja: v.optional(v.string()),

        // Multi-language meanings
        meaningEn: v.optional(v.string()),
        meaningVi: v.optional(v.string()),
        meaningMn: v.optional(v.string()),

        courseId: v.string(),
        unitId: v.number(),
        exampleSentence: v.optional(v.string()),
        exampleMeaning: v.optional(v.string()),

        // Multi-language example translations
        exampleMeaningEn: v.optional(v.string()),
        exampleMeaningVi: v.optional(v.string()),
        exampleMeaningMn: v.optional(v.string()),

        tips: v.optional(
          v.object({
            synonyms: v.optional(v.array(v.string())),
            antonyms: v.optional(v.array(v.string())),
            nuance: v.optional(v.string()),
          })
        ),
      })
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const smartFilledCount = 0;
    let newWordCount = 0;

    const items = args.items;

    // Phase 1: Resolve Words (Concurrent Read & Write)
    // 1a. Check for existing words concurrently
    const wordPromises = items.map(item =>
      ctx.db
        .query('words')
        .withIndex('by_word', q => q.eq('word', item.word))
        .unique()
    );
    const existingWordsResults = await Promise.all(wordPromises);

    // Map word string to Word ID (populated as we go)
    const wordIdMap = new Map<string, Id<'words'>>();

    // Operations to perform
    const wordOps = items.map(async (item, idx) => {
      const existingWord = existingWordsResults[idx];

      if (existingWord) {
        wordIdMap.set(item.word, existingWord._id);

        // Smart Fill Data Gathering (if needed) - Note: Doing this inside the map strictly might be complex if we want to batch this too.
        // For simplicity and speed in this specific logic, we'll keep the Smart Fill logic slightly simplified or
        // accept that checking "existing appearances" for smart fill might still need a query.
        // BUT, to truly solve N+1, we should skip smart fill from DB if we want max speed,
        // OR batch fetch those too.
        // Let's assume for Bulk Import, speed is priority. If user provided meaning, we skip smart fill.
        // If user didn't provide meaning, we might need it.
        // Optimization: Only query for smart fill if absolutely necessary (missing fields).

        // Update word fields
        const wordUpdates: {
          meaning?: string;
          partOfSpeech?: string;
          hanja?: string;
          meaningEn?: string;
          meaningVi?: string;
          meaningMn?: string;
        } = {};
        if (item.meaning) wordUpdates.meaning = item.meaning;
        if (item.partOfSpeech) wordUpdates.partOfSpeech = item.partOfSpeech;
        if (item.hanja !== undefined) wordUpdates.hanja = item.hanja;
        if (item.meaningEn !== undefined) wordUpdates.meaningEn = item.meaningEn;
        if (item.meaningVi !== undefined) wordUpdates.meaningVi = item.meaningVi;
        if (item.meaningMn !== undefined) wordUpdates.meaningMn = item.meaningMn;

        if (Object.keys(wordUpdates).length > 0) {
          await ctx.db.patch(existingWord._id, { ...wordUpdates, updatedAt: Date.now() });
        }
      } else {
        // New Word
        const newId = await ctx.db.insert('words', {
          word: item.word,
          meaning: item.meaning || '',
          partOfSpeech: item.partOfSpeech || 'NOUN',
          hanja: item.hanja,
          meaningEn: item.meaningEn,
          meaningVi: item.meaningVi,
          meaningMn: item.meaningMn,
          tips: item.tips,
        });
        wordIdMap.set(item.word, newId);
        newWordCount++;
      }
    });

    // Wait for all word operations
    try {
      await Promise.all(wordOps);
    } catch (e: unknown) {
      // If critical failure in word phase
      errors.push(`Critical error in word phase: ${toErrorMessage(e)}`);
    }

    // Phase 2: Resolve Appearances (Concurrent based on resolved IDs)
    const appOps = items.map(async item => {
      const wordId = wordIdMap.get(item.word);
      if (!wordId) {
        failedCount++;
        errors.push(`${item.word}: Failed to resolve ID`);
        return;
      }

      try {
        // Check existing appearance
        const existingApp = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_word_course_unit', q =>
            q.eq('wordId', wordId).eq('courseId', item.courseId).eq('unitId', item.unitId)
          )
          .unique();

        // Build Final Data (Smart Fill Logic Lite - fallback to word meaning if app meaning missing?)
        // Actually, if we want to do proper smart fill from *other* appearances, we'd need another query.
        // Let's assume for bulk import, if the user didn't provide it, we leave it blank or use word meaning.
        // To keep it clean and fast:

        const finalData = {
          meaning: item.meaning,
          meaningEn: item.meaningEn,
          meaningVi: item.meaningVi,
          meaningMn: item.meaningMn,
          exampleSentence: item.exampleSentence,
          exampleMeaning: item.exampleMeaning,
          exampleMeaningEn: item.exampleMeaningEn,
          exampleMeaningVi: item.exampleMeaningVi,
          exampleMeaningMn: item.exampleMeaningMn,
        };

        // Filter out undefined
        const cleanData: {
          meaning?: string;
          meaningEn?: string;
          meaningVi?: string;
          meaningMn?: string;
          exampleSentence?: string;
          exampleMeaning?: string;
          exampleMeaningEn?: string;
          exampleMeaningVi?: string;
          exampleMeaningMn?: string;
        } = {};
        Object.entries(finalData).forEach(([k, v]) => {
          if (v !== undefined) {
            (cleanData as Record<string, unknown>)[k] = v;
          }
        });

        if (existingApp) {
          await ctx.db.patch(existingApp._id, cleanData);
        } else {
          await ctx.db.insert('vocabulary_appearances', {
            wordId,
            courseId: item.courseId,
            unitId: item.unitId,
            ...finalData, // undefineds are fine in insert? No, usually cleaner to spread exacts or let schema handle optionals.
            // Convex handles undefined/optional gracefully often, but better to be explicit.
            createdAt: Date.now(),
          });
        }
        successCount++;
      } catch (e: unknown) {
        failedCount++;
        errors.push(`${item.word} (App): ${toErrorMessage(e)}`);
      }
    });

    await Promise.all(appOps);

    return {
      success: true,
      results: {
        success: successCount,
        failed: failedCount,
        smartFilled: smartFilledCount, // Logic simplified, might be 0 now
        newWords: newWordCount,
        errors,
      },
    };
  },
});

// Get words due for review (Vocab Book - SRS)
// OPTIMIZATION: Batch query with Map instead of N+1 queries
export const getDueForReview = query({
  args: {},
  handler: async (ctx): Promise<VocabReviewItemDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    // Get all user progress that is not MASTERED
    const progressItems = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId))
      .collect();

    // Filter: not mastered
    const notMastered = progressItems.filter(p => p.status !== 'MASTERED');

    // OPTIMIZATION: Batch fetch all words
    const wordIds = [...new Set(notMastered.map(p => p.wordId))];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    // Assemble data in memory
    const wordsWithProgress = notMastered.map(progress => {
      const word = wordsMap.get(progress.wordId.toString());
      if (!word) return null;

      return {
        id: word._id,
        word: word.word,
        meaning: word.meaning,
        partOfSpeech: word.partOfSpeech,
        hanja: word.hanja,
        pronunciation: word.pronunciation,
        audioUrl: word.audioUrl,
        progress: {
          id: progress._id,
          status: progress.status ?? 'LEARNING',
          interval: progress.interval ?? 1,
          streak: progress.streak ?? 0,
          nextReviewAt: progress.nextReviewAt ?? null,
          lastReviewedAt: progress.lastReviewedAt ?? null,
        },
      };
    });

    return wordsWithProgress.filter(w => w !== null);
  },
});

export const getVocabBook = query({
  args: {
    search: v.optional(v.string()),
    includeMastered: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VocabBookItemDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const progressItems = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const filteredProgress = args.includeMastered
      ? progressItems
      : progressItems.filter(p => p.status !== 'MASTERED');

    const wordIds = [...new Set(filteredProgress.map(p => p.wordId))];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    const latestAppearances = await Promise.all(
      wordIds.map(async wordId => {
        const app = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_word_createdAt', q => q.eq('wordId', wordId))
          .order('desc')
          .first();
        return [wordId.toString(), app] as const;
      })
    );
    const appearanceMap = new Map(latestAppearances);

    const searchQuery = args.search?.trim().toLowerCase();
    const items = filteredProgress
      .map(progress => {
        const word = wordsMap.get(progress.wordId.toString());
        if (!word) return null;

        const app = appearanceMap.get(progress.wordId.toString());

        const meaning = app?.meaning || word.meaning;
        const meaningEn = app?.meaningEn || word.meaningEn;
        const meaningVi = app?.meaningVi || word.meaningVi;
        const meaningMn = app?.meaningMn || word.meaningMn;

        const item: VocabBookItemDto = {
          id: word._id,
          word: word.word,
          meaning,
          meaningEn,
          meaningVi,
          meaningMn,
          partOfSpeech: word.partOfSpeech,
          hanja: word.hanja,
          pronunciation: word.pronunciation,
          audioUrl: word.audioUrl,
          exampleSentence: app?.exampleSentence,
          exampleMeaning: app?.exampleMeaning,
          exampleMeaningEn: app?.exampleMeaningEn,
          exampleMeaningVi: app?.exampleMeaningVi,
          exampleMeaningMn: app?.exampleMeaningMn,
          progress: {
            id: progress._id,
            status: progress.status ?? 'LEARNING',
            interval: progress.interval ?? progress.scheduled_days ?? 1,
            streak: progress.streak ?? progress.reps ?? 0,
            nextReviewAt: progress.nextReviewAt ?? progress.due ?? null,
            lastReviewedAt: progress.lastReviewedAt ?? progress.last_review ?? null,
            state: progress.state,
            due: progress.due,
            stability: progress.stability,
            difficulty: progress.difficulty,
            elapsed_days: progress.elapsed_days,
            scheduled_days: progress.scheduled_days,
            learning_steps: progress.learning_steps,
            reps: progress.reps,
            lapses: progress.lapses,
            last_review: progress.last_review ?? null,
          },
        };

        if (searchQuery) {
          const w = item.word.toLowerCase();
          const m = (item.meaning || '').toLowerCase();
          const ex = (item.exampleSentence || '').toLowerCase();
          if (!w.includes(searchQuery) && !m.includes(searchQuery) && !ex.includes(searchQuery)) {
            return null;
          }
        }

        return item;
      })
      .filter((x): x is VocabBookItemDto => x !== null);

    const limit = args.limit && args.limit > 0 ? Math.min(args.limit, 2000) : undefined;
    return limit ? items.slice(0, limit) : items;
  },
});

// Add word to review list (Manual add to SRS)
export const addToReview = mutation({
  args: {
    word: v.string(),
    meaning: v.string(),
    partOfSpeech: v.optional(v.string()),
    context: v.optional(v.string()),
    source: v.optional(v.string()), // e.g., "TOPIK", "READING", "MANUAL"
  },
  handler: async (ctx, args) => {
    console.log(`[addToReview] Called for word: ${args.word}, source: ${args.source}`);
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    console.log(`[addToReview] User ID: ${userId}`);

    // 1. Check if word exists in master dictionary
    const existingWord = await ctx.db
      .query('words')
      .withIndex('by_word', q => q.eq('word', args.word))
      .unique();

    let wordId;
    if (existingWord) {
      wordId = existingWord._id;
    } else {
      // Create new word in dictionary
      wordId = await ctx.db.insert('words', {
        word: args.word,
        meaning: args.meaning,
        partOfSpeech: args.partOfSpeech || 'NOUN',
      });
    }

    // 2. Check if user already has progress for this word
    const existingProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', wordId))
      .unique();

    if (existingProgress) {
      // Already in review list - optionally reset to LEARNING
      if (existingProgress.status === 'MASTERED') {
        await ctx.db.patch(existingProgress._id, {
          status: 'LEARNING',
          interval: 1,
          streak: 0,
          nextReviewAt: now + 24 * 60 * 60 * 1000,
        });
      }
      return { success: true, wordId, action: 'updated' };
    }

    // 3. Create new progress entry
    await ctx.db.insert('user_vocab_progress', {
      userId: userId,
      wordId,
      status: 'NEW',
      interval: 0.5,
      streak: 0,
      lastReviewedAt: now,
      nextReviewAt: now + 12 * 60 * 60 * 1000, // 12 hours
    });

    return { success: true, wordId, action: 'created' };
  },
});

export const setMastery = mutation({
  args: {
    wordId: v.id('words'),
    mastered: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    const existingProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', args.wordId))
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
      };

      if (existingProgress) {
        await ctx.db.patch(existingProgress._id, patch);
        return { success: true, action: 'updated' as const };
      }

      await ctx.db.insert('user_vocab_progress', {
        userId,
        wordId: args.wordId,
        ...patch,
      });
      return { success: true, action: 'created' as const };
    }

    if (!existingProgress) {
      return { success: true, action: 'noop' as const };
    }

    await ctx.db.patch(existingProgress._id, {
      status: 'LEARNING',
      interval: 1,
      streak: 0,
      nextReviewAt: now + oneDay,
      lastReviewedAt: now,
      state: 1,
      due: now + oneDay,
      stability: 1,
      scheduled_days: 1,
      learning_steps: 0,
      lapses: existingProgress.lapses ?? 0,
      last_review: now,
    });

    return { success: true, action: 'updated' as const };
  },
});

// Update vocabulary word and its appearance (Admin only)
export const updateVocab = mutation({
  args: {
    wordId: v.id('words'),
    appearanceId: v.optional(v.id('vocabulary_appearances')),
    // Word fields
    word: v.optional(v.string()),
    meaning: v.optional(v.string()),
    meaningEn: v.optional(v.string()),
    meaningVi: v.optional(v.string()),
    meaningMn: v.optional(v.string()),
    partOfSpeech: v.optional(v.string()),
    // Appearance fields
    unitId: v.optional(v.number()),
    exampleSentence: v.optional(v.string()),
    exampleMeaning: v.optional(v.string()),
    exampleMeaningEn: v.optional(v.string()),
    exampleMeaningVi: v.optional(v.string()),
    exampleMeaningMn: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const { wordId, appearanceId, ...fields } = args;

    // 1. Update word fields
    const wordFields: Record<string, string | undefined> = {};
    if (fields.word !== undefined) wordFields.word = fields.word;
    if (fields.meaning !== undefined) wordFields.meaning = fields.meaning;
    if (fields.meaningEn !== undefined) wordFields.meaningEn = fields.meaningEn;
    if (fields.meaningVi !== undefined) wordFields.meaningVi = fields.meaningVi;
    if (fields.meaningMn !== undefined) wordFields.meaningMn = fields.meaningMn;
    if (fields.partOfSpeech !== undefined) wordFields.partOfSpeech = fields.partOfSpeech;

    if (Object.keys(wordFields).length > 0) {
      await ctx.db.patch(wordId, {
        ...wordFields,
        updatedAt: Date.now(),
      });
    }

    // 2. Update appearance fields if appearanceId provided
    if (appearanceId) {
      const appFields: Record<string, string | number | undefined> = {};
      if (fields.unitId !== undefined) appFields.unitId = fields.unitId;
      if (fields.exampleSentence !== undefined) appFields.exampleSentence = fields.exampleSentence;
      if (fields.exampleMeaning !== undefined) appFields.exampleMeaning = fields.exampleMeaning;
      if (fields.exampleMeaningEn !== undefined)
        appFields.exampleMeaningEn = fields.exampleMeaningEn;
      if (fields.exampleMeaningVi !== undefined)
        appFields.exampleMeaningVi = fields.exampleMeaningVi;
      if (fields.exampleMeaningMn !== undefined)
        appFields.exampleMeaningMn = fields.exampleMeaningMn;

      if (Object.keys(appFields).length > 0) {
        await ctx.db.patch(appearanceId, appFields);
      }
    }

    return { success: true, wordId };
  },
});
