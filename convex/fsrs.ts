'use node';

/**
 * FSRS Node Action
 *
 * Handles FSRS calculations on the server side using Node.js runtime.
 * This action receives card state and rating, computes the next schedule,
 * and returns the updated card state.
 */
import { action } from './_generated/server';
import { v } from 'convex/values';
import {
  Card,
  FSRS,
  Rating,
  State,
  createEmptyCard,
  generatorParameters,
  type Grade,
} from 'ts-fsrs';

// Configure FSRS with optimized parameters
const params = generatorParameters({
  maximum_interval: 365, // Max 1 year between reviews
  enable_fuzz: true, // Add randomness to prevent review clustering
});

const fsrs = new FSRS(params);

/**
 * Calculate next review schedule using FSRS algorithm
 */
export const calculateNextSchedule = action({
  args: {
    // Current card state (null for new cards)
    currentCard: v.optional(
      v.object({
        state: v.number(),
        due: v.number(),
        stability: v.number(),
        difficulty: v.number(),
        elapsed_days: v.number(),
        scheduled_days: v.number(),
        learning_steps: v.number(),
        reps: v.number(),
        lapses: v.number(),
        last_review: v.optional(v.number()),
      })
    ),
    // User rating: 1=Again, 2=Hard, 3=Good, 4=Easy
    rating: v.number(),
    // Current timestamp
    now: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const now = args.now ? new Date(args.now) : new Date();

    // Reconstruct Card object from database state, or create new card
    let card: Card;
    if (args.currentCard) {
      card = {
        state: args.currentCard.state as State,
        due: new Date(args.currentCard.due),
        stability: args.currentCard.stability,
        difficulty: args.currentCard.difficulty,
        elapsed_days: args.currentCard.elapsed_days,
        scheduled_days: args.currentCard.scheduled_days,
        learning_steps: args.currentCard.learning_steps,
        reps: args.currentCard.reps,
        lapses: args.currentCard.lapses,
        last_review: args.currentCard.last_review
          ? new Date(args.currentCard.last_review)
          : undefined,
      };
    } else {
      card = createEmptyCard(now);
    }

    // Convert rating number to Grade type
    const grade = args.rating as Grade;

    // Calculate next review
    const result = fsrs.next(card, now, grade);
    const newCard = result.card;

    // Return serialized state for database storage
    return {
      state: newCard.state,
      due: newCard.due.getTime(),
      stability: newCard.stability,

      scheduled_days: newCard.scheduled_days,
      learning_steps: newCard.learning_steps,
      reps: newCard.reps,
      lapses: newCard.lapses,
      last_review: newCard.last_review?.getTime() ?? null,
      // Also return log for potential analytics
      review_log: {
        rating: result.log.rating,
        state: result.log.state,
        due: result.log.due.getTime(),
        stability: result.log.stability,

        scheduled_days: result.log.scheduled_days,
        review: result.log.review.getTime(),
      },
    };
  },
});

/**
 * Map Pass/Fail to FSRS Rating
 * Used by 2-button mode
 */
export const getRatingForPassFail = action({
  args: {
    isCorrect: v.boolean(),
  },
  handler: async (_ctx, args) => {
    return args.isCorrect ? Rating.Good : Rating.Again;
  },
});

/**
 * Get all scheduling options for a card (preview intervals)
 * Useful for showing "1d" / "3d" / "7d" on rating buttons
 */
export const getSchedulingPreview = action({
  args: {
    currentCard: v.optional(
      v.object({
        state: v.number(),
        due: v.number(),
        stability: v.number(),
        difficulty: v.number(),
        elapsed_days: v.number(),
        scheduled_days: v.number(),
        learning_steps: v.number(),
        reps: v.number(),
        lapses: v.number(),
        last_review: v.optional(v.number()),
      })
    ),
    now: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const now = args.now ? new Date(args.now) : new Date();

    let card: Card;
    if (args.currentCard) {
      card = {
        state: args.currentCard.state as State,
        due: new Date(args.currentCard.due),
        stability: args.currentCard.stability,
        difficulty: args.currentCard.difficulty,
        elapsed_days: args.currentCard.elapsed_days,
        scheduled_days: args.currentCard.scheduled_days,
        learning_steps: args.currentCard.learning_steps,
        reps: args.currentCard.reps,
        lapses: args.currentCard.lapses,
        last_review: args.currentCard.last_review
          ? new Date(args.currentCard.last_review)
          : undefined,
      };
    } else {
      card = createEmptyCard(now);
    }

    const options = fsrs.repeat(card, now);

    // Return simplified preview for UI
    return {
      again: {
        scheduled_days: options[Rating.Again].card.scheduled_days,
        due: options[Rating.Again].card.due.getTime(),
      },
      hard: {
        scheduled_days: options[Rating.Hard].card.scheduled_days,
        due: options[Rating.Hard].card.due.getTime(),
      },
      good: {
        scheduled_days: options[Rating.Good].card.scheduled_days,
        due: options[Rating.Good].card.due.getTime(),
      },
      easy: {
        scheduled_days: options[Rating.Easy].card.scheduled_days,
        due: options[Rating.Easy].card.due.getTime(),
      },
    };
  },
});
