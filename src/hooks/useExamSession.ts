import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../../convex/_generated/dataModel';
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing exam sessions with server-side timer.
 * 
 * The timer is calculated from `session.endTime - Date.now()`, ensuring
 * it resumes correctly if the user refreshes the page.
 * 
 * Usage:
 * ```tsx
 * const { 
 *   session, 
 *   timeLeft, 
 *   answers, 
 *   startExam, 
 *   updateAnswer, 
 *   submitExam,
 *   isLoading 
 * } = useExamSession(examId);
 * ```
 */
export function useExamSession(examId: string) {
    // Query session data (auto-updates via Convex subscription)
    const session = useQuery(api.topik.getSession, { examId });

    // Mutations
    const startExamMutation = useMutation(api.topik.startExam);
    const updateAnswersMutation = useMutation(api.topik.updateAnswers);
    const submitExamMutation = useMutation(api.topik.submitExam);

    // Local state for timer
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [localAnswers, setLocalAnswers] = useState<Record<number, number>>({});

    // Debounce timer for saving answers
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Calculate time left from server endTime
    useEffect(() => {
        if (!session?.endTime || session.status !== 'IN_PROGRESS') {
            setTimeLeft(null);
            return;
        }

        const updateTimeLeft = () => {
            const remaining = Math.max(0, session.endTime - Date.now());
            setTimeLeft(remaining);
        };

        // Initial calculation
        updateTimeLeft();

        // Update every second
        const interval = setInterval(updateTimeLeft, 1000);

        return () => clearInterval(interval);
    }, [session?.endTime, session?.status]);

    // Sync answers from server when session loads; avoid re-sync if unchanged
    useEffect(() => {
        if (session?.answers) {
            setLocalAnswers(prev => (prev === session.answers ? prev : session.answers));
        }
    }, [session?.answers]);

    // Start exam
    const startExam = useCallback(async () => {
        const result = await startExamMutation({ examId });
        if (result.answers) {
            setLocalAnswers(result.answers);
        }
        return result;
    }, [startExamMutation, examId]);

    // Update a single answer (with debounced save to server)
    const updateAnswer = useCallback((questionNumber: number, selectedOption: number) => {
        // Immediately update local state
        setLocalAnswers(prev => {
            const updated = { ...prev, [questionNumber]: selectedOption };

            // Debounce save to server
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
            saveTimeoutRef.current = setTimeout(() => {
                if (session?.sessionId) {
                    updateAnswersMutation({
                        sessionId: session.sessionId,
                        answers: updated,
                    }).catch(console.warn);
                }
            }, 1000); // Save after 1 second of inactivity

            return updated;
        });
    }, [session?.sessionId, updateAnswersMutation]);

    // Submit exam
    const submitExam = useCallback(async () => {
        if (!session?.sessionId) {
            throw new Error('No active session');
        }

        // Save any pending answers first
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        return submitExamMutation({
            sessionId: session.sessionId,
            answers: localAnswers,
        });
    }, [session?.sessionId, submitExamMutation, localAnswers]);

    // Format time for display
    const formatTime = useCallback((ms: number | null): string => {
        if (ms === null) return '--:--';
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    return {
        // Session data
        session,
        sessionId: session?.sessionId as Id<'exam_sessions'> | undefined,
        status: session?.status || 'NONE',
        score: session?.score,
        completedAt: session?.completedAt,

        // Timer
        timeLeft,
        formattedTime: formatTime(timeLeft),
        isExpired: timeLeft !== null && timeLeft <= 0,

        // Answers
        answers: localAnswers,
        updateAnswer,

        // Actions
        startExam,
        submitExam,

        // Loading state
        isLoading: session === undefined,
        isActive: session?.status === 'IN_PROGRESS',
        isCompleted: session?.status === 'COMPLETED' || session?.status === 'AUTO_SUBMITTED',
    };
}
