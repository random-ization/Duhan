import React, { useState } from 'react';
import { TopikExam, Language, ExamAttempt, Annotation } from '../../types';
import { ExamList } from './ExamList';
import { ExamSession } from './ExamSession';
import { ExamResultView, ExamReviewView, ExamCoverView } from './ExamViews';

interface TopikModuleProps {
  exams: TopikExam[];
  language: Language;
  history: ExamAttempt[];
  onSaveHistory: (attempt: ExamAttempt) => void;
  annotations: Annotation[];
  onSaveAnnotation: (annotation: Annotation) => void;
  canAccessContent?: (content: any) => boolean;
  onShowUpgradePrompt?: () => void;
}

export const TopikModule: React.FC<TopikModuleProps> = ({
  exams,
  language,
  history,
  onSaveHistory,
  annotations,
  onSaveAnnotation,
  canAccessContent,
  onShowUpgradePrompt,
}) => {
  const [view, setView] = useState<
    'LIST' | 'HISTORY_LIST' | 'COVER' | 'EXAM' | 'RESULT' | 'REVIEW'
  >('LIST');
  const [currentExam, setCurrentExam] = useState<TopikExam | null>(null);
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [currentReviewAttempt, setCurrentReviewAttempt] = useState<ExamAttempt | null>(null);
  const [examResult, setExamResult] = useState<{
    score: number;
    totalScore: number;
    correctCount: number;
    totalQuestions: number;
  } | null>(null);

  // Timer logic
  React.useEffect(() => {
    let interval: number;
    if (timerActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && timerActive) {
      submitExam();
    }
    return () => clearInterval(interval);
  }, [timerActive, timeLeft]);

  const selectExam = (exam: TopikExam) => {
    if (canAccessContent && !canAccessContent(exam)) {
      onShowUpgradePrompt?.();
      return;
    }

    setCurrentExam(exam);
    setUserAnswers({});
    setTimeLeft(exam.timeLimit * 60);
    setView('COVER');
  };

  const startExam = () => {
    setTimerActive(true);
    setView('EXAM');
  };

  const submitExam = () => {
    setTimerActive(false);
    if (!currentExam) return;

    // Calculate Score
    let score = 0;
    let totalScore = 0;
    let correctCount = 0;

    currentExam.questions.forEach((q, idx) => {
      totalScore += q.points;
      if (userAnswers[idx] === q.correctAnswer) {
        score += q.points;
        correctCount++;
      }
    });

    setExamResult({
      score,
      totalScore,
      correctCount,
      totalQuestions: currentExam.questions.length,
    });

    // Save to history
    const attempt: ExamAttempt = {
      id: Date.now().toString(),
      examId: currentExam.id,
      examTitle: currentExam.title,
      score,
      maxScore: totalScore,
      totalScore,
      correctCount,
      timestamp: Date.now(),
      userAnswers,
    };
    onSaveHistory(attempt);

    setView('RESULT');
  };

  const reviewExam = (attempt?: ExamAttempt) => {
    if (attempt) {
      setCurrentReviewAttempt(attempt);
      const exam = exams.find(e => e.id === attempt.examId);
      if (exam) {
        setCurrentExam(exam);
        setUserAnswers(attempt.userAnswers);
      }
    }
    setView('REVIEW');
  };

  const resetExam = () => {
    setCurrentExam(null);
    setUserAnswers({});
    setTimeLeft(0);
    setTimerActive(false);
    setExamResult(null);
    setCurrentReviewAttempt(null);
    setView('LIST');
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

  const handleDeleteAnnotation = (contextKey: string) => {
    // Create a "delete" annotation by saving with empty note
    const deleteAnnotation: Annotation = {
      id: Date.now().toString(),
      contextKey,
      text: '',
      note: '',
      color: null, // Delete annotation
      timestamp: Date.now(),
    };
    onSaveAnnotation(deleteAnnotation);
  };

  const pauseTimer = () => setTimerActive(false);
  const resumeTimer = () => timeLeft > 0 && setTimerActive(true);

  // View Rendering
  if (view === 'LIST') {
    return (
      <ExamList
        exams={exams}
        history={history}
        language={language}
        onSelectExam={selectExam}
        onViewHistory={() => setView('HISTORY_LIST')}
        onReviewAttempt={reviewExam}
        canAccessContent={canAccessContent}
      />
    );
  }

  if (view === 'HISTORY_LIST') {
    return (
      <ExamList
        exams={exams}
        history={history}
        language={language}
        onSelectExam={selectExam}
        onViewHistory={() => setView('LIST')}
        onReviewAttempt={reviewExam}
        showHistoryView={true}
        onBack={() => setView('LIST')}
        canAccessContent={canAccessContent}
      />
    );
  }

  if (view === 'COVER' && currentExam) {
    return (
      <ExamCoverView
        exam={currentExam}
        language={language}
        onStart={startExam}
        onBack={resetExam}
      />
    );
  }

  if (view === 'EXAM' && currentExam) {
    return (
      <ExamSession
        exam={currentExam}
        language={language}
        userAnswers={userAnswers}
        timeLeft={timeLeft}
        timerActive={timerActive}
        annotations={annotations}
        onAnswerChange={handleAnswerChange}
        onSubmit={submitExam}
        onSaveAnnotation={handleSaveAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
        onPauseTimer={pauseTimer}
        onResumeTimer={resumeTimer}
      />
    );
  }

  if (view === 'RESULT' && currentExam && examResult) {
    return (
      <ExamResultView
        exam={currentExam}
        result={examResult}
        language={language}
        onReview={() => reviewExam()}
        onTryAgain={() => {
          setUserAnswers({});
          setTimeLeft(currentExam.timeLimit * 60);
          setExamResult(null);
          setView('COVER');
        }}
        onBackToList={resetExam}
      />
    );
  }

  if (view === 'REVIEW' && currentExam) {
    return (
      <ExamReviewView
        exam={currentExam}
        userAnswers={userAnswers}
        language={language}
        annotations={annotations}
        onSaveAnnotation={handleSaveAnnotation}
        onDeleteAnnotation={handleDeleteAnnotation}
        onBack={resetExam}
      />
    );
  }

  return null;
};

export default TopikModule;
