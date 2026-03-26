import React, { useMemo } from 'react';
import { BookMarked, ChevronRight, Keyboard, Layers, Trophy } from 'lucide-react';
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

  return (
    <section className="mx-auto w-full max-w-7xl">
      <header className="mb-6 flex items-end justify-between gap-4 px-1">
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

      <div className={isMobile ? 'space-y-4' : 'flex gap-5 h-[500px]'}>
        {cards.map(card => (
          <Button
            key={card.id}
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => navigate(card.path)}
            className={`group relative ${isMobile ? 'w-full' : 'flex-1 hover:flex-[1.35]'} overflow-hidden rounded-[2rem] border text-left transition-all duration-500 ease-out p-6 sm:p-7 !block !whitespace-normal shadow-xl shadow-slate-200/45 dark:shadow-[0_20px_50px_rgba(2,6,23,0.55)] bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-700/80`}
          >
            <div
              className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accentClass} opacity-75 dark:opacity-25 group-hover:opacity-95 dark:group-hover:opacity-35 transition-opacity duration-500`}
            />

            <div className="pointer-events-none absolute inset-0 hidden dark:block bg-[radial-gradient(circle_at_20%_15%,rgba(148,163,184,0.16),transparent_45%),radial-gradient(circle_at_80%_0%,rgba(14,165,233,0.14),transparent_35%),linear-gradient(180deg,rgba(15,23,42,0.58),rgba(15,23,42,0.85))]" />

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="mb-6 flex items-start justify-between gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-600 flex items-center justify-center shadow-sm">
                    {card.icon}
                  </div>
                  {card.meta ? (
                    <span className="text-[11px] font-semibold text-slate-600/90 dark:text-slate-300/90 hidden md:inline">
                      {card.meta}
                    </span>
                  ) : null}
                </div>

                <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-1">
                  {card.title}
                </h2>
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 max-w-[88%] leading-relaxed">
                  {card.subtitle}
                </p>
              </div>

              <div className="mt-7">
                <div className="grid grid-cols-2 gap-3 md:h-0 md:opacity-0 md:group-hover:h-auto md:group-hover:opacity-100 overflow-hidden transition-all duration-500 md:group-hover:mb-5">
                  {card.stats.map(stat => (
                    <div
                      key={stat.label}
                      className="rounded-2xl border border-slate-200 dark:border-slate-600/80 bg-white/85 dark:bg-slate-950/45 p-3.5"
                    >
                      <p className="text-[10px] tracking-wider font-bold text-slate-500 dark:text-slate-400 uppercase">
                        {stat.label}
                      </p>
                      <p
                        className={`mt-1 text-xl font-black text-slate-900 dark:text-slate-100 ${stat.highlight || ''}`}
                      >
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="w-full rounded-2xl border border-slate-300 dark:border-slate-500/70 bg-slate-900 text-slate-100 dark:bg-slate-100 dark:text-slate-900 px-4 py-3.5 font-black transition-all duration-300 group-hover:brightness-110 flex items-center justify-center gap-2">
                  <span>{card.ctaLabel}</span>
                  <ChevronRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          </Button>
        ))}
      </div>
    </section>
  );
}
