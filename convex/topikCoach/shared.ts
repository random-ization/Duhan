/**
 * Shared types and constants for the TOPIK Coach module.
 */

export const TOPIK_COACH_SOURCE = 'topik_coach';

/**
 * TOPIK exam sections that can have separate analysis.
 */
export type TopikSection = 'READING' | 'LISTENING' | 'WRITING';

/**
 * A per-question error record from TOPIK practice.
 */
export type TopikQuestionError = {
  questionNumber: number;
  section: TopikSection;
  questionType?: string;
  userAnswer: number;
  correctAnswer: number;
  /** Tags for the skills tested (e.g. "vocabulary", "grammar", "inference") */
  skillTags?: string[];
};

/**
 * Aggregated weakness profile from TOPIK practice sessions.
 */
export type TopikWeaknessProfile = {
  section: TopikSection;
  totalAttempts: number;
  avgAccuracy: number;
  weakQuestionTypes: Array<{
    type: string;
    errorCount: number;
    totalCount: number;
    errorRate: number;
  }>;
};
