/**
 * FSRS Service Layer
 *
 * Wraps the ts-fsrs library to provide spaced repetition scheduling.
 * Supports both 2-button (Pass/Fail) and 4-button rating modes.
 */
import {
  Card,
  FSRS,
  Rating,
  State,
  createEmptyCard,
  generatorParameters,
  type RecordLogItem,
  type Grade,
} from 'ts-fsrs';

// Configure FSRS with optimized parameters
const params = generatorParameters({
  maximum_interval: 365, // Max 1 year between reviews
  enable_fuzz: true, // Add randomness to prevent review clustering
});

const fsrs = new FSRS(params);

// Re-export types for convenience
export { Rating, State };
export type { Card, RecordLogItem };

/**
 * Create a new empty card for first-time learning
 */
export const createNewCard = (now?: Date): Card => createEmptyCard(now);

/**
 * Schedule the next review based on user rating
 */
export const scheduleReview = (card: Card, grade: Grade, now?: Date): RecordLogItem => {
  return fsrs.next(card, now ?? new Date(), grade);
};

/**
 * Get all scheduling options for a card (all 4 ratings)
 */
export const getSchedulingOptions = (card: Card, now?: Date) => {
  return fsrs.repeat(card, now ?? new Date());
};

/**
 * Map Pass/Fail (2-button mode) to FSRS Rating
 * - Pass → Good (standard interval growth)
 * - Fail → Again (reset to learning)
 */
export const mapPassFailToRating = (isCorrect: boolean): Rating => {
  return isCorrect ? Rating.Good : Rating.Again;
};

/**
 * Map quality score (0-5) to FSRS Rating (for backward compatibility)
 */
export const mapQualityToRating = (quality: number): Rating => {
  if (quality <= 1) return Rating.Again;
  if (quality === 2) return Rating.Hard;
  if (quality <= 4) return Rating.Good;
  return Rating.Easy;
};

/**
 * Convert Card state to display status string
 */
export const stateToStatus = (state: State): string => {
  switch (state) {
    case State.New:
      return 'NEW';
    case State.Learning:
      return 'LEARNING';
    case State.Review:
      return 'REVIEW';
    case State.Relearning:
      return 'RELEARNING';
    default:
      return 'UNKNOWN';
  }
};

/**
 * Check if a card is considered "mastered" (high stability)
 * A card with stability > 30 days is considered mastered
 */
export const isMastered = (card: Card): boolean => {
  return card.state === State.Review && card.stability > 30;
};

/**
 * Calculate retrievability (probability of recall) for a card
 */
export const getRetrievability = (card: Card, now?: Date): number => {
  return fsrs.get_retrievability(card, now ?? new Date(), false);
};

/**
 * Serialize Card object for database storage
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
 * Deserialize Card object from database
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
