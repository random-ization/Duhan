/**
 * SRS Algorithm - FSRS Implementation
 *
 * This module provides spaced repetition scheduling using the FSRS v6 algorithm.
 * Supports both 2-button (Pass/Fail) and 4-button rating modes.
 */
import {
  Card,
  FSRS,
  Rating,
  State,
  createEmptyCard,
  generatorParameters,
  type Grade,
} from 'ts-fsrs';
import { WordStatus } from '../types';

// Configure FSRS with optimized parameters
const params = generatorParameters({
  maximum_interval: 365, // Max 1 year between reviews
  enable_fuzz: true, // Add randomness to prevent review clustering
});

const fsrs = new FSRS(params);

// Re-export for convenience
export { Rating, State, createEmptyCard };
export type { Card, Grade };

/**
 * Legacy interface for backward compatibility
 */
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
 * Calculate next review using legacy quality score (0-5)
 * Kept for backward compatibility during migration
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
    nextReviewAt: now + newInterval * 24 * 60 * 60 * 1000,
  };
};

// ============================================================
// FSRS-specific functions
// ============================================================

/**
 * Map Pass/Fail (2-button mode) to FSRS Rating
 * - Pass → Good (standard interval growth)
 * - Fail → Again (reset to learning)
 */
export const mapPassFailToRating = (isCorrect: boolean): Rating => {
  return isCorrect ? Rating.Good : Rating.Again;
};

/**
 * Map legacy quality score (0-5) to FSRS Rating
 */
export const mapQualityToRating = (quality: number): Rating => {
  if (quality <= 1) return Rating.Again;
  if (quality === 2) return Rating.Hard;
  if (quality <= 4) return Rating.Good;
  return Rating.Easy;
};

/**
 * Calculate next review using FSRS algorithm
 */
export const calculateFSRSReview = (
  grade: Grade,
  currentCard?: Card | null,
  now: Date = new Date()
) => {
  const card: Card = currentCard ?? createEmptyCard(now);
  const result = fsrs.next(card, now, grade);
  return result;
};

/**
 * Get all scheduling options for preview (shows intervals for all ratings)
 */
export const getSchedulingPreview = (currentCard?: Card | null, now: Date = new Date()) => {
  const card: Card = currentCard ?? createEmptyCard(now);
  return fsrs.repeat(card, now);
};

/**
 * Convert FSRS State to legacy WordStatus string
 */
export const stateToStatus = (state: State, stability?: number): WordStatus => {
  switch (state) {
    case State.New:
      return 'NEW';
    case State.Learning:
      return 'LEARNING';
    case State.Review:
      return stability && stability > 30 ? 'MASTERED' : 'REVIEW';
    case State.Relearning:
      return 'LEARNING';
    default:
      return 'LEARNING';
  }
};

/**
 * Check if a card is considered "mastered"
 */
export const isMastered = (card: Card): boolean => {
  return card.state === State.Review && card.stability > 30;
};

/**
 * Serialize Card for database storage
 */
export const serializeCard = (card: Card) => ({
  state: card.state,
  due: card.due.getTime(),
  stability: card.stability,
  difficulty: card.difficulty,
  elapsed_days: card.elapsed_days,
  scheduled_days: card.scheduled_days,
  learning_steps: card.learning_steps,
  reps: card.reps,
  lapses: card.lapses,
  last_review: card.last_review?.getTime() ?? null,
});

/**
 * Deserialize Card from database
 */
export const deserializeCard = (data: {
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
}): Card => ({
  state: data.state as State,
  due: new Date(data.due),
  stability: data.stability,
  difficulty: data.difficulty,
  elapsed_days: data.elapsed_days,
  scheduled_days: data.scheduled_days,
  learning_steps: data.learning_steps,
  reps: data.reps,
  lapses: data.lapses,
  last_review: data.last_review ? new Date(data.last_review) : undefined,
});
