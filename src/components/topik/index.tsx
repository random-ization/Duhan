import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { TopikExam, Language, ExamAttempt, Annotation } from '../../types';
import { ExamList } from './ExamList';
import { ExamSession } from './ExamSession';
import { ExamResultView, ExamReviewView, ExamCoverView } from './ExamViews';
import { useConvex } from 'convex/react';
import { TOPIK } from '../../utils/convexRefs';
import { TopikQuestionDto } from '../../../convex/topik';
import { useLayoutActions } from '../../contexts/LayoutContext';
import { getLabels } from '../../utils/i18n';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { notify } from '../../utils/notify';
import { logger } from '../../utils/logger';
import { useActivityLogger } from '../../hooks/useActivityLogger';
import { createLearningSessionId, useLearningAnalytics } from '../../hooks/useLearningAnalytics';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MobileExamSession } from '../mobile/topik/MobileExamSession';
import { MobileExamReview } from '../mobile/topik/MobileExamReview';
import { MobileExamCover } from '../mobile/topik/MobileExamCover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui';

interface TopikModuleProps {
  exams: TopikExam[];
  language: Language;
  history: ExamAttempt[];
  onSaveHistory: (attempt: ExamAttempt) => void;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
  canAccessContent?: (content: any) => boolean;
  onShowUpgradePrompt?: () => void;
  upgradePromptLoading?: boolean;
  onDeleteHistory?: (id: string) => void;
  initialView?: 'LIST' | 'HISTORY_LIST';
}

type TopikView = 'LIST' | 'HISTORY_LIST' | 'COVER' | 'EXAM' | 'RESULT' | 'REVIEW';

const getPathWithoutLanguage = (pathname: string): string => {
  const pathSegments = pathname.split('/').filter(Boolean);
  const first = pathSegments[0];
  if (first && ['en', 'zh', 'vi', 'mn'].includes(first)) {
    return `/${pathSegments.slice(1).join('/')}`;
  }
  return pathname;
};

const routeForView = (view: TopikView, examId?: string): string | null => {
  if (view === 'LIST') return '/topik';
  if (view === 'HISTORY_LIST') return '/topik/history';
  if (!examId) return null;
  if (view === 'COVER') return `/topik/${examId}`;
  if (view === 'EXAM') return `/topik/${examId}/exam`;
  if (view === 'RESULT') return `/topik/${examId}/result`;
  if (view === 'REVIEW') return `/topik/${examId}/review`;
  return null;
};

const ExitExamConfirmDialog = ({
  open,
  onOpenChange,
  onConfirm,
  labels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  labels: ReturnType<typeof getLabels>;
}) => (
  <AlertDialog open={open} onOpenChange={onOpenChange}>
    <AlertDialogContent className="max-w-md border-2 border-foreground rounded-2xl shadow-pop">
      <AlertDialogHeader>
        <AlertDialogTitle className="font-black text-foreground">
          {labels.dashboard?.topik?.confirmEndTitle || 'End exam now?'}
        </AlertDialogTitle>
        <AlertDialogDescription className="text-sm font-semibold text-muted-foreground">
          {labels.dashboard?.topik?.confirmEnd || 'Are you sure you want to end the exam?'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter className="flex-row justify-end gap-2">
        <AlertDialogCancel onClick={() => onOpenChange(false)}>
          {labels.common?.cancel || 'Cancel'}
        </AlertDialogCancel>
        <AlertDialogAction onClick={onConfirm}>
          {labels.common?.confirm || 'Confirm'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

const TopikViewRenderer = ({
  view,
  isMobile,
  currentExam,
  examResult,
  exams,
  history,
  language,
  userAnswers,
  timeLeft,
  timerActive,
  annotations,
  showExitConfirm,
  onSetShowExitConfirm,
  onSelectExam,
  onToggleHistory,
  onReviewAttempt,
  canAccessContent,
  onShowUpgradePrompt,
  upgradePromptLoading,
  onDeleteHistory,
  onStartExam,
  onResetExam,
  onAnswerChange,
  onSubmitExam,
  onRequestExitExam,
  onConfirmExitExam,
  onSaveAnnotation,
  onDeleteAnnotation,
  onPauseTimer,
  onResumeTimer,
  onReviewResult,
  onTryAgain,
  labels,
}: {
  view: TopikView;
  isMobile: boolean;
  currentExam: TopikExam | null;
  examResult: {
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  } | null;
  exams: TopikExam[];
  history: ExamAttempt[];
  language: Language;
  userAnswers: Record<number, number>;
  timeLeft: number;
  timerActive: boolean;
  annotations: Annotation[];
  showExitConfirm: boolean;
  onSetShowExitConfirm: (open: boolean) => void;
  onSelectExam: (exam: TopikExam) => void;
  onToggleHistory: () => void;
  onReviewAttempt: (attempt?: ExamAttempt) => void;
  canAccessContent?: (content: any) => boolean;
  onShowUpgradePrompt?: () => void;
  upgradePromptLoading?: boolean;
  onDeleteHistory?: (id: string) => void;
  onStartExam: () => void;
  onResetExam: () => void;
  onAnswerChange: (questionIndex: number, optionIndex: number) => void;
  onSubmitExam: () => void;
  onRequestExitExam: () => void;
  onConfirmExitExam: () => void;
  onSaveAnnotation: (annotation: Annotation) => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onPauseTimer: () => void;
  onResumeTimer: () => void;
  onReviewResult: () => void;
  onTryAgain: () => void;
  labels: ReturnType<typeof getLabels>;
}) => {
  if (view === 'LIST') {
    return (
      <ExamList
        exams={exams}
        history={history}
        language={language}
        onSelectExam={onSelectExam}
        onViewHistory={onToggleHistory}
        onReviewAttempt={onReviewAttempt}
        canAccessContent={canAccessContent}
        onShowUpgradePrompt={onShowUpgradePrompt}
        upgradeLoading={upgradePromptLoading}
        onDeleteAttempt={onDeleteHistory}
      />
    );
  }

  if (view === 'HISTORY_LIST') {
    return (
      <ExamList
        exams={exams}
        history={history}
        language={language}
        onSelectExam={onSelectExam}
        onViewHistory={onToggleHistory}
        onReviewAttempt={onReviewAttempt}
        showHistoryView={true}
        onBack={onToggleHistory}
        canAccessContent={canAccessContent}
        onShowUpgradePrompt={onShowUpgradePrompt}
        upgradeLoading={upgradePromptLoading}
        onDeleteAttempt={onDeleteHistory}
      />
    );
  }

  if (!currentExam) return null;

  if (view === 'COVER') {
    if (isMobile) {
      return (
        <MobileExamCover
          exam={currentExam}
          language={language}
          onStart={onStartExam}
          onBack={onResetExam}
        />
      );
    }
    return (
      <ExamCoverView
        exam={currentExam}
        language={language}
        onStart={onStartExam}
        onBack={onResetExam}
        hasAttempted={history.some(h => h.examId === currentExam.id)}
      />
    );
  }

  if (view === 'EXAM') {
    return (
      <>
        {isMobile ? (
          <MobileExamSession
            exam={currentExam}
            language={language}
            userAnswers={userAnswers}
            timeLeft={timeLeft}
            timerActive={timerActive}
            onAnswerChange={onAnswerChange}
            onSubmit={onSubmitExam}
            onExit={onRequestExitExam}
          />
        ) : (
          <ExamSession
            exam={currentExam}
            language={language}
            userAnswers={userAnswers}
            timeLeft={timeLeft}
            timerActive={timerActive}
            annotations={annotations}
            onAnswerChange={onAnswerChange}
            onSubmit={onSubmitExam}
            onExit={onRequestExitExam}
            onSaveAnnotation={onSaveAnnotation}
            onDeleteAnnotation={onDeleteAnnotation}
            onPauseTimer={onPauseTimer}
            onResumeTimer={onResumeTimer}
          />
        )}
        <ExitExamConfirmDialog
          open={showExitConfirm}
          onOpenChange={onSetShowExitConfirm}
          onConfirm={onConfirmExitExam}
          labels={labels}
        />
      </>
    );
  }

  if (view === 'RESULT' && examResult) {
    return (
      <ExamResultView
        exam={currentExam}
        result={examResult}
        language={language}
        onReview={onReviewResult}
        onTryAgain={onTryAgain}
        onBackToList={onResetExam}
      />
    );
  }

  if (view === 'REVIEW') {
    if (isMobile) {
      return (
        <MobileExamReview
          exam={currentExam}
          userAnswers={userAnswers}
          language={language}
          onBack={onResetExam}
          onReset={onTryAgain}
        />
      );
    }
    return (
      <ExamReviewView
        exam={currentExam}
        userAnswers={userAnswers}
        language={language}
        annotations={annotations}
        onSaveAnnotation={onSaveAnnotation}
        onDeleteAnnotation={onDeleteAnnotation}
        onBack={onResetExam}
      />
    );
  }

  return null;
};

export const TopikModule: React.FC<TopikModuleProps> = ({
  exams,
  language,
  history,
  onSaveHistory,
  annotations,
  onSaveAnnotation,
  canAccessContent,
  onShowUpgradePrompt,
  upgradePromptLoading,
  onDeleteHistory,
  initialView = 'LIST',
}) => {
  const location = useLocation();
  const { examId, view: urlView } = useParams<{ examId?: string; view?: string }>();
  const navigate = useLocalizedNavigate();
  const convex = useConvex();
  const { setSidebarHidden } = useLayoutActions();
  const { logActivity } = useActivityLogger();
  const { trackLearningEvent } = useLearningAnalytics();
  const isMobile = useIsMobile();
  const labels = getLabels(language);

  const [view, setView] = useState<TopikView>(initialView);
  const [currentExam, setCurrentExam] = useState<TopikExam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [examResult, setExamResult] = useState<{
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const questionCacheRef = useRef<Map<string, TopikQuestionDto[]>>(new Map());
  const examSessionIdRef = useRef<string | null>(null);
  const pathWithoutLang = getPathWithoutLanguage(location.pathname);
  const isHistoryPath = pathWithoutLang === '/topik/history';

  // Custom handleSetView that also updates URL
  const handleSetView = useCallback(
    (newView: typeof view) => {
      setView(newView);
      const route = routeForView(newView, currentExam?.id);
      if (route) navigate(route);
    },
    [navigate, currentExam]
  );

  const fetchQuestions = useCallback(
    async (examId: string): Promise<TopikQuestionDto[]> => {
      const cached = questionCacheRef.current.get(examId);
      if (cached) return cached;
      const questions = await convex.query(TOPIK.getExamQuestions, { examId });
      const resolved = questions || [];
      questionCacheRef.current.set(examId, resolved);
      return resolved;
    },
    [convex]
  );

  useEffect(() => {
    if (exams.length === 0) return;
    if (typeof globalThis.window === 'undefined') return;

    const firstExamId = exams[0]?.id;
    if (!firstExamId || questionCacheRef.current.has(firstExamId)) return;

    const prefetch = () => {
      void fetchQuestions(firstExamId).catch(() => {
        // Silent prefetch failure; on-demand load still works.
      });
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const idleWindow = globalThis.window as IdleWindow;
    let idleId: number | null = null;
    let timeoutId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(prefetch, { timeout: 1500 });
    } else {
      timeoutId = globalThis.window.setTimeout(prefetch, 800);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timeoutId !== null) {
        globalThis.window.clearTimeout(timeoutId);
      }
    };
  }, [exams, fetchQuestions]);

  const selectExamFromUrl = useCallback(
    async (exam: TopikExam, viewParam?: string) => {
      setLoading(true);
      try {
        let fullQuestions: TopikQuestionDto[] = await fetchQuestions(exam.id);
        if (!fullQuestions) fullQuestions = [];

        const fullExam = { ...exam, questions: fullQuestions };
        setCurrentExam(fullExam as TopikExam);
        setUserAnswers({});
        setTimeLeft(exam.timeLimit * 60);

        if (viewParam === 'exam') {
          setView('EXAM');
          setTimerActive(true);
        } else if (viewParam === 'result') {
          setView('RESULT');
        } else if (viewParam === 'review') {
          setView('REVIEW');
        } else {
          setView('COVER');
          // Hide sidebar for cover page
          setSidebarHidden(true);
        }
      } catch (error) {
        console.error('Failed to load exam:', error);
      } finally {
        setLoading(false);
      }
    },
    [fetchQuestions, setSidebarHidden]
  );

  // Sync URL params with view on mount
  useEffect(() => {
    if (isHistoryPath && !examId) {
      setCurrentExam(null);
      setUserAnswers({});
      setTimerActive(false);
      setExamResult(null);
      setView('HISTORY_LIST');
      setSidebarHidden(false);
      return;
    }

    if (examId && !currentExam) {
      // Need to load exam from URL
      const exam = exams.find(e => e.id === examId);
      if (exam) {
        // Load exam and set view based on URL
        selectExamFromUrl(exam, urlView);
      }
    } else if (!examId && view !== 'LIST' && view !== 'HISTORY_LIST') {
      setView(initialView);
    }
  }, [
    examId,
    urlView,
    exams,
    currentExam,
    view,
    selectExamFromUrl,
    isHistoryPath,
    initialView,
    setSidebarHidden,
  ]);

  const submitExam = useCallback(() => {
    setTimerActive(false);
    if (!currentExam) return;

    let score = 0;
    let totalScore = 0;
    let correctCount = 0;

    const questions = currentExam.questions || [];

    questions.forEach((q, idx) => {
      const questionScore = q.score || 2;
      totalScore += questionScore;
      if (userAnswers[idx] === q.correctAnswer) {
        score += questionScore;
        correctCount++;
      }
    });

    setExamResult({
      score,
      totalScore,
      correctCount,
      totalQuestions: questions.length,
    });

    const timeSpentSeconds = Math.max(0, currentExam.timeLimit * 60 - timeLeft);
    const attempt: ExamAttempt = {
      id: Date.now().toString(),
      examId: currentExam.id,
      examTitle: currentExam.title,
      score,
      maxScore: totalScore,
      totalScore,
      correctCount,
      totalQuestions: questions.length,
      duration: timeSpentSeconds,
      sessionId: examSessionIdRef.current || undefined,
      timestamp: Date.now(),
      userAnswers,
    };
    onSaveHistory(attempt);
    const minutes = Math.max(1, Math.round(timeSpentSeconds / 60));
    logActivity('EXAM', minutes, questions.length, {
      sessionId: examSessionIdRef.current || undefined,
      surface: 'TOPIK',
      contentId: currentExam.id,
      examId: currentExam.id,
      examType: currentExam.type,
      score,
      accuracy: totalScore > 0 ? (score / totalScore) * 100 : undefined,
      result: timeLeft === 0 ? 'auto_submitted' : 'submitted',
    });
    void trackLearningEvent({
      sessionId: examSessionIdRef.current || createLearningSessionId(`topik-${currentExam.id}`),
      module: 'EXAM',
      surface: 'TOPIK',
      contentId: currentExam.id,
      eventName: timeLeft === 0 ? 'exam_auto_submitted' : 'exam_submitted',
      durationSec: timeSpentSeconds,
      itemCount: questions.length,
      score,
      accuracy: totalScore > 0 ? (score / totalScore) * 100 : undefined,
      result: timeLeft === 0 ? 'auto_submitted' : 'submitted',
      source: 'topik_module',
      metadata: {
        correctCount,
      },
    });

    setView('RESULT');
    setSidebarHidden(false);
    examSessionIdRef.current = null;
  }, [
    currentExam,
    logActivity,
    onSaveHistory,
    setSidebarHidden,
    setView,
    timeLeft,
    trackLearningEvent,
    userAnswers,
  ]);

  const handleRequestExitExam = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const handleConfirmExitExam = useCallback(() => {
    setShowExitConfirm(false);
    submitExam();
  }, [submitExam]);

  // Timer logic
  React.useEffect(() => {
    let interval: number;
    if (timerActive && timeLeft > 0) {
      interval = globalThis.window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      submitExam();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft, submitExam]);

  const selectExam = async (exam: TopikExam) => {
    // Permission check.
    if (canAccessContent && !canAccessContent(exam)) {
      onShowUpgradePrompt?.();
      return;
    }

    // Hide sidebar for full page experience
    setSidebarHidden(true);

    setLoading(true); // Begin loading.
    try {
      let fullQuestions: TopikQuestionDto[] = await fetchQuestions(exam.id);

      // Keep an empty fallback to avoid blank screen when no questions are returned.
      if (!fullQuestions) {
        fullQuestions = [];
        logger.warn('No questions found for this exam');
      }

      // Build full exam payload with loaded questions.
      const fullExam = {
        ...exam,
        questions: fullQuestions,
      };

      setCurrentExam(fullExam as TopikExam);
      setUserAnswers({});
      setTimeLeft(exam.timeLimit * 60);
      // Navigate to cover page (sets both URL and internal state)
      setView('COVER');
      navigate(`/topik/${exam.id}`);
    } catch (error) {
      logger.error('Failed to load exam content:', error);
      notify.error(labels.dashboard?.topik?.examLoadError || 'Failed to load exam content.');
      setSidebarHidden(false); // Restore sidebar if loading fails
    } finally {
      setLoading(false); // End loading.
    }
  };

  const startExam = () => {
    setSidebarHidden(true); // Hide sidebar when exam starts
    examSessionIdRef.current = createLearningSessionId(`topik-${currentExam?.id || 'exam'}`);
    if (currentExam) {
      void trackLearningEvent({
        sessionId: examSessionIdRef.current,
        module: 'EXAM',
        surface: 'TOPIK',
        contentId: currentExam.id,
        eventName: 'exam_started',
        source: 'topik_module',
        metadata: {
          examType: currentExam.type,
          questionCount: currentExam.questions?.length || 0,
        },
      });
    }
    setTimerActive(true);
    handleSetView('EXAM');
  };

  const reviewExam = useCallback(
    async (attempt?: ExamAttempt) => {
      if (attempt) {
        const exam = exams.find(e => e.id === attempt.examId);
        if (exam) {
          setLoading(true);
          try {
            // Load full questions from API
            let fullQuestions: TopikQuestionDto[] = await fetchQuestions(exam.id);
            if (!fullQuestions) fullQuestions = [];

            const fullExam = { ...exam, questions: fullQuestions };
            setCurrentExam(fullExam as TopikExam);
            setUserAnswers(attempt.userAnswers);
            setView('REVIEW');
            navigate(`/topik/${exam.id}/review`);
          } catch (error) {
            logger.error('Failed to load exam for review:', error);
            notify.error(labels.dashboard?.topik?.examLoadError || 'Failed to load exam.');
          } finally {
            setLoading(false);
          }
          return;
        }
      }
      setView('REVIEW');
    },
    [exams, fetchQuestions, labels.dashboard?.topik?.examLoadError, navigate]
  );

  const resetExam = () => {
    setSidebarHidden(false); // Restore sidebar
    examSessionIdRef.current = null;
    setCurrentExam(null);
    setUserAnswers({});
    setTimeLeft(0);
    setTimerActive(false);
    setExamResult(null);
    handleSetView('LIST');
  };

  const handleAnswerChange = (questionIndex: number, optionIndex: number) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleSaveAnnotation = (annotation: Annotation) => {
    onSaveAnnotation(annotation);
  };

  const handleDeleteAnnotation = (annotationId: string) => {
    // Find the annotation to delete
    const toDelete = annotations.find(a => a.id === annotationId);
    if (!toDelete) return;

    // Create a "delete" annotation by saving with empty note and null color
    const deleteAnnotation: Annotation = {
      ...toDelete,
      note: '',
      color: null,
    };
    onSaveAnnotation(deleteAnnotation);
  };

  const pauseTimer = () => setTimerActive(false);
  const resumeTimer = () => timeLeft > 0 && setTimerActive(true);
  const handleToggleHistory = useCallback(() => {
    handleSetView(view === 'HISTORY_LIST' ? 'LIST' : 'HISTORY_LIST');
  }, [handleSetView, view]);
  const handleTryAgain = useCallback(() => {
    if (!currentExam) return;
    setUserAnswers({});
    setTimeLeft(currentExam.timeLimit * 60);
    setExamResult(null);
    handleSetView('COVER');
  }, [currentExam, handleSetView]);
  const handleReviewResult = useCallback(() => {
    void reviewExam();
  }, [reviewExam]);

  // Loading screen.
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {/* Spinner fallback */}
        <div className="animate-spin text-indigo-600">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        </div>
        <p className="text-muted-foreground font-medium text-lg">
          {labels.dashboard?.topik?.loadingExam || 'Downloading exam data...'}
        </p>
      </div>
    );
  }

  return (
    <TopikViewRenderer
      view={view}
      isMobile={isMobile}
      currentExam={currentExam}
      examResult={examResult}
      exams={exams}
      history={history}
      language={language}
      userAnswers={userAnswers}
      timeLeft={timeLeft}
      timerActive={timerActive}
      annotations={annotations}
      showExitConfirm={showExitConfirm}
      onSetShowExitConfirm={setShowExitConfirm}
      onSelectExam={selectExam}
      onToggleHistory={handleToggleHistory}
      onReviewAttempt={reviewExam}
      canAccessContent={canAccessContent}
      onShowUpgradePrompt={onShowUpgradePrompt}
      upgradePromptLoading={upgradePromptLoading}
      onDeleteHistory={onDeleteHistory}
      onStartExam={startExam}
      onResetExam={resetExam}
      onAnswerChange={handleAnswerChange}
      onSubmitExam={submitExam}
      onRequestExitExam={handleRequestExitExam}
      onConfirmExitExam={handleConfirmExitExam}
      onSaveAnnotation={handleSaveAnnotation}
      onDeleteAnnotation={handleDeleteAnnotation}
      onPauseTimer={pauseTimer}
      onResumeTimer={resumeTimer}
      onReviewResult={handleReviewResult}
      onTryAgain={handleTryAgain}
      labels={labels}
    />
  );
};

export default TopikModule;
