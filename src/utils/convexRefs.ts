import { makeFunctionReference } from 'convex/server';
import type { DefaultFunctionArgs } from 'convex/server';

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
  saveWord: mRef<
    {
      word: string;
      meaning: string;
      partOfSpeech: string;
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
