import { mutation, query, type QueryCtx } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId, requireAdmin } from './utils';
import { DEFAULT_VOCAB_LIMIT } from './queryLimits';
import type { Doc, Id } from './_generated/dataModel';
import { toErrorMessage } from './errors';
import {
  mapFsrsStateToStatus,
  buildWordUpdates,
  buildAppearanceUpdates,
  cleanupUndefinedFields,
  normalizeUnitIdParam,
  resolveTargetUnitId,
} from './vocabHelpers';

export type VocabStatsDto = {
  total: number;
  mastered: number;
};

const isVisibleInstitute = <T extends { isArchived?: boolean }>(
  institute: T | null | undefined
): institute is T => !!institute && institute.isArchived !== true;

const resolveCourseNameMap = async (ctx: QueryCtx, courseIds: Iterable<string>) => {
  const uniqueCourseIds = [...new Set(Array.from(courseIds).filter(courseId => courseId.trim()))];
  const entries = await Promise.all(
    uniqueCourseIds.map(async courseId => {
      const normalizedInstituteId = ctx.db.normalizeId('institutes', courseId);
      let institute: Doc<'institutes'> | null = null;

      if (normalizedInstituteId) {
        institute = await ctx.db.get(normalizedInstituteId);
      }
      if (!institute) {
        institute = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', courseId))
          .unique();
      }

      return [courseId, isVisibleInstitute(institute) ? institute.name : courseId] as const;
    })
  );

  return new Map<string, string>(entries);
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

export type VocabReviewDeckDto = {
  _id: Id<'words'>;
  word: string;
  meaning: string;
  meaningEn?: string;
  meaningVi?: string;
  meaningMn?: string;
  pronunciation?: string;
  audioUrl?: string;
  hanja?: string;
  partOfSpeech: string;
  unitId: number;
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  progress?: {
    id: Id<'user_vocab_progress'>;
    status?: string;
    interval?: number;
    streak?: number;
    nextReviewAt?: number | null;
    lastReviewedAt?: number | null;
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
  } | null;
  mastered?: boolean;
};

export type DailyPhraseDto = {
  id: string;
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
    difficulty?: number;
    lapses?: number;
  };
};

export type VocabReviewSummaryDto = {
  total: number;
  dueTotal: number;
  dueNow: number;
  unlearned: number;
  mastered: number;
  learning: number;
  recommendedToday: number;
};

export type VocabBookPageDto = {
  items: VocabBookItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
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

const SCAN_PAGE_SIZE = 500;

type VocabBookCategory = 'ALL' | 'UNLEARNED' | 'DUE' | 'MASTERED';

const encodeVocabBookCursor = (value: { dbCursor: string | null; offset: number }): string => {
  return JSON.stringify(value);
};

const decodeVocabBookCursor = (
  encoded: string | undefined
): { dbCursor: string | null; offset: number } => {
  if (!encoded) return { dbCursor: null, offset: 0 };
  try {
    const parsed = JSON.parse(encoded) as {
      dbCursor?: unknown;
      offset?: unknown;
    };
    const dbCursor = typeof parsed.dbCursor === 'string' ? parsed.dbCursor : null;
    const offset =
      typeof parsed.offset === 'number' && Number.isInteger(parsed.offset) && parsed.offset >= 0
        ? parsed.offset
        : 0;
    return { dbCursor, offset };
  } catch {
    return { dbCursor: null, offset: 0 };
  }
};

const matchVocabBookCategory = (
  progress: Doc<'user_vocab_progress'>,
  category: VocabBookCategory
) => {
  if (category === 'ALL') return true;
  if (category === 'MASTERED') return progress.status === 'MASTERED';
  if (category === 'UNLEARNED') return progress.status === 'NEW' || progress.state === 0;
  const isMastered = progress.status === 'MASTERED';
  const isUnlearned = progress.status === 'NEW' || progress.state === 0;
  return !isMastered && !isUnlearned;
};

// Get Vocabulary Stats (Dashboard)
// Get Vocabulary Stats (Dashboard)
export const getStats = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<VocabStatsDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);

      const courseId = args.courseId.trim();
      if (!courseId) return { total: 0, mastered: 0 };

      // Helpful when debugging "Server Error" from the client:
      // check Convex logs for this line to confirm which deployment/version is running.
      console.log(`[vocab:getStats] courseId=${courseId}`);

      // IMPORTANT: This query must be bounded to avoid Convex timeouts when datasets grow.
      // These caps intentionally bias toward reliability over perfect accuracy on very large datasets.
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
      console.error(`[vocab:getStats] failed: ${toErrorMessage(err)}`);
      return { total: 0, mastered: 0 };
    }
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

    const courseNameMap = await resolveCourseNameMap(
      ctx,
      args.courseId ? [args.courseId] : result.page.map(app => app.courseId)
    );

    // Batch fetch words for the page
    const wordIds = [...new Set(result.page.map(a => a.wordId))];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    // Map results
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

    // If courseId is provided, filter via appearances FIRST (before limit)
    if (args.courseId) {
      const courseNameMap = await resolveCourseNameMap(ctx, [args.courseId]);
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

    // No courseId filter: get all words with course associations
    const words = await ctx.db.query('words').take(limit);
    const appearances = await ctx.db.query('vocabulary_appearances').collect();
    const courseNameMap = await resolveCourseNameMap(ctx, [
      ...new Set(appearances.map(app => app.courseId)),
    ]);

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
    try {
      const userId = await getOptionalAuthUserId(ctx);
      let effectiveCourseId = args.courseId;
      let institute: Doc<'institutes'> | null = null;
      const instituteId = ctx.db.normalizeId('institutes', args.courseId);

      if (instituteId) {
        institute = await ctx.db.get(instituteId);
        if (institute) {
          effectiveCourseId = institute.id;
        }
      } else {
        // Try lookup by legacy ID if instituteId was null (fallback)
        institute = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', effectiveCourseId))
          .unique();
      }
      if (!isVisibleInstitute(institute)) {
        return [];
      }

      // 1. Get appearances with optional limit
      const limit = args.limit || DEFAULT_VOCAB_LIMIT;
      const normalizedUnitId = normalizeUnitIdParam(args.unitId);

      if (args.unitId !== undefined) {
        if (normalizedUnitId === undefined) {
          return [];
        }
      }

      const targetUnitId = resolveTargetUnitId(institute, normalizedUnitId);

      // 2. Query appearances using the resolved targetUnitId
      let appearances;
      if (typeof targetUnitId === 'number') {
        appearances = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_course_unit', q =>
            q.eq('courseId', effectiveCourseId).eq('unitId', targetUnitId)
          )
          .take(limit);
      } else {
        appearances = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
          .take(limit);
      }

      // Legacy fallback (safeguard) - Only run if explicit logic didn't find anything AND we didn't already offset
      // Note: The helper function logic is the primary source of truth now.
      if (
        appearances.length === 0 &&
        typeof normalizedUnitId === 'number' &&
        targetUnitId === normalizedUnitId &&
        normalizedUnitId <= 20
      ) {
        // Optional: keep legacy blind +10 check if absolutely necessary, but removing for now as discussed.
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
    } catch (err) {
      console.error(`[vocab:getOfCourse] failed: ${toErrorMessage(err)}`);
      return [];
    }
  },
});

// Lightweight query for high-frequency review views.
// Returns only the fields needed by flashcards / learn / test flows.
export const getReviewDeck = query({
  args: {
    courseId: v.string(),
    unitId: v.optional(v.union(v.number(), v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VocabReviewDeckDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      let effectiveCourseId = args.courseId;
      let institute: Doc<'institutes'> | null = null;
      const instituteId = ctx.db.normalizeId('institutes', args.courseId);

      if (instituteId) {
        institute = await ctx.db.get(instituteId);
        if (institute) {
          effectiveCourseId = institute.id;
        }
      } else {
        institute = await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', effectiveCourseId))
          .unique();
      }
      if (!isVisibleInstitute(institute)) {
        return [];
      }

      const limit = args.limit || DEFAULT_VOCAB_LIMIT;
      const normalizedUnitId = normalizeUnitIdParam(args.unitId);
      if (args.unitId !== undefined && normalizedUnitId === undefined) {
        return [];
      }
      const targetUnitId = resolveTargetUnitId(institute, normalizedUnitId);

      let appearances;
      if (typeof targetUnitId === 'number') {
        appearances = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_course_unit', q =>
            q.eq('courseId', effectiveCourseId).eq('unitId', targetUnitId)
          )
          .take(limit);
      } else {
        appearances = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
          .take(limit);
      }

      if (appearances.length === 0) {
        return [];
      }

      const wordIds = [
        ...new Set(
          appearances
            .map(a => ctx.db.normalizeId('words', a.wordId))
            .filter((id): id is Id<'words'> => id !== null)
        ),
      ];
      const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
      const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

      const progressMap = new Map<string, Doc<'user_vocab_progress'>>();
      if (userId) {
        const allProgress = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        for (const progress of allProgress) {
          progressMap.set(progress.wordId.toString(), progress);
        }
      }

      const rows: VocabReviewDeckDto[] = [];
      for (const app of appearances) {
        const normalizedWordId = ctx.db.normalizeId('words', app.wordId);
        if (!normalizedWordId) continue;
        const word = wordsMap.get(normalizedWordId.toString());
        if (!word) continue;

        const progress = progressMap.get(normalizedWordId.toString());
        rows.push({
          _id: word._id,
          word: word.word,
          meaning: app.meaning || word.meaning,
          meaningEn: app.meaningEn || word.meaningEn,
          meaningVi: app.meaningVi || word.meaningVi,
          meaningMn: app.meaningMn || word.meaningMn,
          pronunciation: word.pronunciation,
          audioUrl: word.audioUrl,
          hanja: word.hanja,
          partOfSpeech: word.partOfSpeech,
          unitId: app.unitId,
          exampleSentence: app.exampleSentence,
          exampleMeaning: app.exampleMeaning,
          exampleMeaningEn: app.exampleMeaningEn,
          exampleMeaningVi: app.exampleMeaningVi,
          exampleMeaningMn: app.exampleMeaningMn,
          progress: progress
            ? {
                id: progress._id,
                status: progress.status,
                interval: progress.interval,
                streak: progress.streak,
                nextReviewAt: progress.nextReviewAt,
                lastReviewedAt: progress.lastReviewedAt,
                state: progress.state,
                due: progress.due,
                stability: progress.stability,
                difficulty: progress.difficulty,
                elapsed_days: progress.elapsed_days,
                scheduled_days: progress.scheduled_days,
                learning_steps: progress.learning_steps,
                reps: progress.reps,
                lapses: progress.lapses,
                last_review: progress.last_review,
              }
            : null,
          mastered: progress?.status === 'MASTERED' || false,
        });
      }

      return rows;
    } catch (err) {
      console.error(`[vocab:getReviewDeck] failed: ${toErrorMessage(err)}`);
      return [];
    }
  },
});

// Get Daily Phrase (Word of the day)
export const getDailyPhrase = query({
  args: {
    language: v.optional(v.string()), // 'zh', 'en', 'vi', 'mn'
  },
  handler: async (ctx, args): Promise<DailyPhraseDto | null> => {
    const lang = args.language || 'zh';

    // 0. Try dedicated Daily Phrases table
    const phrases = await ctx.db.query('daily_phrases').collect();
    if (phrases.length > 0) {
      const day = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
      const index = day % phrases.length;
      const phrase = phrases[index];

      let translation = phrase.translation; // Default to English
      if (lang === 'zh' || !args.language) translation = phrase.translationZh || phrase.translation;
      if (lang === 'vi' && phrase.translationVi) translation = phrase.translationVi;
      if (lang === 'mn' && phrase.translationMn) translation = phrase.translationMn;

      return {
        id: phrase._id as string,
        korean: phrase.korean,
        romanization: phrase.romanization,
        translation,
      };
    }

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
      id: word._id as string,
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
        // Wrong (reset logic)
        // streak = 0 (default)
        // interval = 1 (default)
        // status = 'LEARNING' (default)
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
        // interval is 1 (default)
        // status is 'LEARNING' (default)
      } else {
        // streak is 0 (default)
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

    const stateToStatus = (state: number): string => {
      return mapFsrsStateToStatus(state, fsrsState.stability);
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

// Batch FSRS progress updates to reduce mutation frequency during fast review sessions.
export const updateProgressBatch = mutation({
  args: {
    items: v.array(
      v.object({
        wordId: v.id('words'),
        rating: v.number(),
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
        reviewDurationMs: v.optional(v.number()),
        reviewedAt: v.optional(v.number()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (args.items.length === 0) {
      return { success: true, processed: 0, updated: 0, inserted: 0 };
    }

    const latestByWord = new Map<
      string,
      {
        wordId: Id<'words'>;
        rating: number;
        fsrsState: {
          state: number;
          due: number;
          stability: number;
          difficulty: number;
          elapsed_days: number;
          scheduled_days: number;
          learning_steps: number;
          reps: number;
          lapses: number;
          last_review: number | null;
        };
        reviewDurationMs?: number;
        reviewedAt?: number;
      }
    >();

    for (const item of args.items) {
      latestByWord.set(item.wordId.toString(), item);
    }

    let updated = 0;
    let inserted = 0;
    const now = Date.now();
    for (const item of latestByWord.values()) {
      const reviewTs = typeof item.reviewedAt === 'number' ? item.reviewedAt : now;
      const stateToStatus = (state: number): string => {
        return mapFsrsStateToStatus(state, item.fsrsState.stability);
      };

      const progressData = {
        state: item.fsrsState.state,
        due: item.fsrsState.due,
        stability: item.fsrsState.stability,
        difficulty: item.fsrsState.difficulty,
        elapsed_days: item.fsrsState.elapsed_days,
        scheduled_days: item.fsrsState.scheduled_days,
        learning_steps: item.fsrsState.learning_steps,
        reps: item.fsrsState.reps,
        lapses: item.fsrsState.lapses,
        last_review: item.fsrsState.last_review ?? reviewTs,
        status: stateToStatus(item.fsrsState.state),
        interval: item.fsrsState.scheduled_days,
        streak: item.fsrsState.reps,
        nextReviewAt: item.fsrsState.due,
        lastReviewedAt: reviewTs,
      };

      const existing = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user_word', q => q.eq('userId', userId).eq('wordId', item.wordId))
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, progressData);
        updated += 1;
      } else {
        await ctx.db.insert('user_vocab_progress', {
          userId,
          wordId: item.wordId,
          ...progressData,
        });
        inserted += 1;
      }
    }

    return {
      success: true,
      processed: latestByWord.size,
      updated,
      inserted,
    };
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
        meaningEn: v.optional(v.string()),
        meaningVi: v.optional(v.string()),
        meaningMn: v.optional(v.string()),
        courseId: v.string(),
        unitId: v.number(),
        exampleSentence: v.optional(v.string()),
        exampleMeaning: v.optional(v.string()),
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

    const items = args.items;
    let successCount = 0;
    let failedCount = 0;
    const errors: string[] = [];
    const smartFilledCount = 0;
    let newWordCount = 0;

    // Phase 1: Resolve Words
    const wordPromises = items.map(item =>
      ctx.db
        .query('words')
        .withIndex('by_word', q => q.eq('word', item.word))
        .unique()
    );
    const existingWordsResults = await Promise.all(wordPromises);
    const wordIdMap = new Map<string, Id<'words'>>();

    const wordOps = items.map(async (item, idx) => {
      const existingWord = existingWordsResults[idx];
      if (existingWord) {
        wordIdMap.set(item.word, existingWord._id);
        const wordUpdates: Record<string, string | undefined> = {
          meaning: item.meaning,
          partOfSpeech: item.partOfSpeech,
          hanja: item.hanja,
          meaningEn: item.meaningEn,
          meaningVi: item.meaningVi,
          meaningMn: item.meaningMn,
        };
        const cleanUpdates = cleanupUndefinedFields<Record<string, unknown>>(wordUpdates);
        if (Object.keys(cleanUpdates).length > 0) {
          await ctx.db.patch(existingWord._id, { ...cleanUpdates, updatedAt: Date.now() });
        }
      } else {
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

    try {
      await Promise.all(wordOps);
    } catch (e: unknown) {
      errors.push(`Critical error in word phase: ${toErrorMessage(e)}`);
    }

    // Phase 2: Resolve Appearances
    const appOps = items.map(async item => {
      const wordId = wordIdMap.get(item.word);
      if (!wordId) {
        failedCount++;
        errors.push(`${item.word}: Failed to resolve ID`);
        return;
      }

      try {
        const existingApp = await ctx.db
          .query('vocabulary_appearances')
          .withIndex('by_word_course_unit', q =>
            q.eq('wordId', wordId).eq('courseId', item.courseId).eq('unitId', item.unitId)
          )
          .unique();

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
        const cleanData = cleanupUndefinedFields<Record<string, unknown>>(finalData);

        if (existingApp) {
          await ctx.db.patch(existingApp._id, cleanData);
        } else {
          await ctx.db.insert('vocabulary_appearances', {
            wordId,
            courseId: item.courseId,
            unitId: item.unitId,
            ...cleanData,
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
        smartFilled: smartFilledCount,
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

    // Use collect() instead of paginated loop
    const allProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const notMastered = allProgress.filter(p => p.status !== 'MASTERED');

    // OPTIMIZATION: Batch fetch all words
    const wordIds = [...new Set(notMastered.map(p => p.wordId))];
    const wordsArray = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(wordsArray.filter(Boolean).map(w => [w!._id.toString(), w!]));

    // Assemble data in memory
    const wordsWithProgress: Array<VocabReviewItemDto | null> = notMastered.map(progress => {
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
          difficulty: progress.difficulty,
          lapses: progress.lapses,
        },
      };
    });

    return wordsWithProgress.filter((w): w is VocabReviewItemDto => w !== null);
  },
});

export const getReviewSummary = query({
  args: {
    savedByUserOnly: v.optional(v.boolean()),
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

      const now = Date.now();
      let total = 0;
      let mastered = 0;
      let unlearned = 0;
      let dueTotal = 0;
      let dueNow = 0;
      let cursor: string | null = null;

      do {
        const page = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ numItems: SCAN_PAGE_SIZE, cursor });

        for (const progress of page.page) {
          if (args.savedByUserOnly && progress.savedByUser !== true) continue;

          total += 1;
          const isMastered = progress.status === 'MASTERED';
          const isUnlearned = progress.status === 'NEW' || progress.state === 0;
          const nextReviewAt = progress.nextReviewAt ?? progress.due ?? null;

          if (isMastered) {
            mastered += 1;
            continue;
          }

          if (isUnlearned) {
            unlearned += 1;
          }

          dueTotal += 1;
          if (typeof nextReviewAt === 'number' && nextReviewAt <= now) {
            dueNow += 1;
          }
        }

        cursor = page.isDone ? null : page.continueCursor;
      } while (cursor);

      const recommendedToday =
        total === 0
          ? 0
          : Math.max(
              10,
              Math.min(60, dueNow > 0 ? dueNow : Math.min(dueTotal > 0 ? dueTotal : total, 30))
            );

      return {
        total,
        dueTotal,
        dueNow,
        unlearned,
        mastered,
        learning: Math.max(0, dueTotal - unlearned),
        recommendedToday,
      };
    } catch (err) {
      console.error(`[vocab:getReviewSummary] failed: ${toErrorMessage(err)}`);
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

const buildVocabBookItems = async (
  ctx: QueryCtx,
  selected: Array<{ progress: Doc<'user_vocab_progress'>; word: Doc<'words'> }>
): Promise<VocabBookItemDto[]> => {
  if (selected.length === 0) return [];

  const MAX_APPEARANCE_LOOKUPS = 200;
  const appearanceLookups = await Promise.all(
    selected.slice(0, MAX_APPEARANCE_LOOKUPS).map(async ({ word }) => {
      const app = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_word_createdAt', q => q.eq('wordId', word._id))
        .order('desc')
        .first();
      return [word._id.toString(), app] as const;
    })
  );
  const appearanceMap = new Map<string, Doc<'vocabulary_appearances'> | null>();
  for (const [id, app] of appearanceLookups) appearanceMap.set(id, app ?? null);

  return selected.map(({ progress, word }) => {
    const app = appearanceMap.get(word._id.toString()) ?? null;
    const meaning = app?.meaning || word.meaning;
    const meaningEn = app?.meaningEn || word.meaningEn;
    const meaningVi = app?.meaningVi || word.meaningVi;
    const meaningMn = app?.meaningMn || word.meaningMn;

    return {
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
  });
};

export const getVocabBook = query({
  args: {
    search: v.optional(v.string()),
    includeMastered: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    savedByUserOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args): Promise<VocabBookItemDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) return [];

      const includeMastered = args.includeMastered ?? false;
      const hardCap = 2000;
      const limit =
        args.limit && args.limit > 0
          ? Math.min(args.limit, hardCap)
          : Math.min(DEFAULT_VOCAB_LIMIT, hardCap);
      const searchQuery = args.search?.trim().toLowerCase() || '';

      type ProgressWithWord = { progress: Doc<'user_vocab_progress'>; word: Doc<'words'> };

      // 1) Select up to `limit` progress entries (and join `words`) without unbounded fan-out.
      const selected: ProgressWithWord[] = [];
      let cursor: string | null = null;
      let scanned = 0;
      const MAX_PROGRESS_SCAN = 12000;

      do {
        const page = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ numItems: SCAN_PAGE_SIZE, cursor });

        const progressPage = page.page.filter(
          p =>
            (includeMastered || p.status !== 'MASTERED') &&
            (!args.savedByUserOnly || p.savedByUser === true)
        );

        if (!searchQuery) {
          // No search: just take the first `limit` items (fast path).
          const remaining = limit - selected.length;
          const take = remaining > 0 ? progressPage.slice(0, remaining) : [];
          const words = await Promise.all(take.map(p => ctx.db.get(p.wordId)));
          for (let i = 0; i < take.length; i++) {
            const word = words[i];
            if (!word) continue;
            selected.push({ progress: take[i], word });
          }
        } else {
          // Search: scan a bounded amount and stop as soon as we have enough matches.
          const words = await Promise.all(progressPage.map(p => ctx.db.get(p.wordId)));
          for (let i = 0; i < progressPage.length; i++) {
            const word = words[i];
            if (!word) continue;

            const w = word.word.toLowerCase();
            const m = (word.meaning || '').toLowerCase();
            if (!w.includes(searchQuery) && !m.includes(searchQuery)) continue;

            selected.push({ progress: progressPage[i], word });
            if (selected.length >= limit) break;
          }
        }

        scanned += page.page.length;
        cursor =
          page.isDone || selected.length >= limit || scanned >= MAX_PROGRESS_SCAN
            ? null
            : page.continueCursor;
      } while (cursor);

      if (selected.length === 0) return [];

      // 2) Fetch latest appearance per selected word (bounded).
      // This is optional for core functionality; keep it capped for reliability.
      const MAX_APPEARANCE_LOOKUPS = 200;
      const appearanceLookups = await Promise.all(
        selected.slice(0, MAX_APPEARANCE_LOOKUPS).map(async ({ word }) => {
          const app = await ctx.db
            .query('vocabulary_appearances')
            .withIndex('by_word_createdAt', q => q.eq('wordId', word._id))
            .order('desc')
            .first();
          return [word._id.toString(), app] as const;
        })
      );
      const appearanceMap = new Map<string, Doc<'vocabulary_appearances'> | null>();
      for (const [id, app] of appearanceLookups) appearanceMap.set(id, app ?? null);

      return selected.map(({ progress, word }) => {
        const app = appearanceMap.get(word._id.toString()) ?? null;

        const meaning = app?.meaning || word.meaning;
        const meaningEn = app?.meaningEn || word.meaningEn;
        const meaningVi = app?.meaningVi || word.meaningVi;
        const meaningMn = app?.meaningMn || word.meaningMn;

        return {
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
      });
    } catch (err) {
      console.error(`[vocab:getVocabBook] failed: ${toErrorMessage(err)}`);
      return [];
    }
  },
});

export const getVocabBookPage = query({
  args: {
    search: v.optional(v.string()),
    includeMastered: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    savedByUserOnly: v.optional(v.boolean()),
    category: v.optional(
      v.union(v.literal('ALL'), v.literal('UNLEARNED'), v.literal('DUE'), v.literal('MASTERED'))
    ),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<VocabBookPageDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      const includeMastered = args.includeMastered ?? false;
      const category: VocabBookCategory = args.category ?? 'ALL';
      const searchQuery = args.search?.trim().toLowerCase() || '';
      const hardCap = 120;
      const pageSize =
        args.limit && args.limit > 0 ? Math.min(args.limit, hardCap) : Math.min(60, hardCap);
      const start = decodeVocabBookCursor(args.cursor);

      let dbCursor = start.dbCursor;
      let offset = start.offset;
      let scanned = 0;
      const MAX_PROGRESS_SCAN = 14000;
      const selected: Array<{ progress: Doc<'user_vocab_progress'>; word: Doc<'words'> }> = [];

      while (selected.length < pageSize && scanned < MAX_PROGRESS_SCAN) {
        const currentDbCursor = dbCursor;
        const page = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ numItems: SCAN_PAGE_SIZE, cursor: currentDbCursor });

        scanned += page.page.length;
        const pageSlice = offset > 0 ? page.page.slice(offset) : page.page;
        offset = 0;

        const progressPage = pageSlice.filter(progress => {
          if (args.savedByUserOnly && progress.savedByUser !== true) return false;
          if (!includeMastered && progress.status === 'MASTERED') return false;
          return matchVocabBookCategory(progress, category);
        });

        if (progressPage.length > 0) {
          const words = await Promise.all(
            progressPage.map(progress => ctx.db.get(progress.wordId))
          );
          for (let index = 0; index < progressPage.length; index += 1) {
            const progress = progressPage[index];
            const word = words[index];
            if (!word) continue;

            if (searchQuery) {
              const loweredWord = word.word.toLowerCase();
              const loweredMeanings = [word.meaning, word.meaningEn, word.meaningVi, word.meaningMn]
                .filter((item): item is string => typeof item === 'string')
                .map(item => item.toLowerCase());
              const matchedMeaning = loweredMeanings.some(item => item.includes(searchQuery));
              if (!loweredWord.includes(searchQuery) && !matchedMeaning) {
                continue;
              }
            }

            selected.push({ progress, word });

            if (selected.length >= pageSize) {
              const consumedOffset = page.page.indexOf(progress) + 1;
              const nextCursor =
                consumedOffset < page.page.length
                  ? encodeVocabBookCursor({ dbCursor: currentDbCursor, offset: consumedOffset })
                  : page.isDone
                    ? null
                    : encodeVocabBookCursor({ dbCursor: page.continueCursor, offset: 0 });
              const items = await buildVocabBookItems(ctx, selected);
              return { items, nextCursor, hasMore: Boolean(nextCursor) };
            }
          }
        }

        if (page.isDone) {
          const items = await buildVocabBookItems(ctx, selected);
          return { items, nextCursor: null, hasMore: false };
        }

        dbCursor = page.continueCursor;
      }

      const items = await buildVocabBookItems(ctx, selected);
      return { items, nextCursor: null, hasMore: false };
    } catch (err) {
      console.error(`[vocab:getVocabBookPage] failed: ${toErrorMessage(err)}`);
      return { items: [], nextCursor: null, hasMore: false };
    }
  },
});

export const getVocabBookCount = query({
  args: {
    includeMastered: v.optional(v.boolean()),
    savedByUserOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) return { count: 0 };

      const includeMastered = args.includeMastered ?? true;

      // Bounded scan; accuracy is best-effort on very large datasets.
      const MAX_PROGRESS_DOCS = 20000;
      let scanned = 0;
      let count = 0;
      let cursor: string | null = null;
      do {
        const page = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ numItems: SCAN_PAGE_SIZE, cursor });
        scanned += page.page.length;
        for (const p of page.page) {
          if (args.savedByUserOnly && p.savedByUser !== true) continue;
          if (includeMastered || p.status !== 'MASTERED') count++;
        }
        cursor = page.isDone || scanned >= MAX_PROGRESS_DOCS ? null : page.continueCursor;
      } while (cursor);

      return { count };
    } catch (err) {
      console.error(`[vocab:getVocabBookCount] failed: ${toErrorMessage(err)}`);
      return { count: 0 };
    }
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
      // Already in review list - mark as savedByUser & optionally reset to LEARNING
      const patch: Record<string, unknown> = { savedByUser: true };
      if (existingProgress.status === 'MASTERED') {
        patch.status = 'LEARNING';
        patch.interval = 1;
        patch.streak = 0;
        patch.nextReviewAt = now + 24 * 60 * 60 * 1000;
      }
      await ctx.db.patch(existingProgress._id, patch);
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
      savedByUser: true,
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

const stripMeaningHtml = (value: string) =>
  value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const splitMeaningCandidates = (value: string): string[] => {
  const cleaned = stripMeaningHtml(value);
  if (!cleaned) return [];

  const primaryParts = cleaned
    .split(/\s\/\s|\s\|\s|；|;|\n|／|·/g)
    .map(part => part.trim())
    .filter(Boolean);

  if (primaryParts.length > 1) return primaryParts;
  return [cleaned];
};

const isGenericMeaning = (value: string): boolean => {
  const text = value.trim().toLowerCase();
  return (
    /^(yes|no|okay|ok)$/i.test(text) ||
    /^to be$/.test(text) ||
    /^to not be$/.test(text) ||
    /^there is$/.test(text) ||
    /^there are$/.test(text) ||
    /^and$/.test(text) ||
    /^or$/.test(text) ||
    /^who$/.test(text) ||
    /^what$/.test(text) ||
    /^when$/.test(text)
  );
};

const looksLikeGrammarGloss = (value: string): boolean => {
  const text = value.toLowerCase();
  return (
    /particle|connector|subject|topic|sentence/.test(text) ||
    /\bto be\b|\bto not be\b|\bthere is\b|\bthere are\b|\blet's\b|how\/what about/.test(text) ||
    /together with|subject particle|topic particle/.test(text)
  );
};

const compactForMatch = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}]+/gu, '')
    .trim();

const isEnglishGlossCandidate = (value: string): boolean => {
  const hasLatin = /[A-Za-z]/.test(value);
  if (!hasLatin) return false;

  const hasHangul = /[\u3131-\u318e\uac00-\ud7a3]/i.test(value);
  const hasLowercaseLatin = /[a-z]/.test(value);

  if (hasHangul && !hasLowercaseLatin) {
    // Cases like "SNS 아이디" are not reliable English meanings.
    return false;
  }

  return true;
};

const normalizeMeaningValue = (raw: string, word?: string): string | null => {
  const candidates = splitMeaningCandidates(raw);
  if (candidates.length === 0) return null;

  const normalizedCandidates = candidates
    .map(candidate =>
      candidate
        .replace(/^[-–•·\s]+/, '')
        .replace(/[-–•·\s]+$/, '')
        .trim()
    )
    .filter(candidate => candidate.length > 0);
  if (normalizedCandidates.length === 0) return null;

  const englishCandidates = normalizedCandidates.filter(isEnglishGlossCandidate);
  const first = normalizedCandidates[0];
  const firstHasLatin = isEnglishGlossCandidate(first);

  if (firstHasLatin && !isGenericMeaning(first) && !looksLikeGrammarGloss(first)) {
    return first;
  }

  const fallbackEnglish =
    englishCandidates.find(
      candidate =>
        !isGenericMeaning(candidate) &&
        !looksLikeGrammarGloss(candidate) &&
        candidate.split(/\s+/).length >= 2
    ) ||
    englishCandidates.find(
      candidate => !isGenericMeaning(candidate) && !looksLikeGrammarGloss(candidate)
    ) ||
    englishCandidates.find(candidate => !isGenericMeaning(candidate)) ||
    englishCandidates[0];

  if (fallbackEnglish) {
    return fallbackEnglish;
  }

  if (word) {
    const compactWord = compactForMatch(word);
    if (compactWord.length > 0) {
      const matchedCandidate = normalizedCandidates.find(candidate => {
        const compactCandidate = compactForMatch(candidate);
        return (
          compactCandidate.length > 0 &&
          (compactCandidate.includes(compactWord) || compactWord.includes(compactCandidate))
        );
      });
      if (matchedCandidate) {
        return matchedCandidate;
      }
    }
  }

  if (
    normalizedCandidates.length > 1 &&
    normalizedCandidates.every(candidate => !isEnglishGlossCandidate(candidate))
  ) {
    // Multiple non-English candidates are usually extraction artifacts; skip these ambiguous rows.
    return null;
  }

  return first;
};

export const sanitizeCourseMeanings = mutation({
  args: {
    courseId: v.string(),
    dryRun: v.optional(v.boolean()),
    clearOtherLocales: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const dryRun = args.dryRun ?? false;
    const clearOtherLocales = args.clearOtherLocales ?? true;

    const appearances = await ctx.db
      .query('vocabulary_appearances')
      .withIndex('by_course_unit', q => q.eq('courseId', args.courseId))
      .collect();

    const wordIds = [...new Set(appearances.map(item => item.wordId))];
    const words = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordMap = new Map(words.filter(Boolean).map(word => [word!._id.toString(), word!]));

    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    const samples: Array<{
      word: string;
      before: string;
      after: string;
      appearanceId: Id<'vocabulary_appearances'>;
    }> = [];

    for (const appearance of appearances) {
      const wordDoc = wordMap.get(appearance.wordId.toString());
      const wordText = wordDoc?.word ?? '';

      const sourceMeaning =
        appearance.meaningEn?.trim() ||
        appearance.meaning?.trim() ||
        wordDoc?.meaningEn?.trim() ||
        wordDoc?.meaning?.trim() ||
        '';

      if (!sourceMeaning) {
        skipped += 1;
        continue;
      }

      const normalized = normalizeMeaningValue(sourceMeaning, wordText);
      if (!normalized) {
        skipped += 1;
        continue;
      }

      const existingMeaning = appearance.meaning?.trim() || '';
      const existingMeaningEn = appearance.meaningEn?.trim() || '';
      const existingMeaningVi = appearance.meaningVi?.trim() || '';
      const existingMeaningMn = appearance.meaningMn?.trim() || '';

      const needsUpdate =
        existingMeaning !== normalized ||
        existingMeaningEn !== normalized ||
        (clearOtherLocales && (existingMeaningVi.length > 0 || existingMeaningMn.length > 0));

      if (!needsUpdate) {
        unchanged += 1;
        continue;
      }

      updated += 1;
      if (samples.length < 30) {
        samples.push({
          word: wordText,
          before: sourceMeaning,
          after: normalized,
          appearanceId: appearance._id,
        });
      }

      if (!dryRun) {
        await ctx.db.patch(appearance._id, {
          meaning: normalized,
          meaningEn: normalized,
          meaningVi: clearOtherLocales ? '' : appearance.meaningVi,
          meaningMn: clearOtherLocales ? '' : appearance.meaningMn,
        });
      }
    }

    return {
      success: true,
      dryRun,
      courseId: args.courseId,
      processed: appearances.length,
      updated,
      unchanged,
      skipped,
      samples,
    };
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
    const wordFields = buildWordUpdates(fields);
    if (Object.keys(wordFields).length > 0) {
      await ctx.db.patch(wordId, {
        ...wordFields,
        updatedAt: Date.now(),
      });
    }

    // 2. Update appearance fields if appearanceId provided
    if (appearanceId) {
      const appFields = buildAppearanceUpdates(fields);
      if (Object.keys(appFields).length > 0) {
        await ctx.db.patch(appearanceId, appFields);
      }
    }

    return { success: true, wordId };
  },
});

const learningSessionModeValidator = v.union(
  v.literal('FLASHCARD'),
  v.literal('LEARN'),
  v.literal('TEST')
);

const learningSessionSnapshotValidator = v.object({
  wordIds: v.array(v.string()),
  questionIndex: v.number(),
  wrongWordIds: v.array(v.string()),
  correctCount: v.number(),
  totalAnswered: v.number(),
  currentBatchNum: v.number(),
  settings: v.object({
    multipleChoice: v.boolean(),
    writingMode: v.boolean(),
    mcDirection: v.union(v.literal('KR_TO_NATIVE'), v.literal('NATIVE_TO_KR')),
    writingDirection: v.union(v.literal('KR_TO_NATIVE'), v.literal('NATIVE_TO_KR')),
    autoTTS: v.boolean(),
    soundEffects: v.boolean(),
  }),
  pendingAdvanceReason: v.optional(v.union(v.literal('WRONG'), v.literal('DONT_KNOW'))),
  timestamp: v.number(),
});

export const getActiveLearningSession = query({
  args: {
    instituteId: v.string(),
    unitId: v.number(),
    mode: learningSessionModeValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

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
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

    if (!active) return null;

    return {
      id: active._id,
      instituteId: active.instituteId,
      unitId: active.unitId,
      mode: active.mode,
      status: active.status,
      snapshot: active.snapshot,
      startedAt: active.startedAt,
      updatedAt: active.updatedAt,
      completedAt: active.completedAt,
    };
  },
});

export const upsertLearningSession = mutation({
  args: {
    instituteId: v.string(),
    unitId: v.number(),
    mode: learningSessionModeValidator,
    snapshot: learningSessionSnapshotValidator,
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
      .sort((a, b) => b.updatedAt - a.updatedAt)[0];

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
