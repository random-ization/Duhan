import React, { useCallback, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import TopikModule from '../components/topik';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useUserActions } from '../hooks/useUserActions';
import { useQuery } from 'convex/react';
import { Target, Clock, ArrowRight, Archive, History, Headphones, BookOpen, PenLine } from 'lucide-react';
import { clsx } from 'clsx';
import BackButton from '../components/ui/BackButton';
import { useTranslation } from 'react-i18next';
import { qRef } from '../utils/convexRefs';
import { api } from '../../convex/_generated/api';
import { Annotation, ExamAttempt } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import MobileTopikPage from '../components/mobile/MobileTopikPage';
import { Button } from '../components/ui';

const TopikPage: React.FC = () => {
  const { user, language, canAccessContent, setShowUpgradePrompt } = useAuth();
  const { saveExamAttempt, saveAnnotation, deleteExamAttempt } = useUserActions();
  const { topikExams } = useData();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [now] = React.useState(() => Date.now());
  const [filterType, setFilterType] = useState<'READING' | 'LISTENING' | 'WRITING'>('READING');
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? {} : 'skip'
  );

  const writingSessions = useQuery(
    api.topikWriting.getUserSessions,
    user ? {} : 'skip'
  );

  const examHistory = React.useMemo(() => {
    return [...(examAttempts ?? []), ...(writingSessions ?? [])] as ExamAttempt[];
  }, [examAttempts, writingSessions]);
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
  const onShowUpgradePrompt = useCallback(() => setShowUpgradePrompt(true), [setShowUpgradePrompt]);

  // Compute top score from exam history
  const topScore = examHistory.length > 0 ? Math.max(...examHistory.map(e => e.score || 0)) : 0;
  const totalAttempts = examHistory.length;

  // Filter exams based on type
  const filteredExams = topikExams.filter(exam => exam.type === filterType);
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
      className="min-h-screen bg-background p-6 md:p-12 font-sans pb-32"
      style={{
        backgroundImage: 'radial-gradient(hsl(var(--border) / 0.75) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/dashboard?view=practice')} />
          <div>
            <h2 className="text-4xl font-black font-display text-foreground tracking-tight">
              {t('dashboard.topik.examCenter')}
            </h2>
            <p className="text-muted-foreground font-bold">{t('dashboard.topik.realExam')}</p>
          </div>
          <img src="/emojis/Trophy.png" className="w-14 h-14 animate-bounce-slow" alt="trophy" />
        </div>

        {/* ─── TOPIK Stats Card ─── */}
        {(() => {
          const oneDayMs = 86400000;

          // Core stats
          const scores = examHistory.map(e => e.score || 0);
          const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 : 0;
          const passCount = scores.filter(s => s >= 60).length;
          const passRate = scores.length > 0 ? Math.round((passCount / scores.length) * 100) : 0;

          // Subject breakdown — join with topikExams to get type
          const examTypeMap = new Map(topikExams.map(e => [e.id, e.type]));
          const readingAttempts = examHistory.filter(e => examTypeMap.get(e.examId) === 'READING');
          const listeningAttempts = examHistory.filter(e => examTypeMap.get(e.examId) === 'LISTENING');
          const writingAttempts = examHistory.filter(e => examTypeMap.get(e.examId) === 'WRITING');

          const readingBest = readingAttempts.length > 0 ? Math.max(...readingAttempts.map(e => e.score || 0)) : 0;
          const listeningBest = listeningAttempts.length > 0 ? Math.max(...listeningAttempts.map(e => e.score || 0)) : 0;
          const writingBest = writingAttempts.length > 0 ? Math.max(...writingAttempts.map(e => e.score || 0)) : 0;

          const maxScore = 100;

          // Recent trend: last 5 scores direction
          const recent5 = [...examHistory]
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
            .slice(0, 5)
            .map(e => e.score || 0)
            .reverse();
          const trendUp = recent5.length >= 2 && recent5[recent5.length - 1] >= recent5[0];

          // Days since last attempt
          const lastTimestamp = examHistory.length > 0
            ? Math.max(...examHistory.map(e => e.timestamp || 0))
            : 0;
          const daysSince = lastTimestamp > 0 ? Math.floor((now - lastTimestamp) / oneDayMs) : -1;

          // Recommended next exam (one user hasn't done)
          const attemptedIds = new Set(examHistory.map(e => e.examId));
          const recommended = topikExams.find(e => !attemptedIds.has(e.id));

          // Reminder urgency
          const reminderLevel = daysSince < 0 ? 'none' : daysSince <= 2 ? 'good' : daysSince <= 6 ? 'warn' : 'danger';
          const reminderColors = {
            none: 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-400/20 text-blue-700 dark:text-blue-300',
            good: 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-400/20 text-emerald-700 dark:text-emerald-300',
            warn: 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-400/20 text-amber-700 dark:text-amber-300',
            danger: 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-400/20 text-rose-700 dark:text-rose-300',
          }[reminderLevel];
          const reminderIcon = { none: '✨', good: '🟢', warn: '🟡', danger: '🔴' }[reminderLevel];
          const reminderMsg =
            daysSince < 0
              ? t('topikLobby.reminder.firstTime', { defaultValue: 'Start your first TOPIK simulation!' })
              : daysSince <= 2
                ? t('topikLobby.reminder.good', { defaultValue: "Great streak! Keep the momentum." })
                : daysSince <= 6
                  ? t('topikLobby.reminder.warn', { count: daysSince, defaultValue: `${daysSince} days since last practice — stay sharp!` })
                  : t('topikLobby.reminder.danger', { count: daysSince, defaultValue: `${daysSince} days away — memory may have faded!` });

          return (
            <div className="rounded-2xl border-2 border-border bg-card shadow-sm overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">

                {/* ── Panel 1: Core Stats ── */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <img src="/emojis/Trophy.png" className="w-8 h-8" alt="trophy" />
                    <span className="font-black text-sm text-foreground uppercase tracking-wider">
                      {t('topikLobby.statsTitle', { defaultValue: 'My Stats' })}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: t('dashboard.topik.bestLabel', { defaultValue: 'Best Score' }), value: topScore, color: 'text-amber-600 dark:text-amber-300' },
                      { label: t('topikLobby.avgScore', { defaultValue: 'Avg. Score' }), value: avgScore, color: 'text-indigo-600 dark:text-indigo-300' },
                      { label: t('topikLobby.passRate', { defaultValue: 'Pass Rate' }), value: `${passRate}%`, color: passRate >= 60 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-500 dark:text-rose-400' },
                      { label: t('dashboard.topik.totalAttempts', { defaultValue: 'Attempts' }), value: totalAttempts, color: 'text-foreground' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-muted rounded-xl p-3 text-center">
                        <div className={`text-2xl font-black ${color}`}>{value}</div>
                        <div className="text-[10px] font-bold text-muted-foreground mt-0.5 uppercase tracking-wide">{label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── Panel 2: Subject Breakdown ── */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📊</span>
                    <span className="font-black text-sm text-foreground uppercase tracking-wider">
                      {t('topikLobby.breakdown', { defaultValue: 'Subject Breakdown' })}
                    </span>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: t('dashboard.topik.reading', { defaultValue: 'Reading' }), best: readingBest, attempts: readingAttempts.length, color: 'bg-blue-500' },
                      { label: t('dashboard.topik.listening', { defaultValue: 'Listening' }), best: listeningBest, attempts: listeningAttempts.length, color: 'bg-violet-500' },
                      { label: t('dashboard.topik.writing', { defaultValue: 'Writing' }), best: writingBest, attempts: writingAttempts.length, color: 'bg-emerald-500' },
                    ].map(({ label, best, attempts, color }) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold text-foreground">{label}</span>
                          <span className="text-xs font-bold text-muted-foreground">
                            {attempts > 0 ? `${t('dashboard.topik.bestLabel', { defaultValue: 'Best' })}: ${best}` : t('topikLobby.notTried', { defaultValue: 'Not tried' })}
                          </span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${color} transition-all duration-700`}
                            style={{ width: attempts > 0 ? `${Math.min(100, (best / maxScore) * 100)}%` : '0%' }}
                          />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1 font-medium">
                          {attempts > 0
                            ? t('topikLobby.subjectAttempts', { count: attempts, defaultValue: `${attempts} attempts` })
                            : t('topikLobby.tryThisSection', { defaultValue: '← Try this section!' })}
                        </div>
                      </div>
                    ))}
                  </div>
                  {recent5.length >= 2 && (
                    <div className={`text-xs font-bold mt-2 flex items-center gap-1.5 ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                      {trendUp ? '↗' : '↘'} {trendUp
                        ? t('topikLobby.trendUp', { defaultValue: 'Score improving in last 5 attempts' })
                        : t('topikLobby.trendDown', { defaultValue: 'Score declining — focus on weak areas' })}
                    </div>
                  )}
                </div>

                {/* ── Panel 3: Reminder ── */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💡</span>
                    <span className="font-black text-sm text-foreground uppercase tracking-wider">
                      {t('topikLobby.todayTitle', { defaultValue: "Today's Tip" })}
                    </span>
                  </div>
                  <div className={`rounded-xl border p-3 text-sm font-medium ${reminderColors}`}>
                    {reminderIcon} {reminderMsg}
                  </div>
                  {recommended ? (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        {t('topikLobby.recommended', { defaultValue: 'Recommended' })}
                      </p>
                      <button
                        onClick={() => navigate(`/topik/${recommended.id}`)}
                        className="w-full flex items-center justify-between bg-primary text-primary-foreground rounded-xl px-4 py-3 font-bold text-sm hover:opacity-90 transition group"
                      >
                        <span>{recommended.title}</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </button>
                      <p className="text-[10px] text-muted-foreground font-medium text-center">
                        {t('topikLobby.estimatedTime', { defaultValue: 'Est. time:' })} {recommended.timeLimit} {t('topikLobby.minutes', { defaultValue: 'min' })}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-2xl mb-1">🎉</div>
                      <p className="text-xs font-bold text-muted-foreground">
                        {t('topikLobby.allDone', { defaultValue: "You've tried all available exams!" })}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })()}


        {/* Filter Buttons */}
        <div className="flex items-center gap-2 bg-card p-1.5 rounded-xl border-2 border-foreground shadow-pop w-fit">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setFilterType('READING')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2',
              filterType === 'READING'
                ? 'bg-blue-600 dark:bg-blue-500 text-white dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-blue-600 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-500/15'
            )}
          >
            <BookOpen size={16} /> {t('dashboard.topik.reading')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setFilterType('LISTENING')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2',
              filterType === 'LISTENING'
                ? 'bg-violet-600 dark:bg-violet-500 text-white dark:text-primary-foreground'
                : 'text-muted-foreground hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-500/15'
            )}
          >
            <Headphones size={16} /> {t('dashboard.topik.listening')}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => setFilterType('WRITING')}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-black transition-all flex items-center gap-2',
              filterType === 'WRITING'
                ? 'bg-rose-500 dark:bg-rose-500 text-white'
                : 'text-muted-foreground hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-500/15'
            )}
          >
            <PenLine size={16} /> {t('dashboard.topik.writing')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Writing Exam Grid */}
          <div className="md:col-span-2 space-y-6">
            <h3 className="font-black text-xl flex items-center gap-2 text-foreground">
              <Target size={20} />{' '}
              {filterType === 'WRITING'
                ? t('dashboard.topik.writingMockExams')
                : t('dashboard.topik.recommended')}
            </h3>

            {filterType === 'WRITING' ? (
              // Writing exams: use topikExams with type WRITING, or show placeholder
              (() => {
                const writingExams = topikExams.filter(e => (e.type as string) === 'WRITING');
                if (writingExams.length === 0) {
                  // Placeholder card using a synthetic entry
                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => alert(t('dashboard.topik.writingComingSoon'))}
                        className="flex items-stretch text-left bg-card rounded-2xl border-2 border-foreground shadow-pop hover:-translate-y-1 transition cursor-pointer group overflow-hidden min-h-[140px] w-full"
                      >
                        <div className="p-4 flex flex-col items-center justify-center text-white w-32 shrink-0 relative overflow-hidden bg-rose-500">
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 2px,transparent 2px,transparent 10px)' }}
                          />
                          <div className="text-3xl font-black text-yellow-300 font-display z-10"><PenLine size={28} /></div>
                          <div className="text-[10px] font-bold tracking-widest uppercase z-10 mt-1">
                            {t('dashboard.topik.writingCardLabel')}
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-black text-lg text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-300 transition">
                              {t('dashboard.topik.writingMockTitle')}
                            </h4>
                            <p className="text-xs font-bold text-muted-foreground mt-1">
                              {t('dashboard.topik.writingMockDesc')}
                            </p>
                            <div className="flex gap-3 mt-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                <Clock size={12} /> {t('topikLobby.timeLimit', { count: 50 })}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-between items-center border-t border-border pt-3">
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {t('dashboard.topik.clickStart')}
                            </span>
                            <span className="bg-rose-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md group-hover:scale-105 transition inline-flex items-center gap-1">
                              {t('dashboard.topik.startWriting')} <ArrowRight size={12} />
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {writingExams.map(exam => (
                      <button
                        key={exam.id}
                        type="button"
                        onClick={() => navigate(`/topik/writing/${exam.id}`)}
                        className="flex items-stretch text-left bg-card rounded-2xl border-2 border-foreground shadow-pop hover:-translate-y-1 transition cursor-pointer group overflow-hidden min-h-[140px] w-full"
                      >
                        <div className="p-4 flex flex-col items-center justify-center text-white w-32 shrink-0 relative overflow-hidden bg-rose-500">
                          <div
                            className="absolute inset-0 opacity-20"
                            style={{ backgroundImage: 'repeating-linear-gradient(45deg,#fff 0,#fff 2px,transparent 2px,transparent 10px)' }}
                          />
                          <div className="text-3xl font-black text-yellow-300 font-display z-10">{exam.round}</div>
                          <div className="text-[10px] font-bold tracking-widest uppercase z-10 mt-1">
                            {t('dashboard.topik.writingCardLabel')}
                          </div>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="font-black text-lg text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-300 transition">{exam.title}</h4>
                            <div className="flex gap-3 mt-2">
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                                <Clock size={12} /> {t('topikLobby.timeLimit', { count: exam.timeLimit })}
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-between items-center border-t border-border pt-3">
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {t('dashboard.topik.clickStart')}
                            </span>
                            <span className="bg-rose-500 text-white px-3 py-1.5 rounded-lg font-bold text-xs shadow-md group-hover:scale-105 transition inline-flex items-center gap-1">
                              {t('dashboard.topik.startWriting')} <ArrowRight size={12} />
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                );
              })()
            ) : filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredExams.map(exam => (
                  <Button
                    key={exam.id}
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => navigate(`/topik/${exam.id}`)}
                    className="!flex !items-stretch !justify-start bg-card rounded-2xl p-0 border-2 border-foreground shadow-pop hover:-translate-y-1 transition cursor-pointer group overflow-hidden flex-col md:flex-row h-auto min-h-[140px] w-full text-left"
                  >
                    <div
                      className={clsx(
                        'p-4 flex flex-col items-center justify-center text-white w-full md:w-32 shrink-0 relative overflow-hidden',
                        exam.type === 'READING' ? 'bg-primary' : 'bg-blue-800 dark:bg-blue-700'
                      )}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, #fff 0, #fff 2px, transparent 2px, transparent 10px)',
                        }}
                      ></div>
                      <div className="text-3xl font-black text-yellow-400 dark:text-amber-300 font-display z-10">
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
                          <h4 className="font-black text-lg text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition">
                            {exam.title}
                          </h4>
                          <span
                            className={clsx(
                              'text-[10px] font-black px-2 py-0.5 rounded border',
                              exam.type === 'READING'
                                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-200 dark:border-blue-400/40'
                                : 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-200 dark:border-rose-400/40'
                            )}
                          >
                            {exam.type === 'READING'
                              ? t('dashboard.topik.reading')
                              : t('dashboard.topik.listening')}
                          </span>
                        </div>
                        <p className="text-muted-foreground text-xs font-bold">
                          {t('topikLobby.roundTitle', { round: exam.round })}
                        </p>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded-md">
                            <Clock size={12} />{' '}
                            {t('topikLobby.timeLimit', { count: exam.timeLimit })}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-center border-t border-border pt-3">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {t('dashboard.topik.clickStart')}
                        </span>
                        <span className="bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold text-xs shadow-md group-hover:scale-105 transition inline-flex items-center gap-1">
                          {t('dashboard.topik.startNow')} <ArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="bg-card rounded-[2rem] p-8 border-2 border-border text-center">
                <p className="text-muted-foreground font-bold">{t('topikLobby.noExams')}</p>
              </div>
            )}
          </div>

          {/* Sidebar: Archive */}
          {/* Sidebar: Archive */}
          <div className="h-fit sticky top-6 space-y-6">
            <h3 className="font-black text-xl text-foreground flex items-center gap-2">
              <History size={20} /> {t('dashboard.topik.examHistory')}
            </h3>

            <div className="bg-card rounded-2xl border-2 border-foreground p-4 shadow-sm">
              <div className="space-y-3">
                {examHistory.length > 0 ? (
                  examHistory.slice(0, 3).map((attempt, index) => {
                    const score = attempt.score || 0;
                    const maxScore = attempt.maxScore || attempt.totalScore || 100;
                    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                    const attemptKey = attempt.id || attempt.timestamp || `attempt-${index}`;
                    return (
                      <Button
                        key={attemptKey}
                        type="button"
                        variant="ghost"
                        size="auto"
                        onClick={() => navigate('/topik/history')}
                        className="!block relative bg-muted p-3 rounded-xl border border-border group cursor-pointer hover:bg-card hover:border-foreground transition w-full text-left"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h5 className="font-bold text-foreground text-xs">
                              {attempt.examTitle || t('topikLobby.unknownExam')}
                            </h5>
                            <p className="text-[10px] text-muted-foreground font-bold mt-0.5">
                              {attempt.timestamp
                                ? new Date(attempt.timestamp).toLocaleDateString()
                                : 'N/A'}
                            </p>
                          </div>
                          <span className="font-black text-sm text-foreground">
                            {score}
                            <span className="text-[10px] text-muted-foreground">/{maxScore}</span>
                          </span>
                        </div>
                        {percentage >= 60 && (
                          <div className="absolute top-2 right-12 border border-green-600 text-green-600 dark:border-emerald-300 dark:text-emerald-200 text-[10px] font-black px-1 py-0 rounded rotate-[-15deg] opacity-80">
                            {t('dashboard.topik.passBadge')}
                          </div>
                        )}
                      </Button>
                    );
                  })
                ) : (
                  <div className="text-center py-6">
                    <Archive size={24} className="mx-auto text-muted-foreground mb-2" />
                    <p className="text-xs text-muted-foreground font-bold">
                      {t('dashboard.topik.noHistory')}
                    </p>
                  </div>
                )}
              </div>
              {examHistory.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => navigate('/topik/history')}
                  className="w-full mt-4 py-2 border-2 border-border rounded-xl font-bold text-xs text-muted-foreground hover:border-foreground hover:text-foreground transition"
                >
                  {t('topikLobby.viewAllHistory')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikPage;
