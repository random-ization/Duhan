import { makeFunctionReference } from 'convex/server';
import type { DefaultFunctionArgs } from 'convex/server';
import type { Doc, Id } from '../../convex/_generated/dataModel';

// Import types only to avoid runtime cycles
import type { GrammarStatsDto, GrammarItemDto, UnitGrammarDto } from '../../convex/grammars';

export type NoArgs = Record<string, never>;

export const qRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'query', Args, Ret>(name);

export const mRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'mutation', Args, Ret>(name);

export const aRef = <Args extends DefaultFunctionArgs, Ret>(name: string) =>
  makeFunctionReference<'action', Args, Ret>(name);

/**
 * COMMON REFS
 */
export const INSTITUTES = {
  getAll: qRef<NoArgs, Doc<'institutes'>[]>('institutes:getAll'),
};

export const STORAGE = {
  getUploadUrl: aRef<
    { filename: string; contentType: string; folder?: string },
    { uploadUrl: string; publicUrl: string; key: string; headers: Record<string, string> }
  >('storage:getUploadUrl'),
};

export const UNITS = {
  bulkImport: mRef<
    {
      courseId: string;
      items: Array<{
        unitIndex: number;
        articleIndex: number;
        title: string;
        readingText: string;
        translation?: string;
        translationEn?: string;
        translationVi?: string;
        translationMn?: string;
        audioUrl?: string;
      }>;
    },
    {
      success: boolean;
      results: {
        success: number;
        failed: number;
        created: number;
        updated: number;
        errors: string[];
      };
    }
  >('units:bulkImport'),
};

/**
 * GRAMMAR REFS
 */
export const GRAMMARS = {
  getStats: qRef<{ courseId: string }, GrammarStatsDto>('grammars:getStats'),
  getByCourse: qRef<{ courseId: string }, GrammarItemDto[]>('grammars:getByCourse'),
  getUnitGrammar: qRef<{ courseId: string; unitId: number }, UnitGrammarDto[]>(
    'grammars:getUnitGrammar'
  ),
  search: qRef<{ query: string }, GrammarItemDto[]>('grammars:search'),
  create: mRef<
    { title: string; summary: string; explanation: string; type: string; level: string },
    { id: string }
  >('grammars:create'),
  assignToUnit: mRef<{ courseId: string; unitId: number; grammarId: string }, unknown>(
    'grammars:assignToUnit'
  ),
  removeFromUnit: mRef<{ courseId: string; unitId: number; grammarId: string }, void>(
    'grammars:removeFromUnit'
  ),
  updateStatus: mRef<
    { grammarId: string; status: string },
    { status: string; proficiency: number }
  >('grammars:updateStatus'),
  bulkImport: mRef<
    {
      items: Array<{
        title: string;
        summary?: string;
        explanation?: string;
        type?: string;
        level?: string;
        unitId?: number;
      }>;
      courseId?: string;
    },
    {
      success: boolean;
      results: { success: number; failed: number; newGrammars: number; errors: string[] };
    }
  >('grammars:bulkImport'),
};

/**
 * VOCAB REFS
 */
import { VocabStatsDto, VocabWordDto, DailyPhraseDto } from '../../convex/vocab';

export const VOCAB = {
  getStats: qRef<{ courseId?: string }, VocabStatsDto>('vocab:getStats'),
  getOfCourse: qRef<{ courseId: string; limit?: number }, VocabWordDto[]>('vocab:getOfCourse'),
  getDailyPhrase: qRef<{ language?: string }, DailyPhraseDto | null>('vocab:getDailyPhrase'),
  // Mutations
  updateProgress: mRef<{ wordId: string; quality: number }, { success: boolean; progress: any }>(
    'vocab:updateProgress'
  ),
  updateProgressV2: mRef<
    {
      wordId: Id<'words'>;
      rating: number;
      fsrsState: FSRSCardState;
    },
    { success: boolean; progress?: FSRSProgressDto }
  >('vocab:updateProgressV2'),
  getAllPaginated: qRef<
    { paginationOpts: PaginationOptions; courseId?: string },
    PaginationResult<unknown>
  >('vocab:getAllPaginated'),
  bulkImport: mRef<
    { items: unknown[] },
    {
      success: boolean;
      results: {
        success: number;
        failed: number;
        smartFilled: number;
        newWords: number;
        errors: string[];
      };
    }
  >('vocab:bulkImport'),
  updateVocab: mRef<
    {
      wordId: Id<'words'>;
      appearanceId?: Id<'vocabulary_appearances'>;
      word?: string;
      meaning?: string;
      meaningEn?: string;
      meaningVi?: string;
      meaningMn?: string;
      partOfSpeech?: string;
      unitId?: number;
      exampleSentence?: string;
      exampleMeaning?: string;
      exampleMeaningEn?: string;
      exampleMeaningVi?: string;
      exampleMeaningMn?: string;
    },
    { success: boolean; wordId: Id<'words'>; action?: string }
  >('vocab:updateVocab'),
  saveWord: mRef<
    {
      word: string;
      meaning: string;
      partOfSpeech: string;
      hanja?: string;
      pronunciation?: string;
      courseId: string;
      unitId: number;
      exampleSentence?: string;
      exampleMeaning?: string;
    },
    void
  >('vocab:saveWord'),
  // SRS Review
  getDueForReview: qRef<NoArgs, import('../../convex/vocab').VocabReviewItemDto[]>(
    'vocab:getDueForReview'
  ),
  addToReview: mRef<
    {
      word: string;
      meaning: string;
      partOfSpeech?: string;
      context?: string;
      source?: string;
    },
    void
  >('vocab:addToReview'),
};

/**
 * FSRS REFS
 */
export type FSRSCardState = {
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
};

export type FSRSReviewLog = {
  rating: number;
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  review: number;
};

export type FSRSNextScheduleResult = FSRSCardState & {
  review_log: FSRSReviewLog;
};

export type FSRSProgressDto = FSRSCardState & {
  id: string;
  status: string;
  interval: number;
  streak: number;
  nextReviewAt: number;
  lastReviewedAt: number;
};

export const FSRS = {
  calculateNextSchedule: aRef<
    {
      currentCard?: Omit<FSRSCardState, 'last_review'> & { last_review?: number };
      rating: number;
      now?: number;
    },
    FSRSNextScheduleResult
  >('fsrs:calculateNextSchedule'),
};

export const PASSWORD_RESET = {
  requestPasswordReset: aRef<{ email: string }, { success: boolean }>(
    'passwordReset:requestPasswordReset'
  ),
  resetPassword: aRef<
    { email: string; token: string; newPassword: string },
    { success: boolean; error?: string }
  >('passwordReset:resetPassword'),
};

/**
 * TOPIK REFS
 */
import { TopikQuestionDto, TopikExamDto } from '../../convex/topik';
import type { PaginationOptions, PaginationResult } from 'convex/server';

export const TOPIK = {
  getExams: qRef<
    { paginationOpts?: PaginationOptions },
    PaginationResult<TopikExamDto> | TopikExamDto[]
  >('topik:getExams'),
  getExamById: qRef<{ examId: string }, TopikExamDto | null>('topik:getExamById'),
  getExamQuestions: qRef<{ examId: string }, TopikQuestionDto[]>('topik:getExamQuestions'),
  // Mutations
  saveExam: mRef<
    {
      id: string;
      title: string;
      round: number;
      type: string;
      timeLimit: number;
      questions: any[];
      isPaid?: boolean;
      // Add other fields as needed or use partial
    } & Record<string, any>,
    { success: boolean; examId: string }
  >('topik:saveExam'),
  submitExam: mRef<{ sessionId: string; answers: any }, { success: boolean; score: number }>(
    'topik:submitExam'
  ),
  deleteExam: mRef<{ examId: string }, unknown>('topik:deleteExam'),
};
