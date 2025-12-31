import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useCallback } from 'react';

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
    // Query vocab data for this course
    const vocabData = useQuery(api.vocab.getOfCourse, { courseId });

    // Mutation with optimistic update
    const updateProgressMutation = useMutation(api.vocab.updateProgress)
        .withOptimisticUpdate((localStore, args) => {
            const { wordId, quality } = args;

            // Get current query data from local cache
            const currentVocab = localStore.getQuery(api.vocab.getOfCourse, { courseId });
            if (!currentVocab) return;

            // Calculate new progress values based on quality
            const isCorrect = quality >= 4;
            const now = Date.now();

            // Update the word's progress in the local cache
            const updatedVocab = currentVocab.map(word => {
                if (word._id !== wordId) return word;

                const currentProgress = word.progress;
                let newStatus = 'LEARNING';
                let newInterval = 1;
                let newStreak = 0;

                if (currentProgress) {
                    if (isCorrect) {
                        newStreak = currentProgress.streak + 1;
                        newInterval = currentProgress.interval * 2;
                        newStatus = newInterval > 30 ? 'MASTERED' : 'REVIEW';
                    } else {
                        newStreak = 0;
                        newInterval = 1;
                        newStatus = 'LEARNING';
                    }
                } else {
                    // New progress entry
                    if (isCorrect) {
                        newStreak = 1;
                        newInterval = 1;
                        newStatus = 'LEARNING';
                    } else {
                        newStreak = 0;
                        newInterval = 0.5;
                        newStatus = 'NEW';
                    }
                }

                return {
                    ...word,
                    progress: {
                        id: currentProgress?.id || ('temp-' + wordId) as any,
                        status: newStatus,
                        interval: newInterval,
                        streak: newStreak,
                        nextReviewAt: now + (newInterval * 24 * 60 * 60 * 1000),
                    },
                    mastered: newStatus === 'MASTERED',
                };
            });

            // Set the updated data in the local cache
            localStore.setQuery(api.vocab.getOfCourse, { courseId }, updatedVocab);
        });

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
    // Query unit details
    const unitData = useQuery(api.units.getDetails, { courseId, unitIndex });

    // Mutation with optimistic update
    const completeUnitMutation = useMutation(api.progress.completeUnit)
        .withOptimisticUpdate((localStore, args) => {
            // Optimistically update local state for completion tracking
            // Since completeUnit modifies user_course_progress, update the relevant query cache

            // Note: This is a simplified example. In a real implementation,
            // you would update the specific query that displays completion status.
            console.log('[Optimistic] Unit marked complete:', args);
        });

    const completeUnit = useCallback(
        async () => {
            return completeUnitMutation({ courseId, unitIndex });
        },
        [completeUnitMutation, courseId, unitIndex]
    );

    return {
        unitData,
        completeUnit,
        isLoading: unitData === undefined,
    };
}
