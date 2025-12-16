import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  onDeleteHistory?: (id: string) => void;
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
  onDeleteHistory,
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

  const [loading, setLoading] = useState(false);

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

  const selectExam = async (exam: TopikExam) => {
    // 权限检查
    if (canAccessContent && !canAccessContent(exam)) {
      onShowUpgradePrompt?.();
      return;
    }

    setLoading(true); // 开始加载
    try {
      // 始终从后端代理获取最新数据，避免缓存问题
      const { api } = await import('../../services/api');
      let fullQuestions = await api.getTopikExamQuestions(exam.id);

      // 如果还是空的，给个默认空数组防止白屏
      if (!fullQuestions) {
        fullQuestions = [];
        console.warn('Warning: No questions found for this exam');
      }

      // 组装完整的考试对象
      const fullExam = {
        ...exam,
        questions: fullQuestions
      };

      setCurrentExam(fullExam);
      setUserAnswers({});
      setTimeLeft(exam.timeLimit * 60);
      setView('COVER');

    } catch (error) {
      console.error("Failed to load exam content:", error);
      alert("无法加载试卷内容，请检查：\n1. 网络连接是否正常\n2. 服务器是否运行正常");
    } finally {
      setLoading(false); // 结束加载
    }
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
      const questionScore = q.score || 2; // Default 2 points per question
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

  // 3. 在 return 之前添加 Loading 界面
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        {/* 如果有 Loader2 图标就用这个，没有就用文字 */}
        <div className="animate-spin text-indigo-600">
          <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
        <p className="text-slate-500 font-medium text-lg">正在下载试卷数据...</p>
      </div>
    );
  }

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
        onSelectExam={selectExam}
        onViewHistory={() => setView('LIST')}
        onReviewAttempt={reviewExam}
        showHistoryView={true}
        onBack={() => setView('LIST')}
        canAccessContent={canAccessContent}
        onDeleteAttempt={onDeleteHistory}
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
        hasAttempted={history.some(h => h.examId === currentExam.id)}
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
