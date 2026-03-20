import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../convex/_generated/dataModel';
import { VocabularyItem, Mistake, Annotation, ExamAttempt } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { useNotebookPicker } from '../contexts/NotebookPickerContext';
import { toErrorMessage } from '../utils/errors';
import { mRef, NOTE_PAGES } from '../utils/convexRefs';

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

const resolveAnnotationSourceModule = (annotation: Annotation): string => {
  if (annotation.scopeType) return annotation.scopeType;
  if (annotation.contextKey.startsWith('READING:')) return 'READING_ARTICLE';
  if (annotation.contextKey.startsWith('TOPIK-')) return 'TOPIK_REVIEW';
  return 'TEXTBOOK';
};

export const useUserActions = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { confirm } = useConfirmDialog();
  const { pickNotebook } = useNotebookPicker();

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
        scopeType?: string;
        scopeId?: string;
        blockId?: string;
        quote?: string;
        contextBefore?: string;
        contextAfter?: string;
      },
      { id: Id<'annotations'>; success: boolean; upserted?: boolean }
    >('annotations:save')
  );
  const upsertAnnotationByAnchorMutation = useMutation(
    mRef<
      {
        scopeType: string;
        scopeId: string;
        blockId: string;
        start: number;
        end: number;
        quote: string;
        contextBefore?: string;
        contextAfter?: string;
        note?: string;
        color?: string;
        targetType?: string;
        contextKey?: string;
      },
      { id: Id<'annotations'>; success: boolean; upserted: boolean }
    >('annotations:upsertByAnchor')
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
  const ingestNotePageFromSourceMutation = useMutation(NOTE_PAGES.ingestFromSource);
  const deleteNotePageBySourceRefMutation = useMutation(NOTE_PAGES.deleteBySourceRef);

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

  const clearMistakes = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Clear all mistakes?',
      description: 'This will remove all saved mistake records and cannot be undone.',
      confirmText: 'Clear',
      cancelText: 'Cancel',
      variant: 'destructive',
    });
    if (!confirmed) return;
    clearMistakesMutation({}).catch(e =>
      console.error('Failed to clear mistakes', toErrorMessage(e))
    );
  }, [clearMistakesMutation, confirm]);

  const saveAnnotation = useCallback(
    async (annotation: Annotation) => {
      if (!user) return;

      try {
        let persistedId: Id<'annotations'> | null = null;
        const hasAnchorScope =
          typeof annotation.startOffset === 'number' &&
          typeof annotation.endOffset === 'number' &&
          typeof annotation.scopeType === 'string' &&
          typeof annotation.scopeId === 'string' &&
          typeof annotation.blockId === 'string' &&
          (annotation.quote || annotation.text).trim().length > 0;

        if (hasAnchorScope) {
          const result = await upsertAnnotationByAnchorMutation({
            scopeType: annotation.scopeType!,
            scopeId: annotation.scopeId!,
            blockId: annotation.blockId!,
            start: annotation.startOffset!,
            end: annotation.endOffset!,
            quote: annotation.quote || annotation.text,
            contextBefore: annotation.contextBefore,
            contextAfter: annotation.contextAfter,
            note: annotation.note,
            color: annotation.color === null ? '__none__' : annotation.color || undefined,
            targetType: annotation.targetType,
            contextKey: annotation.contextKey,
          });
          persistedId = result.id;
        } else {
          const result = await saveAnnotationMutation({
            contextKey: annotation.contextKey,
            text: annotation.text,
            note: annotation.note,
            color: annotation.color === null ? '__none__' : annotation.color || undefined,
            startOffset: annotation.startOffset,
            endOffset: annotation.endOffset,
            scopeType: annotation.scopeType,
            scopeId: annotation.scopeId,
            blockId: annotation.blockId,
            quote: annotation.quote,
            contextBefore: annotation.contextBefore,
            contextAfter: annotation.contextAfter,
          });
          persistedId = result.id;
        }

        if (
          persistedId &&
          typeof annotation.startOffset === 'number' &&
          typeof annotation.endOffset === 'number' &&
          (annotation.quote || annotation.text).trim() &&
          annotation.blockId
        ) {
          const resolvedScopeType =
            annotation.scopeType || resolveAnnotationSourceModule(annotation);
          const resolvedScopeId = annotation.scopeId || annotation.contextKey;
          const resolvedSourceModule = resolveAnnotationSourceModule(annotation)
            .trim()
            .toUpperCase();
          const normalizedNote = annotation.note?.trim() || '';
          const clearHighlightExplicit = annotation.color === null;
          const quoteText = (annotation.quote || annotation.text).trim();
          const sourceRef = {
            module: resolvedSourceModule,
            scopeType: resolvedScopeType,
            scopeId: resolvedScopeId,
            blockId: annotation.blockId,
            start: annotation.startOffset,
            end: annotation.endOffset,
            quote: quoteText,
            contextKey: annotation.contextKey,
            annotationId: String(persistedId),
          };

          if (clearHighlightExplicit && !normalizedNote) {
            await deleteNotePageBySourceRefMutation({ sourceRef });
          } else {
            if (normalizedNote.length === 0) {
              return;
            }

            const notebookId = await pickNotebook({
              title: t('notes.picker.annotation.title', { defaultValue: 'Save quote note' }),
              description: t('notes.picker.annotation.descriptionUserActions', {
                defaultValue:
                  'Select a notebook. Cancel keeps the highlight/annotation without notebook sync.',
              }),
              confirmText: t('notes.picker.annotation.confirm', {
                defaultValue: 'Save to Notebook',
              }),
              cancelText: t('notes.picker.annotation.cancel', { defaultValue: 'Cancel' }),
            });
            if (!notebookId) {
              return;
            }

            await ingestNotePageFromSourceMutation({
              notebookId,
              sourceModule: resolvedSourceModule,
              sourceRef,
              noteType: 'manual',
              title: annotation.contextKey || quoteText,
              quote: quoteText,
              note: normalizedNote || undefined,
              color: clearHighlightExplicit ? '__none__' : annotation.color || undefined,
              tags: ['annotation', resolvedSourceModule.toLowerCase()],
              status: 'Inbox',
              scopeType: resolvedScopeType,
              scopeId: resolvedScopeId,
              blockId: annotation.blockId,
              start: annotation.startOffset,
              end: annotation.endOffset,
              contextBefore: annotation.contextBefore,
              contextAfter: annotation.contextAfter,
              contextKey: annotation.contextKey,
              contentId: annotation.scopeId || annotation.contextKey,
              contentTitle: annotation.contextKey,
              annotationId: String(persistedId),
            });
          }
        }
      } catch (apiError) {
        console.error('Failed to save annotation to server:', apiError);
      }
    },
    [
      user,
      saveAnnotationMutation,
      upsertAnnotationByAnchorMutation,
      ingestNotePageFromSourceMutation,
      deleteNotePageBySourceRefMutation,
      pickNotebook,
      t,
    ]
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
