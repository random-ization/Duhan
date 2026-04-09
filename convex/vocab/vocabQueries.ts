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
  VocabStatsDto,
  VocabWordDto,
  VocabReviewDeckDto,
  VocabBookItemDto,
  VocabBookPageDto,
  VocabReviewSummaryDto,
  VocabProgressDto,
} from './vocabTypes';
import { normalizeUnitIdParam, resolveTargetUnitId } from '../vocabHelpers';
import { normalizeStoragePublicUrl } from '../spacesConfig';

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

async function buildVocabBookItems(
  ctx: QueryCtx,
  selected: Array<{ progress: Doc<'user_vocab_progress'>; word: Doc<'words'> }>
): Promise<VocabBookItemDto[]> {
  if (selected.length === 0) return [];

  const appearanceLookups = await Promise.all(
    selected.slice(0, 200).map(async ({ word }) => {
      const appearance = await ctx.db
        .query('vocabulary_appearances')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_word_createdAt', (q: any) => q.eq('wordId', word._id))
        .order('desc')
        .first();
      return [word._id.toString(), appearance] as const;
    })
  );

  const appearanceMap = new Map<string, Doc<'vocabulary_appearances'> | null>();
  for (const [id, appearance] of appearanceLookups) {
    appearanceMap.set(id, appearance ?? null);
  }

  return selected.map(({ progress, word }) => {
    const appearance = appearanceMap.get(word._id.toString()) ?? null;
    const mappedProgress = mapProgress(progress)!;

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
      status: (mappedProgress.status as VocabBookItemDto['status']) || 'NEW',
      proficiency: 0,
      last_review: mappedProgress.last_review ?? undefined,
      next_review: mappedProgress.nextReviewAt ?? mappedProgress.due ?? undefined,
      lapses: mappedProgress.lapses ?? 0,
      elapsed_days: mappedProgress.elapsed_days ?? 0,
      scheduled_days: mappedProgress.scheduled_days ?? 0,
      learning_steps: mappedProgress.learning_steps ?? 0,
      reps: mappedProgress.reps ?? 0,
      mastered: mappedProgress.status === 'MASTERED',
      progress: mappedProgress,
      savedByUser: progress.savedByUser,
    };
  });
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

// Get vocabulary statistics for a course
export const getStats = query({
  args: {
    courseId: v.string(),
  },
  handler: async (ctx, args): Promise<VocabStatsDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);

      const courseId = args.courseId?.trim() || '';
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
  },
  handler: async (ctx, args): Promise<VocabBookPageDto> => {
    try {
      const userId = await getOptionalAuthUserId(ctx);
      if (!userId) {
        return { items: [], nextCursor: null, hasMore: false };
      }

      const includeMastered = args.includeMastered ?? false;
      const category = (args.category ?? 'ALL') as VocabBookCategory;
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

      const courseId = args.courseId?.trim() || '';
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
