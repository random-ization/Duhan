/**
 * TOPIK Coach Module
 *
 * Unified module for all TOPIK exam coaching features:
 * - Writing evaluation (via topikWritingCoach.ts — kept as standalone for backward compat)
 * - Reading performance analysis
 * - Combined weakness profiling
 *
 * The writing coach remains at convex/topikWritingCoach.ts to avoid breaking
 * existing API references. This module extends with reading analysis and
 * cross-section weakness aggregation.
 */

// Re-export reading analysis queries
export { getReadingPerformance, getCombinedWeaknesses } from './reading';

export { getWeakPoints } from './weakPoints';

// Re-export writing coach deep analysis
export {
  getScorePrediction,
  getImprovementPlan,
  getMistakeBook,
  getHotTopics,
  getWritingProgress,
  predictScore,
  generateImprovementPlan,
  completeImprovementPlan,
} from './writing';

// Re-export shared types
export type { TopikSection, TopikQuestionError, TopikWeaknessProfile } from './shared';

export type { TopikCoachWeakPoint } from './weakPoints';
