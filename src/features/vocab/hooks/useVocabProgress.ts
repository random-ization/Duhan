import { useMutation, useQuery, useAction } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { calculateNextReview, Rating } from '../../../utils/srsAlgorithm';
import { mRef, qRef, aRef } from '../../../utils/convexRefs';

// ============================================================
// FSRS Card State Types
// ============================================================
export type FSRSCardState = {
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

// ============================================================
// Legacy Hook (Backward Compatible)
// ============================================================

/**
 * Hook for managing vocab progress with optimistic updates.
 *
 * This hook provides mutations that immediately update the local query cache
 * before the server responds, making the UI feel instant.
 *
 * @deprecated Use useFSRSProgress for new implementations
 */
export function useVocabProgress(courseId: string) {
  type VocabProgress = {
    id: string;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number;
  };
  type VocabWordRow = Record<string, unknown> & {
    _id: Id<'words'>;
    progress: VocabProgress | null;
    mastered?: boolean;
  };

  const getOfCourseRef = qRef<{ courseId: string; limit?: number }, VocabWordRow[]>(
    'vocab:getOfCourse'
  );
  const updateProgressRef = mRef<{ wordId: Id<'words'>; quality: number }, void>(
    'vocab:updateProgress'
  );

  // Query vocab data for this course
  const vocabData = useQuery(getOfCourseRef, { courseId });

  // Mutation with optimistic update
  const updateProgressMutation = useMutation(updateProgressRef).withOptimisticUpdate(
    (localStore, args) => {
      const { wordId, quality } = args;

      // Get current query data from local cache
      const currentVocab = localStore.getQuery(getOfCourseRef, { courseId });
      if (!Array.isArray(currentVocab)) return;

      const currentVocabRows = currentVocab as VocabWordRow[];
      const updatedVocab = currentVocabRows.map(word => {
        if (word._id !== wordId) return word;
        const currentProgress = word.progress
          ? { interval: word.progress.interval, streak: word.progress.streak }
          : null;
        // Calculate new progress using the extracted SRS algorithm
        const srsResult = calculateNextReview(quality, currentProgress);

        const existingProgressId = word.progress?.id || `temp-${String(wordId)}`;

        return {
          ...word,
          progress: {
            id: existingProgressId,
            status: srsResult.status,
            interval: srsResult.interval,
            streak: srsResult.streak,
            nextReviewAt: srsResult.nextReviewAt,
          },
          mastered: srsResult.status === 'MASTERED',
        };
      });

      // Set the updated data in the local cache
      localStore.setQuery(getOfCourseRef, { courseId }, updatedVocab);
    }
  );

  // Wrapper function for easy use
  const updateProgress = useCallback(
    async (args: { wordId: Id<'words'>; quality: number }) => {
      return updateProgressMutation(args);
    },
    [updateProgressMutation]
  );

  return {
    vocabData,
    updateProgress,
    isLoading: vocabData === undefined,
  };
}

// ============================================================
// FSRS Hook (New Implementation)
// ============================================================

/**
 * Hook for managing vocab progress using FSRS algorithm.
 *
 * Supports both 2-button (Pass/Fail) and 4-button rating modes.
 *
 * Usage:
 * ```tsx
 * const { updateProgressFSRS, vocabData } = useFSRSProgress(courseId);
 *
 * // 2-button mode (Pass/Fail)
 * updateProgressFSRS({ wordId: word._id, isCorrect: true });
 *
 * // 4-button mode
 * updateProgressFSRS({ wordId: word._id, rating: Rating.Good });
 * ```
 */
export function useFSRSProgress(courseId: string) {
  type VocabProgress = {
    id: string;
    status: string;
    interval: number;
    streak: number;
    nextReviewAt: number;
    // FSRS fields
    state?: number;
    stability?: number;
    difficulty?: number;
  };
  type VocabWordRow = Record<string, unknown> & {
    _id: Id<'words'>;
    progress: VocabProgress | null;
    mastered?: boolean;
  };

  // Query ref
  const getOfCourseRef = qRef<{ courseId: string; limit?: number }, VocabWordRow[]>(
    'vocab:getOfCourse'
  );

  // Action ref for FSRS calculation
  const calculateNextScheduleRef = aRef<
    {
      currentCard?: FSRSCardState;
      rating: number;
      now?: number;
    },
    FSRSCardState & { review_log: Record<string, unknown> }
  >('fsrs:calculateNextSchedule');

  // Mutation ref for saving progress
  const updateProgressV2Ref = mRef<
    {
      wordId: Id<'words'>;
      rating: number;
      fsrsState: FSRSCardState;
    },
    { success: boolean; progress: Record<string, unknown> }
  >('vocab:updateProgressV2');

  // Query vocab data
  const vocabData = useQuery(getOfCourseRef, { courseId });

  // FSRS action
  const calculateNextSchedule = useAction(calculateNextScheduleRef);

  // Mutation
  const updateProgressV2 = useMutation(updateProgressV2Ref);

  /**
   * Update progress using FSRS algorithm
   * @param args.wordId - Word ID
   * @param args.rating - FSRS Rating (1-4) for 4-button mode
   * @param args.isCorrect - Boolean for 2-button mode (true=Good, false=Again)
   * @param args.currentCard - Current card state (optional, will fetch from vocabData)
   */
  const updateProgressFSRS = useCallback(
    async (args: {
      wordId: Id<'words'>;
      rating?: number;
      isCorrect?: boolean;
      currentCard?: FSRSCardState;
    }) => {
      const { wordId, rating, isCorrect, currentCard } = args;

      // Determine rating from isCorrect if not provided
      const finalRating = rating ?? (isCorrect ? Rating.Good : Rating.Again);

      // Get current card state from vocabData if not provided
      let cardState = currentCard;
      if (!cardState && vocabData) {
        const wordRow = vocabData.find(w => w._id === wordId);
        if (wordRow?.progress?.state !== undefined) {
          cardState = {
            state: wordRow.progress.state,
            due: wordRow.progress.nextReviewAt ?? Date.now(),
            stability: wordRow.progress.stability ?? 0,
            difficulty: wordRow.progress.difficulty ?? 5,
            elapsed_days: 0,
            scheduled_days: wordRow.progress.interval ?? 0,
            learning_steps: 0,
            reps: wordRow.progress.streak ?? 0,
            lapses: 0,
            last_review: null,
          };
        }
      }

      try {
        // 1. Call FSRS action to calculate next schedule
        const fsrsResult = await calculateNextSchedule({
          currentCard: cardState,
          rating: finalRating,
          now: Date.now(),
        });

        logger.info('[FSRS] Calculated next schedule:', {
          wordId,
          rating: finalRating,
          newState: fsrsResult.state,
          scheduledDays: fsrsResult.scheduled_days,
        });

        // 2. Save to database using V2 mutation
        const result = await updateProgressV2({
          wordId,
          rating: finalRating,
          fsrsState: {
            state: fsrsResult.state,
            due: fsrsResult.due,
            stability: fsrsResult.stability,
            difficulty: fsrsResult.difficulty,
            elapsed_days: fsrsResult.elapsed_days,
            scheduled_days: fsrsResult.scheduled_days,
            learning_steps: fsrsResult.learning_steps,
            reps: fsrsResult.reps,
            lapses: fsrsResult.lapses,
            last_review: fsrsResult.last_review,
          },
        });

        return result;
      } catch (error) {
        logger.error('[FSRS] Error updating progress:', error);
        throw error;
      }
    },
    [vocabData, calculateNextSchedule, updateProgressV2]
  );

  /**
   * Get scheduling preview for a word (shows intervals for all ratings)
   */
  const getPreviewRef = aRef<
    { currentCard?: FSRSCardState; now?: number },
    {
      again: { scheduled_days: number; due: number };
      hard: { scheduled_days: number; due: number };
      good: { scheduled_days: number; due: number };
      easy: { scheduled_days: number; due: number };
    }
  >('fsrs:getSchedulingPreview');
  const getSchedulingPreview = useAction(getPreviewRef);

  return {
    vocabData,
    updateProgressFSRS,
    getSchedulingPreview,
    isLoading: vocabData === undefined,
  };
}

// ============================================================
// Unit Progress Hook (Unchanged)
// ============================================================

/**
 * Hook for marking units as complete with optimistic updates.
 * Updates the local progress cache immediately when a unit is marked complete.
 */
export function useUnitProgress(courseId: string, unitIndex: number) {
  const getDetailsRef = qRef<{ courseId: string; unitIndex: number }, unknown>('units:getDetails');
  const completeUnitRef = mRef<{ courseId: string; unitIndex: number }, unknown>(
    'progress:completeUnit'
  );
  // Query unit details
  const unitData = useQuery(getDetailsRef, { courseId, unitIndex });

  // Mutation with optimistic update
  const completeUnitMutation = useMutation(completeUnitRef).withOptimisticUpdate(
    (_localStore, args) => {
      logger.info('[Optimistic] Unit marked complete:', args);
    }
  );

  const completeUnit = useCallback(async () => {
    return completeUnitMutation({ courseId, unitIndex });
  }, [completeUnitMutation, courseId, unitIndex]);

  return {
    unitData,
    completeUnit,
    isLoading: unitData === undefined,
  };
}
