import React, { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from 'convex/react';
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
import {
  ABILITY_PROFILER,
  COMMUNITY_INSIGHTS,
  DAILY_CHALLENGES,
  DAILY_TASK,
  IMPORTED_CONTENT,
  NOTE_PAGES,
  READING_PROGRESS,
  RECOMMENDATIONS,
  TOPIK,
  VOCAB,
} from '../../utils/convexRefs';
import type { AbilityDimensions } from '../../utils/convexRefs';

import type { LearnerStatsDto } from '../../../convex/learningStats';

import type {
  DailyTaskItemDto,
  DailyTaskKind,
  DailyTaskPlanDto,
} from '../../../convex/dailyTask/shared';

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

const TASK_KIND_META: Record<DailyTaskKind, { kanji: string; bg: string }> = {
  vocab_20: { kanji: '詞', bg: 'var(--color-k-pink-deep)' },
  grammar_drill: { kanji: '法', bg: 'var(--color-k-mint-deep)' },
  listening_10min: { kanji: '聽', bg: 'var(--color-k-butter-deep)' },
  typing_wpm: { kanji: '寫', bg: 'var(--color-k-lilac-deep)' },
  note_review: { kanji: '記', bg: 'var(--color-k-sky-deep)' },
  sentence_review: { kanji: '句', bg: 'var(--color-k-mint-deep)' },
  grammar_review: { kanji: '法', bg: 'var(--color-k-butter-deep)' },
  topik_rewrite: { kanji: '改', bg: 'var(--color-k-lilac-deep)' },
};

type ToolkitCard = {
  kanji: string;
  label: string;
  subtitle: string;
  bg: string;
  path: string;
};

const RADAR_LABELS: { key: keyof AbilityDimensions; labelZh: string }[] = [
  { key: 'vocabulary', labelZh: '词汇' },
  { key: 'grammar', labelZh: '语法' },
  { key: 'reading', labelZh: '阅读' },
  { key: 'writing', labelZh: '写作' },
  { key: 'listening', labelZh: '听力' },
];

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

function formatNumber(value: number): string {
  return value.toLocaleString();
}

function getReadingLabel(contentType?: string): string {
  if (contentType === 'news_article') return '新闻阅读';
  if (contentType === 'textbook_unit') return '课文阅读';
  return '阅读';
}

function DailyTaskRow({
  task,
  isLast,
  navigate,
  onComplete,
}: {
  task: DailyTaskItemDto;
  isLast: boolean;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  onComplete: (taskId: string) => void;
}) {
  const meta = TASK_KIND_META[task.kind] ?? {
    kanji: '任',
    bg: 'var(--color-k-crimson)',
  };
  const target = task.targetCount ?? 1;
  const current = Math.min(task.currentCount ?? 0, target);
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const xp = typeof task.metadata?.rewardXp === 'number' ? task.metadata.rewardXp : 0;

  return (
    <div
      className="group flex items-center gap-3.5 px-[18px] py-[13px] transition-colors hover:bg-k-bg2"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-k-line)',
        opacity: task.completed ? 0.62 : 1,
      }}
    >
      <HanjaSeal
        c={meta.kanji}
        size={34}
        bg={task.completed ? 'var(--color-k-mint-deep)' : meta.bg}
        round={9}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`truncate text-[13px] font-extrabold text-k-ink ${task.completed ? 'line-through' : ''}`}
          >
            {task.title}
          </span>
          {xp > 0 && <span className="text-[9px] font-black text-k-crimson">+{xp} XP</span>}
        </div>
        {task.description ? (
          <div className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-k-sub">
            {task.description}
          </div>
        ) : null}
        {target > 1 ? (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-k-line">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  background: task.completed
                    ? 'var(--color-k-mint-deep)'
                    : 'var(--color-k-crimson)',
                }}
              />
            </div>
            <span className="shrink-0 text-[10px] font-black text-k-sub">
              {current}/{target}
            </span>
          </div>
        ) : null}
      </div>
      {task.completed ? (
        <span className="shrink-0 text-[14px] font-black text-k-mint-deep">✓</span>
      ) : (
        <button
          type="button"
          onClick={event => {
            event.stopPropagation();
            if (task.linkPath) {
              navigate(task.linkPath);
              return;
            }
            onComplete(task.taskId);
          }}
          className="shrink-0 rounded-lg bg-k-ink px-3 py-1.5 text-[10px] font-black text-k-bg opacity-0 transition-opacity hover:bg-k-ink/85 group-hover:opacity-100"
        >
          GO →
        </button>
      )}
    </div>
  );
}

function DailyTaskCockpit({
  plan,
  navigate,
  onComplete,
}: {
  plan: DailyTaskPlanDto;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  onComplete: (taskId: string) => void;
}) {
  const completedCount = plan.tasks.filter(task => task.completed).length;
  const totalCount = plan.tasks.length;
  const allDone = plan.status === 'completed';

  return (
    <DesktopCard pad={0} className="mb-[22px] overflow-hidden">
      <div className="flex items-center justify-between border-b border-k-line px-[18px] py-[13px]">
        <div className="flex items-center gap-2.5">
          <span className="font-k-serif text-[16px] font-medium text-k-crimson">任</span>
          <span className="text-[14px] font-extrabold text-k-ink">今日任务</span>
          <DesignChip tone={allDone ? 'mint' : 'muted'} size="sm">
            {completedCount}/{totalCount}
          </DesignChip>
        </div>
        <span className="text-[10px] font-bold text-k-sub">{plan.date}</span>
      </div>
      <div className="h-[3px] w-full bg-k-line">
        <div
          className="h-full transition-all duration-700"
          style={{
            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
            background: allDone ? 'var(--color-k-mint-deep)' : 'var(--color-k-crimson)',
          }}
        />
      </div>
      {plan.rationale ? (
        <div className="border-b border-k-line bg-k-bg2/60 px-[18px] py-[10px] text-[11px] font-semibold leading-relaxed text-k-sub">
          {plan.rationale}
        </div>
      ) : null}
      {plan.tasks.map((task, index) => (
        <DailyTaskRow
          key={task.taskId}
          task={task}
          isLast={index === plan.tasks.length - 1}
          navigate={navigate}
          onComplete={onComplete}
        />
      ))}
    </DesktopCard>
  );
}

function AbilityRadar({ dimensions }: { dimensions: AbilityDimensions }) {
  const cx = 80;
  const cy = 80;
  const r = 58;
  const n = RADAR_LABELS.length;
  const angleStep = (2 * Math.PI) / n;
  const startAngle = -Math.PI / 2;
  const values = RADAR_LABELS.map(label => dimensions[label.key] ?? 0);
  const polygon = (scale: number) =>
    RADAR_LABELS.map((_, index) => {
      const angle = startAngle + index * angleStep;
      return `${cx + scale * r * Math.cos(angle)},${cy + scale * r * Math.sin(angle)}`;
    }).join(' ');
  const dataPolygon = values
    .map((value, index) => {
      const angle = startAngle + index * angleStep;
      const scaled = (Math.max(0, Math.min(100, value)) / 100) * r;
      return `${cx + scaled * Math.cos(angle)},${cy + scaled * Math.sin(angle)}`;
    })
    .join(' ');

  return (
    <svg viewBox="0 0 160 160" className="mx-auto w-full max-w-[178px]">
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <polygon
          key={scale}
          points={polygon(scale)}
          fill="none"
          stroke="var(--color-k-line)"
          strokeWidth={0.5}
        />
      ))}
      {RADAR_LABELS.map((label, index) => {
        const angle = startAngle + index * angleStep;
        const x = cx + (r + 14) * Math.cos(angle);
        const y = cy + (r + 14) * Math.sin(angle);
        const anchor =
          Math.abs(Math.cos(angle)) < 0.1 ? 'middle' : Math.cos(angle) > 0 ? 'start' : 'end';
        return (
          <React.Fragment key={label.key}>
            <line
              x1={cx}
              y1={cy}
              x2={cx + r * Math.cos(angle)}
              y2={cy + r * Math.sin(angle)}
              stroke="var(--color-k-line)"
              strokeWidth={0.5}
            />
            <text
              x={x}
              y={y + 3}
              textAnchor={anchor}
              className="fill-k-sub"
              style={{ fontSize: '8px', fontWeight: 700 }}
            >
              {label.labelZh}
            </text>
          </React.Fragment>
        );
      })}
      <polygon
        points={dataPolygon}
        fill="var(--color-k-crimson)"
        fillOpacity={0.15}
        stroke="var(--color-k-crimson)"
        strokeWidth={1.5}
      />
      {values.map((value, index) => {
        const angle = startAngle + index * angleStep;
        const scaled = (Math.max(0, Math.min(100, value)) / 100) * r;
        return (
          <circle
            key={`${RADAR_LABELS[index].key}-${value}`}
            cx={cx + scaled * Math.cos(angle)}
            cy={cy + scaled * Math.sin(angle)}
            r={2.4}
            fill="var(--color-k-crimson)"
          />
        );
      })}
    </svg>
  );
}

export default function DesktopCourseDetailPage({
  courseProgress,
  reviewSummary,
  dailyPhrase,
  stats,
  dailyTaskPlan,
}: {
  courseProgress: CourseProgress | null;
  reviewSummary: ReviewSummary | null;
  dailyPhrase: DailyPhrase | null;
  stats: LearnerStatsDto | null;
  dailyTaskPlan: DailyTaskPlanDto | null;
}) {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('public');
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
  const noteFacets = useQuery(NOTE_PAGES.listFacets, {});
  const importedStudyStates = useQuery(
    IMPORTED_CONTENT.listStudyStates,
    user ? { limit: 2 } : 'skip'
  );
  const recentReading = useQuery(READING_PROGRESS.getRecentReading, user ? { limit: 3 } : 'skip');
  const nextAction = useQuery(
    RECOMMENDATIONS.getNextBestAction,
    user ? { localHour: new Date(now).getHours() } : 'skip'
  );
  const abilityScores = useQuery(ABILITY_PROFILER.getLiveAbilityScores, user ? {} : 'skip');
  const communityStanding = useQuery(COMMUNITY_INSIGHTS.getMyStanding, user ? {} : 'skip');
  const updateTaskCompletion = useMutation(DAILY_TASK.updateTaskCompletion);

  const handleTaskComplete = useCallback(
    (taskId: string) => {
      void updateTaskCompletion({ taskId, completed: true });
    },
    [updateTaskCompletion]
  );

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
  const isGrammarDone = courseProgress?.completedUnits?.includes(currentUnitIndex) ?? false;
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
        kanji: '筆',
        label: '写作教练',
        done: false, // AI Coach is an ongoing tool
        cur: reviewDone && isGrammarDone && listeningDone && !challengeDone,
        navTo: '/topik/writing-coach',
      },
      {
        kanji: '試',
        label: t('dashboard.desktop.modules.topik', { defaultValue: 'TOPIK' }),
        done: challengeDone,
        cur: false,
        navTo: '/topik',
      },
    ];
  }, [dueNow, isGrammarDone, listeningDone, challengeDone, t]);

  const taskCount = useMemo(() => pathStrip.filter(p => !p.done).length, [pathStrip]);

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

  const showDailyPhraseBanner = !!dailyPhrase && (todayChallenge?.isCompleted || dueNow === 0);

  const mistakeCount =
    noteFacets?.noteTypes.find(
      item =>
        item.key === '错题' || item.key === t('coursesOverview.desktop.notebook.types.mistakes')
    )?.count ?? 0;

  const toolkitCards = useMemo<ToolkitCard[]>(
    () => [
      {
        kanji: '句',
        label: 'AI 句子解释',
        subtitle: '导入真实韩语内容，逐句解释并保存到复习',
        bg: 'var(--color-k-indigo)',
        path: '/learning/text-import',
      },
      {
        kanji: '詞',
        label: t('dashboard.desktop.vocabBook', { defaultValue: 'Vocabulary' }),
        subtitle: stats
          ? `${formatNumber(stats.vocabStats?.total ?? 0)} ${t('dashboard.desktop.vocabBook', { defaultValue: 'Vocabulary' })} · ${formatNumber(stats.vocabStats?.dueReviews ?? 0)} ${t('dashboard.desktop.reviewCta', { defaultValue: 'Review' })}`
          : t('common.loading', { defaultValue: 'Loading...' }),
        bg: 'var(--color-k-pink-deep)',
        path: '/vocab-book',
      },
      {
        kanji: '筆',
        label: '写作教练',
        subtitle: 'AI 实时作文批改',
        bg: 'var(--color-k-jade)',
        path: '/topik/writing-coach',
      },
      {
        kanji: '誤',
        label: t('dashboard.desktop.incorrectBook', { defaultValue: 'Incorrect book' }),
        subtitle: `${mistakeCount} ${t('common.items', { defaultValue: 'items' })}`,
        bg: 'var(--color-k-crimson)',
        path: '/review',
      },
      {
        kanji: '記',
        label: t('dashboard.desktop.notebook', { defaultValue: 'Notebook' }),
        subtitle: noteFacets
          ? `${noteFacets.total} ${t('coursesOverview.desktop.notebook.noteCount', { count: noteFacets.total })}`
          : t('common.loading', { defaultValue: 'Loading...' }),
        bg: 'var(--color-k-butter-deep)',
        path: '/notebook',
      },
      {
        kanji: '報',
        label: '学习周报',
        subtitle: '周度学习分析与建议',
        bg: 'var(--color-k-indigo)',
        path: '/dashboard/weekly-report',
      },
      {
        kanji: '旗',
        label: t('dashboard.desktop.achievements', { defaultValue: 'Achievements' }),
        subtitle: t('dashboard.desktop.tasksLeft', {
          count: stats?.vocabStats?.mastered ?? 0,
          defaultValue: 'Mastered',
        }),
        bg: 'var(--color-k-mint-deep)',
        path: '/achievements',
      },
    ],
    [mistakeCount, noteFacets, stats, t]
  );
  const activeImportedContent = importedStudyStates?.[0] ?? null;

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
          onClick={() => navigate('/dashboard/weekly-report')}
          className="cursor-pointer hover:shadow-k-sh-lg transition-all"
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
            <div className="h-full bg-k-ink" style={{ width: `${weeklyProgressPct}%` }} />
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

      <DesktopCard pad={18} className="mb-[22px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3.5">
            <HanjaSeal c="句" size={42} bg="var(--color-k-indigo)" round={10} />
            <div>
              <div className="text-[10px] font-black uppercase tracking-[1.4px] text-k-sub">
                AI 句子解释
              </div>
              <div className="text-[17px] font-black text-k-ink">
                把真实韩语内容拆成可复习的句子、词汇和语法
              </div>
              <div className="mt-1 text-[11px] font-semibold text-k-sub">
                {activeImportedContent
                  ? `最近导入：${activeImportedContent.title} · 已保存 ${activeImportedContent.savedSentenceCount} 句`
                  : '粘贴文章、台词或邮件，系统会自动断句并进入 AI 精读。'}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {activeImportedContent?.nextSentenceId ? (
              <button
                type="button"
                onClick={() =>
                  navigate(`/learning/sentence/${activeImportedContent.nextSentenceId}`)
                }
                className="rounded-xl bg-k-ink px-4 py-2 text-[11px] font-black text-k-bg transition-colors hover:bg-k-ink/85"
              >
                继续最近导入
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => navigate('/learning/text-import')}
              className="rounded-xl border border-k-line px-4 py-2 text-[11px] font-black text-k-ink transition-colors hover:bg-k-bg2"
            >
              打开句子解释
            </button>
          </div>
        </div>
      </DesktopCard>

      {dailyTaskPlan?.tasks.length ? (
        <DailyTaskCockpit
          plan={dailyTaskPlan}
          navigate={navigate}
          onComplete={handleTaskComplete}
        />
      ) : null}

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
        <div className="grid grid-cols-5 gap-[1px] bg-[rgba(31,27,23,0.08)]">
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
                <span style={{ textDecoration: p.done ? 'line-through' : 'none' }}>{p.label}</span>
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

      <div className="mb-[22px] grid grid-cols-2 gap-[18px]">
        <DesktopCard pad={0}>
          <div className="flex items-center border-b border-k-line px-[18px] py-[13px]">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">續</span>
            <span className="text-[13px] font-extrabold text-k-ink">
              {t('dashboard.desktop.continueLearning', { defaultValue: 'Continue Learning' })}
            </span>
          </div>
          {recentReading && recentReading.length > 0 ? (
            recentReading.slice(0, 3).map((item, index, items) => (
              <button
                key={item._id}
                type="button"
                onClick={() => navigate(`/reading/${item.contentId}`)}
                className="flex w-full cursor-pointer items-center gap-3 px-[18px] py-[12px] text-left transition-colors hover:bg-k-bg2"
                style={{
                  borderBottom: index < items.length - 1 ? '1px solid var(--color-k-line)' : 'none',
                }}
              >
                <HanjaSeal c="讀" size={28} bg="var(--color-k-sky-deep)" round={7} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-extrabold text-k-ink">
                    {getReadingLabel(item.contentType)}
                  </span>
                  <span className="block text-[10px] font-bold text-k-sub">
                    {item.readingTimeSeconds
                      ? `已读 ${Math.round((item.readingTimeSeconds ?? 0) / 60)} 分钟`
                      : '继续阅读'}
                  </span>
                </span>
                <span className="text-[14px] text-k-sub-light">›</span>
              </button>
            ))
          ) : (
            <div className="px-[18px] py-[16px] text-center">
              <div className="text-[11px] font-bold text-k-sub/60">
                {t('dashboard.desktop.noRecentReading', {
                  defaultValue: 'Start reading to see your progress here',
                })}
              </div>
              <button
                type="button"
                onClick={() => navigate('/reading')}
                className="mt-2 text-[11px] font-bold text-k-crimson hover:underline"
              >
                {t('dashboard.desktop.goToReading', {
                  defaultValue: 'Browse reading materials →',
                })}
              </button>
            </div>
          )}
        </DesktopCard>

        <DesktopCard pad={0}>
          <div className="flex items-center border-b border-k-line px-[18px] py-[13px]">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">智</span>
            <span className="text-[13px] font-extrabold text-k-ink">
              {t('dashboard.desktop.aiSuggestion', { defaultValue: 'AI Suggestion' })}
            </span>
          </div>
          <div className="px-[18px] py-[16px]">
            {nextAction ? (
              <button
                type="button"
                onClick={() => navigate(nextAction.path)}
                className="w-full cursor-pointer rounded-xl border border-k-line/20 bg-gradient-to-br from-k-bg2 to-white p-4 text-left transition-all hover:shadow-sm"
              >
                <div className="mb-1.5 flex items-center gap-2">
                  <HanjaSeal c={nextAction.seal} size={22} bg="var(--color-k-crimson)" round={5} />
                  <span className="text-[12px] font-extrabold text-k-ink">
                    {t(`dashboard.nba.${nextAction.kind}`, {
                      defaultValue: nextAction.kind,
                      count: nextAction.count,
                    })}
                  </span>
                </div>
                <div className="text-[11px] leading-relaxed text-k-sub">
                  {t(`dashboard.nba.reason.${nextAction.reasonCode}`, {
                    defaultValue: nextAction.reasonCode,
                  })}
                </div>
                {nextAction.count > 0 ? (
                  <div className="mt-2 text-[10px] font-bold text-k-crimson">
                    {nextAction.count}{' '}
                    {t('dashboard.desktop.itemsPending', { defaultValue: 'items' })}
                  </div>
                ) : null}
              </button>
            ) : (
              <div className="rounded-xl border border-k-line/20 bg-k-bg2 p-4 text-[11px] font-bold leading-relaxed text-k-sub/80">
                {t('dashboard.desktop.defaultSuggestion', {
                  defaultValue:
                    'Start by explaining a Korean sentence you recently encountered — the system will help you save vocabulary and grammar for review.',
                })}
              </div>
            )}
          </div>
        </DesktopCard>
      </div>

      {/* Activity + Insights */}
      <div className="mb-[22px] grid grid-cols-[1.4fr_1fr] gap-[18px]">
        <DesktopCard>
          <div className="mb-4 flex items-baseline">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">績</span>
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
                      background: i === 6 ? 'var(--color-k-ink)' : 'var(--color-k-crimson)',
                      opacity: i === 6 ? 1 : 0.85,
                    }}
                  />
                  <div className="text-[10px] font-bold text-k-sub">{weekdayLabels[i]}</div>
                </div>
              ));
            })()}
          </div>
        </DesktopCard>

        <DesktopCard>
          <div className="mb-3 flex items-baseline">
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">洞</span>
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
                    outline: cell.isToday ? '1.5px solid var(--color-k-ink)' : 'none',
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

      <DesktopCard pad={0}>
        <div className="flex items-center border-b border-k-line px-[18px] py-[14px]">
          <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">庫</span>
          <span className="text-[14px] font-extrabold text-k-ink">
            {t('dashboard.desktop.myResources', { defaultValue: 'My resources' })}
          </span>
        </div>
        <div className="grid grid-cols-2">
          {toolkitCards.map((card, index) => (
            <button
              key={card.path}
              type="button"
              onClick={() => navigate(card.path)}
              className="flex cursor-pointer items-center gap-3 px-[18px] py-[14px] text-left transition-colors hover:bg-k-bg2"
              style={{
                borderRight: index % 2 === 0 ? '1px solid var(--color-k-line)' : 'none',
                borderBottom:
                  index < toolkitCards.length - 2 ? '1px solid var(--color-k-line)' : 'none',
              }}
            >
              <HanjaSeal c={card.kanji} size={34} bg={card.bg} round={9} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-extrabold text-k-ink">
                  {card.label}
                </span>
                <span className="block truncate text-[11px] font-semibold text-k-sub">
                  {card.subtitle}
                </span>
              </span>
              <span className="text-[16px] text-k-sub-light">›</span>
            </button>
          ))}
        </div>
      </DesktopCard>
    </div>
  );

  const right = (
    <div className="max-h-[calc(100vh-100px)] w-[320px] shrink-0 overflow-y-auto pl-[22px]">
      <DRail kanji="火" title={t('dashboard.desktop.streak', { defaultValue: 'Streak' })} pad={16}>
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
                  i < upcomingReviews.length - 1 ? '1px solid var(--color-k-line)' : 'none',
              }}
            >
              <div className="flex-1">
                <div className="text-[13px] font-extrabold tracking-[-0.2px] text-k-ink">{r.w}</div>
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

      {abilityScores ? (
        <DRail
          kanji="能"
          title={t('dashboard.desktop.abilityProfile', { defaultValue: 'Ability Profile' })}
          pad={14}
        >
          <AbilityRadar dimensions={abilityScores.dimensions} />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-k-sub">
                {t('dashboard.desktop.estimatedTopik', { defaultValue: 'Est. TOPIK' })}
              </span>
              <span className="font-k-serif text-[18px] font-black text-k-crimson">
                Lv.{abilityScores.estimatedTopikLevel ?? '?'}
              </span>
            </div>
            <div className="text-[10px] font-bold text-k-sub">
              {t('dashboard.desktop.overall', { defaultValue: 'Overall' })}{' '}
              {Math.round(abilityScores.overallScore)}
            </div>
          </div>
          <div className="mt-2 text-[9px] font-bold italic text-k-sub/50">
            {abilityScores.source === 'snapshot'
              ? t('dashboard.desktop.snapshotBased', { defaultValue: 'Based on recent snapshot' })
              : t('dashboard.desktop.liveEstimate', { defaultValue: 'Live estimate' })}
          </div>
        </DRail>
      ) : null}

      {communityStanding && communityStanding.totalWords > 0 ? (
        <DRail
          kanji="群"
          title={t('dashboard.desktop.communityStanding', { defaultValue: 'Community' })}
          pad={14}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-k-sub">
                {t('dashboard.desktop.yourWords', { defaultValue: 'Your words' })}
              </span>
              <span className="font-k-serif text-[14px] font-extrabold text-k-ink">
                {communityStanding.totalWords}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-k-sub">
                {t('dashboard.desktop.mastered', { defaultValue: 'Mastered' })}
              </span>
              <span className="font-k-serif text-[14px] font-extrabold text-k-mint">
                {communityStanding.masteredWords}
              </span>
            </div>
            {communityStanding.communityAvgWords > 0 ? (
              <>
                <div className="h-px bg-k-line" />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-k-sub">
                    {t('dashboard.desktop.communityAvg', { defaultValue: 'Community avg' })}
                  </span>
                  <span className="font-k-serif text-[14px] font-extrabold text-k-sub">
                    {communityStanding.communityAvgWords}
                  </span>
                </div>
                <div className="relative h-[6px] overflow-hidden rounded-full bg-k-line">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-k-crimson transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          (communityStanding.totalWords /
                            Math.max(communityStanding.communityAvgWords * 2, 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </>
            ) : null}
          </div>
        </DRail>
      ) : null}
    </div>
  );

  return (
    <div className="flex font-sans">
      <div className="flex-1">{content}</div>
      {right}
    </div>
  );
}
