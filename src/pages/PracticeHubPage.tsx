import React, { useMemo } from 'react';
import {
  BookMarked,
  ChevronRight,
  Keyboard,
  Layers,
  Trophy,
  Sparkles,
  Dumbbell,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { Button } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useTopikExams } from '../hooks/useTopikExams';
import { NOTE_PAGES, NoArgs, qRef, VOCAB } from '../utils/convexRefs';

type PracticeHubStat = {
  label: string;
  value: string;
  highlight?: string;
};

type PracticeHubCard = {
  id: 'notebook' | 'typing' | 'spelling';
  title: string;
  subtitle: string;
  path: string;
  icon: React.ReactNode;
  accentClass: string;
  stats: PracticeHubStat[];
  ctaLabel: string;
  meta?: string;
};

const formatRelativeTime = (
  timestamp: number | undefined,
  t: (key: string, options?: any) => string
): string => {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return t('relativeTime.justNow', { defaultValue: 'Just now' });
  if (diffHours < 24)
    return t('relativeTime.hoursAgo', { count: diffHours, defaultValue: `${diffHours} hours ago` });
  const diffDays = Math.floor(diffHours / 24);
  return t('relativeTime.daysAgo', { count: diffDays, defaultValue: `${diffDays} days ago` });
};

export default function PracticeHubPage() {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();

  const topikExams = useTopikExams();
  const reviewSummary = useQuery(VOCAB.getReviewSummary, user ? { savedByUserOnly: true } : 'skip');
  const typingStats = useQuery(
    qRef<
      Record<string, never>,
      { totalTests: number; highestWpm: number; averageWpm: number } | null
    >('typing:getUserStats'),
    {}
  );
  const notebooks = useQuery(NOTE_PAGES.listNotebooks, user ? ({} as NoArgs) : 'skip');

  const notebookCount = notebooks?.totals.notebooks ?? 0;
  const pendingReviewCount =
    notebooks?.notebooks.reduce((sum, notebook) => sum + (notebook.reviewCount || 0), 0) ?? 0;
  const latestNotebookUpdatedAt = useMemo(() => {
    if (!notebooks?.notebooks.length) return undefined;
    return Math.max(...notebooks.notebooks.map(item => item.updatedAt || item.createdAt || 0));
  }, [notebooks]);

  const dueNow = reviewSummary?.dueNow ?? 0;
  const mastered = reviewSummary?.mastered ?? 0;
  const totalWords = reviewSummary?.total ?? 0;

  const cards: PracticeHubCard[] = [
    {
      id: 'notebook',
      title: t('dashboard.notes.label', { defaultValue: 'My Notebook' }),
      subtitle: t('dashboard.notes.subtitle', {
        defaultValue: 'Manage mistakes, notes and plans',
      }),
      path: '/notebook',
      icon: <BookMarked size={26} className="text-teal-600" />,
      accentClass: 'from-teal-50 to-cyan-50 border-teal-200',
      stats: [
        {
          label: t('notes.v2.review.pendingReview', { defaultValue: 'Pending Review' }),
          value: `${pendingReviewCount}`,
          highlight: 'text-teal-700',
        },
        {
          label: t('notes.v2.sidebar.notebooks', { defaultValue: 'Notebooks' }),
          value: `${notebookCount}`,
        },
      ],
      ctaLabel: t('dashboard.notes.openNotebook', { defaultValue: 'Open Notebook' }),
      meta: latestNotebookUpdatedAt
        ? `${t('lastUpdated', { defaultValue: 'Last updated' })}: ${formatRelativeTime(latestNotebookUpdatedAt, t)}`
        : undefined,
    },
    {
      id: 'typing',
      title: t('sidebar.typing', { defaultValue: 'Typing' }),
      subtitle: t('typing.subtitle', { defaultValue: 'Improve speed and muscle memory' }),
      path: '/typing',
      icon: <Keyboard size={26} className="text-fuchsia-600" />,
      accentClass: 'from-fuchsia-50 to-pink-50 border-fuchsia-200',
      stats: [
        {
          label: t('typingGame.bestRecord', { defaultValue: 'All-time Best' }),
          value: `${typingStats?.highestWpm ?? 0} WPM`,
          highlight: 'text-fuchsia-700',
        },
        {
          label: t('typingGame.totalTests', { defaultValue: 'Tests' }),
          value: `${typingStats?.totalTests ?? 0}`,
        },
      ],
      ctaLabel: t('typingGame.continuePractice', { defaultValue: 'Continue Practice' }),
    },
    {
      id: 'spelling',
      title: t('dashboard.vocab.title', { defaultValue: 'Spelling' }),
      subtitle: t('dashboard.vocab.subtitle', { defaultValue: 'Consolidate memory' }),
      path: '/vocab-book',
      icon: <Layers size={26} className="text-emerald-600" />,
      accentClass: 'from-emerald-50 to-green-50 border-emerald-200',
      stats: [
        {
          label: t('vocab.mastered', { defaultValue: 'Mastered' }),
          value: `${mastered}`,
        },
        {
          label: t('vocab.due', { defaultValue: 'Due Today' }),
          value: `${dueNow}`,
          highlight: 'text-emerald-700',
        },
      ],
      ctaLabel: t('dashboard.vocab.startChallenge', { defaultValue: 'Start Challenge' }),
      meta: totalWords > 0 ? `${mastered}/${totalWords}` : undefined,
    },
  ];

  const topikBadge = `${topikExams.length} ${t('common.exams', { defaultValue: 'Exams' })}`;
  const streakLikeValue =
    dueNow > 0
      ? t('vocab.dueCount', { count: dueNow, defaultValue: `${dueNow} due` })
      : t('vocab.masteredCount', { count: mastered, defaultValue: `${mastered} mastered` });
  const recommendedPath = dueNow > 0 ? '/vocab-book' : '/notebook';
  const recommendedTitle =
    dueNow > 0
      ? t('dashboard.vocab.title', { defaultValue: 'My Vocab' })
      : t('dashboard.notes.label', { defaultValue: 'My Notebook' });
  const recommendedDescription =
    dueNow > 0
      ? t('practice.mobileRecommendedDue', {
          defaultValue: '{{count}} cards are ready for review.',
          count: dueNow,
        })
      : t('practice.mobileRecommendedNotebook', {
          defaultValue: 'Review recent notes and mistakes.',
        });

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header
        className={`mb-6 items-end justify-between gap-4 px-1 ${isMobile ? 'hidden' : 'flex'}`}
      >
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {t('nav.practice', { defaultValue: 'Practice Hub' })}
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300/90">
            {t('dashboard.practice.subtitle', {
              defaultValue: 'Organize your resources and start today challenge',
            })}
          </p>
        </div>
        {!isMobile && (
          <div className="inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/70 border border-slate-300/70 dark:border-slate-500/60 px-4 py-2 shadow-sm">
            <Trophy className="w-4 h-4 text-amber-500 dark:text-amber-300" />
            <span className="text-xs font-black text-slate-800 dark:text-slate-100">
              {streakLikeValue}
            </span>
            <span className="mx-1 text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              TOPIK {topikBadge}
            </span>
          </div>
        )}
      </header>

      {isMobile && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Custom Premium Header */}
          <header className="mb-8 pt-4 px-1">
            <div className="flex items-center justify-between mb-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-indigo-600 backdrop-blur-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
                <Dumbbell className="w-3.5 h-3.5" />
                {t('nav.practice', { defaultValue: 'Practice' })}
              </div>
              <Button
                variant="ghost"
                size="auto"
                onClick={() => navigate('/topik')}
                className="h-9 rounded-xl border border-border bg-card px-4 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm active:scale-95 transition-all"
              >
                TOPIK
              </Button>
            </div>
            <h1 className="text-3xl font-black text-foreground italic tracking-tight mb-2">
              {t('practice.mobileTitle', { defaultValue: 'Build your skills' })}
            </h1>
            <p className="text-sm font-semibold text-muted-foreground leading-relaxed">
              {t('practice.mobileSubtitle', {
                defaultValue:
                  'Jump into reviews, typing, and notebook work from your focused practice queue.',
              })}
            </p>
          </header>

          {/* Redesigned Recommended Card */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(recommendedPath)}
            className="w-full relative overflow-hidden rounded-[2.5rem] border border-indigo-600/20 bg-indigo-600 p-8 text-left shadow-2xl shadow-indigo-200/50 dark:shadow-indigo-900/20 mb-10 flex flex-col items-start justify-between whitespace-normal"
          >
            {/* Decorative Orbs */}
            <div className="absolute -right-16 -top-16 h-48 w-48 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-48 w-48 bg-indigo-400/20 rounded-full blur-3xl" />

            <div className="relative z-10 w-full">
              <div className="flex w-full items-start justify-between gap-4 mb-6">
                <div className="flex-1">
                  <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/90 backdrop-blur-md mb-4">
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 fill-current" />
                    {t('dashboard.practice.recommended', { defaultValue: 'Recommended next' })}
                  </div>
                  <h3 className="text-2xl font-black italic leading-tight text-white tracking-tight">
                    {recommendedTitle}
                  </h3>
                </div>
                <div className="rounded-[1.75rem] border border-white/20 bg-white/10 px-4 py-3 text-right backdrop-blur-md">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/60 mb-1">
                    {t('vocab.due', { defaultValue: 'Due Today' })}
                  </div>
                  <div className="text-2xl font-black text-white">{dueNow}</div>
                </div>
              </div>

              <p className="text-sm font-semibold leading-relaxed text-white/80 max-w-[85%] mb-8">
                {recommendedDescription}
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                    {t('vocab.mastered', { defaultValue: 'Mastered' })}
                  </div>
                  <div className="text-xl font-black text-white">{mastered}</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
                  <div className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-1">
                    {t('common.exams', { defaultValue: 'Exams' })}
                  </div>
                  <div className="text-xl font-black text-white">{topikExams.length}</div>
                </div>
              </div>
            </div>
          </motion.button>
        </div>
      )}

      <div
        className={cn(
          'grid gap-6 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 pb-12',
          isMobile ? 'grid-cols-1' : 'grid-cols-3 h-[500px]'
        )}
      >
        {cards.map((card, idx) => (
          <motion.button
            key={card.id}
            initial={!isMobile ? { opacity: 0, y: 20 } : false}
            animate={!isMobile ? { opacity: 1, y: 0 } : false}
            transition={{ delay: 0.1 * idx }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(card.path)}
            className={cn(
              'group relative overflow-hidden rounded-[2.5rem] border border-border bg-card p-8 text-left transition-all duration-500 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col justify-between',
              !isMobile && 'hover:flex-[1.25] h-full'
            )}
          >
            {/* Hover Gradient Overlay */}
            <div
              className={cn(
                'absolute inset-0 bg-gradient-to-br transition-opacity duration-700',
                card.accentClass,
                'opacity-[0.03] group-hover:opacity-10 dark:opacity-[0.02] dark:group-hover:opacity-[0.05]'
              )}
            />

            <div className="relative z-10 flex flex-col h-full">
              <div className="mb-8 flex items-center justify-between">
                <div className="w-16 h-16 rounded-[1.75rem] bg-muted flex items-center justify-center text-foreground border border-border shadow-sm group-hover:scale-110 transition-transform duration-500">
                  {React.cloneElement(
                    card.icon as React.ReactElement<{ size?: number; strokeWidth?: number }>,
                    { size: 28, strokeWidth: 2.5 }
                  )}
                </div>
                {card.meta && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    {card.meta}
                  </span>
                )}
              </div>

              <div className="mb-6">
                <div className="inline-flex rounded-full bg-muted/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-4">
                  {card.id === 'typing'
                    ? t('practice.mobileSkillLabel.typing', { defaultValue: 'Speed Drill' })
                    : card.id === 'spelling'
                      ? t('practice.mobileSkillLabel.spelling', { defaultValue: 'Recall Drill' })
                      : t('practice.mobileSkillLabel.notebook', {
                          defaultValue: 'Review Workspace',
                        })}
                </div>

                <h2 className="text-2xl font-black text-foreground italic tracking-tight mb-2">
                  {card.title}
                </h2>
                <p className="text-sm font-semibold text-muted-foreground leading-relaxed max-w-[90%]">
                  {card.subtitle}
                </p>
              </div>

              <div className="mt-auto">
                <div
                  className={cn(
                    'grid grid-cols-2 gap-4 mb-8 transition-all duration-500',
                    !isMobile && 'h-0 opacity-0 group-hover:h-auto group-hover:opacity-100'
                  )}
                >
                  {card.stats.map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-border bg-muted/30 p-4"
                    >
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">
                        {stat.label}
                      </p>
                      <p className={cn('text-xl font-black text-foreground', stat.highlight)}>
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="w-full h-14 rounded-2xl bg-zinc-900 dark:bg-indigo-600 px-6 font-black text-white flex items-center justify-between group-hover:bg-indigo-600 transition-colors duration-300">
                  <span className="text-xs uppercase tracking-widest">{card.ctaLabel}</span>
                  <ChevronRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
}
