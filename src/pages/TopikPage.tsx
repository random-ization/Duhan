import React, { useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import TopikModule from '../components/topik';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useUserActions } from '../hooks/useUserActions';
import { useQuery } from 'convex/react';
import { Target, Clock, ArrowRight, Archive, History, Headphones, BookOpen } from 'lucide-react';
import { clsx } from 'clsx';
import BackButton from '../components/ui/BackButton';
import { useTranslation } from 'react-i18next';
import { qRef } from '../utils/convexRefs';
import { Annotation, ExamAttempt } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileTopikPage from '../components/mobile/MobileTopikPage';

// Use any here to be compatible with the restricted type in routes.tsx (TextbookContent | TopikExam)
// Defining specific union type here causes circular dependency or tight coupling with AuthContext
interface TopikPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const TopikPage: React.FC<TopikPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user, language } = useAuth();
  const { saveExamAttempt, saveAnnotation, deleteExamAttempt } = useUserActions();
  const { topikExams } = useData();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [filterType, setFilterType] = useState<'ALL' | 'READING' | 'LISTENING'>('ALL');
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? {} : 'skip'
  );
  const examHistory = examAttempts ?? [];
  const { examId } = useParams();
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathWithoutLang =
    pathSegments[0] && ['en', 'zh', 'vi', 'mn'].includes(pathSegments[0])
      ? `/${pathSegments.slice(1).join('/')}`
      : location.pathname;
  const isHistoryRoute = pathWithoutLang === '/topik/history';
  const topikAnnotations = useQuery(
    qRef<{ prefix: string; limit?: number }, Annotation[]>('annotations:getByPrefix'),
    user && examId ? { prefix: `TOPIK-${examId}`, limit: 4000 } : 'skip'
  );

  // Filter exams based on type
  const filteredExams = topikExams.filter(exam => filterType === 'ALL' || exam.type === filterType);
  // We can't use useParams readily because existing routing might not rely on it
  // But usually /topik/:examId implies params.
  // Let's assume if there is an examId passed via some mechanism or we add local state management
  // Actually, usually TopikModule handles the selection.
  // But for this Lobby, we want to SHOW the lobby if no exam is active.
  // Since we don't have deeply nested routes setup in this file, let's assume this page REPLACES the default view.
  // If the user selects an exam, we probably navigate to `/topik/:id`.
  // Current app likely uses TopikModule to list exams?
  // Let's check: "TopikModule" takes "exams" prop. It likely has a list view.
  // BUT the user wants THIS specific design.

  // Let's just implement the UI. If the user clicks "Start", we can navigate or set state.
  // Assuming the route `/topik/:examId` exists and maps to this page, we can read it.
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // If examId is present, show the actual exam module (or if TopikModule handles it)
  // For now, let's assume TopikModule handles the actual taking of the exam.
  // We will wrap it.
  if (examId || isHistoryRoute) {
    return (
      <TopikModule
        exams={topikExams}
        language={language}
        history={examHistory}
        onSaveHistory={saveExamAttempt}
        annotations={topikAnnotations ?? []}
        onSaveAnnotation={saveAnnotation}
        canAccessContent={canAccessContent}
        onShowUpgradePrompt={onShowUpgradePrompt}
        onDeleteHistory={deleteExamAttempt}
        initialView={isHistoryRoute ? 'HISTORY_LIST' : 'LIST'}
      />
    );
  }

  // Mobile Lobby View
  if (isMobile) {
    return <MobileTopikPage onSelectExam={id => navigate(`/topik/${id}`)} />;
  }

  // Desktop Lobby View
  return (
    <div
      className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/dashboard')} />
          <div>
            <h2 className="text-4xl font-black font-display text-slate-900 tracking-tight">
              {t('dashboard.topik.examCenter')}
            </h2>
            <p className="text-slate-500 font-bold">{t('dashboard.topik.realExam')}</p>
          </div>
          <img src="/emojis/Trophy.png" className="w-14 h-14 animate-bounce-slow" alt="trophy" />
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border-2 border-slate-900 shadow-pop w-fit">
          <button
            onClick={() => setFilterType('ALL')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black transition-all',
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            )}
          >
            {t('dashboard.topik.all')}
          </button>
          <button
            onClick={() => setFilterType('READING')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2',
              filterType === 'READING'
                ? 'bg-blue-600 text-white'
                : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
            )}
          >
            <BookOpen size={16} /> {t('dashboard.topik.reading')}
          </button>
          <button
            onClick={() => setFilterType('LISTENING')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2',
              filterType === 'LISTENING'
                ? 'bg-violet-600 text-white'
                : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
            )}
          >
            <Headphones size={16} /> {t('dashboard.topik.listening')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Main Exam Card */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="font-black text-xl flex items-center gap-2 text-slate-900">
              <Target size={20} /> {t('dashboard.topik.recommended')}
            </h3>

            {filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredExams.map(exam => (
                  <button
                    key={exam.id}
                    onClick={() => navigate(`/topik/${exam.id}`)}
                    className="bg-white rounded-2xl p-0 border-2 border-slate-900 shadow-pop hover:-translate-y-1 transition cursor-pointer group overflow-hidden flex flex-col md:flex-row h-auto min-h-[140px] w-full text-left"
                  >
                    <div
                      className={clsx(
                        'p-4 flex flex-col items-center justify-center text-white w-full md:w-32 shrink-0 relative overflow-hidden',
                        exam.type === 'READING' ? 'bg-slate-900' : 'bg-blue-800'
                      )}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 10px)',
                        }}
                      ></div>
                      <div className="text-3xl font-black text-yellow-400 font-display z-10">
                        {exam.round}
                      </div>
                      <div className="text-[10px] font-bold tracking-widest uppercase z-10 mt-1">
                        {exam.type === 'READING'
                          ? `TOPIK II ${t('dashboard.topik.reading')}`
                          : `TOPIK II ${t('dashboard.topik.listening')}`}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-black text-lg text-slate-900 group-hover:text-indigo-600 transition">
                            {exam.title}
                          </h4>
                          <span
                            className={clsx(
                              'text-[10px] font-black px-2 py-0.5 rounded border',
                              exam.type === 'READING'
                                ? 'bg-blue-100 text-blue-700 border-blue-200'
                                : 'bg-rose-100 text-rose-600 border-rose-200'
                            )}
                          >
                            {exam.type === 'READING'
                              ? t('dashboard.topik.reading')
                              : t('dashboard.topik.listening')}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs font-bold">
                          {t('topikLobby.roundTitle', { round: exam.round })}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                            <Clock size={12} />{' '}
                            {t('topikLobby.timeLimit', { count: exam.timeLimit })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center border-t border-slate-100 pt-3">
                        <span className="text-[10px] font-bold text-slate-400">
                          {t('dashboard.topik.clickStart')}
                        </span>
                        <button className="bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md group-hover:scale-105 transition flex items-center gap-1">
                          {t('dashboard.topik.startNow')} <ArrowRight size={12} />
                        </button>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-8 border-2 border-slate-200 text-center">
                <p className="text-slate-500 font-bold">{t('topikLobby.noExams')}</p>
              </div>
            )}
          </div>

          {/* Sidebar: Archive */}
          {/* Sidebar: Archive */}
          <div className="h-fit sticky top-6 space-y-6">
            <h3 className="font-black text-xl text-slate-900 flex items-center gap-2">
              <History size={20} /> {t('dashboard.topik.examHistory')}
            </h3>

            <div className="bg-white rounded-2xl border-2 border-slate-900 p-4 shadow-sm">
              <div className="space-y-3">
                {examHistory.length > 0 ? (
                  examHistory.slice(0, 3).map((attempt, index) => {
                    const score = attempt.score || 0;
                    const maxScore = attempt.maxScore || attempt.totalScore || 100;
                    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    const attemptKey = attempt.id || attempt.timestamp || `attempt-${index}`;
                    return (
                      <button
                        key={attemptKey}
                        onClick={() => navigate('/topik/history')}
                        className="relative bg-slate-50 p-3 rounded-xl border border-slate-200 group cursor-pointer hover:bg-white hover:border-slate-900 transition w-full text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-slate-900 text-xs">
                              {attempt.examTitle || t('topikLobby.unknownExam')}
                            </h5>
                            <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                              {attempt.timestamp
                                ? new Date(attempt.timestamp).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                          <span className="font-black text-sm text-slate-900">
                            {score}
                            <span className="text-[10px] text-slate-400">/{maxScore}</span>
                          </span>
                        </div>
                        {percentage >= 60 && (
                          <div className="absolute top-2 right-12 border border-green-600 text-green-600 text-[10px] font-black px-1 py-0 rounded rotate-[-15deg] opacity-80">
                            PASS
                          </div>
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <Archive size={24} className="mx-auto text-slate-300 mb-2" />
                    <p className="text-xs text-slate-400 font-bold">
                      {t('dashboard.topik.noHistory')}
                    </p>
                  </div>
                )}
              </div>
              {examHistory.length > 0 && (
                <button
                  onClick={() => navigate('/topik/history')}
                  className="w-full mt-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-xs text-slate-500 hover:border-slate-900 hover:text-slate-900 transition"
                >
                  {t('topikLobby.viewAllHistory')}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikPage;
