import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import type { Id } from '../../convex/_generated/dataModel';
import { VocabularyItem, Mistake, Annotation, ExamAttempt } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { toErrorMessage } from '../utils/errors';
import { mRef } from '../utils/convexRefs';

const normalizeExamAnswers = (answers: Record<number, number> | undefined) => {
  if (!answers) return answers;
  const entries = Object.entries(answers);
  if (entries.length === 0) return answers;

  const numericKeys = entries.map(([k]) => Number(k)).filter(n => Number.isFinite(n));
  if (numericKeys.length === 0) return answers;

  const minKey = Math.min(...numericKeys);
  const hasZero = numericKeys.includes(0);
  const isZeroBased = hasZero || minKey === 0;
  if (!isZeroBased) return answers;

  const normalized: Record<number, number> = {};
  for (const [k, v] of entries) {
    const n = Number(k);
    if (!Number.isFinite(n)) continue;
    normalized[n + 1] = v;
  }
  return normalized;
};

export const useUserActions = () => {
  const { user } = useAuth();

  const saveSavedWordMutation = useMutation(
    mRef<
      { korean: string; english: string; exampleSentence?: string; exampleTranslation?: string },
      { success: boolean }
    >('user:saveSavedWord')
  );
  const saveMistakeMutation = useMutation(
    mRef<
      { wordId?: Id<'words'>; korean: string; english: string; context?: string },
      { success: boolean }
    >('user:saveMistake')
  );
  const clearMistakesMutation = useMutation(
    mRef<Record<string, never>, { success: boolean; deleted: number }>('user:clearMistakes')
  );
  const saveAnnotationMutation = useMutation(
    mRef<
      {
        contextKey: string;
        text: string;
        note?: string;
        color?: string;
        startOffset?: number;
        endOffset?: number;
      },
      { id: Id<'annotations'>; success: boolean }
    >('annotations:save')
  );
  const saveExamAttemptMutation = useMutation(
    mRef<
      {
        examId: string;
        score: number;
        totalQuestions?: number;
        sectionScores?: unknown;
        duration?: number;
        answers?: unknown;
      },
      { success: boolean; attemptId: Id<'exam_attempts'> }
    >('user:saveExamAttempt')
  );
  const deleteExamAttemptMutation = useMutation(
    mRef<{ attemptId: Id<'exam_attempts'> }, { success: boolean; error?: string }>(
      'user:deleteExamAttempt'
    )
  );
  const updateLearningProgressMutation = useMutation(
    mRef<
      { lastInstitute?: string; lastLevel?: number; lastUnit?: number; lastModule?: string },
      { success: boolean }
    >('user:updateLearningProgress')
  );

  const saveWord = useCallback(
    async (vocabItem: VocabularyItem | string, meaning?: string) => {
      if (!user) return;

      let newItem: VocabularyItem;
      let korean = '';
      let english = '';

      if (typeof vocabItem === 'string' && meaning) {
        korean = vocabItem;
        english = meaning;
        newItem = {
          korean,
          english,
          exampleSentence: '',
          exampleTranslation: '',
        };
      } else {
        newItem = vocabItem as VocabularyItem;
        korean = newItem.korean || newItem.word || '';
        english = newItem.english || newItem.meaning || '';
      }

      try {
        await saveSavedWordMutation({
          korean,
          english,
          exampleSentence: newItem.exampleSentence,
          exampleTranslation: newItem.exampleTranslation,
        });
      } catch (e) {
        console.error('Failed to save word', e);
      }
    },
    [user, saveSavedWordMutation]
  );

  const recordMistake = useCallback(
    async (word: Mistake | VocabularyItem) => {
      if (!user) return;

      const maybeVocab = word as Partial<VocabularyItem>;
      const korean = word.korean || maybeVocab.word || '';
      const english = word.english || maybeVocab.meaning || '';
      const isExistingMistake = typeof word.id === 'string' && word.id.startsWith('mistake-');
      const wordId =
        !isExistingMistake && typeof word.id === 'string' ? (word.id as Id<'words'>) : undefined;

      try {
        await saveMistakeMutation({
          korean,
          english,
          wordId,
          context: 'Web App',
        });
      } catch (e) {
        console.error('Failed to save mistake', toErrorMessage(e));
      }
    },
    [user, saveMistakeMutation]
  );

  const clearMistakes = useCallback(() => {
    if (window.confirm('Are you sure?')) {
      clearMistakesMutation({}).catch(e =>
        console.error('Failed to clear mistakes', toErrorMessage(e))
      );
    }
  }, [clearMistakesMutation]);

  const saveAnnotation = useCallback(
    async (annotation: Annotation) => {
      if (!user) return;

      try {
        await saveAnnotationMutation({
          contextKey: annotation.contextKey,
          text: annotation.text,
          note: annotation.note,
          color: annotation.color || undefined, // undefined to delete color field if needed?
          startOffset: annotation.startOffset,
          endOffset: annotation.endOffset,
        });
      } catch (apiError) {
        console.error('Failed to save annotation to server:', apiError);
      }
    },
    [user, saveAnnotationMutation]
  );

  const saveExamAttempt = useCallback(
    async (attempt: ExamAttempt) => {
      if (!user) return;

      try {
        await saveExamAttemptMutation({
          examId: attempt.examId,
          score: attempt.score,
          answers: normalizeExamAnswers(attempt.userAnswers),
        });
      } catch (e) {
        console.error('Failed to save exam attempt', toErrorMessage(e));
      }
    },
    [user, saveExamAttemptMutation]
  );

  const deleteExamAttempt = useCallback(
    async (attemptId: string) => {
      if (!user) return;
      try {
        await deleteExamAttemptMutation({ attemptId: attemptId as Id<'exam_attempts'> });
      } catch (e) {
        console.error('Failed to delete exam attempt', toErrorMessage(e));
      }
    },
    [user, deleteExamAttemptMutation]
  );

  const updateLearningProgress = useCallback(
    async (institute: string, level: number, unit?: number, module?: string) => {
      if (!user) return;

      try {
        await updateLearningProgressMutation({
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module,
        });
      } catch (e) {
        console.error('Failed to update learning progress', toErrorMessage(e));
      }
    },
    [user, updateLearningProgressMutation]
  );

  return {
    saveWord,
    recordMistake,
    clearMistakes,
    saveAnnotation,
    saveExamAttempt,
    deleteExamAttempt,
    updateLearningProgress,
  };
};
