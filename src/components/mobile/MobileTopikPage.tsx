import React, { useEffect, useMemo, useState } from 'react';
import {
  History,
  BookOpen,
  Headphones,
  PenLine,
  Clock,
  HelpCircle,
  PlayCircle,
  RotateCcw,
  Archive,
} from 'lucide-react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { qRef } from '../../utils/convexRefs';
import { ExamAttempt, TopikExam } from '../../types';
import { clsx } from 'clsx';
import { Button } from '../ui';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';

interface MobileTopikPageProps {
  onSelectExam: (examId: string) => void;
  topikExams: TopikExam[];
}

const MobileTopikPage: React.FC<MobileTopikPageProps> = ({ onSelectExam, topikExams }) => {
  const filterStorageKey = 'mobileTopikFilterType';
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [filterType, setFilterType] = useState<'ALL' | 'READING' | 'LISTENING' | 'WRITING'>(() => {
    if (globalThis.window === undefined) return 'ALL';
    const saved = safeGetLocalStorageItem(filterStorageKey);
    if (saved === 'READING' || saved === 'LISTENING' || saved === 'WRITING') return saved;
    return 'ALL';
  });

  useEffect(() => {
    if (globalThis.window === undefined) return;
    safeSetLocalStorageItem(filterStorageKey, filterType);
  }, [filterType]);

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

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/practice'));
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/practice');
  };

  return (
    <div className="min-h-[100dvh] bg-background pb-mobile-nav">
      <MobileWorkspaceHeader
        title={t('dashboard.topik.examCenter')}
        subtitle={t('topik.mobileSubtitle', {
          defaultValue: 'Choose a mock exam, track your scores, and keep your timing sharp.',
        })}
        eyebrow={t('nav.topik', { defaultValue: 'TOPIK' })}
        onBack={handleBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
        actions={
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/topik/history')}
            className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-card shadow-sm active:scale-95"
            aria-label={t('dashboard.topik.history', { defaultValue: 'History' })}
          >
            <History className="h-4 w-4 text-muted-foreground" />
          </Button>
        }
      >
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
      </MobileWorkspaceHeader>

      {/* Filter Tabs */}
      <div className="px-4 sm:px-5 py-3 flex gap-2 bg-card border-b border-border overflow-x-auto no-scrollbar">
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setFilterType('ALL')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shrink-0',
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
            'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0',
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
            'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0',
            filterType === 'LISTENING'
              ? 'bg-violet-600 text-white dark:bg-violet-400/30 dark:text-violet-100'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Headphones className="w-3 h-3" /> {t('dashboard.topik.listening')}
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => setFilterType('WRITING')}
          className={clsx(
            'px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0',
            filterType === 'WRITING'
              ? 'bg-rose-600 text-white dark:bg-rose-400/30 dark:text-rose-100'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <PenLine className="w-3 h-3" /> {t('dashboard.topik.writing')}
        </Button>
      </div>

      {/* Stats Row */}
      <div className="px-4 sm:px-5 py-3 grid grid-cols-3 gap-2">
        <div className="min-w-0 bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-[11px] leading-tight text-muted-foreground font-medium line-clamp-2 min-h-[2rem]">
            {t('dashboard.topik.avgScore')}
          </div>
          <div className="text-lg font-extrabold text-foreground">{avgScore}</div>
        </div>
        <div className="min-w-0 bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-[11px] leading-tight text-muted-foreground font-medium line-clamp-2 min-h-[2rem]">
            {t('dashboard.topik.passRate')}
          </div>
          <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-300">
            {passRate}%
          </div>
        </div>
        <div className="min-w-0 bg-card rounded-lg border border-border p-3 text-center">
          <div className="text-[11px] leading-tight text-muted-foreground font-medium line-clamp-2 min-h-[2rem]">
            {t('dashboard.topik.total')}
          </div>
          <div className="text-lg font-extrabold text-foreground">{filteredExams.length}</div>
        </div>
      </div>

      {/* Exam List (Compact Rows) */}
      <div className="px-4 sm:px-5 space-y-2 pb-4">
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
          const isWriting = exam.type === 'WRITING';
          const isListening = exam.type === 'LISTENING';

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
                    : isWriting
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-400/14 dark:text-rose-200'
                      : 'bg-violet-100 text-violet-600 dark:bg-violet-400/14 dark:text-violet-200'
                )}
              >
                {exam.round}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-foreground text-sm line-clamp-2">{exam.title}</h3>
                  <span
                    className={clsx(
                      'text-[9px] font-bold px-1 py-0.5 rounded',
                      isReading
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-400/12 dark:text-blue-200'
                        : isWriting
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-400/12 dark:text-rose-200'
                          : 'bg-violet-50 text-violet-600 dark:bg-violet-400/12 dark:text-violet-200'
                    )}
                  >
                    {isReading
                      ? t('dashboard.topik.mobile.typeReadingShort', { defaultValue: 'READ' })
                      : isListening
                        ? t('dashboard.topik.mobile.typeListeningShort', { defaultValue: 'LIST' })
                        : t('dashboard.topik.mobile.typeWritingShort', { defaultValue: 'WRITE' })}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground font-medium mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
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
