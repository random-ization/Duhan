/**
 * FSRS Utility Functions (non-Node runtime)
 *
 * Pure utility functions for FSRS state management that can be imported
 * directly into mutations and queries. Unlike fsrs.ts (which exports Node actions),
 * these functions run in the Convex default runtime.
 *
 * Supports: user_vocab_progress, user_saved_sentences, user_grammar_saved
 */

/**
 * FSRS card state representation used across all learning item tables.
 * Field names are prefixed with `fsrs` in sentence/grammar tables to avoid
 * collision with existing fields, but unprefixed in user_vocab_progress (legacy).
 */
export type FsrsCardState = {
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: number; // Next review timestamp (ms)
  stability: number; // Memory stability (days)
  difficulty: number; // Card difficulty (1-10)
  elapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  lastReview: number | undefined;
};

/** FSRS state constants */
export const FSRS_STATE = {
  NEW: 0,
  LEARNING: 1,
  REVIEW: 2,
  RELEARNING: 3,
} as const;

/**
 * Create an initial FSRS card state for a newly saved learning item.
 * The item is marked as New with `due` set to now (immediately reviewable).
 */
export function createInitialFsrsState(now?: number): FsrsCardState {
  const timestamp = now ?? Date.now();
  return {
    state: FSRS_STATE.NEW,
    due: timestamp,
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    lastReview: undefined,
  };
}

/**
 * Convert FsrsCardState to the field format used in `user_saved_sentences`
 * and `user_grammar_saved` tables (fsrs-prefixed fields).
 */
export function fsrsStateToPrefixedFields(card: FsrsCardState) {
  return {
    fsrsState: card.state,
    fsrsDue: card.due,
    fsrsStability: card.stability,
    fsrsDifficulty: card.difficulty,
    fsrsElapsedDays: card.elapsedDays,
    fsrsScheduledDays: card.scheduledDays,
    fsrsLearningSteps: card.learningSteps,
    fsrsReps: card.reps,
    fsrsLapses: card.lapses,
    fsrsLastReview: card.lastReview,
  };
}

/**
 * Extract FsrsCardState from a document with fsrs-prefixed fields.
 * Returns null if no FSRS state has been initialized yet.
 */
export function fsrsStateFromPrefixedFields(doc: {
  fsrsState?: number;
  fsrsDue?: number;
  fsrsStability?: number;
  fsrsDifficulty?: number;
  fsrsElapsedDays?: number;
  fsrsScheduledDays?: number;
  fsrsLearningSteps?: number;
  fsrsReps?: number;
  fsrsLapses?: number;
  fsrsLastReview?: number;
}): FsrsCardState | null {
  if (doc.fsrsState === undefined && doc.fsrsDue === undefined) return null;
  return {
    state: doc.fsrsState ?? FSRS_STATE.NEW,
    due: doc.fsrsDue ?? Date.now(),
    stability: doc.fsrsStability ?? 0,
    difficulty: doc.fsrsDifficulty ?? 0,
    elapsedDays: doc.fsrsElapsedDays ?? 0,
    scheduledDays: doc.fsrsScheduledDays ?? 0,
    learningSteps: doc.fsrsLearningSteps ?? 0,
    reps: doc.fsrsReps ?? 0,
    lapses: doc.fsrsLapses ?? 0,
    lastReview: doc.fsrsLastReview,
  };
}

/**
 * Convert FsrsCardState to the field format used in `user_vocab_progress`
 * (unprefixed legacy fields).
 */
export function fsrsStateToVocabFields(card: FsrsCardState) {
  return {
    state: card.state,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    last_review: card.lastReview,
    nextReviewAt: card.due,
    lastReviewedAt: card.lastReview,
  };
}

/**
 * Extract FsrsCardState from a user_vocab_progress document.
 * Returns null if no FSRS state has been initialized yet.
 */
export function fsrsStateFromVocabFields(doc: {
  state?: number;
  due?: number;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  learning_steps?: number;
  reps?: number;
  lapses?: number;
  last_review?: number;
}): FsrsCardState | null {
  if (doc.state === undefined && doc.due === undefined) return null;
  return {
    state: doc.state ?? FSRS_STATE.NEW,
    due: doc.due ?? Date.now(),
    stability: doc.stability ?? 0,
    difficulty: doc.difficulty ?? 0,
    elapsedDays: doc.elapsed_days ?? 0,
    scheduledDays: doc.scheduled_days ?? 0,
    learningSteps: doc.learning_steps ?? 0,
    reps: doc.reps ?? 0,
    lapses: doc.lapses ?? 0,
    lastReview: doc.last_review,
  };
}

/**
 * Convert FsrsCardState to the args format expected by the `calculateNextSchedule` action.
 */
export function fsrsStateToActionArgs(card: FsrsCardState) {
  return {
    state: card.state,
    due: card.due,
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: card.learningSteps,
    reps: card.reps,
    lapses: card.lapses,
    last_review: card.lastReview,
  };
}
