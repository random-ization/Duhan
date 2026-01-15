
import { WordStatus } from '../../types';

export interface SRSCurrentProgress {
    streak: number;
    interval: number;
}

export interface SRSResult {
    status: WordStatus;
    interval: number;
    streak: number;
    nextReviewAt: number;
}

/**
 * Calculates the next review schedule based on the user's performance.
 * 
 * @param quality - The quality of the response (0-5). >= 4 is considered correct.
 * @param currentProgress - The current progress of the item, if any.
 * @param now - Optional timestamp for 'now'. Defaults to Date.now().
 * @returns The calculated new status, interval, streak, and next review timestamp.
 */
export const calculateNextReview = (
    quality: number,
    currentProgress?: SRSCurrentProgress | null,
    now: number = Date.now()
): SRSResult => {
    const isCorrect = quality >= 4;
    let newStatus: WordStatus = 'LEARNING';
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
        status: newStatus,
        interval: newInterval,
        streak: newStreak,
        nextReviewAt: now + (newInterval * 24 * 60 * 60 * 1000),
    };
};
