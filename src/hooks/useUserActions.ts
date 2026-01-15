import { useCallback } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
    VocabularyItem,
    Mistake,
    Annotation,
    ExamAttempt,
} from '../types';
import { useAuth } from '../contexts/AuthContext';

export const useUserActions = () => {
    const { user, updateUser } = useAuth();

    const saveSavedWordMutation = useMutation(api.user.saveSavedWord);
    const saveMistakeMutation = useMutation(api.user.saveMistake);
    const saveAnnotationMutation = useMutation(api.annotations.save);
    const saveExamAttemptMutation = useMutation(api.user.saveExamAttempt);
    const deleteExamAttemptMutation = useMutation(api.user.deleteExamAttempt);
    const updateLearningProgressMutation = useMutation(api.user.updateLearningProgress);

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

            // Optimistic update
            updateUser({ savedWords: [...(user.savedWords || []), newItem] });

            try {
                await saveSavedWordMutation({
                    korean,
                    english,
                    exampleSentence: newItem.exampleSentence,
                    exampleTranslation: newItem.exampleTranslation
                });
            } catch (e) {
                console.error('Failed to save word', e);
                // Revert optimistic update if needed, or just let next fetch fix it
            }
        },
        [user, updateUser, saveSavedWordMutation]
    );

    const recordMistake = useCallback(
        async (word: Mistake | VocabularyItem) => {
            if (!user) return;

            const korean = word.korean || (word as any).word;
            const english = word.english || (word as any).meaning;
            const wordId = (word as any).id?.includes('mistake') ? undefined : (word as any).id;

            const mistake: Mistake = 'id' in word && (word as any).id.includes('mistake')
                ? word as Mistake
                : {
                    id: `mistake-${Date.now()}`,
                    korean,
                    english,
                    createdAt: Date.now(),
                };

            // Optimistic update
            updateUser({ mistakes: [...(user.mistakes || []), mistake] });

            try {
                await saveMistakeMutation({
                    korean,
                    english,
                    wordId: wordId as any,
                    context: 'Web App'
                });
            } catch (e) {
                console.error(e);
            }
        },
        [user, updateUser, saveMistakeMutation]
    );

    const clearMistakes = useCallback(() => {
        if (window.confirm('Are you sure?')) {
            updateUser({ mistakes: [] });
            // Server sync todo
        }
    }, [updateUser]);

    const saveAnnotation = useCallback(
        async (annotation: Annotation) => {
            if (!user) return;

            // Optimistic update
            const updatedAnnotations = [...(user.annotations || [])];
            const index = updatedAnnotations.findIndex(a => a.id === annotation.id);

            if (index !== -1) {
                if (!annotation.color && (!annotation.note || annotation.note.trim() === '')) {
                    updatedAnnotations.splice(index, 1);
                } else {
                    updatedAnnotations[index] = annotation;
                }
            } else {
                updatedAnnotations.push(annotation);
            }
            updateUser({ annotations: updatedAnnotations });

            try {
                await saveAnnotationMutation({
                    contextKey: annotation.contextKey,
                    text: annotation.text,
                    note: annotation.note,
                    color: annotation.color || undefined, // undefined to delete color field if needed? 
                    startOffset: annotation.startOffset,
                    endOffset: annotation.endOffset
                });
            } catch (apiError) {
                console.error('Failed to save annotation to server:', apiError);
            }
        },
        [user, updateUser, saveAnnotationMutation]
    );

    const saveExamAttempt = useCallback(
        async (attempt: ExamAttempt) => {
            if (!user) return;

            updateUser({ examHistory: [...(user.examHistory || []), attempt] });

            try {
                await saveExamAttemptMutation({
                    examId: attempt.examId as any,
                    score: attempt.score,
                    totalQuestions: attempt.maxScore,
                    sectionScores: attempt.userAnswers
                });
            } catch (e) {
                console.error(e);
            }
        },
        [user, updateUser, saveExamAttemptMutation]
    );

    const deleteExamAttempt = useCallback(
        async (attemptId: string) => {
            if (!user) return;
            const updatedHistory = (user.examHistory || []).filter(h => h.id !== attemptId);
            updateUser({ examHistory: updatedHistory });

            try {
                await deleteExamAttemptMutation({ attemptId: attemptId as any });
            } catch (e) {
                console.error('Failed to delete exam attempt', e);
            }
        },
        [user, updateUser, deleteExamAttemptMutation]
    );

    const updateLearningProgress = useCallback(
        async (institute: string, level: number, unit?: number, module?: string) => {
            if (!user) return;

            // Optimistic update
            updateUser({
                lastInstitute: institute,
                lastLevel: level,
                lastUnit: unit,
                lastModule: module,
            });

            try {
                await updateLearningProgressMutation({
                    lastInstitute: institute,
                    lastLevel: level,
                    lastUnit: unit,
                    lastModule: module
                });
            } catch (e) {
                console.error('Failed to update learning progress', e);
            }
        },
        [user, updateUser, updateLearningProgressMutation]
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
