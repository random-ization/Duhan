/**
 * Vocabulary types and interfaces
 * Extracted from convex/vocab.ts for better organization
 */

import type { Id } from '../_generated/dataModel';

export type VocabProgressDto = {
  id: Id<'user_vocab_progress'>;
  status?: 'NEW' | 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED' | string;
  interval?: number;
  streak?: number;
  nextReviewAt?: number | null;
  lastReviewedAt?: number | null;
  state?: number;
  due?: number | null;
  stability?: number;
  difficulty?: number;
  elapsed_days?: number;
  scheduled_days?: number;
  learning_steps?: number;
  reps?: number;
  lapses?: number;
  last_review?: number | null;
};

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
  _id: Id<'words'>; // Legacy support
  creationTime: number;
  word: string;
  meaning: string;
  meaningEn?: string; // Legacy support
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  pronunciation?: string;
  hanja?: string;
  partOfSpeech: string;
  audioUrl?: string; // Legacy support
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Example fields
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  // New names
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;

  // Progress fields
  status: 'NEW' | 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
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
  progress?: VocabProgressDto | null;
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
  appearanceId?: Id<'vocabulary_appearances'>;
  courseId?: string;
  unitId?: number;
};

export type VocabReviewDeckDto = {
  id: Id<'vocabulary_appearances'>;
  _id: Id<'words'>; // Legacy support
  wordId: Id<'words'>;
  word: string;
  meaning: string;
  meaningEn?: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  pronunciation?: string;
  hanja?: string;
  partOfSpeech: string;
  audioUrl?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Example fields
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;
  // New names
  example?: string;
  exampleZh?: string;
  exampleVi?: string;
  exampleMn?: string;

  // Progress fields
  status: 'NEW' | 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  progress?: VocabProgressDto | null;
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
  meaningEn?: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  pronunciation?: string;
  hanja?: string;
  partOfSpeech: string;
  audioUrl?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Example fields
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;

  // Progress fields
  status: 'NEW' | 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  progress: VocabProgressDto;
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

export type VocabActivityHeatmapCellDto = {
  date: string;
  count: number;
  intensity: 0 | 1 | 2 | 3 | 4;
  isToday: boolean;
};

export type VocabDashboardInsightsDto = {
  retentionRate30d: number | null;
  activeDays30d: number;
  totalReviews30d: number;
  heatmap: VocabActivityHeatmapCellDto[];
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
  meaningEn?: string;
  meaningZh: string;
  meaningVi: string;
  meaningMn: string;
  pronunciation?: string;
  hanja?: string;
  partOfSpeech: string;
  audioUrl?: string;
  audio?: string;
  image?: string;
  tags?: string[];
  level?: string;
  frequency?: number;
  // Example fields
  exampleSentence?: string;
  exampleMeaning?: string;
  exampleMeaningEn?: string;
  exampleMeaningVi?: string;
  exampleMeaningMn?: string;

  // Progress fields
  status: 'NEW' | 'NOT_STARTED' | 'LEARNING' | 'REVIEW' | 'MASTERED';
  proficiency: number;
  last_review?: number;
  next_review?: number;
  lapses: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  mastered: boolean;
  progress: VocabProgressDto;
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
