/**
 * Vocabulary query functions
 * Extracted from convex/vocab.ts for better organization
 */

import { query, mutation, QueryCtx } from '../_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId, requireAdmin } from '../utils';
import { DEFAULT_VOCAB_LIMIT } from '../queryLimits';
import { vocabLogger } from '../logger';
import type { Doc, Id } from '../_generated/dataModel';
import type {
  VocabActivityHeatmapCellDto,
  VocabDashboardInsightsDto,
  VocabStatsDto,
  VocabWordDto,
  VocabReviewDeckDto,
  VocabBookItemDto,
  VocabBookPageDto,
  VocabReviewSummaryDto,
  VocabProgressDto,
  UnitProgressDto,
} from './vocabTypes';
import { normalizeUnitIdParam, resolveTargetUnitId } from '../vocabHelpers';
import { normalizeStoragePublicUrl } from '../spacesConfig';
import { ONE_DAY_MS, startOfDay } from '../userStatsHelpers';

const SCAN_PAGE_SIZE = 500;

type VocabBookCategory = 'ALL' | 'UNLEARNED' | 'DUE' | 'MASTERED';

const isVisibleInstitute = <T extends { isArchived?: boolean }>(
  institute: T | null | undefined
): institute is T => !!institute && institute.isArchived !== true;

function mapProgress(
  progress: Doc<'user_vocab_progress'> | null | undefined
): VocabProgressDto | null {
  if (!progress) return null;
  return {
    id: progress._id,
    status: progress.status ?? 'NEW',
    interval: progress.interval ?? progress.scheduled_days ?? 1,
    streak: progress.streak ?? progress.reps ?? 0,
    nextReviewAt: progress.nextReviewAt ?? progress.due ?? null,
    lastReviewedAt: progress.lastReviewedAt ?? progress.last_review ?? null,
    state: progress.state,
    due: progress.due ?? progress.nextReviewAt ?? null,
    stability: progress.stability,
    difficulty: progress.difficulty,
    elapsed_days: progress.elapsed_days,
    scheduled_days: progress.scheduled_days,
    learning_steps: progress.learning_steps,
    reps: progress.reps,
    lapses: progress.lapses,
    last_review: progress.last_review ?? progress.lastReviewedAt ?? null,
  };
}

function encodeVocabBookCursor(value: { dbCursor: string | null; offset: number }): string {
  return JSON.stringify(value);
}

function decodeVocabBookCursor(encoded: string | undefined): {
  dbCursor: string | null;
  offset: number;
} {
  if (!encoded) return { dbCursor: null, offset: 0 };
  try {
    const parsed = JSON.parse(encoded) as { dbCursor?: unknown; offset?: unknown };
    return {
      dbCursor: typeof parsed.dbCursor === 'string' ? parsed.dbCursor : null,
      offset:
        typeof parsed.offset === 'number' && Number.isInteger(parsed.offset) && parsed.offset >= 0
          ? parsed.offset
          : 0,
    };
  } catch {
    return { dbCursor: null, offset: 0 };
  }
}

function matchVocabBookCategory(progress: Doc<'user_vocab_progress'>, category: VocabBookCategory) {
  if (category === 'ALL') return true;
  if (category === 'MASTERED') return progress.status === 'MASTERED';
  if (category === 'UNLEARNED') return progress.status === 'NEW' || progress.state === 0;
  const isMastered = progress.status === 'MASTERED';
  const isUnlearned = progress.status === 'NEW' || progress.state === 0;
  return !isMastered && !isUnlearned;
}

async function buildVocabBookItem(
  ctx: QueryCtx,
  word: Doc<'words'>,
  progress: Doc<'user_vocab_progress'> | Partial<Doc<'user_vocab_progress'>> | null
): Promise<VocabBookItemDto> {
  const appearance = await ctx.db
    .query('vocabulary_appearances')
    .withIndex('by_word_createdAt', q => q.eq('wordId', word._id))
    .order('desc')
    .first();

  // Handle both full and partial progress objects
  const mappedProgress = progress && '_id' in progress 
    ? mapProgress(progress as Doc<'user_vocab_progress'>) 
    : null;
  
  // Ensure we always have a valid progress object for VocabBookItemDto
  const defaultProgress: VocabProgressDto = {
    id: '' as Id<'user_vocab_progress'>,
    status: 'NEW',
    interval: 1,
    streak: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    state: 0,
    due: null,
    stability: 0,
    difficulty: 0,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
    reps: 0,
    lapses: 0,
    last_review: null,
  };
  
  const effectiveProgress = mappedProgress ?? defaultProgress;

  return {
    id: word._id,
    word: word.word,
    meaning: appearance?.meaning || word.meaning,
    meaningEn: appearance?.meaningEn || word.meaningEn,
    meaningZh: appearance?.meaning || word.meaning,
    meaningVi: appearance?.meaningVi || word.meaningVi || '',
    meaningMn: appearance?.meaningMn || word.meaningMn || '',
    pronunciation: word.pronunciation,
    hanja: word.hanja,
    partOfSpeech: word.partOfSpeech || '',
    audioUrl: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
    audio: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
    exampleSentence: appearance?.exampleSentence,
    exampleMeaning: appearance?.exampleMeaning,
    exampleMeaningEn: appearance?.exampleMeaningEn,
    exampleMeaningVi: appearance?.exampleMeaningVi,
    exampleMeaningMn: appearance?.exampleMeaningMn,
    example: appearance?.exampleSentence,
    exampleZh: appearance?.exampleMeaning,
    exampleVi: appearance?.exampleMeaningVi,
    exampleMn: appearance?.exampleMeaningMn,
    status: (effectiveProgress.status as VocabBookItemDto['status']) || 'NEW',
    proficiency: 0,
    last_review: effectiveProgress.last_review ?? undefined,
    next_review: effectiveProgress.nextReviewAt ?? effectiveProgress.due ?? undefined,
    lapses: effectiveProgress.lapses ?? 0,
    elapsed_days: effectiveProgress.elapsed_days ?? 0,
    scheduled_days: effectiveProgress.scheduled_days ?? 0,
    learning_steps: effectiveProgress.learning_steps ?? 0,
    reps: effectiveProgress.reps ?? 0,
    mastered: effectiveProgress.status === 'MASTERED',
    progress: effectiveProgress,
    savedByUser: progress?.savedByUser,
  };
}

async function buildVocabBookItems(
  ctx: QueryCtx,
  selected: Array<{ progress: Doc<'user_vocab_progress'>; word: Doc<'words'> }>
): Promise<VocabBookItemDto[]> {
  if (selected.length === 0) return [];
  return Promise.all(selected.map(({ progress, word }) => buildVocabBookItem(ctx, word, progress)));
}

async function resolveCourseContext(ctx: QueryCtx, courseId: string) {
  let effectiveCourseId = courseId;
  let institute: Doc<'institutes'> | null = null;
  const instituteId = ctx.db.normalizeId('institutes', courseId);

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

  return { institute, effectiveCourseId };
}

function buildEmptyVocabHeatmap(now: number): VocabActivityHeatmapCellDto[] {
  const todayStart = startOfDay(now);
  return Array.from({ length: 28 }, (_, index) => {
    const dayStart = todayStart - (27 - index) * ONE_DAY_MS;
    return {
      date: formatLocalDateKey(dayStart),
      count: 0,
      intensity: 0,
      isToday: index === 27,
    };
  });
}

function formatLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function summarizeReviewProgress(
  progressArray: Array<Doc<'user_vocab_progress'> | null | undefined>,
  now: number,
  todayMs: number
): VocabReviewSummaryDto {
  let dueTotal = 0;
  let dueNow = 0;
  let unlearned = 0;
  let mastered = 0;
  let learning = 0;
  let recommendedToday = 0;

  for (const progress of progressArray) {
    if (!progress) {
      unlearned += 1;
      continue;
    }

    switch (progress.status) {
      case 'MASTERED':
        mastered += 1;
        break;
      case 'NOT_STARTED':
      case 'NEW':
        unlearned += 1;
        if (progress.due && progress.due <= now) {
          dueTotal += 1;
          dueNow += 1;
          recommendedToday += 1;
        }
        break;
      case 'LEARNING':
      case 'REVIEW':
        learning += 1;
        if (progress.due && progress.due <= now) {
          dueTotal += 1;
          dueNow += 1;
          recommendedToday += 1;
        } else if (progress.due && progress.due <= todayMs + ONE_DAY_MS) {
          recommendedToday += 1;
        }
        break;
      default:
        learning += 1;
        break;
    }
  }

  return {
    total: progressArray.length,
    dueTotal,
    dueNow,
    unlearned,
    mastered,
    learning,
    recommendedToday,
  };
}

// Get vocabulary statistics for a course
export const getStats = query({
  args: {
    courseId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<VocabStatsDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) return { total: 0, mastered: 0, dueReviews: 0, unlearned: 0 };

      const courseId = args.courseId?.trim();
      const now = Date.now();
      
      if (!courseId || courseId === 'all') {
        // Global stats for the user
        const allProgress = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        
        let total = 0;
        let mastered = 0;
        let dueReviews = 0;
        let unlearned = 0;

        for (const p of allProgress) {
          total++;
          if (p.status === 'MASTERED') mastered++;
          else if (p.status === 'NEW' || p.status === 'NOT_STARTED') unlearned++;
          
          if (p.status !== 'MASTERED' && (p.due ?? p.nextReviewAt ?? 0) <= now) {
            dueReviews++;
          }
        }
        return { total, mastered, dueReviews, unlearned };
      }

      vocabLogger.debug(`getStats courseId=${courseId}`);

      // Scan appearances to collect unique wordIds in this course.
      const appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', courseId))
        .collect();

      const courseWordIds = new Set(appearances.map(app => app.wordId.toString()));
      const total = courseWordIds.size;
      
      if (total === 0) return { total: 0, mastered: 0, dueReviews: 0, unlearned: 0 };

      // Get progress for these words
      const progressDocs = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

      let mastered = 0;
      let dueReviews = 0;
      let learnedInCourse = 0;

      for (const p of progressDocs) {
        if (!courseWordIds.has(p.wordId.toString())) continue;
        
        if (p.status === 'MASTERED') {
          mastered++;
          learnedInCourse++;
        } else {
          if (p.status !== 'NEW' && p.status !== 'NOT_STARTED') {
            learnedInCourse++;
          }
          if ((p.due ?? p.nextReviewAt ?? 0) <= now) {
            dueReviews++;
          }
        }
      }

      return { 
        total, 
        mastered, 
        dueReviews, 
        unlearned: total - learnedInCourse 
      };
    } catch (err) {
      vocabLogger.error('getStats failed', err);
      return { total: 0, mastered: 0, dueReviews: 0, unlearned: 0 };
    }
  },
});

// Get vocabulary for a course/unit for typing and lightweight study flows
export const getOfCourse = query({
  args: {
    courseId: v.string(),
    unitId: v.optional(v.union(v.number(), v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VocabWordDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      const { institute, effectiveCourseId } = await resolveCourseContext(ctx, args.courseId);
      if (!isVisibleInstitute(institute)) {
        return [];
      }

      const limit = args.limit ?? DEFAULT_VOCAB_LIMIT;
      const normalizedUnitId = normalizeUnitIdParam(args.unitId);
      if (args.unitId !== undefined && normalizedUnitId === undefined) {
        return [];
      }

      const targetUnitId = resolveTargetUnitId(institute, normalizedUnitId);
      const appearances =
        typeof targetUnitId === 'number'
          ? await ctx.db
              .query('vocabulary_appearances')
              .withIndex('by_course_unit', q =>
                q.eq('courseId', effectiveCourseId).eq('unitId', targetUnitId)
              )
              .take(limit)
          : await ctx.db
              .query('vocabulary_appearances')
              .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
              .take(limit);

      if (appearances.length === 0) {
        return [];
      }

      const wordIds = [
        ...new Set(
          appearances
            .map(appearance => ctx.db.normalizeId('words', appearance.wordId))
            .filter((id): id is Id<'words'> => id !== null)
        ),
      ];
      const words = await Promise.all(wordIds.map(id => ctx.db.get(id)));
      const wordsMap = new Map(words.filter(Boolean).map(word => [word!._id.toString(), word!]));

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

      const rows = appearances.map(appearance => {
        const wordId = ctx.db.normalizeId('words', appearance.wordId);
        if (!wordId) return null;
        const word = wordsMap.get(wordId.toString());
        if (!word) return null;

        const progress = mapProgress(progressMap.get(wordId.toString()));
        return {
          id: word._id,
          _id: word._id,
          creationTime: word._creationTime,
          word: word.word,
          meaning: appearance.meaning || word.meaning,
          meaningEn: appearance.meaningEn || word.meaningEn,
          meaningZh: appearance.meaning || word.meaning,
          meaningVi: appearance.meaningVi || word.meaningVi || '',
          meaningMn: appearance.meaningMn || word.meaningMn || '',
          pronunciation: word.pronunciation,
          hanja: word.hanja,
          partOfSpeech: word.partOfSpeech || '',
          audioUrl: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
          audio: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
          exampleSentence: appearance.exampleSentence,
          exampleMeaning: appearance.exampleMeaning,
          exampleMeaningEn: appearance.exampleMeaningEn,
          exampleMeaningVi: appearance.exampleMeaningVi,
          exampleMeaningMn: appearance.exampleMeaningMn,
          example: appearance.exampleSentence,
          exampleZh: appearance.exampleMeaning,
          exampleVi: appearance.exampleMeaningVi,
          exampleMn: appearance.exampleMeaningMn,
          status: (progress?.status as VocabWordDto['status']) || 'NEW',
          proficiency: 0,
          last_review: progress?.last_review ?? undefined,
          next_review: progress?.nextReviewAt ?? progress?.due ?? undefined,
          lapses: progress?.lapses ?? 0,
          elapsed_days: progress?.elapsed_days ?? 0,
          scheduled_days: progress?.scheduled_days ?? 0,
          learning_steps: progress?.learning_steps ?? 0,
          reps: progress?.reps ?? 0,
          mastered: progress?.status === 'MASTERED',
          progress,
          appearanceId: appearance._id,
          courseId: appearance.courseId,
          unitId: appearance.unitId,
        };
      });

      return rows.filter(Boolean) as VocabWordDto[];
    } catch (err) {
      vocabLogger.error('getOfCourse failed', err);
      return [];
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
          _id: word._id, // Legacy support
          wordId: word._id,
          word: word.word,
          meaning: app.meaning || word.meaning,
          meaningEn: app.meaningEn || word.meaningEn, // Legacy support
          meaningZh: app.meaning || word.meaning,
          meaningVi: app.meaningVi || word.meaningVi,
          meaningMn: app.meaningMn || word.meaningMn,
          pronunciation: word.pronunciation,
          hanja: word.hanja,
          partOfSpeech: word.partOfSpeech || '',
          audioUrl: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
          audio: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
          image: undefined,
          tags: undefined,
          level: undefined,
          frequency: undefined,
          exampleSentence: app.exampleSentence,
          exampleMeaning: app.exampleMeaning,
          exampleMeaningEn: app.exampleMeaningEn,
          exampleMeaningVi: app.exampleMeaningVi,
          exampleMeaningMn: app.exampleMeaningMn,
          example: app.exampleSentence,
          exampleZh: app.exampleMeaning,
          exampleVi: app.exampleMeaningVi,
          exampleMn: app.exampleMeaningMn,
          tips: word.tips,
          status: (progress?.status as VocabReviewDeckDto['status']) || 'NEW',
          proficiency: 0,
          last_review: progress?.last_review,
          next_review: progress?.due || progress?.nextReviewAt,
          lapses: progress?.lapses || 0,
          elapsed_days: progress?.elapsed_days || 0,
          scheduled_days: progress?.scheduled_days || 0,
          learning_steps: progress?.learning_steps || 0,
          reps: progress?.reps || 0,
          mastered: progress?.status === 'MASTERED' || false,
          progress: mapProgress(progress),
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
      const limit = Math.min(args.limit ?? DEFAULT_VOCAB_LIMIT, 2000);
      const searchQuery = args.search?.trim().toLowerCase() || '';
      const selected: Array<{ progress: Doc<'user_vocab_progress'>; word: Doc<'words'> }> = [];
      let cursor: string | null = null;
      let scanned = 0;

      do {
        const page = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ numItems: SCAN_PAGE_SIZE, cursor });

        const progressPage = page.page.filter(
          progress =>
            (includeMastered || progress.status !== 'MASTERED') &&
            (!args.savedByUserOnly || progress.savedByUser === true)
        );

        const words = await Promise.all(progressPage.map(progress => ctx.db.get(progress.wordId)));
        for (let index = 0; index < progressPage.length; index += 1) {
          const progress = progressPage[index];
          const word = words[index];
          if (!word) continue;
          if (searchQuery) {
            const loweredWord = word.word.toLowerCase();
            const loweredMeanings = [word.meaning, word.meaningEn, word.meaningVi, word.meaningMn]
              .filter((item): item is string => typeof item === 'string')
              .map(item => item.toLowerCase());
            if (
              !loweredWord.includes(searchQuery) &&
              !loweredMeanings.some(item => item.includes(searchQuery))
            ) {
              continue;
            }
          }

          selected.push({ progress, word });
          if (selected.length >= limit) break;
        }

        scanned += page.page.length;
        cursor =
          page.isDone || selected.length >= limit || scanned >= 12000 ? null : page.continueCursor;
      } while (cursor);

      return buildVocabBookItems(ctx, selected);
    } catch (err) {
      vocabLogger.error('getVocabBook failed', err);
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
    selectedWordIds: v.optional(v.array(v.string())),
    category: v.optional(
      v.union(v.literal('ALL'), v.literal('UNLEARNED'), v.literal('DUE'), v.literal('MASTERED'))
    ),
    cursor: v.optional(v.string()),
    courseId: v.optional(v.string()),
    unit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<VocabBookPageDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      const includeMastered = args.includeMastered ?? false;
      const category = (args.category ?? 'ALL') as VocabBookCategory;
      const now = Date.now();
      const searchQuery = args.search?.trim().toLowerCase() || '';
      const selectedWordIds = new Set(
        (args.selectedWordIds ?? []).map(id => id.trim()).filter(id => id.length > 0)
      );
      const hasSelectedWordIds = selectedWordIds.size > 0;
      const pageSize = Math.min(args.limit ?? 60, 120);
      const start = decodeVocabBookCursor(args.cursor);

      let dbCursor = start.dbCursor;
      let offset = start.offset;
      let scanned = 0;
      const selected: Array<{ progress: Doc<'user_vocab_progress'>; word: Doc<'words'> }> = [];

      let courseWordIds: Set<string> | null = null;
      const targetCourseIds: string[] = [];

      if (args.courseId) {
        const { effectiveCourseId } = await resolveCourseContext(ctx, args.courseId);
        targetCourseIds.push(effectiveCourseId);
      } else if (!args.savedByUserOnly) {
        const enrolled = await ctx.db
          .query('user_course_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        targetCourseIds.push(...enrolled.map(p => p.courseId));
      }

      if (targetCourseIds.length > 0) {
        const appearances = await Promise.all(
          targetCourseIds.map(courseId => {
            const query = ctx.db
              .query('vocabulary_appearances')
              .withIndex('by_course_unit', q => q.eq('courseId', courseId));
            // If unit is specified, filter by unitId
            if (args.unit !== undefined && args.unit !== null) {
              return query.filter(q => q.eq(q.field('unitId'), args.unit)).collect();
            }
            return query.collect();
          })
        );
        courseWordIds = new Set(appearances.flat().map(a => String(a.wordId)));
      }

      // SPECIAL CASE: When filtering by course/unit, we want to include words 
      // even if they don't have a progress record yet.
      if (courseWordIds && (category === 'UNLEARNED' || category === 'ALL')) {
        const allUserProgress = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        const progressMap = new Map(allUserProgress.map(p => [String(p.wordId), p]));
        
        let targetWordIds: string[] = [];
        
        if (category === 'UNLEARNED') {
          // Words in textbooks that have NO progress record or are 'NEW'
          targetWordIds = Array.from(courseWordIds).filter(id => {
            const p = progressMap.get(id);
            return !p || p.status === 'NEW' || p.state === 0;
          });
        } else {
          // ALL words in textbooks (respecting courseWordIds filter)
          targetWordIds = Array.from(courseWordIds);
        }
        
        // Simple slicing for this view since it's targeted
        let filteredWordIds = targetWordIds;
        if (searchQuery) {
          const words = await Promise.all(targetWordIds.map(id => ctx.db.get(ctx.db.normalizeId('words', id)!)));
          filteredWordIds = targetWordIds.filter((id, idx) => {
            const word = words[idx];
            if (!word) return false;
            const loweredWord = word.word.toLowerCase();
            const loweredMeanings = [word.meaning, word.meaningEn, word.meaningVi, word.meaningMn]
              .filter((item): item is string => typeof item === 'string')
              .map(item => item.toLowerCase());
            return loweredWord.includes(searchQuery) || loweredMeanings.some(m => m.includes(searchQuery));
          });
        }

        const startIndex = offset || 0;
        const pageItems = filteredWordIds.slice(startIndex, startIndex + pageSize);
        
        const items = await Promise.all(
          pageItems.map(async (wordIdStr) => {
            const wordId = ctx.db.normalizeId('words', wordIdStr);
            if (!wordId) return null;
            const word = await ctx.db.get(wordId);
            if (!word) return null;
            
            const progress = progressMap.get(wordIdStr) || {
              userId,
              wordId,
              status: 'NEW',
              proficiency: 0,
              reps: 0,
              lapses: 0,
              state: 0,
              updatedAt: now,
              createdAt: now,
            };
            
            return buildVocabBookItem(ctx, word, progress);
          })
        );

        const nextOffset = startIndex + pageSize;
        const nextCursor = nextOffset < filteredWordIds.length 
          ? encodeVocabBookCursor({ dbCursor: dbCursor, offset: nextOffset }) 
          : null;

        return { 
          items: items.filter((i): i is VocabBookItemDto => i !== null), 
          nextCursor, 
          hasMore: Boolean(nextCursor) 
        };
      }

      // STANDARD CASE: Iterate over user_vocab_progress
      while (selected.length < pageSize && scanned < 14000) {
        const currentDbCursor = dbCursor;
        const page = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .paginate({ numItems: SCAN_PAGE_SIZE, cursor: currentDbCursor });

        scanned += page.page.length;
        const pageSlice = offset > 0 ? page.page.slice(offset) : page.page;
        offset = 0;

        const filteredProgress = pageSlice.filter(progress => {
          if (courseWordIds && !courseWordIds.has(String(progress.wordId))) return false;
          if (hasSelectedWordIds && !selectedWordIds.has(String(progress.wordId))) return false;
          if (args.savedByUserOnly && progress.savedByUser !== true) return false;
          if (!includeMastered && progress.status === 'MASTERED') return false;
          if (hasSelectedWordIds) return true;
          return matchVocabBookCategory(progress, category);
        });

        const words = await Promise.all(
          filteredProgress.map(progress => ctx.db.get(progress.wordId))
        );
        for (let index = 0; index < filteredProgress.length; index += 1) {
          const progress = filteredProgress[index];
          const word = words[index];
          if (!word) continue;

          if (searchQuery) {
            const loweredWord = word.word.toLowerCase();
            const loweredMeanings = [word.meaning, word.meaningEn, word.meaningVi, word.meaningMn]
              .filter((item): item is string => typeof item === 'string')
              .map(item => item.toLowerCase());
            if (
              !loweredWord.includes(searchQuery) &&
              !loweredMeanings.some(item => item.includes(searchQuery))
            ) {
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

        if (page.isDone) {
          const items = await buildVocabBookItems(ctx, selected);
          return { items, nextCursor: null, hasMore: false };
        }

        dbCursor = page.continueCursor;
      }

      const items = await buildVocabBookItems(ctx, selected);
      return { items, nextCursor: null, hasMore: false };
    } catch (err) {
      vocabLogger.error('getVocabBookPage failed', err);
      return { items: [], nextCursor: null, hasMore: false };
    }
  },
});

export const getActiveLearningSession = query({
  args: {
    instituteId: v.string(),
    unitId: v.number(),
    mode: v.union(v.literal('FLASHCARD'), v.literal('LEARN'), v.literal('TEST')),
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
      .sort((left, right) => right.updatedAt - left.updatedAt)[0];

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

export const getDueForReview = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const allProgress = await ctx.db
      .query('user_vocab_progress')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const notMastered = allProgress.filter(progress => progress.status !== 'MASTERED');
    const wordIds = [...new Set(notMastered.map(progress => progress.wordId))];
    const words = await Promise.all(wordIds.map(id => ctx.db.get(id)));
    const wordsMap = new Map(words.filter(Boolean).map(word => [word!._id.toString(), word!]));

    const rows = notMastered.map(progress => {
      const word = wordsMap.get(progress.wordId.toString());
      if (!word) return null;
      const mappedProgress = mapProgress(progress);
      if (!mappedProgress) return null;
      return {
        id: word._id,
        wordId: word._id,
        word: word.word,
        meaning: word.meaning,
        meaningEn: word.meaningEn,
        meaningZh: word.meaning,
        meaningVi: word.meaningVi || '',
        meaningMn: word.meaningMn || '',
        pronunciation: word.pronunciation,
        hanja: word.hanja,
        partOfSpeech: word.partOfSpeech || '',
        audioUrl: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
        audio: normalizeStoragePublicUrl(word.audioUrl) || word.audioUrl,
        status: mappedProgress.status || 'NEW',
        proficiency: 0,
        last_review: mappedProgress.last_review ?? undefined,
        next_review: mappedProgress.nextReviewAt ?? undefined,
        lapses: mappedProgress.lapses ?? 0,
        elapsed_days: mappedProgress.elapsed_days ?? 0,
        scheduled_days: mappedProgress.scheduled_days ?? 0,
        learning_steps: mappedProgress.learning_steps ?? 0,
        reps: mappedProgress.reps ?? 0,
        mastered: mappedProgress.status === 'MASTERED',
        progress: mappedProgress,
        courseId: '',
        unitId: 0,
        displayOrder: 0,
      };
    });

    return rows.filter(Boolean);
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
        for (const progress of page.page) {
          if (args.savedByUserOnly && progress.savedByUser !== true) continue;
          if (includeMastered || progress.status !== 'MASTERED') {
            count += 1;
          }
        }

        cursor = page.isDone || scanned >= 20000 ? null : page.continueCursor;
      } while (cursor);

      return { count };
    } catch (err) {
      vocabLogger.error('getVocabBookCount failed', err);
      return { count: 0 };
    }
  },
});

// Get review summary
export const getReviewSummary = query({
  args: {
    courseId: v.optional(v.string()),
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
      const todayMs = startOfDay(now);
      const courseId = args.courseId?.trim() || '';

      const targetCourseIds: string[] = [];
      if (courseId) {
        targetCourseIds.push(courseId);
      } else if (!args.savedByUserOnly) {
        const enrolled = await ctx.db
          .query('user_course_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        targetCourseIds.push(...enrolled.map(p => p.courseId));
      }

      let appearanceWordIds: Set<string> | null = null;
      if (targetCourseIds.length > 0) {
        const appearances = await Promise.all(
          targetCourseIds.map(cid => 
            ctx.db.query('vocabulary_appearances')
              .withIndex('by_course_unit', q => q.eq('courseId', cid))
              .collect()
          )
        );
        appearanceWordIds = new Set(appearances.flat().map(a => String(a.wordId)));
      }

      const progressDocs = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

      const filteredProgress = progressDocs.filter(p => {
        if (args.savedByUserOnly && p.savedByUser !== true) return false;
        if (appearanceWordIds && !appearanceWordIds.has(String(p.wordId))) return false;
        return true;
      });

      const summary = summarizeReviewProgress(filteredProgress, now, todayMs);
      
      // Add truly new words to unlearned count
      if (appearanceWordIds) {
        const progressWordIds = new Set(progressDocs.map(p => String(p.wordId)));
        const trulyNewCount = Array.from(appearanceWordIds).filter(id => !progressWordIds.has(id)).length;
        summary.unlearned += trulyNewCount;
        summary.total += trulyNewCount;
      }

      // Add legacy saved words to counts if not filtering by course
      if (!courseId) {
        const legacyWords = await ctx.db
          .query('saved_words')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        summary.unlearned += legacyWords.length;
        summary.total += legacyWords.length;
      }

      return summary;
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

export const getDashboardInsights = query({
  args: {},
  handler: async (ctx): Promise<VocabDashboardInsightsDto> => {
    const now = Date.now();
    const heatmap = buildEmptyVocabHeatmap(now);
    const userId = await getOptionalAuthUserId(ctx);

    if (!userId) {
      return {
        retentionRate30d: null,
        activeDays30d: 0,
        totalReviews30d: 0,
        heatmap,
      };
    }

    const todayStart = startOfDay(now);
    const cutoff = todayStart - 27 * ONE_DAY_MS;
    const activityCountByDay = new Map<string, number>();
    let weightedAccuracySum = 0;
    let accuracyWeight = 0;
    let cursor: string | null = null;
    let reachedCutoff = false;

    do {
      const page = await ctx.db
        .query('learning_events')
        .withIndex('by_user_module_eventAt', q => q.eq('userId', userId).eq('module', 'VOCAB'))
        .order('desc')
        .paginate({ cursor, numItems: SCAN_PAGE_SIZE });

      for (const event of page.page) {
        if (event.eventAt < cutoff) {
          reachedCutoff = true;
          break;
        }

        const dayKey = formatLocalDateKey(startOfDay(event.eventAt));
        const eventWeight = Math.max(1, event.itemCount ?? 1);
        activityCountByDay.set(dayKey, (activityCountByDay.get(dayKey) ?? 0) + eventWeight);

        if (typeof event.accuracy === 'number' && Number.isFinite(event.accuracy)) {
          const boundedAccuracy = Math.max(0, Math.min(100, event.accuracy));
          weightedAccuracySum += boundedAccuracy * eventWeight;
          accuracyWeight += eventWeight;
        }
      }

      cursor = page.isDone || reachedCutoff ? null : page.continueCursor;
    } while (cursor);

    const maxCount = Math.max(...heatmap.map(cell => activityCountByDay.get(cell.date) ?? 0), 0);
    const normalizedHeatmap = heatmap.map(cell => {
      const count = activityCountByDay.get(cell.date) ?? 0;
      let intensity: 0 | 1 | 2 | 3 | 4 = 0;

      if (count > 0) {
        if (maxCount <= 1) {
          intensity = 4;
        } else {
          intensity = Math.min(4, Math.max(1, Math.ceil((count / maxCount) * 4))) as 1 | 2 | 3 | 4;
        }
      }

      return {
        ...cell,
        count,
        intensity,
      };
    });

    return {
      retentionRate30d:
        accuracyWeight > 0 ? Math.round(weightedAccuracySum / accuracyWeight) : null,
      activeDays30d: normalizedHeatmap.filter(cell => cell.count > 0).length,
      totalReviews30d: normalizedHeatmap.reduce((sum, cell) => sum + cell.count, 0),
      heatmap: normalizedHeatmap,
    };
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

// Get day-by-day review forecast for the next 7 days
export const getForecast = query({
  args: {},
  handler: async (ctx): Promise<number[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) return [0, 0, 0, 0, 0, 0, 0];

      const now = Date.now();
      const todayStart = startOfDay(now);
      
      // We only need words that are due or will be due
      const progressDocs = await ctx.db
        .query('user_vocab_progress')
        .withIndex('by_user', q => q.eq('userId', userId))
        .collect();

      const forecast = [0, 0, 0, 0, 0, 0, 0];
      for (const p of progressDocs) {
        if (p.status === 'MASTERED') continue;
        
        const due = p.due ?? p.nextReviewAt;
        if (!due) continue;
        
        const dayIndex = Math.floor((due - todayStart) / ONE_DAY_MS);
        if (dayIndex < 0) {
          // Already due
          forecast[0]++;
        } else if (dayIndex < 7) {
          forecast[dayIndex]++;
        }
      }

      return forecast;
    } catch (err) {
      vocabLogger.error('getForecast failed', err);
      return [0, 0, 0, 0, 0, 0, 0];
    }
  },
});

/**
 * Get per-unit progress for a course
 * Returns progress data for each unit including total words, mastered words, and progress percentage
 */
export const getUnitProgress = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<UnitProgressDto[]> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);

      // Resolve course context to get effectiveCourseId and institute
      const { institute, effectiveCourseId } = await resolveCourseContext(ctx, args.courseId);

      // Query all vocabulary_appearances for this course
      const appearances = await ctx.db
        .query('vocabulary_appearances')
        .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
        .collect();

      // Group by unitId, collecting unique wordId sets per unit
      const unitWordsMap = new Map<number, Set<string>>();
      for (const appearance of appearances) {
        const unitId = appearance.unitId;
        if (!unitWordsMap.has(unitId)) {
          unitWordsMap.set(unitId, new Set());
        }
        unitWordsMap.get(unitId)!.add(appearance.wordId.toString());
      }

      // Collect all unique wordIds across all units
      const allWordIds = new Set<string>();
      for (const wordSet of unitWordsMap.values()) {
        for (const wordId of wordSet) {
          allWordIds.add(wordId);
        }
      }

      // Batch-fetch user_vocab_progress records for the user
      const progressMap = new Map<string, Doc<'user_vocab_progress'>>();
      if (userId && allWordIds.size > 0) {
        // Fetch all progress for this user, then filter by our wordIds
        const allProgress = await ctx.db
          .query('user_vocab_progress')
          .withIndex('by_user', q => q.eq('userId', userId))
          .collect();
        
        for (const progress of allProgress) {
          const wordIdStr = progress.wordId.toString();
          if (allWordIds.has(wordIdStr)) {
            progressMap.set(wordIdStr, progress);
          }
        }
      }

      // Build result array
      const result: UnitProgressDto[] = [];

      for (const [unitId, wordSet] of unitWordsMap) {
        const totalWords = wordSet.size;
        let masteredWords = 0;

        for (const wordId of wordSet) {
          const progress = progressMap.get(wordId);
          // Words with state >= 2 are considered mastered
          // Words without progress record are treated as state 0 (not mastered)
          if (progress && typeof progress.state === 'number' && progress.state >= 2) {
            masteredWords++;
          }
        }

        // Compute progressPercent = Math.floor(masteredWords / totalWords * 100)
        // Handle edge case where totalWords is 0
        const progressPercent = totalWords > 0 ? Math.floor((masteredWords / totalWords) * 100) : 0;

        result.push({
          unitId,
          totalWords,
          masteredWords,
          progressPercent,
        });
      }

      // Determine if this is a Volume 2 course
      const isVolume2 =
        institute &&
        institute.volume &&
        (institute.volume === '2' || institute.volume === 'B');
      const isLegacyYonseiVolume2Id =
        institute &&
        institute.id &&
        (institute.id.includes('_1b') || institute.id.includes('_2b') || institute.id.endsWith('b'));

      // If institute.totalUnits is defined, pad result to include units with 0 words
      // For Volume 2 courses, we should NOT pad units 1-10 since the course uses units 11-20
      if (institute && typeof institute.totalUnits === 'number' && institute.totalUnits > 0) {
        const existingUnits = new Set(result.map(r => r.unitId));
        // Skip padding for Volume 2 courses that already have data in units 11-20
        const hasVolume2Units = existingUnits.size > 0 && Math.min(...existingUnits) >= 11;
        if (existingUnits.size < institute.totalUnits && !(isVolume2 || isLegacyYonseiVolume2Id || hasVolume2Units)) {
          for (let unitId = 1; unitId <= institute.totalUnits; unitId++) {
            if (!existingUnits.has(unitId)) {
              result.push({
                unitId,
                totalWords: 0,
                masteredWords: 0,
                progressPercent: 0,
              });
            }
          }
        }
      }

      // Sort by unitId ascending
      result.sort((a, b) => a.unitId - b.unitId);

      return result;
    } catch (err) {
      vocabLogger.error('getUnitProgress failed', err);
      return [];
    }
  },
});
