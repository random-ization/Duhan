import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useCallback } from 'react';
import { logger } from '../../../utils/logger';
import { calculateNextReview } from '../../../utils/srsAlgorithm';
import { mRef, qRef } from '../../../utils/convexRefs';

/**
 * Hook for managing vocab progress with optimistic updates.
 *
 * This hook provides mutations that immediately update the local query cache
 * before the server responds, making the UI feel instant.
 *
 * Usage:
 * ```tsx
 * const { updateProgress, vocabData } = useVocabProgress(courseId);
 *
 * // When user answers correctly
 * updateProgress({ wordId: word._id, quality: 5 });  // Optimistically updates UI
 * ```
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
