import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { Headphones, Tv, ChevronRight, BookMarked, Sparkles, Search } from 'lucide-react';
import {
  VocabIcon,
  GrammarIcon,
  ListeningIcon,
  ReadingIcon,
  StreakIcon,
  GoalIcon,
  TrophyIcon,
  TopikIcon,
} from '../ui/CustomIcons';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import { useAuth } from '../../contexts/AuthContext';
import { useLearningSelection } from '../../contexts/LearningContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useTopikExams } from '../../hooks/useTopikExams';
import { qRef, NoArgs } from '../../utils/convexRefs';
import {
  buildLearningModulePath,
  normalizeLearningFlowModule,
  type LearningFlowModule,
  type LearningMaterialSelection,
} from '../../utils/learningFlow';
import { Institute } from '../../types';
import { Button } from '../ui';
import { MobileSectionHeader } from './MobileSectionHeader';

const resolveResumeMaterial = ({
  recentMaterials,
  user,
  learningEntryTarget,
}: {
  recentMaterials: Partial<Record<LearningFlowModule, LearningMaterialSelection>>;
  user: ReturnType<typeof useAuth>['user'];
  learningEntryTarget: { instituteId: string; level: number } | null;
}) => {
  const lastModule = normalizeLearningFlowModule(user?.lastModule ?? null);
  if (!lastModule) return { module: null, material: null };

  const remembered = recentMaterials[lastModule];
  if (remembered?.instituteId) {
    return { module: lastModule, material: remembered };
  }

  if (user?.lastInstitute) {
    return {
      module: lastModule,
      material: {
        instituteId: user.lastInstitute,
        level: user.lastLevel || learningEntryTarget?.level || 1,
        unit: user.lastUnit,
      },
    };
  }

  return { module: lastModule, material: null };
};

const resolveModuleDisplay = (
  module: LearningFlowModule | null,
  t: (key: string, opts?: Record<string, unknown>) => string
) => {
  if (module === 'vocabulary') {
    return t('courseDashboard.modules.vocabulary', { defaultValue: 'Vocabulary' });
  }
  if (module === 'grammar') {
    return t('courseDashboard.modules.grammar', { defaultValue: 'Grammar' });
  }
  if (module === 'listening') {
    return t('courseDashboard.modules.listening', { defaultValue: 'Listening' });
  }
  if (module === 'reading') {
    return t('courseDashboard.modules.reading', { defaultValue: 'Reading' });
  }
  return t('nav.learn', { defaultValue: 'Learning' });
};

type DashboardExplore = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  iconClassName: string;
  badgeClassName: string;
  path: string;
};

const MobileDashboardLayout = ({
  t,
  navigate,
  stats,
  savedWordsCount,
  topikExamCount,
  resumeModule,
  resumeMaterialName,
  resumePath,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  stats: LearnerStatsDto;
  savedWordsCount: number;
  topikExamCount: number;
  resumeModule: LearningFlowModule | null;
  resumeMaterialName: string;
  resumePath: string;
}) => {
  const shortcutCards = [
    {
      id: 'review',
      label: t('dashboard.mobile.review', { defaultValue: 'Review' }),
      title: t('dashboard.vocab.title', { defaultValue: 'My Vocab' }),
      subtitle: t('dashboard.mobile.quickReviewSubtitle', { defaultValue: 'Clear due cards.' }),
      value: `${stats.vocabStats.dueReviews}`,
      icon: VocabIcon,
      path: '/vocab-book',
    },
    {
      id: 'practice',
      label: t('dashboard.mobile.practice', { defaultValue: 'Practice' }),
      title: t('nav.practice', { defaultValue: 'Practice' }),
      subtitle: t('dashboard.mobile.quickPracticeSubtitle', { defaultValue: 'Focus drills.' }),
      value: `${savedWordsCount}`,
      icon: GrammarIcon,
      path: '/practice',
    },
    {
      id: 'notebook',
      label: t('dashboard.mobile.notes', { defaultValue: 'Notebook' }),
      title: t('dashboard.notes.label', { defaultValue: 'Notebook' }),
      subtitle: t('dashboard.mobile.quickNotebookSubtitle', { defaultValue: 'Weak spots.' }),
      value: `${stats.reviewStats.savedWords || stats.vocabStats.total}`,
      icon: TrophyIcon,
      path: '/notebook',
    },
    {
      id: 'topik',
      label: t('nav.topik', { defaultValue: 'TOPIK' }),
      title: t('nav.topik', { defaultValue: 'TOPIK' }),
      subtitle: t('dashboard.mobile.topikShortcutSubtitle', {
        defaultValue: 'Mock exams, review, and score tracking.',
      }),
      value: `${topikExamCount}`,
      icon: TopikIcon,
      path: '/topik',
    },
  ];

  const exploreCards: DashboardExplore[] = [
    {
      id: 'reading',
      label: t('nav.reading', { defaultValue: 'Reading Hub' }),
      title: t('nav.reading', { defaultValue: 'Reading & News' }),
      subtitle: t('dashboard.readingHub.mobileSubtitle', {
        defaultValue: 'News, stories, and picture books for immersion.',
      }),
      icon: <BookMarked className="w-5 h-5" />,
      iconClassName: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
      badgeClassName: 'bg-blue-500 text-white',
      path: '/reading',
    },
    {
      id: 'podcasts',
      label: t('dashboard.mobile.listen', { defaultValue: 'Listen' }),
      title: t('dashboard.podcast.label', { defaultValue: 'Podcasts' }),
      subtitle: t('dashboard.mobile.latestEpisodes', {
        defaultValue: 'Jump into recent episodes and transcript-led study.',
      }),
      icon: <Headphones className="w-5 h-5" />,
      iconClassName: 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400',
      badgeClassName: 'bg-violet-500 text-white',
      path: '/podcasts',
    },
    {
      id: 'videos',
      label: t('dashboard.mobile.watch', { defaultValue: 'Watch' }),
      title: t('dashboard.mobile.videoLibrary', { defaultValue: 'Video Library' }),
      subtitle: t('dashboard.mobile.immersion', {
        defaultValue: 'Shadow native pacing with subtitle-aware playback.',
      }),
      icon: <Tv className="w-5 h-5" />,
      iconClassName: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
      badgeClassName: 'bg-rose-500 text-white',
      path: '/videos',
    },
  ];

  return (
    <div className="relative min-h-screen pb-mobile-nav bg-background">
      <div className="mx-auto w-full max-w-2xl px-0 pt-0 pb-12 overflow-hidden">
        {/* Bento Box Header Section */}
        <section className="grid grid-cols-2 gap-4 mb-10 px-4 pt-6">
          {/* Main Hero (Bento: Large) */}
          <div className="col-span-2 relative overflow-hidden rounded-[2.5rem] bg-indigo-600/90 p-6 text-white shadow-2xl backdrop-blur-md rim-light">
            <div className="absolute top-0 right-0 h-48 w-48 bg-white/10 blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white/90">
                  <Sparkles className="h-3 w-3" />
                  {t('dashboard.summary.title', { defaultValue: 'FOCUS' })}
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-black leading-[1.1] tracking-tighter italic text-balance">
                  {resumeMaterialName
                    ? t('dashboard.mobileFocus.continue', { defaultValue: 'Pick up progress.' })
                    : t('dashboard.mobileFocus.choose', { defaultValue: 'Start a path.' })}
                </h2>
                <p className="mt-2 text-[13px] font-bold text-white/80 leading-relaxed uppercase tracking-wide">
                  {resumeMaterialName
                    ? `${resolveModuleDisplay(resumeModule, t)} · ${resumeMaterialName}`
                    : t('learningFlow.mobileHub.subtitle', { defaultValue: 'Choose a skill' })}
                </p>
              </div>
              <Button
                variant="ghost"
                size="auto"
                onClick={() => navigate(resumePath)}
                className="flex h-12 w-full items-center justify-center rounded-2xl bg-white px-4 text-sm font-black text-indigo-600 shadow-lg active:scale-95 transition-all"
              >
                {resumeModule && resumeMaterialName
                  ? t('dashboard.common.continueLearning', { defaultValue: 'RESUME NOW' })
                  : t('learningFlow.mobileHub.pickMaterial', { defaultValue: 'GET STARTED' })}
              </Button>
            </div>
          </div>

          {/* Streak (Bento: Small) */}
          <div className="col-span-1 rounded-[2rem] bg-card/60 p-5 backdrop-blur-md shadow-lg rim-light flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <StreakIcon size={20} />
              <div className="text-right">
                <span className="unit text-2xl font-black italic tracking-tighter text-foreground">
                  {stats.streak}
                </span>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80">
              {t('dashboard.mobile.streakShort', { defaultValue: 'STREAK' })}
            </p>
          </div>

          {/* Goal (Bento: Small) */}
          <div className="col-span-1 rounded-[2rem] bg-card/60 p-5 backdrop-blur-md shadow-lg rim-light flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <GoalIcon size={20} />
              <div className="text-right">
                <span className="unit text-2xl font-black italic tracking-tighter text-foreground">
                  {stats.todayMinutes}
                </span>
                <span className="text-[10px] text-muted-foreground/60"> / {stats.dailyGoal}m</span>
              </div>
            </div>
            <p className="mt-4 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/80">
              {t('common.minutes', { defaultValue: 'MINUTES' })}
            </p>
          </div>
        </section>

        <section className="mb-10 px-4">
          <Button
            type="button"
            variant="outline"
            size="auto"
            onClick={() => navigate('/dictionary/search')}
            className="flex h-14 w-full items-center justify-start gap-3 rounded-[1.75rem] border border-indigo-100/30 bg-card/70 px-4 text-left shadow-lg backdrop-blur-md active:scale-[0.99] transition-all rim-light"
          >
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400">
              <Search className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-black tracking-tight text-foreground">
                {t('dashboard.dictionary.label', { defaultValue: 'Dictionary' })}
              </p>
              <p className="text-[11px] font-bold text-muted-foreground">
                {t('dashboard.dictionary.placeholder', { defaultValue: 'Search dictionary' })}
              </p>
            </div>
          </Button>
        </section>

        {/* Study Hub Grid */}
        <section className="space-y-6 mb-12">
          <MobileSectionHeader
            title={t('dashboard.mobile.shortcutsTitle', { defaultValue: 'LEARNING HUB' })}
          />
          <div className="grid grid-cols-2 gap-4">
            {shortcutCards.map(card => {
              const Icon = card.icon;
              return (
                <Button
                  key={card.id}
                  variant="outline"
                  size="auto"
                  onClick={() => navigate(card.path)}
                  className="group relative overflow-hidden rounded-[2.5rem] border border-indigo-100/30 bg-card/70 p-5 text-left shadow-lg backdrop-blur-md active:scale-95 transition-all !flex !flex-col !items-start !justify-between !whitespace-normal rim-light"
                >
                  <div className="w-full relative z-10 flex items-start justify-between mb-8">
                    <Icon size={22} className="shadow-md" />
                    <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 italic">
                      {card.value}
                    </span>
                  </div>
                  <div className="relative z-10">
                    <h4 className="text-lg font-black leading-tight text-foreground italic uppercase tracking-tight">
                      {card.title}
                    </h4>
                    <p className="mt-1.5 text-[11px] font-bold leading-relaxed text-muted-foreground line-clamp-1">
                      {card.subtitle}
                    </p>
                  </div>
                </Button>
              );
            })}
          </div>
        </section>

        {/* Immersion Section */}
        <section className="space-y-6">
          <MobileSectionHeader
            title={t('dashboard.mobile.exploreTitle', { defaultValue: 'IMMERSION' })}
          />
          <div className="grid grid-cols-1 gap-4">
            {exploreCards.map(card => (
              <Button
                key={card.id}
                variant="outline"
                size="auto"
                onClick={() => navigate(card.path)}
                className="group relative rounded-[2rem] border border-indigo-100/30 bg-card/60 p-4 shadow-lg backdrop-blur-md active:scale-[0.98] transition-all !flex !items-center !justify-between !whitespace-normal rim-light"
              >
                <div className="flex items-center gap-4 text-left">
                  <div
                    className={cn(
                      'grid h-12 w-12 place-items-center rounded-2xl shadow-inner',
                      card.id === 'reading'
                        ? 'bg-blue-500/10 text-blue-600'
                        : card.id === 'podcasts'
                          ? 'bg-violet-500/10 text-violet-600'
                          : 'bg-rose-500/10 text-rose-600'
                    )}
                  >
                    {card.id === 'reading' ? (
                      <ReadingIcon size={20} />
                    ) : card.id === 'podcasts' ? (
                      <ListeningIcon size={20} />
                    ) : (
                      <Tv className="w-5 h-5 shadow-sm" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-black leading-tight text-foreground italic uppercase tracking-tight">
                      {card.title}
                    </h4>
                    <p className="mt-1 text-[11px] font-bold leading-relaxed text-muted-foreground mr-4 line-clamp-1">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50/50 dark:bg-indigo-900/10 text-indigo-400 group-active:translate-x-1 transition-transform">
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export const MobileDashboard: React.FC<{
  learningEntryTarget: { instituteId: string; level: number } | null;
  institutes: Institute[] | undefined;
  institutesLoading: boolean;
}> = ({ learningEntryTarget, institutes: _institutes, institutesLoading: _institutesLoading }) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { recentMaterials } = useLearningSelection();
  const topikExams = useTopikExams();

  // -- Data Fetching (Replicated from DashboardPage & LearnerSummaryCard) --

  // 1. User Stats (Streak, Minutes)
  const userStats = useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats'));

  // 2. Vocab Count
  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean }, { count: number }>('vocab:getVocabBookCount'),
    user ? { includeMastered: true } : 'skip'
  );
  const savedWordsCount = vocabBookCount?.count || 0;

  // -- Render Helpers --
  const stats: LearnerStatsDto = userStats || {
    streak: 0,
    todayMinutes: 0,
    dailyGoal: 30,
    dailyProgress: 0,
    weeklyActivity: [],
    todayActivities: {
      wordsLearned: 0,
      readingsCompleted: 0,
      listeningsCompleted: 0,
      examsCompleted: 0,
    },
    courseProgress: [],
    currentProgress: null,
    totalWordsLearned: 0,
    totalGrammarLearned: 0,
    wordsToReview: 0,
    vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
    grammarStats: { total: 0, mastered: 0 },
    reviewStats: { dueNow: 0, dueSoon: 0, savedWords: 0 },
    moduleBreakdown: [],
    recentSessions: [],
    totalMinutes: 0,
    todayWordsStudied: 0,
    todayGrammarStudied: 0,
  };
  const { module: resumeModule, material: resumeMaterial } = useMemo(
    () =>
      resolveResumeMaterial({
        recentMaterials,
        user,
        learningEntryTarget,
      }),
    [learningEntryTarget, recentMaterials, user]
  );
  const resumeMaterialName = useMemo(() => {
    if (!resumeMaterial?.instituteId || !_institutes) return '';
    const institute = _institutes.find(item => item.id === resumeMaterial.instituteId);
    return institute?.name || resumeMaterial.instituteId;
  }, [_institutes, resumeMaterial]);
  const resumePath = useMemo(() => {
    if (resumeModule && resumeMaterial?.instituteId) {
      return buildLearningModulePath(resumeModule, resumeMaterial.instituteId);
    }
    return '/courses';
  }, [resumeMaterial, resumeModule]);

  return (
    <MobileDashboardLayout
      t={t}
      navigate={navigate}
      stats={stats}
      savedWordsCount={savedWordsCount}
      topikExamCount={topikExams.length}
      resumeModule={resumeModule}
      resumeMaterialName={resumeMaterialName}
      resumePath={resumePath}
    />
  );
};
