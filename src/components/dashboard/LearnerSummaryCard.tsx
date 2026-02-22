import React from 'react';
import { useQuery } from 'convex/react';
import { Flame, Clock, BookOpen, Zap, BookText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import { Skeleton } from '../../components/common';
import { NoArgs, qRef } from '../../utils/convexRefs';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
} from '../ui/tooltip';

/* ────────────── types ────────────── */

type WeeklyDay = { day: string; minutes: number };

type UserStats = {
  streak: number;
  todayMinutes: number;
  dailyGoal: number;
  dailyProgress: number;
  weeklyActivity: WeeklyDay[];
  vocabStats: { total: number; dueReviews: number; mastered: number };
  grammarStats: { total: number; mastered: number };
  totalMinutes: number;
  todayWordsStudied: number;
  todayGrammarStudied: number;
};

type XpStats = { currentWeekXp: number; totalXp: number } | null;

/* ────────────── sub-components ────────────── */


const StatPairBox = ({
  icon,
  todayValue,
  totalValue,
  todayLabel,
  totalLabel,
  todaySubLabel,
  accent = 'text-white',
}: {
  icon: React.ReactNode;
  todayValue: string | number;
  totalValue: string | number;
  todayLabel: string;
  totalLabel: string;
  todaySubLabel: string;
  accent?: string;
}) => (
  <div className="flex flex-col items-center gap-1.5 px-2 py-2 min-w-[80px]">
    <div className="flex items-center gap-1.5 mb-0.5">
      {icon}
      <span className="text-[11px] font-semibold opacity-60">{todayLabel}</span>
    </div>
    <div className="flex items-baseline gap-2">
      <div className="flex flex-col items-center">
        <span className={`text-lg md:text-xl font-black ${accent}`}>{todayValue}</span>
        <span className="text-[9px] font-semibold opacity-50">{todaySubLabel}</span>
      </div>
      <span className="text-white/30 text-xs">/</span>
      <div className="flex flex-col items-center">
        <span className="text-lg md:text-xl font-black opacity-60">{totalValue}</span>
        <span className="text-[9px] font-semibold opacity-40">{totalLabel}</span>
      </div>
    </div>
  </div>
);

const WeeklyChart = ({ data }: { data: WeeklyDay[] }) => {
  const { i18n, t } = useTranslation();
  const max = Math.max(...data.map(d => d.minutes), 1);
  const locale =
    i18n.language === 'zh'
      ? 'zh-CN'
      : i18n.language === 'vi'
        ? 'vi-VN'
        : i18n.language === 'mn'
          ? 'mn-MN'
          : i18n.language === 'ko'
            ? 'ko-KR'
            : 'en-US';
  const shortFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const longFormatter = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  const baseMonday = new Date(Date.UTC(2024, 0, 1));
  const dayLabels = Array.from({ length: 7 }, (_, i) =>
    shortFormatter.format(new Date(baseMonday.getTime() + i * 86400000))
  );
  const fullDayLabels = Array.from({ length: 7 }, (_, i) =>
    longFormatter.format(new Date(baseMonday.getTime() + i * 86400000))
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-end justify-between gap-1.5 md:gap-2 h-full w-full px-1">
        {data.map((d, i) => {
          const pct = Math.max((d.minutes / max) * 100, 4);
          const isToday = i === (new Date().getDay() === 0 ? 6 : new Date().getDay() - 1);
          return (
            <Tooltip key={d.day}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center gap-1 flex-1 cursor-default">
                  <div className="w-full relative" style={{ height: 100 }}>
                    <div
                      className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-500 ${isToday
                        ? 'bg-gradient-to-t from-emerald-400 to-lime-300 shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                        : 'bg-white/25 hover:bg-white/40'
                        }`}
                      style={{ height: `${pct}%` }}
                    />
                  </div>
                  <span
                    className={`text-[10px] md:text-xs font-bold ${isToday ? 'text-lime-300' : 'opacity-60'}`}
                  >
                    {dayLabels[i]}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  side="top"
                  className="bg-card/95 backdrop-blur-md border border-border text-foreground px-3 py-2 rounded-xl shadow-xl"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-bold text-sm">
                      {fullDayLabels[i]}
                      {isToday && (
                        <span className="ml-1.5 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                          {t('learnerSummary.todayTag', { defaultValue: 'Today' })}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>⏱</span>
                      <span>
                        {t('learnerSummary.studyTooltip', {
                          defaultValue: 'Studied {{count}} min',
                          count: d.minutes,
                        })}
                      </span>
                    </div>
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};

/* ────────────── skeleton ────────────── */

const HeroSkeleton = () => (
  <div className="w-full rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-slate-800 dark:to-indigo-950 border-2 border-indigo-400/60 dark:border-indigo-800/40 p-6 md:p-8 text-white animate-pulse">
    <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-6">
      <div className="space-y-4">
        <Skeleton className="h-7 w-40 bg-white/20" />
        <Skeleton className="h-4 w-64 bg-white/15" />
        <Skeleton className="h-3 w-full bg-white/15 rounded-full" />
        <div className="flex gap-4 mt-4">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={`skeleton-${i}`} className="h-14 w-16 bg-white/15 rounded-xl" />
          ))}
        </div>
      </div>
      <Skeleton className="h-[130px] bg-white/10 rounded-xl" />
    </div>
  </div>
);

/* ────────────── main component ────────────── */

export const LearnerSummaryCard: React.FC = () => {
  const { language } = useAuth();
  const { t } = useTranslation();
  const labels = getLabels(language);

  const userStats = useQuery(qRef<NoArgs, UserStats>('userStats:getStats'));
  const xpStats = useQuery(qRef<NoArgs, XpStats>('xp:getMyXpStats'));

  if (userStats === undefined) return <HeroSkeleton />;
  if (!userStats) return null;

  const {
    streak,
    todayMinutes,
    dailyGoal: rawGoal,
    weeklyActivity,
    vocabStats,
    grammarStats,
    totalMinutes,
    todayWordsStudied,
    todayGrammarStudied,
  } = userStats;

  const dailyGoal = rawGoal || 30; // Prevent NaN
  const progressPercent = Math.min(100, Math.round((todayMinutes / dailyGoal) * 100));

  const l = labels.dashboard?.summary;

  return (
    <section className="w-full rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-slate-800 dark:to-indigo-950 border-2 border-indigo-400/60 dark:border-indigo-800/40 p-6 md:p-8 text-white shadow-lg overflow-hidden relative">
      {/* Subtle dot pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-[1fr_180px] lg:grid-cols-[1fr_220px] gap-6 md:gap-8">
        {/* ── Left: core metrics ── */}
        <div className="space-y-4">
          {/* Title + Streak */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl md:text-2xl font-black tracking-tight">
              {l?.title || t('learnerSummary.title', { defaultValue: 'Learning Summary' })}
            </h2>
            <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm px-3 py-1.5 rounded-full">
              <Flame className="w-4 h-4 text-orange-300" />
              <span className="font-bold text-sm">
                {(l?.streak || t('learnerSummary.streak', { defaultValue: '{count} day streak' })).replace('{count}', String(streak))}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div>
            <div className="flex justify-between text-sm mb-1.5 opacity-80 font-semibold">
              <span>{l?.progress || t('learnerSummary.progress', { defaultValue: "Today's progress" })}</span>
              <span>
                {todayMinutes} / {dailyGoal} {l?.minutes || t('learnerSummary.minutes', { defaultValue: 'min' })}
              </span>
            </div>
            <div className="h-3 bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-lime-300 to-emerald-400 dark:from-emerald-500 dark:to-teal-400 rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Goal achieved banner */}
          {progressPercent >= 100 && (
            <div className="text-center bg-white/15 rounded-xl py-2 font-bold text-sm">
              {l?.completed || t('learnerSummary.completed', { defaultValue: '✨ Goal completed today!' })}
            </div>
          )}


          {/* Bottom stat row — today vs cumulative pairs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-white/15 pt-3">
            <div className="bg-white/8 rounded-xl">
              <StatPairBox
                icon={<Clock className="w-3.5 h-3.5 opacity-70" />}
                todayValue={todayMinutes}
                totalValue={totalMinutes}
                todayLabel={t('learnerSummary.stats.studyToday', { defaultValue: 'Study' })}
                totalLabel={t('learnerSummary.stats.studyTotal', { defaultValue: 'Total Study' })}
                todaySubLabel={t('learnerSummary.todayTag', { defaultValue: 'Today' })}
              />
            </div>
            <div className="bg-white/8 rounded-xl">
              <StatPairBox
                icon={<BookOpen className="w-3.5 h-3.5 opacity-70" />}
                todayValue={todayWordsStudied}
                totalValue={vocabStats.total}
                todayLabel={t('learnerSummary.stats.wordsToday', { defaultValue: 'Words' })}
                totalLabel={t('learnerSummary.stats.wordsTotal', { defaultValue: 'Total Words' })}
                todaySubLabel={t('learnerSummary.todayTag', { defaultValue: 'Today' })}
                accent="text-emerald-200"
              />
            </div>
            <div className="bg-white/8 rounded-xl">
              <StatPairBox
                icon={<BookText className="w-3.5 h-3.5 opacity-70" />}
                todayValue={todayGrammarStudied}
                totalValue={grammarStats.total}
                todayLabel={t('learnerSummary.stats.grammarToday', { defaultValue: 'Grammar' })}
                totalLabel={t('learnerSummary.stats.grammarTotal', {
                  defaultValue: 'Total Grammar',
                })}
                todaySubLabel={t('learnerSummary.todayTag', { defaultValue: 'Today' })}
                accent="text-blue-200"
              />
            </div>
            <div className="bg-white/8 rounded-xl">
              <StatPairBox
                icon={<Zap className="w-3.5 h-3.5 text-yellow-300" />}
                todayValue={xpStats?.currentWeekXp ?? 0}
                totalValue={xpStats?.totalXp ?? 0}
                todayLabel="XP"
                totalLabel={t('learnerSummary.stats.xpTotal', { defaultValue: 'Total XP' })}
                todaySubLabel={t('learnerSummary.todayTag', { defaultValue: 'Today' })}
                accent="text-yellow-200"
              />
            </div>
          </div>
        </div>

        {/* ── Right: weekly chart ── */}
        <div className="flex flex-col">
          <h3 className="text-sm font-bold opacity-70 mb-2">
            {t('learnerSummary.weeklyActivity', { defaultValue: 'Weekly Activity' })}
          </h3>
          <div className="flex-1 min-h-[100px]">
            <WeeklyChart data={weeklyActivity} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LearnerSummaryCard;
