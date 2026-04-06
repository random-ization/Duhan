/**
 * Vocabulary types and interfaces
 * Extracted from convex/vocab.ts for better organization
 */

import type { Id } from '../_generated/dataModel';

export type VocabStatsDto = {
  total: number;
  mastered: number;
};

export type VocabTips = {
  word: string;
  meaning: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
};

export type VocabWordDto = {
  id: Id<'words'>;
  word: string;
  meaning: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Progress fields
  status: 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  // Course context
  courseData?: {
    courseId: string;
    unitId: number;
    displayOrder: number;
    customNote?: string;
    customNoteZh?: string;
    customNoteVi?: string;
    customNoteMn?: string;
    isImportant?: boolean;
  };
};

export type VocabReviewDeckDto = {
  id: Id<'vocabulary_appearances'>;
  wordId: Id<'words'>;
  word: string;
  meaning: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Progress fields
  status: 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  // Course context
  courseId: string;
  unitId: number;
  displayOrder: number;
  customNote?: string;
  customNoteZh?: string;
  customNoteVi?: string;
  customNoteMn?: string;
  isImportant?: boolean;
};

export type DailyPhraseDto = {
  id: Id<'daily_phrases'>;
  korean: string;
  romanization: string;
  translation: string;
  translationZh: string;
  translationVi: string;
  translationMn: string;
};

export type VocabReviewItemDto = {
  id: Id<'vocabulary_appearances'>;
  wordId: Id<'words'>;
  word: string;
  meaning: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Progress fields
  status: 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  // Course context
  courseId: string;
  unitId: number;
  displayOrder: number;
  customNote?: string;
  customNoteZh?: string;
  customNoteVi?: string;
  customNoteMn?: string;
  isImportant?: boolean;
};

export type VocabReviewSummaryDto = {
  total: number;
  dueTotal: number;
  dueNow: number;
  unlearned: number;
  mastered: number;
  learning: number;
  recommendedToday: number;
};

export type VocabBookPageDto = {
  items: VocabBookItemDto[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type VocabBookItemDto = {
  id: Id<'words'>;
  word: string;
  meaning: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Progress fields
  status: 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  // Course context
  courseData?: {
    courseId: string;
    unitId: number;
    displayOrder: number;
    customNote?: string;
    customNoteZh?: string;
    customNoteVi?: string;
    customNoteMn?: string;
    isImportant?: boolean;
  };
  savedByUser?: boolean;
  savedAt?: number;
};

export type VocabBookCategory = 'ALL' | 'UNLEARNED' | 'DUE' | 'MASTERED';

export type LearningSessionDto = {
  id: Id<'vocab_learning_sessions'>;
  userId: Id<'users'>;
  instituteId: string;
  unitId: number;
  mode: 'FLASHCARD' | 'LEARN' | 'TEST';
  status: 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
  startedAt: number;
  updatedAt: number;
  completedAt?: number;
  snapshot?: unknown;
};
