import React, { Suspense, lazy, useCallback, useState } from 'react';
import { Navigate, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useCurrentLanguage, useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { useTopikExams } from '../hooks/useTopikExams';
import { useUserActions } from '../hooks/useUserActions';
import { useQuery } from 'convex/react';
import {
  Target,
  Clock,
  ArrowRight,
  Archive,
  History,
  Headphones,
  BookOpen,
  PenLine,
  LayoutGrid,
} from 'lucide-react';
import { clsx } from 'clsx';
import { DesktopCard } from '../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../components/desktop/ui/HanjaSeal';
import { DesignChip } from '../components/desktop/ui/DesignChip';
import { KT } from '../theme/ksoftTokens';
import BackButton from '../components/ui/BackButton';
import { useTranslation } from 'react-i18next';
import { qRef, TOPIK } from '../utils/convexRefs';
import { api } from '../../convex/_generated/api';
import { Annotation, ExamAttempt } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';
import { Button } from '../components/ui';
import { notify } from '../utils/notify';
import { useContextualSidebar } from '../hooks/useContextualSidebar';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import { getUpgradeBenefitCopy } from '../utils/upgradeCopy';
import { formatTopikLabel } from '../utils/topik';
import { appendReturnToPath, hasSafeReturnTo, resolveSafeReturnTo } from '../utils/navigation';
import {
  ContextualCountBadge,
  ContextualEmptyState,
  ContextualListItemButton,
  ContextualPrimaryActionButton,
  ContextualSection,
} from '../components/layout/contextualSidebarBlocks';
import { localizeInternalPath } from '../utils/localizedRouting';

const TopikModule = lazy(() => import('../components/topik'));
const MobileTopikPage = lazy(() => import('../components/mobile/MobileTopikPage'));

const LOCALE_PREFIXES = ['en', 'zh', 'vi', 'mn'];
const LOBBY_HISTORY_LIMIT = 50;
const FULL_HISTORY_LIMIT = 200;

const stripLocalePrefix = (pathname: string): string => {
  const pathSegments = pathname.split('/').filter(Boolean);
  const hasLocalePrefix = pathSegments[0] && LOCALE_PREFIXES.includes(pathSegments[0]);
  return hasLocalePrefix ? `/${pathSegments.slice(1).join('/')}` : pathname;
};

const TopikPage: React.FC = () => {
  const { user, language, canAccessContent } = useAuth();
  const { saveExamAttempt, saveAnnotation, deleteExamAttempt } = useUserActions();
  const topikExams = useTopikExams();
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { startUpgradeFlow, authLoading: upgradeFlowLoading } = useUpgradeFlow();
  const upgradeCopy = getUpgradeBenefitCopy(language);
  const [now] = React.useState(() => Date.now());
  const [filterType, setFilterType] = useState<'READING' | 'LISTENING' | 'WRITING'>('READING');
  const [expandedLockedExamId, setExpandedLockedExamId] = useState<string | null>(null);
  const { examId } = useParams();
  const pathWithoutLang = stripLocalePrefix(location.pathname);
  const isHistoryRoute = pathWithoutLang === '/topik/history';
  const needsLobbyInsights = Boolean(user && !isMobile && !examId && !isHistoryRoute);
  const needsExamHistory = Boolean(user && (needsLobbyInsights || examId || isHistoryRoute));
  const historyLimit = needsLobbyInsights ? LOBBY_HISTORY_LIMIT : FULL_HISTORY_LIMIT;
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    needsExamHistory ? { limit: historyLimit } : 'skip'
  );

  const writingSessions = useQuery(
    api.topikWriting.getUserSessions,
    needsExamHistory ? { limit: historyLimit } : 'skip'
  );
  const lobbyStats = useQuery(TOPIK.getLobbyStats, needsLobbyInsights ? {} : 'skip');

  const examHistory = React.useMemo(() => {
    return [...(examAttempts ?? []), ...(writingSessions ?? [])] as ExamAttempt[];
  }, [examAttempts, writingSessions]);
  const returnToParam = searchParams.get('returnTo');
  const linkReturnTo = hasSafeReturnTo(returnToParam) ? returnToParam : null;
  const topikBackPath = resolveSafeReturnTo(returnToParam, '/courses');
  const withReturnTo = useCallback(
    (path: string) => appendReturnToPath(path, linkReturnTo),
    [linkReturnTo]
  );
  const topikAnnotations = useQuery(
    qRef<{ prefix: string; limit?: number }, Annotation[]>('annotations:getByPrefix'),
    user && examId ? { prefix: `TOPIK-${examId}`, limit: 4000 } : 'skip'
  );
  const onShowUpgradePrompt = useCallback(() => {
    startUpgradeFlow({
      plan: 'ANNUAL',
      source: 'topik_locked',
      returnTo: `${location.pathname}${location.search}`,
    });
  }, [location.pathname, location.search, startUpgradeFlow]);

  const writingExams = React.useMemo(
    () => topikExams.filter(exam => exam.type === 'WRITING'),
    [topikExams]
  );

  // Filter exams based on type
  const filteredExams = React.useMemo(
    () => topikExams.filter(exam => exam.type === filterType),
    [filterType, topikExams]
  );

  const topikContextualContent = React.useMemo(
    () => (
      <div className="space-y-3">
        <ContextualSection
          title={t('dashboard.topik.examHistory')}
          badge={<ContextualCountBadge value={examHistory.length} tone="accent" />}
          withRail
        >
          {examHistory.length > 0 ? (
            <div className="space-y-2">
              {examHistory.slice(0, 4).map((attempt, index) => {
                const score = attempt.score || 0;
                const maxScore = attempt.maxScore || attempt.totalScore || 100;
                const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
                const attemptKey = attempt.id || attempt.timestamp || `attempt-${index}`;
                return (
                  <ContextualListItemButton
                    key={attemptKey}
                    icon={History}
                    label={attempt.examTitle || t('topikLobby.unknownExam')}
                    subtitle={
                      attempt.timestamp ? new Date(attempt.timestamp).toLocaleDateString() : 'N/A'
                    }
                    onClick={() => navigate(withReturnTo('/topik/history'))}
                    trailing={
                      <div className="text-right">
                        <p className="text-xs font-black">
                          {score}
                          <span
                            className="ml-0.5 text-[10px] font-semibold"
                            style={{ color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))' }}
                          >
                            /{maxScore}
                          </span>
                        </p>
                        {percentage >= 60 ? (
                          <ContextualCountBadge
                            value={t('dashboard.topik.passBadge')}
                            tone="success"
                          />
                        ) : null}
                      </div>
                    }
                  />
                );
              })}
            </div>
          ) : (
            <ContextualEmptyState
              icon={Archive}
              title={t('dashboard.topik.noHistory')}
              subtitle={t('topikLobby.reminder.firstTime', {
                defaultValue: 'Start your first TOPIK simulation!',
              })}
            />
          )}
        </ContextualSection>

        {examHistory.length > 0 ? (
          <ContextualPrimaryActionButton
            label={t('topikLobby.viewAllHistory')}
            onClick={() => navigate(withReturnTo('/topik/history'))}
          />
        ) : null}
      </div>
    ),
    [examHistory, navigate, t, withReturnTo]
  );

  useContextualSidebar({
    id: 'topik-lobby-context',
    title: t('dashboard.topik.examHistory', { defaultValue: 'Exam history' }),
    subtitle: t('topikLobby.viewAllHistory', { defaultValue: 'View all history' }),
    content: topikContextualContent,
    enabled: !isMobile && !examId && !isHistoryRoute,
  });
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
  React.useEffect(() => {
    setExpandedLockedExamId(null);
  }, [filterType]);

  if (!user) {
    return <Navigate to={localizeInternalPath('/', currentLanguage)} replace />;
  }

  // If examId is present, show the actual exam module (or if TopikModule handles it)
  // For now, let's assume TopikModule handles the actual taking of the exam.
  // We will wrap it.
  if (examId || isHistoryRoute) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-k-bg">
            <div className="text-sm font-semibold text-k-sub">
              {t('loading', { defaultValue: 'Loading...' })}
            </div>
          </div>
        }
      >
        <TopikModule
          exams={topikExams}
          language={language}
          history={examHistory}
          onSaveHistory={saveExamAttempt}
          annotations={topikAnnotations ?? []}
          onSaveAnnotation={saveAnnotation}
          canAccessContent={canAccessContent}
          onShowUpgradePrompt={onShowUpgradePrompt}
          upgradePromptLoading={upgradeFlowLoading}
          onDeleteHistory={deleteExamAttempt}
          initialView={isHistoryRoute ? 'HISTORY_LIST' : 'LIST'}
        />
      </Suspense>
    );
  }

  // Mobile Lobby View
  if (isMobile) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-k-bg">
            <div className="text-sm font-semibold text-k-sub">
              {t('loading', { defaultValue: 'Loading...' })}
            </div>
          </div>
        }
      >
        <MobileTopikPage
          onSelectExam={id => {
            const targetExam = topikExams.find(exam => exam.id === id);
            if ((targetExam?.type as string) === 'WRITING') {
              navigate(withReturnTo(`/topik/writing/${id}`));
              return;
            }
            navigate(withReturnTo(`/topik/${id}`));
          }}
          topikExams={topikExams}
        />
      </Suspense>
    );
  }

  // Desktop Lobby View
  return (
    <div className="min-h-screen bg-k-bg p-8 md:p-14 font-k-sans pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Premium Header */}
        <div className="mb-12 flex items-end gap-6">
          <div className="flex-1">
            <div className="mb-3 flex items-center gap-3">
              <BackButton onClick={() => navigate(topikBackPath)} />
              <div className="font-k-serif text-[14px] tracking-[4px] text-k-crimson uppercase font-medium">
                TOPIK · 韓語能力考試
              </div>
            </div>
            <div className="flex items-center gap-5">
              <HanjaSeal c="試" size={64} bg="var(--color-k-crimson)" round={16} />
              <div>
                <h1 className="text-[48px] font-extrabold leading-[1.1] tracking-[-1.5px] text-k-ink">
                  {t('dashboard.topik.examCenter')}
                </h1>
                <p className="mt-1 text-[17px] font-medium text-k-sub">
                  {t('dashboard.topik.realExam')} · {filteredExams.length}{' '}
                  {t('topikLobby.examsAvailable', { defaultValue: 'exams' })}
                </p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <img
              src="/emojis/Trophy.png"
              className="w-20 h-20 animate-bounce-slow opacity-80"
              alt=""
            />
          </div>
        </div>

        {/* Filters and Search Area */}
        <div className="mb-10 flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-2 bg-k-card p-1.5 rounded-[20px] border border-k-line shadow-k-sh-sm">
            {[
              {
                id: 'READING',
                icon: BookOpen,
                label: t('dashboard.topik.reading'),
                tone: 'indigo',
              },
              {
                id: 'LISTENING',
                icon: Headphones,
                label: t('dashboard.topik.listening'),
                tone: 'crimson',
              },
              { id: 'WRITING', icon: PenLine, label: t('dashboard.topik.writing'), tone: 'jade' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterType(f.id as any)}
                className={clsx(
                  'px-6 py-2.5 rounded-[15px] text-[13px] font-extrabold transition-all flex items-center gap-2.5 cursor-pointer',
                  filterType === f.id
                    ? 'bg-k-ink text-k-bg shadow-lg scale-[1.02]'
                    : 'text-k-sub hover:text-k-ink hover:bg-k-bg2'
                )}
              >
                <f.icon size={16} /> {f.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <DesignChip tone="muted" size="md">
              {t('topikLobby.allLevels', { defaultValue: 'ALL LEVELS' })}
            </DesignChip>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_330px] gap-12 items-start">
          {/* Left: Exams Grid */}
          <div className="space-y-8">
            <div className="flex items-baseline gap-3">
              <span className="font-k-serif text-[22px] font-medium text-k-crimson opacity-80">
                {filterType === 'WRITING' ? '筆' : filterType === 'READING' ? '閱' : '聽'}
              </span>
              <h3 className="text-[20px] font-extrabold tracking-[-0.5px] text-k-ink">
                {filterType === 'WRITING'
                  ? t('dashboard.topik.writingMockExams')
                  : t('dashboard.topik.recommended')}
              </h3>
              <div className="h-[1px] flex-1 bg-k-line"></div>
            </div>

            {filterType === 'WRITING' ? (
              writingExams.length === 0 ? (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  <DesktopCard
                    pad={0}
                    onClick={() =>
                      notify.info(
                        t('dashboard.topik.writingComingSoon', {
                          defaultValue: 'Writing module is coming soon.',
                        })
                      )
                    }
                    className="group flex flex-col transition-all hover:shadow-k-sh-lg cursor-pointer border border-transparent hover:border-k-line overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-4 bg-k-crimson text-k-bg relative overflow-hidden">
                      <div
                        className="absolute inset-0 opacity-10"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg,var(--color-k-bg) 0,var(--color-k-bg) 2px,transparent 2px,transparent 10px)',
                        }}
                      />
                      <PenLine size={20} className="z-10 text-k-butter" />
                      <div className="text-[10px] font-bold tracking-widest uppercase z-10 text-k-bg/80">
                        {t('dashboard.topik.writingCardLabel')}
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col gap-4">
                      <div>
                        <h4 className="font-extrabold text-[16px] tracking-tight text-k-ink group-hover:text-k-crimson transition leading-snug">
                          {t('dashboard.topik.writingMockTitle')}
                        </h4>
                        <p className="text-[12px] font-medium text-k-sub mt-1 leading-relaxed line-clamp-2">
                          {t('dashboard.topik.writingMockDesc')}
                        </p>
                      </div>
                      <div className="flex justify-between items-center mt-auto">
                        <DesignChip tone="muted" size="sm">
                          {t('topikLobby.timeLimit', { count: 50 })}
                        </DesignChip>
                        <span className="bg-k-crimson text-k-bg px-4 py-1.5 rounded-xl font-bold text-[11px] shadow-sm group-hover:scale-105 transition inline-flex items-center gap-1.5">
                          {t('dashboard.topik.startWriting')} <ArrowRight size={14} />
                        </span>
                      </div>
                    </div>
                  </DesktopCard>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                  {writingExams.map(exam => (
                    <DesktopCard
                      key={exam.id}
                      pad={0}
                      onClick={() => navigate(withReturnTo(`/topik/writing/${exam.id}`))}
                      className="group flex flex-col transition-all hover:shadow-k-sh-lg cursor-pointer border border-transparent hover:border-k-line overflow-hidden"
                    >
                      <div className="p-4 flex items-center justify-between bg-k-crimson text-k-bg relative overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg,var(--color-k-bg) 0,var(--color-k-bg) 2px,transparent 2px,transparent 10px)',
                          }}
                        />
                        <div className="flex items-center gap-3 z-10">
                          <div className="text-[18px] font-black font-k-serif text-k-butter">
                            {exam.round}
                          </div>
                          <div className="text-[10px] font-bold tracking-widest uppercase text-k-bg/80">
                            {t('dashboard.topik.writingCardLabel')}
                          </div>
                        </div>
                        <PenLine size={16} className="z-10 text-k-butter opacity-60" />
                      </div>
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div>
                          <h4 className="font-extrabold text-[16px] tracking-tight text-k-ink group-hover:text-k-crimson transition leading-snug">
                            {exam.title}
                          </h4>
                        </div>
                        <div className="flex justify-between items-center mt-auto">
                          <DesignChip tone="muted" size="sm">
                            {t('topikLobby.timeLimit', { count: exam.timeLimit })}
                          </DesignChip>
                          <span className="bg-k-crimson text-k-bg px-4 py-1.5 rounded-xl font-bold text-[11px] shadow-sm group-hover:scale-105 transition inline-flex items-center gap-1.5">
                            {t('dashboard.topik.startWriting')} <ArrowRight size={14} />
                          </span>
                        </div>
                      </div>
                    </DesktopCard>
                  ))}
                </div>
              )
            ) : filteredExams.length > 0 ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {filteredExams.map(exam => {
                  const isLocked = canAccessContent != null && !canAccessContent(exam);
                  const showLockedUpgradeCard = isLocked && expandedLockedExamId === exam.id;

                  return (
                    <DesktopCard
                      key={exam.id}
                      pad={0}
                      onClick={() => {
                        if (isLocked) {
                          setExpandedLockedExamId(exam.id);
                          return;
                        }
                        setExpandedLockedExamId(null);
                        navigate(withReturnTo(`/topik/${exam.id}`));
                      }}
                      className={clsx(
                        'group flex flex-col transition-all hover:shadow-k-sh-lg cursor-pointer border border-transparent hover:border-k-line overflow-hidden',
                        isLocked && 'opacity-80'
                      )}
                    >
                      <div
                        className={clsx(
                          'p-4 flex items-center justify-between text-k-bg relative overflow-hidden transition-all',
                          exam.type === 'READING' ? 'bg-k-indigo' : 'bg-k-crimson'
                        )}
                      >
                        <div
                          className="absolute inset-0 opacity-10"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, var(--color-k-bg) 0, var(--color-k-bg) 2px, transparent 2px, transparent 10px)',
                          }}
                        ></div>
                        <div className="flex items-center gap-3 z-10">
                          <div className="text-[18px] font-black font-k-serif text-k-butter">
                            {exam.round}
                          </div>
                          <div className="text-[10px] font-bold tracking-widest uppercase text-k-bg/80">
                            {exam.type === 'READING' ? '閱讀測验' : '聽力測验'}
                          </div>
                        </div>
                        {isLocked && (
                          <DesignChip tone="butter" size="sm" className="z-10">
                            {t('pricingDetails.upgradeGuide.badge')}
                          </DesignChip>
                        )}
                      </div>
                      <div className="p-5 flex-1 flex flex-col gap-4">
                        <div>
                          <h4
                            className={clsx(
                              'font-extrabold text-[16px] tracking-tight transition leading-tight mb-2',
                              exam.type === 'READING'
                                ? 'text-k-ink group-hover:text-k-indigo'
                                : 'text-k-ink group-hover:text-k-crimson'
                            )}
                          >
                            {exam.title}
                          </h4>
                          <div className="flex gap-2">
                            <DesignChip tone="muted" size="sm">
                              {t('topikLobby.timeLimit', { count: exam.timeLimit })}
                            </DesignChip>
                            {!isLocked && (
                              <DesignChip tone={exam.type === 'READING' ? 'sky' : 'pink'} size="sm">
                                {exam.type === 'READING' ? 'READ' : 'LIST'}
                              </DesignChip>
                            )}
                          </div>

                          {showLockedUpgradeCard ? (
                            <div className="mt-4 rounded-xl border border-k-butter bg-k-card p-4 shadow-sm">
                              <h5 className="text-[14px] font-extrabold text-k-ink">
                                {upgradeCopy.lockedTitle}
                              </h5>
                              <p className="mt-1 text-[11px] font-medium leading-relaxed text-k-sub">
                                {upgradeCopy.lockedNote}
                              </p>
                              <div className="mt-4 flex gap-2">
                                <button
                                  onClick={event => {
                                    event.stopPropagation();
                                    onShowUpgradePrompt();
                                  }}
                                  disabled={upgradeFlowLoading}
                                  className="flex-1 rounded-lg bg-k-ink px-3 py-1.5 text-[11px] font-extrabold text-k-bg hover:opacity-90 transition-opacity"
                                >
                                  {t('pricingDetails.upgradeGuide.cta')}
                                </button>
                                <button
                                  onClick={event => {
                                    event.stopPropagation();
                                    setExpandedLockedExamId(null);
                                  }}
                                  className="rounded-lg border border-k-line bg-k-bg2 px-3 py-1.5 text-[11px] font-extrabold text-k-ink hover:bg-k-line2"
                                >
                                  {t('pricingDetails.upgradeGuide.dismiss')}
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        {!showLockedUpgradeCard && (
                          <div className="flex justify-between items-center mt-auto border-t border-k-line pt-3">
                            <span className="text-[10px] font-bold text-k-sub uppercase tracking-wider">
                              {isLocked
                                ? t('pricingDetails.upgradeGuide.previewCta')
                                : t('dashboard.topik.clickStart')}
                            </span>
                            <span
                              className={clsx(
                                'px-4 py-1.5 rounded-xl font-bold text-[11px] shadow-sm inline-flex items-center gap-1.5 transition',
                                isLocked
                                  ? 'bg-k-bg2 text-k-sub border border-k-line'
                                  : 'bg-k-ink text-k-bg group-hover:scale-105'
                              )}
                            >
                              {isLocked ? 'LOCKED' : t('dashboard.topik.startNow')}{' '}
                              <ArrowRight size={14} />
                            </span>
                          </div>
                        )}
                      </div>
                    </DesktopCard>
                  );
                })}
              </div>
            ) : (
              <DesktopCard className="text-center py-20">
                <p className="text-k-sub font-bold text-[15px]">{t('topikLobby.noExams')}</p>
              </DesktopCard>
            )}
          </div>

          {/* Right: Sidebar Stats */}
          <div className="space-y-10 sticky top-8">
            {/* 1. Countdown Module */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <HanjaSeal
                  c="日"
                  size={24}
                  bg="var(--color-k-crimson)"
                  round={6}
                  className="text-[12px]"
                />
                <h4 className="text-[15px] font-extrabold text-k-ink">
                  {t('dashboard.topik.nextExamTitle', { defaultValue: '距下次考试' })}
                </h4>
              </div>
              <DesktopCard className="text-center py-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-k-crimson/5 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-110"></div>

                {lobbyStats?.upcomingExam ? (
                  <>
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-[64px] font-black font-k-serif text-k-crimson leading-none">
                        {Math.ceil((lobbyStats.upcomingExam.date! - now) / (1000 * 60 * 60 * 24))}
                      </span>
                      <span className="text-[28px] font-black font-k-serif text-k-crimson">日</span>
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-k-sub">
                      第 {lobbyStats.upcomingExam.round} 回 TOPIK ·{' '}
                      {new Date(lobbyStats.upcomingExam.date!).toLocaleDateString('zh-CN', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </>
                ) : (
                  <>
                    {/* Fallback if no upcoming exam in DB */}
                    <div className="flex items-baseline justify-center gap-2">
                      <span className="text-[64px] font-black font-k-serif text-k-crimson leading-none">
                        67
                      </span>
                      <span className="text-[28px] font-black font-k-serif text-k-crimson">日</span>
                    </div>
                    <p className="mt-3 text-[13px] font-bold text-k-sub">第 99 回 TOPIK · 7月6日</p>
                  </>
                )}
              </DesktopCard>
            </div>

            {/* 2. Weak Points Module */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <HanjaSeal
                  c="弱"
                  size={24}
                  bg="var(--color-k-crimson)"
                  round={6}
                  className="text-[12px]"
                />
                <h4 className="text-[15px] font-extrabold text-k-ink">
                  {t('dashboard.topik.weakAreasTitle', { defaultValue: '待加强' })}
                </h4>
              </div>
              <DesktopCard pad={0} className="overflow-hidden">
                <div className="divide-y divide-k-line">
                  {lobbyStats?.weakAreas && lobbyStats.weakAreas.length > 0 ? (
                    lobbyStats.weakAreas.map((area, idx) => (
                      <div key={area.type} className="p-5 hover:bg-k-bg/50 transition-colors group">
                        <div className="flex justify-between items-start mb-1">
                          <h5 className="text-[16px] font-extrabold text-k-ink group-hover:text-k-crimson transition">
                            <span className="mr-2 font-k-serif text-k-crimson">{area.label}</span>
                            <span className="text-[14px] text-k-sub">· {area.subLabel}</span>
                          </h5>
                        </div>
                        <p className="text-[12px] font-bold text-k-sub">
                          {t('dashboard.topik.recentScore', { defaultValue: '近期得分' })}{' '}
                          <span className="text-k-ink">{area.score}%</span>
                        </p>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Placeholders if no history */}
                      <div className="p-5 opacity-40">
                        <h5 className="text-[16px] font-extrabold text-k-ink">
                          <span className="mr-2 font-k-serif">쓰기</span>
                          <span className="text-[14px]">· 论说文</span>
                        </h5>
                        <p className="text-[12px] font-bold text-k-sub">近期得分 --%</p>
                      </div>
                      <div className="p-5 opacity-40">
                        <h5 className="text-[16px] font-extrabold text-k-ink">
                          <span className="mr-2 font-k-serif">듣기</span>
                          <span className="text-[14px]">· 高级听力</span>
                        </h5>
                        <p className="text-[12px] font-bold text-k-sub">近期得分 --%</p>
                      </div>
                    </>
                  )}
                </div>
              </DesktopCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopikPage;
