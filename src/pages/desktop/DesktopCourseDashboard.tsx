import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { StreakRow } from '../../components/desktop/ui/StreakRow';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { DRail } from '../../components/desktop/ui/DRail';
import { DesktopPrimaryActionCard } from '../../components/desktop/DesktopPrimaryActionCard';
import { DesktopTopikCountdownCard } from '../../components/desktop/DesktopTopikCountdownCard';
import { VOCAB, TOPIK, DAILY_CHALLENGES } from '../../utils/convexRefs';

import type { LearnerStatsDto } from '../../../convex/learningStats';

interface CourseProgress {
  courseId?: string;
  courseName?: string;
  lastUnitIndex?: number;
  completedUnits?: number[];
  totalUnits?: number;
  progressPercent?: number;
}

interface ReviewSummary {
  dueNow?: number;
  dueSoon?: number;
}

interface DailyPhrase {
  korean?: string;
  translation?: string;
}

const ZH_WEEKDAY_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

function getWeekdayLabels(language: string): string[] {
  const today = new Date();
  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (i === 0) {
      labels.push(language === 'zh' ? '今' : 'Now');
    } else if (language === 'zh') {
      labels.push(ZH_WEEKDAY_SHORT[d.getDay()]);
    } else {
      labels.push(d.toLocaleDateString(language, { weekday: 'short' }));
    }
  }
  return labels;
}

export default function DesktopCourseDashboard({
  courseProgress,
  reviewSummary,
  dailyPhrase,
  stats,
}: {
  courseProgress: CourseProgress | null;
  reviewSummary: ReviewSummary | null;
  dailyPhrase: DailyPhrase | null;
  stats: LearnerStatsDto | null;
}) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const dashboardLanguage = i18n.language || 'en';
  const navigate = useLocalizedNavigate();
  const [now] = React.useState(() => Date.now());

  const dueWords = useQuery(VOCAB.getDueForReview, user ? {} : 'skip');
  const todayChallenge = useQuery(
    DAILY_CHALLENGES.getTodayChallenge,
    user ? { language: dashboardLanguage } : 'skip'
  );
  const lobbyStats = useQuery(TOPIK.getLobbyStats, user ? {} : 'skip');
  const insights = useQuery(VOCAB.getDashboardInsights, user ? {} : 'skip');

  const dueNow = reviewSummary?.dueNow ?? 0;

  const weeklyMinutes = useMemo(() => {
    if (!stats?.weeklyActivity) return [0, 0, 0, 0, 0, 0, 0];
    return stats.weeklyActivity.map(d => (typeof d === 'number' ? d : d.minutes));
  }, [stats]);

  const weeklyTotalMinutes = useMemo(
    () => weeklyMinutes.reduce((sum, m) => sum + m, 0),
    [weeklyMinutes]
  );

  const dailyGoalMinutes = stats?.dailyGoal ?? 30;
  const weeklyGoalMinutes = dailyGoalMinutes * 7;
  const weeklyGoalHours = +(weeklyGoalMinutes / 60).toFixed(1);
  const weeklyTotalHours = (weeklyTotalMinutes / 60).toFixed(1);
  const weeklyProgressPct = Math.min(
    100,
    Math.round((weeklyTotalMinutes / Math.max(1, weeklyGoalMinutes)) * 100)
  );

  const activeWeekdayCount = useMemo(
    () => weeklyMinutes.filter(m => m > 0).length,
    [weeklyMinutes]
  );

  const weekdayLabels = useMemo(() => getWeekdayLabels(i18n.language), [i18n.language]);

  const upcomingReviews = useMemo(() => {
    if (!dueWords || dueWords.length === 0) return [];
    return dueWords.slice(0, 3).map(w => {
      const diffMin = w.next_review ? Math.max(0, Math.floor((w.next_review - now) / 60000)) : 0;
      let dueLabel = t('dashboard.desktop.now', { defaultValue: 'Now' });
      if (diffMin > 0 && diffMin < 60) {
        dueLabel = t('dashboard.desktop.minutesAgo', {
          count: diffMin,
          defaultValue: `${diffMin}m`,
        });
      } else if (diffMin >= 60 && diffMin < 1440) {
        dueLabel = t('dashboard.desktop.hoursAgo', {
          count: Math.floor(diffMin / 60),
          defaultValue: `${Math.floor(diffMin / 60)}h`,
        });
      } else if (diffMin >= 1440) {
        dueLabel = `${Math.floor(diffMin / 1440)}d`;
      }
      return { w: w.word, m: w.meaningZh || w.meaning, d: dueLabel };
    });
  }, [dueWords, now, t]);

  const currentUnitIndex = courseProgress?.lastUnitIndex ?? 0;
  const isGrammarDone =
    courseProgress?.completedUnits?.includes(currentUnitIndex) ?? false;
  const listeningDone = (stats?.todayActivities?.listeningsCompleted ?? 0) > 0;
  const challengeDone = todayChallenge?.isCompleted ?? false;

  type ModuleEntry = {
    kanji: string;
    label: string;
    done: boolean;
    cur: boolean;
    navTo: string;
  };

  const pathStrip: ModuleEntry[] = useMemo(() => {
    const reviewDone = dueNow === 0;
    return [
      {
        kanji: '復',
        label: t('dashboard.desktop.modules.review', { defaultValue: '复习' }),
        done: reviewDone,
        cur: !reviewDone,
        navTo: '/review',
      },
      {
        kanji: '文',
        label: t('dashboard.desktop.modules.grammar', { defaultValue: '语法' }),
        done: isGrammarDone,
        cur: reviewDone && !isGrammarDone,
        navTo: '/grammar',
      },
      {
        kanji: '聽',
        label: t('dashboard.desktop.modules.listening', { defaultValue: '听力' }),
        done: listeningDone,
        cur: reviewDone && isGrammarDone && !listeningDone,
        navTo: '/podcasts',
      },
      {
        kanji: '試',
        label: t('dashboard.desktop.modules.topik', { defaultValue: 'TOPIK' }),
        done: challengeDone,
        cur: reviewDone && isGrammarDone && listeningDone && !challengeDone,
        navTo: '/topik',
      },
    ];
  }, [dueNow, isGrammarDone, listeningDone, challengeDone, t]);

  const taskCount = useMemo(
    () => pathStrip.filter(p => !p.done).length,
    [pathStrip]
  );

  const dateStr = useMemo(() => {
    const d = new Date();
    if (i18n.language === 'zh') {
      const weekLabel = `星期${ZH_WEEKDAY_SHORT[d.getDay()]}`;
      return `${d.getMonth() + 1}月 ${d.getDate()}日 · ${weekLabel}`;
    }
    return `${d.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' })} · ${d.toLocaleDateString(i18n.language, { weekday: 'short' })}`;
  }, [i18n.language]);

  const lobbyWeakAreas = lobbyStats?.weakAreas ?? [];
  const normalizedCourseProgress =
    courseProgress?.courseId && courseProgress.courseName
      ? {
          courseId: courseProgress.courseId,
          courseName: courseProgress.courseName,
          lastUnitIndex: courseProgress.lastUnitIndex ?? 1,
          completedUnits: courseProgress.completedUnits ?? [],
        }
      : null;

  const showDailyPhraseBanner =
    !!dailyPhrase && (todayChallenge?.isCompleted || dueNow === 0);

  const content = (
    <div>
      {/* Hero */}
      <div className="mb-[22px] flex items-end gap-[22px]">
        <div className="flex-1">
          <div className="mb-1.5 font-k-serif text-[13px] tracking-[4px] text-k-crimson">
            {dateStr}
          </div>
          <div className="text-[36px] font-extrabold leading-[1.1] tracking-[-1px] text-k-ink">
            {t('dashboard.desktop.greeting', {
              name: user?.name?.split(' ')[0] || 'Learner',
              defaultValue: 'Hello',
            })}
          </div>
          <div className="mt-1.5 text-[14px] font-medium text-k-sub">
            {taskCount > 0
              ? t('dashboard.desktop.tasksLeftSummary', {
                  count: taskCount,
                  defaultValue: `还有 ${taskCount} 项任务待完成`,
                })
              : t('dashboard.desktop.allDone', {
                  defaultValue: '今日任务已完成 ✓',
                })}
          </div>
        </div>
        <DesktopCard
          pad={16}
          style={{
            width: 220,
            background:
              'linear-gradient(135deg, rgba(235,160,172,0.55) 0%, rgba(222,185,116,0.55) 100%)',
          }}
        >
          <div className="mb-1 text-[10px] font-extrabold tracking-[1.5px] text-k-sub">
            {t('dashboard.desktop.weeklyGoal', { defaultValue: 'Weekly Goal' })}
          </div>
          <div className="text-[26px] font-extrabold tracking-[-0.6px] text-k-ink">
            {weeklyTotalHours} / {weeklyGoalHours}{' '}
            <span className="text-[12px] font-bold text-k-sub">
              {t('dashboard.desktop.hours', { defaultValue: 'hours' })}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[rgba(31,27,23,0.1)]">
            <div
              className="h-full bg-k-ink"
              style={{ width: `${weeklyProgressPct}%` }}
            />
          </div>
        </DesktopCard>
      </div>

      {/* Primary Action */}
      <DesktopPrimaryActionCard
        dueNow={dueNow}
        todayChallenge={todayChallenge ?? null}
        weakAreas={lobbyWeakAreas}
        courseProgress={normalizedCourseProgress}
      />

      {/* Compact path strip */}
      <DesktopCard pad={0} className="mb-[22px]">
        <div className="flex items-center gap-3 border-b border-[rgba(31,27,23,0.08)] px-[18px] py-3">
          <HanjaSeal c="道" size={26} bg="var(--color-k-crimson)" round={7} />
          <div className="text-[12px] font-extrabold tracking-[0.4px] text-k-ink">
            {t('dashboard.desktop.todayPath', { defaultValue: "Today's Path" })}
          </div>
          <div className="ml-auto text-[10px] font-bold text-k-sub">
            {pathStrip.filter(p => p.done).length} / {pathStrip.length}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-[1px] bg-[rgba(31,27,23,0.08)]">
          {pathStrip.map((p, i) => (
            <button
              key={`${p.kanji}-${i}`}
              type="button"
              onClick={() => navigate(p.navTo)}
              className="flex cursor-pointer items-center gap-2.5 bg-k-card px-[14px] py-[12px] text-left transition-colors hover:bg-k-bg2"
              style={{ opacity: p.done ? 0.55 : 1 }}
            >
              <HanjaSeal
                c={p.kanji}
                size={28}
                bg={
                  p.done
                    ? 'var(--color-k-mint-deep)'
                    : p.cur
                    ? 'var(--color-k-ink)'
                    : 'var(--color-k-sub-light)'
                }
                round={7}
              />
              <div className="flex-1 text-[12px] font-extrabold tracking-[-0.2px] text-k-ink">
                <span style={{ textDecoration: p.done ? 'line-through' : 'none' }}>
                  {p.label}
                </span>
              </div>
              {p.done && <span className="text-[14px] text-k-mint-deep">✓</span>}
              {p.cur && (
                <span className="rounded-md bg-k-ink px-1.5 py-0.5 text-[8px] font-extrabold tracking-[1px] text-k-bg">
                  {t('dashboard.desktop.now', { defaultValue: 'NOW' })}
                </span>
              )}
            </button>
          ))}
        </div>
      </DesktopCard>

      {/* Activity + Insights */}
      <div className="mb-[22px] grid grid-cols-[1.4fr_1fr] gap-[18px]">
        <DesktopCard>
          <div className="mb-4 flex items-baseline">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">
              績
            </span>
            <span className="text-[14px] font-extrabold text-k-ink">
              {t('dashboard.desktop.weeklyActivity', { defaultValue: 'Activity' })}
            </span>
            <span
              className="ml-auto cursor-pointer text-[11px] font-bold text-k-sub hover:text-k-ink"
              onClick={() => navigate('/profile')}
            >
              {t('dashboard.desktop.viewAll', { defaultValue: 'View all' })} →
            </span>
          </div>
          <div className="flex h-[90px] items-end gap-2.5">
            {(() => {
              const maxVal = Math.max(60, ...weeklyMinutes);
              return weeklyMinutes.map((v, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-sm"
                    style={{
                      height: `${Math.max(2, (v / maxVal) * 90)}px`,
                      background:
                        i === 6 ? 'var(--color-k-ink)' : 'var(--color-k-crimson)',
                      opacity: i === 6 ? 1 : 0.85,
                    }}
                  />
                  <div className="text-[10px] font-bold text-k-sub">
                    {weekdayLabels[i]}
                  </div>
                </div>
              ));
            })()}
          </div>
        </DesktopCard>

        <DesktopCard>
          <div className="mb-3 flex items-baseline">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">
              洞
            </span>
            <span className="text-[14px] font-extrabold text-k-ink">
              {t('dashboard.desktop.insights.title', { defaultValue: '30 天洞见' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[20px] font-extrabold tracking-[-0.4px] text-k-ink">
                {insights?.retentionRate30d != null
                  ? `${Math.round(insights.retentionRate30d)}%`
                  : '—'}
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-k-sub">
                {t('dashboard.desktop.insights.retention', { defaultValue: '记忆留存' })}
              </div>
            </div>
            <div>
              <div className="text-[20px] font-extrabold tracking-[-0.4px] text-k-ink">
                {insights?.activeDays30d ?? '—'}
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-k-sub">
                {t('dashboard.desktop.insights.activeDays', { defaultValue: '活跃天数' })}
              </div>
            </div>
            <div>
              <div className="text-[20px] font-extrabold tracking-[-0.4px] text-k-ink">
                {insights?.totalReviews30d ?? '—'}
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-k-sub">
                {t('dashboard.desktop.insights.reviews', { defaultValue: '总复习数' })}
              </div>
            </div>
          </div>
          {insights?.heatmap?.length ? (
            <div className="mt-3 grid grid-cols-[repeat(14,minmax(0,1fr))] gap-[3px]">
              {insights.heatmap.slice(-28).map((cell, idx) => (
                <div
                  key={`${cell.date}-${idx}`}
                  className="aspect-square rounded-[3px]"
                  style={{
                    background:
                      cell.intensity === 0
                        ? 'rgba(31,27,23,0.06)'
                        : cell.intensity === 1
                        ? 'rgba(91,132,114,0.30)'
                        : cell.intensity === 2
                        ? 'rgba(91,132,114,0.55)'
                        : cell.intensity === 3
                        ? 'rgba(91,132,114,0.80)'
                        : 'var(--color-k-mint-deep)',
                    outline: cell.isToday
                      ? '1.5px solid var(--color-k-ink)'
                      : 'none',
                  }}
                  title={cell.date}
                />
              ))}
            </div>
          ) : null}
        </DesktopCard>
      </div>

      {/* Daily phrase (only when challenge already done/no due) */}
      {showDailyPhraseBanner && dailyPhrase ? (
        <DesktopCard
          pad={20}
          style={{ background: 'var(--color-k-indigo)', color: 'var(--color-k-card)' }}
          className="relative mb-[22px]"
        >
          <div className="absolute -right-1.5 -top-2 font-k-serif text-[90px] font-medium leading-[1] text-[rgba(255,255,255,0.08)]">
            語
          </div>
          <DesignChip tone="ink" size="sm">
            {t('dashboard.desktop.dailyPhrase', { defaultValue: '今日金句' })}
          </DesignChip>
          <div className="mt-2.5 text-[17px] font-extrabold leading-[1.3]">
            {dailyPhrase.korean}
          </div>
          <div className="mt-1 text-[11px] opacity-75">{dailyPhrase.translation}</div>
        </DesktopCard>
      ) : null}
    </div>
  );

  const right = (
    <div className="max-h-[calc(100vh-100px)] w-[320px] shrink-0 overflow-y-auto pl-[22px]">
      <DRail
        kanji="火"
        title={t('dashboard.desktop.streak', { defaultValue: 'Streak' })}
        pad={16}
      >
        <div className="mb-3 flex items-baseline gap-1.5">
          <span className="text-[32px] font-extrabold tracking-[-1px] text-k-ink">
            {stats?.streak ?? 0}
          </span>
          <span className="text-[11px] font-bold text-k-sub">
            {t('dashboard.desktop.consecutiveDays', { defaultValue: 'days' })}
          </span>
          <span className="ml-auto text-[18px]">🔥</span>
        </div>
        <StreakRow done={activeWeekdayCount} />
      </DRail>

      <DRail
        kanji="記"
        title={t('dashboard.desktop.upcomingReviews', { defaultValue: 'Upcoming' })}
        action={`${t('dashboard.desktop.reviewCta', { defaultValue: 'Review' })} →`}
        onActionClick={() => navigate('/review')}
        pad={14}
      >
        {upcomingReviews.length === 0 ? (
          <div className="py-6 text-center text-[11px] font-semibold text-k-sub opacity-50">
            {t('dashboard.desktop.noUpcomingReviews', { defaultValue: 'No reviews' })}
          </div>
        ) : (
          upcomingReviews.map((r, i) => (
            <div
              key={`${r.w}-${i}`}
              className="flex items-center gap-2.5 py-[7px]"
              style={{
                borderBottom:
                  i < upcomingReviews.length - 1
                    ? '1px solid var(--color-k-line)'
                    : 'none',
              }}
            >
              <div className="flex-1">
                <div className="text-[13px] font-extrabold tracking-[-0.2px] text-k-ink">
                  {r.w}
                </div>
                <div className="text-[10px] font-semibold text-k-sub">{r.m}</div>
              </div>
              <DesignChip tone="muted" size="sm">
                {r.d}
              </DesignChip>
            </div>
          ))
        )}
      </DRail>

      <DesktopTopikCountdownCard
        upcomingExam={lobbyStats?.upcomingExam ?? null}
        weakAreas={lobbyWeakAreas}
      />
    </div>
  );

  return (
    <div className="flex font-sans">
      <div className="flex-1">{content}</div>
      {right}
    </div>
  );
}
