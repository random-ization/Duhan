import { useQuery, useMutation } from 'convex/react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { mRef, qRef } from '../utils/convexRefs';

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
  type ExamSession = {
    sessionId: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'AUTO_SUBMITTED' | 'NONE';
    endTime?: number;
    answers?: Record<number, number>;
    score?: number;
    completedAt?: number;
  };
  const session = useQuery(qRef<{ examId: string }, ExamSession | null>('topik:getSession'), {
    examId,
  });

  // Mutations
  const startExamMutation = useMutation(mRef<{ examId: string }, ExamSession>('topik:startExam'));
  const updateAnswersMutation = useMutation(
    mRef<{ sessionId: string; answers: Record<number, number> }, unknown>('topik:updateAnswers')
  );
  const submitExamMutation = useMutation(
    mRef<{ sessionId: string; answers: Record<number, number> }, unknown>('topik:submitExam')
  );

  // Local state for timer
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [localAnswers, setLocalAnswers] = useState<Record<number, number>>({});

  // Debounce timer for saving answers
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSaveRef = useRef<Record<number, number> | null>(null);

  // Reset timer during render if needed (avoid useEffect state update)
  if ((!session?.endTime || session.status !== 'IN_PROGRESS') && timeLeft !== null) {
    setTimeLeft(null);
  }

  // Calculate time left from server endTime
  useEffect(() => {
    if (!session?.endTime || session.status !== 'IN_PROGRESS') {
      return;
    }

    const endTime = session.endTime;
    const updateTimeLeft = () => {
      const remaining = Math.max(0, endTime - Date.now());
      setTimeLeft(remaining);
    };

    // Initial calculation
    updateTimeLeft();

    // Update every second
    const interval = setInterval(updateTimeLeft, 1000);

    return () => clearInterval(interval);
  }, [session?.endTime, session?.status]);

  // Sync answers from server when session loads; avoid re-sync if unchanged
  // Track synced session to avoid useEffect state updates
  const [syncedSessionId, setSyncedSessionId] = useState<string | null>(null);

  // Sync answers on session load (render-time update pattern)
  if (session?.sessionId && session.sessionId !== syncedSessionId) {
    setSyncedSessionId(session.sessionId);
    if (session.answers) {
      setLocalAnswers(session.answers);
    }
  }

  // Start exam
  const startExam = useCallback(async () => {
    const result = await startExamMutation({ examId });
    if (result.answers) {
      setLocalAnswers(result.answers);
    }
    return result;
  }, [startExamMutation, examId]);

  // Update a single answer (with debounced save to server)
  const updateAnswer = useCallback(
    (questionNumber: number, selectedOption: number) => {
      // Immediately update local state
      setLocalAnswers(prev => {
        const updated = { ...prev, [questionNumber]: selectedOption };

        // Store the latest answers for debounced save
        pendingSaveRef.current = updated;

        // Debounce save to server
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(async () => {
          if (session?.sessionId && pendingSaveRef.current) {
            try {
              await updateAnswersMutation({
                sessionId: session.sessionId,
                answers: pendingSaveRef.current,
              });
            } catch (error) {
              console.warn('Failed to save answers:', error);
            } finally {
              pendingSaveRef.current = null;
            }
          }
        }, 1000); // Save after 1 second of inactivity

        return updated;
      });
    },
    [session, updateAnswersMutation]
  );

  // Submit exam
  const submitExam = useCallback(async () => {
    if (!session?.sessionId) {
      throw new Error('No active session');
    }

    // Save any pending answers first
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // If there's a pending save, wait for it or use the latest answers
    const answersToSubmit = pendingSaveRef.current || localAnswers;

    return submitExamMutation({
      sessionId: session.sessionId,
      answers: answersToSubmit,
    });
  }, [session, submitExamMutation, localAnswers]);

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
      pendingSaveRef.current = null;
    };
  }, []);

  return {
    // Session data
    session,
    sessionId: session?.sessionId,
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
