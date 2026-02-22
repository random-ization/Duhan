import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  History,
  BookOpen,
  Headphones,
  Clock,
  HelpCircle,
  PlayCircle,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { useData } from '../../contexts/DataContext';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { qRef } from '../../utils/convexRefs';
import { ExamAttempt } from '../../types';
import { clsx } from 'clsx';
import { Button } from '../ui';

interface MobileTopikPageProps {
  onSelectExam: (examId: string) => void;
}

const MobileTopikPage: React.FC<MobileTopikPageProps> = ({ onSelectExam }) => {
  const { user } = useAuth();
  const { topikExams } = useData();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<'ALL' | 'READING' | 'LISTENING'>('ALL');

  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? {} : 'skip'
  );
  const examHistory = examAttempts ?? [];

  const upcomingExam = useMemo(() => {
    if (topikExams.length === 0) return null;
    return [...topikExams].sort((a, b) => b.round - a.round)[0];
  }, [topikExams]);

  // Filter exams
  const filteredExams = topikExams.filter(exam => filterType === 'ALL' || exam.type === filterType);

  // Calculate stats
  const totalAttempts = examHistory.length;
  const avgScore =
    totalAttempts > 0
      ? Math.round(
        examHistory.reduce((sum, a) => {
          const maxScore = a.maxScore || a.totalScore || 100;
          return sum + (maxScore > 0 ? ((a.score || 0) / maxScore) * 100 : 0);
        }, 0) / totalAttempts
      )
      : 0;
  const passCount = examHistory.filter(a => {
    const maxScore = a.maxScore || a.totalScore || 100;
    return maxScore > 0 && (a.score || 0) / maxScore >= 0.6;
  }).length;
  const passRate = totalAttempts > 0 ? Math.round((passCount / totalAttempts) * 100) : 0;

  // Get best score for an exam
  const getBestScore = (examId: string) => {
    const attempts = examHistory.filter(a => a.examId === examId);
    if (attempts.length === 0) return null;
    return Math.max(
      ...attempts.map(a => {
        const maxScore = a.maxScore || a.totalScore || 100;
        return maxScore > 0 ? Math.round(((a.score || 0) / maxScore) * 100) : 0;
      })
    );
  };

  return (
    <div className="min-h-screen bg-muted pb-20">
      {/* Header */}
      <header className="bg-card px-5 pt-5 pb-4 border-b border-border sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/practice')}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-foreground">
              {t('dashboard.topik.examCenter')}
            </h1>
          </div>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/topik/history')}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <History className="w-4 h-4 text-muted-foreground" />
          </Button>
        </div>

        {/* D-Day Banner */}
        <div className="rounded-xl bg-primary p-3 text-primary-foreground flex items-center gap-3">
          <div className="rounded bg-primary-foreground/20 px-2.5 py-1 text-sm font-extrabold text-primary-foreground">
            {upcomingExam
              ? t('dashboard.topik.mobile.roundBadge', {
                round: upcomingExam.round,
                defaultValue: 'R{{round}}',
              })
              : t('dashboard.topik.mobile.roundBadgeFallback', { defaultValue: 'TOPIK' })}
          </div>
          <div className="text-xs">
            <div className="font-medium text-primary-foreground/75">
              {t('dashboard.topik.nextExam')}
            </div>
            <div className="font-bold">
              {upcomingExam?.title ||
                t('dashboard.topik.mobile.nextExamNameFallback', {
                  defaultValue: 'TOPIK II',
                })}
            </div>
          </div>
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="px-5 py-3 flex gap-2 bg-card border-b border-border sticky top-[89px] z-10">
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setFilterType('ALL')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors',
            filterType === 'ALL'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {t('dashboard.topik.all')}
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setFilterType('READING')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors',
            filterType === 'READING'
              ? 'bg-blue-600 text-white dark:bg-blue-400/30 dark:text-blue-100'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <BookOpen className="w-3 h-3" /> {t('dashboard.topik.reading')}
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setFilterType('LISTENING')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors',
            filterType === 'LISTENING'
              ? 'bg-violet-600 text-white dark:bg-violet-400/30 dark:text-violet-100'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Headphones className="w-3 h-3" /> {t('dashboard.topik.listening')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="px-5 py-3 flex gap-2">
        <div className="flex-1 bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground font-medium">
            {t('dashboard.topik.avgScore')}
          </div>
          <div className="text-lg font-extrabold text-foreground">{avgScore}</div>
        </div>
        <div className="flex-1 bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground font-medium">
            {t('dashboard.topik.passRate')}
          </div>
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
            {passRate}%
          </div>
        </div>
        <div className="flex-1 bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground font-medium">
            {t('dashboard.topik.total')}
          </div>
          <div className="text-lg font-extrabold text-foreground">{filteredExams.length}</div>
        </div>
      </div>

      {/* Exam List (Compact Rows) */}
      <div className="px-5 space-y-2 pb-4">
        <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
          {t('dashboard.topik.availableExams')}
        </div>

        {filteredExams.length === 0 && (
          <div className="text-center py-10">
            <Archive className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground font-medium">{t('topikLobby.noExams')}</p>
          </div>
        )}

        {filteredExams.map(exam => {
          const bestScore = getBestScore(exam.id);
          const isReading = exam.type === 'READING';

          return (
            <Button
              variant="ghost"
              size="auto"
              key={exam.id}
              onClick={() => onSelectExam(exam.id)}
              className="w-full bg-card rounded-xl border border-border p-3 flex items-center gap-3 text-left active:bg-muted transition-colors"
            >
              {/* Round Badge */}
              <div
                className={clsx(
                  'w-10 h-10 rounded-lg flex items-center justify-center font-extrabold text-sm',
                  isReading
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-400/14 dark:text-blue-200'
                    : 'bg-violet-100 text-violet-600 dark:bg-violet-400/14 dark:text-violet-200'
                )}
              >
                {exam.round}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm truncate">{exam.title}</h3>
                  <span
                    className={clsx(
                      'text-[9px] font-bold px-1 py-0.5 rounded',
                      isReading
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200'
                        : 'bg-violet-50 text-violet-600 dark:bg-violet-400/12 dark:text-violet-200'
                    )}
                  >
                    {isReading
                      ? t('dashboard.topik.mobile.typeReadingShort', { defaultValue: 'READ' })
                      : t('dashboard.topik.mobile.typeListeningShort', { defaultValue: 'LIST' })}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-2">
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {t('dashboard.topik.mobile.minuteShort', {
                      minutes: exam.timeLimit,
                      defaultValue: '{{minutes}}m',
                    })}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <HelpCircle className="w-3 h-3" />
                    {t('dashboard.topik.mobile.questionCountShort', {
                      count: exam.questions?.length || 50,
                      defaultValue: '{{count}}Q',
                    })}
                  </span>
                  {bestScore !== null && (
                    <span className="font-bold text-emerald-600 dark:text-emerald-300">
                      {t('dashboard.topik.mobile.bestScore', {
                        score: bestScore,
                        defaultValue: '{{score}}%',
                      })}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Icon */}
              {bestScore !== null ? (
                <RotateCcw className="w-5 h-5 text-muted-foreground" />
              ) : (
                <PlayCircle className="w-7 h-7 text-primary dark:text-primary-foreground" />
              )}
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileTopikPage;
