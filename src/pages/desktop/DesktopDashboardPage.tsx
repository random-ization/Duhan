import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { buildTodayTaskPath } from '../../utils/todayFlow';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { UserAvatar } from '../../components/common';
import {
  qRef,
  NOTE_PAGES,
  DAILY_TASK,
  READING_PROGRESS,
  RECOMMENDATIONS,
  ABILITY_PROFILER,
} from '../../utils/convexRefs';
import type { AbilityDimensions, LiveAbilityScores, NextBestAction } from '../../utils/convexRefs';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import type {
  DailyTaskPlanDto,
  DailyTaskItemDto,
  DailyTaskKind,
} from '../../../convex/dailyTask/shared';
import { UserTier, SubscriptionType } from '../../types';

// 格式化学习时长
function formatStudyHours(minutes: number): string {
  return Math.round(minutes / 60).toString();
}

// 格式化数字
function formatNumber(n: number): string {
  return n.toLocaleString();
}

// --- 今日任务 Hanja / Tone 映射 ---
const TASK_KIND_META: Record<DailyTaskKind, { k: string; tone: string }> = {
  vocab_20: { k: '詞', tone: 'pink' },
  grammar_drill: { k: '法', tone: 'mint' },
  listening_10min: { k: '聽', tone: 'butter' },
  typing_wpm: { k: '寫', tone: 'lilac' },
  note_review: { k: '記', tone: 'sky' },
  sentence_review: { k: '句', tone: 'mint' },
  grammar_review: { k: '法', tone: 'butter' },
  topik_rewrite: { k: '改', tone: 'lilac' },
};

const ABILITY_DIMENSION_COPY: Record<keyof AbilityDimensions, { label: string; action: string }> = {
  vocabulary: { label: '词汇', action: '用复习把快忘的词先拉回来。' },
  grammar: { label: '语法', action: '优先做语法复练，减少反复错的结构。' },
  reading: { label: '阅读', action: '用短阅读继续积累真实句子。' },
  writing: { label: '写作', action: '写作教练会把问题拆成可复练的点。' },
  listening: { label: '听力', action: '用 10 分钟听力保持输入强度。' },
};

function findWeakestAbilityDimension(dimensions: AbilityDimensions | undefined) {
  if (!dimensions) return null;

  return (Object.entries(dimensions) as Array<[keyof AbilityDimensions, number]>).reduce<{
    key: keyof AbilityDimensions;
    score: number;
  } | null>((weakest, [key, score]) => {
    if (!weakest || score < weakest.score) {
      return { key, score };
    }
    return weakest;
  }, null);
}

function getNextTask(plan: DailyTaskPlanDto | null | undefined): DailyTaskItemDto | null {
  return plan?.tasks.find(task => !task.completed) ?? plan?.tasks[0] ?? null;
}

function CommandMetric({
  label,
  value,
  detail,
  color = 'var(--color-k-crimson)',
}: {
  label: string;
  value: string;
  detail?: string;
  color?: string;
}) {
  return (
    <div className="min-w-0 border-l border-k-line px-3.5 py-1">
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
        <span className="text-[10px] font-black text-k-sub">{label}</span>
      </div>
      <div className="mt-1.5 truncate text-[13px] font-black text-k-ink">{value}</div>
      {detail && (
        <div className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-k-sub">
          {detail}
        </div>
      )}
    </div>
  );
}

function LearningLoopSummary({
  plan,
  stats,
  abilityScores,
  nextAction,
  navigate,
  dashboardReturnPath,
  t,
}: {
  plan: DailyTaskPlanDto | null | undefined;
  stats: LearnerStatsDto | undefined;
  abilityScores: LiveAbilityScores | null | undefined;
  nextAction: NextBestAction | null | undefined;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  dashboardReturnPath: string;
  t: TFunction;
}) {
  const nextTask = getNextTask(plan);
  const weakest = findWeakestAbilityDimension(abilityScores?.dimensions);
  const completedCount = plan?.tasks.filter(task => task.completed).length ?? 0;
  const totalCount = plan?.tasks.length ?? 0;
  const learnedDetail = stats
    ? `${formatNumber(stats.vocabStats?.mastered ?? 0)} 个已掌握词 · ${formatStudyHours(stats.totalMinutes ?? 0)} 小时`
    : t('common.loading', 'Loading...');
  const gapTitle = plan?.reviewSummary?.weakPointSummary
    ? '今日弱点'
    : weakest
      ? `${ABILITY_DIMENSION_COPY[weakest.key].label}偏弱`
      : '等待诊断';
  const gapDetail =
    plan?.reviewSummary?.weakPointSummary ??
    (weakest
      ? `${Math.round(weakest.score)}/100 · ${ABILITY_DIMENSION_COPY[weakest.key].action}`
      : '完成更多学习后会自动生成薄弱项。');
  const fallbackActionLabel = nextAction
    ? t(`dashboard.nba.${nextAction.kind}`, {
        defaultValue: nextAction.kind,
        count: nextAction.count,
      })
    : '打开课程中心';
  const actionPath = nextTask
    ? (buildTodayTaskPath(nextTask, dashboardReturnPath) ?? nextAction?.path ?? '/courses')
    : (nextAction?.path ?? '/courses');
  const completionPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const nextTitle = nextTask?.title ?? fallbackActionLabel;
  const nextDetail = nextTask?.description ?? plan?.rationale ?? '从最有收益的一步开始。';
  const todayMinutes = stats?.todayMinutes ?? 0;
  const dailyGoal = stats?.dailyGoal ?? 20;
  const progressValue =
    totalCount > 0
      ? `${completedCount}/${totalCount} · ${completionPercent}%`
      : `${todayMinutes}/${dailyGoal} 分钟`;

  return (
    <DesktopCard
      pad={0}
      className="mb-[16px] overflow-hidden border border-k-line/80 shadow-k-sh-sm"
    >
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <HanjaSeal c="艙" size={38} bg="var(--color-k-crimson)" round={10} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] font-black text-k-crimson">今日指令台</span>
                <span className="h-1 w-1 rounded-full bg-k-line2" />
                <span className="text-[12px] font-black text-k-ink">学习驾驶舱</span>
              </div>
              <div className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[11px] font-black text-k-sub">下一步</span>
                <h1 className="max-w-[560px] truncate text-[21px] font-black leading-7 text-k-ink">
                  {nextTitle}
                </h1>
              </div>
              <div className="mt-1 max-w-[720px] truncate text-[12px] font-semibold text-k-sub">
                {nextDetail}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(actionPath)}
              className="rounded-[10px] bg-k-ink px-4 py-2.5 text-[12px] font-black text-k-bg transition-colors hover:bg-k-ink/85"
            >
              开始今日学习 →
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard/weekly-report')}
              className="rounded-[10px] border border-k-line bg-k-card px-4 py-2.5 text-[12px] font-black text-k-ink transition-colors hover:border-k-crimson hover:text-k-crimson"
            >
              反馈
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1.05fr_1.1fr_1fr] gap-2.5">
          <CommandMetric
            label="今日"
            value={progressValue}
            detail={
              plan?.rationale ? `为什么做：${plan.rationale}` : `${todayMinutes}/${dailyGoal} 分钟`
            }
            color="var(--color-k-crimson)"
          />
          <CommandMetric
            label="已学"
            value={learnedDetail}
            detail={
              totalCount > 0 ? `今日任务 ${completedCount}/${totalCount}` : '学习资产持续累积'
            }
            color="var(--color-k-mint-deep)"
          />
          <CommandMetric
            label="不足"
            value={gapTitle}
            detail={gapDetail}
            color="var(--color-k-butter-deep)"
          />
        </div>
      </div>
    </DesktopCard>
  );
}

// --- DailyTaskCockpit ---
function DailyTaskCockpit({
  plan,
  t,
  navigate,
  dashboardReturnPath,
  _onComplete,
}: {
  plan: DailyTaskPlanDto;
  t: TFunction;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  dashboardReturnPath: string;
  _onComplete: (taskId: string) => void;
}) {
  const allDone = plan.status === 'completed';
  const completedCount = plan.tasks.filter(task => task.completed).length;
  const totalCount = plan.tasks.length;

  return (
    <DesktopCard
      pad={0}
      className="mb-[16px] overflow-hidden border border-k-line/80 shadow-k-sh-sm"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-[18px] py-[12px] border-b"
        style={{
          borderColor: 'var(--color-k-line)',
          background: allDone
            ? 'linear-gradient(135deg, var(--color-k-mint)30 0%, var(--color-k-bg)00 100%)'
            : 'linear-gradient(135deg, var(--color-k-butter)20 0%, var(--color-k-bg)00 100%)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <span className="font-k-serif text-[16px] font-medium text-k-crimson">任</span>
          <span className="text-[14px] font-extrabold text-k-ink">
            {t('dashboard.desktop.dailyTasks', { defaultValue: "Today's Tasks" })}
          </span>
          <DesignChip tone={allDone ? 'mint' : 'muted'} size="sm">
            {completedCount}/{totalCount}
          </DesignChip>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <span className="text-[11px] font-black tracking-wide text-k-mint-deep">
              {t('dashboard.desktop.allDone', { defaultValue: '✓ ALL DONE' })}
            </span>
          )}
          <span className="text-[10px] font-bold text-k-sub">{plan.date}</span>
        </div>
      </div>

      {/* Global progress bar */}
      <div className="h-[3px] w-full bg-k-line">
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{
            width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
            background: allDone ? 'var(--color-k-mint-deep)' : 'var(--color-k-crimson)',
          }}
        />
      </div>
      {plan.rationale && (
        <div
          className="border-b px-[18px] py-[8px] text-[11px] font-semibold leading-relaxed text-k-sub"
          style={{ borderColor: 'var(--color-k-line)', background: 'var(--color-k-bg2)' }}
        >
          {plan.rationale}
        </div>
      )}

      {/* Task items */}
      {plan.tasks.map((task, i) => (
        <DailyTaskRow
          key={task.taskId}
          task={task}
          isLast={i === plan.tasks.length - 1}
          navigate={navigate}
          dashboardReturnPath={dashboardReturnPath}
          _onComplete={_onComplete}
        />
      ))}

      {/* Review summary footer */}
      {plan.reviewSummary &&
        (plan.reviewSummary.dueVocabCount ||
          plan.reviewSummary.dueNoteCount ||
          plan.reviewSummary.dueSentenceCount ||
          plan.reviewSummary.dueGrammarCount ||
          plan.reviewSummary.weakPointSummary) && (
          <div
            className="flex items-center gap-3 border-t px-[18px] py-[8px] text-[11px] font-semibold text-k-sub"
            style={{ borderColor: 'var(--color-k-line)', background: 'var(--color-k-bg2)' }}
          >
            {plan.reviewSummary.dueVocabCount != null && plan.reviewSummary.dueVocabCount > 0 && (
              <span>
                📚{' '}
                {t('dashboard.desktop.dueVocab', {
                  count: plan.reviewSummary.dueVocabCount,
                  defaultValue: `${plan.reviewSummary.dueVocabCount} vocab due`,
                })}
              </span>
            )}
            {plan.reviewSummary.dueNoteCount != null && plan.reviewSummary.dueNoteCount > 0 && (
              <span>
                📝 {plan.reviewSummary.dueNoteCount}{' '}
                {t('dashboard.desktop.notesDue', { defaultValue: 'notes queued' })}
              </span>
            )}
            {plan.reviewSummary.dueSentenceCount != null &&
              plan.reviewSummary.dueSentenceCount > 0 && (
                <span>
                  句 {plan.reviewSummary.dueSentenceCount}{' '}
                  {t('dashboard.desktop.sentencesDue', { defaultValue: 'sentences due' })}
                </span>
              )}
            {plan.reviewSummary.dueGrammarCount != null &&
              plan.reviewSummary.dueGrammarCount > 0 && (
                <span>
                  法 {plan.reviewSummary.dueGrammarCount}{' '}
                  {t('dashboard.desktop.grammarDue', { defaultValue: 'grammar due' })}
                </span>
              )}
            {plan.reviewSummary.weakPointSummary && (
              <span
                className="ml-auto italic opacity-70 max-w-[280px] truncate"
                title={plan.reviewSummary.weakPointSummary}
              >
                💡 {plan.reviewSummary.weakPointSummary}
              </span>
            )}
          </div>
        )}
    </DesktopCard>
  );
}

function DailyTaskRow({
  task,
  isLast,
  navigate,
  dashboardReturnPath,
  _onComplete,
}: {
  task: DailyTaskItemDto;
  isLast: boolean;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  dashboardReturnPath: string;
  _onComplete: (taskId: string) => void;
}) {
  const meta = TASK_KIND_META[task.kind] ?? { k: '?', tone: 'muted' };
  const target = task.targetCount ?? 1;
  const current = Math.min(task.currentCount ?? 0, target);
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const xp = typeof task.metadata?.rewardXp === 'number' ? task.metadata.rewardXp : 0;

  return (
    <div
      className="group flex items-center gap-3.5 px-[18px] py-[11px] transition-colors hover:bg-k-bg2"
      style={{
        borderBottom: isLast ? 'none' : '1px solid var(--color-k-line)',
        opacity: task.completed ? 0.65 : 1,
      }}
    >
      {/* Icon */}
      <HanjaSeal
        c={meta.k}
        size={36}
        bg={task.completed ? 'var(--color-k-mint-deep)' : `var(--color-k-${meta.tone}-deep)`}
        round={9}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-[13px] font-extrabold text-k-ink ${task.completed ? 'line-through' : ''}`}
          >
            {task.title}
          </span>
          {xp > 0 && (
            <span className="text-[9px] font-black text-k-crimson tracking-wide">+{xp} XP</span>
          )}
        </div>
        {task.description && (
          <div className="text-[11px] font-semibold text-k-sub mt-0.5 line-clamp-1">
            {task.description}
          </div>
        )}
        {/* Progress bar */}
        {target > 1 && (
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-[4px] flex-1 rounded-full bg-k-line overflow-hidden">
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
            <span className="text-[10px] font-black text-k-sub shrink-0">
              {current}/{target}
            </span>
          </div>
        )}
      </div>

      {/* Action */}
      {task.completed ? (
        <span className="text-[14px] text-k-mint-deep font-black shrink-0">✓</span>
      ) : (
        <button
          onClick={e => {
            e.stopPropagation();
            const taskPath = buildTodayTaskPath(task, dashboardReturnPath);
            if (taskPath) {
              navigate(taskPath);
            }
          }}
          className="shrink-0 rounded-lg border border-k-line bg-k-card px-3 py-1.5 text-[10px] font-black text-k-ink transition-colors hover:border-k-crimson hover:text-k-crimson"
        >
          GO →
        </button>
      )}
    </div>
  );
}

// 热力图数据组件 - 使用真实数据
function HeatmapGrid({ stats }: { stats: LearnerStatsDto | undefined }) {
  const cells = useMemo(() => {
    if (!stats?.weeklyActivity) {
      // 降级：显示空状态
      return Array.from({ length: 14 * 7 }, () => 0);
    }

    // 使用真实周活动数据
    const activity = stats.weeklyActivity;
    const cells: number[] = [];
    for (let week = 0; week < 14; week++) {
      for (let day = 0; day < 7; day++) {
        const dayIndex = week * 7 + day;
        if (dayIndex < activity.length) {
          const minutes = activity[dayIndex]?.minutes ?? 0;
          // 根据学习时长映射到 0-1 范围
          cells.push(Math.min(1, minutes / 120));
        } else {
          cells.push(0);
        }
      }
    }
    return cells;
  }, [stats?.weeklyActivity]);

  return (
    <div className="grid grid-cols-14 gap-[3px]">
      {cells.map((v, i) => {
        const c =
          v > 0.7
            ? 'var(--color-k-mint-deep)'
            : v > 0.45
              ? 'var(--color-k-mint)'
              : v > 0.2
                ? 'var(--color-k-line2)'
                : 'var(--color-k-bg2)';
        return <div key={i} className="aspect-square rounded-[3px]" style={{ background: c }} />;
      })}
    </div>
  );
}

type DashboardNavigate = ReturnType<typeof useLocalizedNavigate>;

function SectionHeading({
  seal,
  title,
  subtitle,
}: {
  seal: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <HanjaSeal c={seal} size={34} bg="var(--color-k-crimson)" round={9} />
      <div>
        <div className="text-[14px] font-black text-k-ink">{title}</div>
        {subtitle && <div className="mt-0.5 text-[11px] font-semibold text-k-sub">{subtitle}</div>}
      </div>
    </div>
  );
}

function LearnerSnapshotCard({
  user,
  stats,
  userLevel,
  daysJoined,
  t,
}: {
  user: ReturnType<typeof useAuth>['user'];
  stats: LearnerStatsDto | undefined;
  userLevel: number;
  daysJoined: number;
  t: TFunction;
}) {
  const isPremium =
    user?.subscriptionType === SubscriptionType.MONTHLY || user?.tier === UserTier.PREMIUM;
  return (
    <DesktopCard pad={18}>
      <div className="flex items-center gap-3">
        <UserAvatar
          user={user}
          className="h-[54px] w-[54px] rounded-[16px] shadow-k-sh-sm"
          fallbackClassName="text-[22px]"
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[16px] font-black text-k-ink">
            {user?.name || 'Learner'}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-k-sub">
            Lv.{userLevel} · {t('dashboard.desktop.dayJoined', { count: daysJoined })} ·{' '}
            {isPremium ? 'Premium' : 'Free'}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          { k: '詞', v: formatNumber(stats?.vocabStats?.mastered ?? 0), l: '已掌握' },
          { k: '法', v: formatNumber(stats?.grammarStats?.mastered ?? 0), l: '语法' },
          { k: '時', v: formatStudyHours(stats?.totalMinutes ?? 0), l: '小时' },
        ].map(item => (
          <div key={item.k} className="rounded-[12px] bg-k-bg2 px-3 py-2 text-center">
            <div className="font-k-serif text-[11px] text-k-crimson">{item.k}</div>
            <div className="mt-0.5 text-[17px] font-black text-k-ink">{item.v}</div>
            <div className="text-[9px] font-bold text-k-sub">{item.l}</div>
          </div>
        ))}
      </div>
    </DesktopCard>
  );
}

function ContinueLearningCard({
  recentReading,
  navigate,
  t,
}: {
  recentReading:
    | Array<{
        _id?: string;
        contentId: string;
        contentType?: string;
        readingTimeSeconds?: number;
      }>
    | undefined;
  navigate: DashboardNavigate;
  t: TFunction;
}) {
  return (
    <DesktopCard pad={0} className="overflow-hidden">
      <div className="border-b border-k-line px-5 py-4">
        <SectionHeading seal="續" title="继续学习" subtitle="从上次中断的位置接上。" />
      </div>
      {recentReading && recentReading.length > 0 ? (
        recentReading.slice(0, 3).map((item, i) => (
          <button
            key={item._id || `${item.contentId}-${i}`}
            type="button"
            onClick={() => navigate(`/reading/${item.contentId}`)}
            className="flex w-full items-center gap-3 border-b border-k-line px-5 py-3 text-left transition-colors last:border-b-0 hover:bg-k-bg2"
          >
            <HanjaSeal c="讀" size={30} bg="var(--color-k-sky-deep)" round={8} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-black text-k-ink">
                {item.contentType === 'news_article'
                  ? '新闻阅读'
                  : item.contentType === 'textbook_unit'
                    ? '课文阅读'
                    : '阅读'}
              </div>
              <div className="mt-0.5 text-[10px] font-bold text-k-sub">
                {item.readingTimeSeconds
                  ? `已读 ${Math.round(item.readingTimeSeconds / 60)} 分钟`
                  : '继续阅读'}
              </div>
            </div>
            <span className="text-[16px] text-k-sub-light">›</span>
          </button>
        ))
      ) : (
        <div className="px-5 py-5">
          <div className="text-[12px] font-semibold leading-6 text-k-sub">
            {t('dashboard.desktop.noRecentReading', {
              defaultValue: 'Start reading to see your progress here',
            })}
          </div>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="mt-3 rounded-[10px] bg-k-bg2 px-4 py-2 text-[12px] font-black text-k-ink transition-colors hover:text-k-crimson"
          >
            Browse reading materials →
          </button>
        </div>
      )}
    </DesktopCard>
  );
}

function LearningFeedbackCard({
  plan,
  abilityScores,
  nextAction,
  navigate,
  t,
}: {
  plan: DailyTaskPlanDto | null | undefined;
  abilityScores: LiveAbilityScores | null | undefined;
  nextAction: NextBestAction | null | undefined;
  navigate: DashboardNavigate;
  t: TFunction;
}) {
  const weakest = findWeakestAbilityDimension(abilityScores?.dimensions);
  const weakLabel =
    plan?.reviewSummary?.weakPointSummary ??
    (weakest
      ? `${ABILITY_DIMENSION_COPY[weakest.key].label} ${Math.round(weakest.score)}/100`
      : '完成更多学习后生成能力画像。');
  return (
    <DesktopCard pad={0} className="overflow-hidden">
      <div className="border-b border-k-line px-5 py-4">
        <SectionHeading seal="饋" title="学习反馈" subtitle="看见学了什么，以及下一处短板。" />
      </div>
      <div className="space-y-3 px-5 py-5">
        <div className="rounded-[14px] bg-k-bg2 px-4 py-3">
          <div className="text-[10px] font-black text-k-sub">当前短板</div>
          <div className="mt-1 text-[13px] font-black leading-6 text-k-ink">{weakLabel}</div>
        </div>
        {nextAction && (
          <button
            type="button"
            onClick={() => nextAction.path && navigate(nextAction.path)}
            className="w-full rounded-[14px] border border-k-line bg-k-card px-4 py-3 text-left transition-colors hover:border-k-crimson"
          >
            <div className="text-[10px] font-black text-k-sub">推荐动作</div>
            <div className="mt-1 text-[13px] font-black text-k-ink">
              {t(`dashboard.nba.${nextAction.kind}`, {
                defaultValue: nextAction.kind,
                count: nextAction.count,
              })}
            </div>
          </button>
        )}
        <button
          type="button"
          onClick={() => navigate('/dashboard/weekly-report')}
          className="w-full rounded-[12px] bg-k-ink px-4 py-3 text-[12px] font-black text-k-bg transition-colors hover:bg-k-ink/85"
        >
          打开周报与能力画像
        </button>
      </div>
    </DesktopCard>
  );
}

function EssentialActionsCard({
  stats,
  noteCount,
  navigate,
  t,
}: {
  stats: LearnerStatsDto | undefined;
  noteCount: number | undefined;
  navigate: DashboardNavigate;
  t: TFunction;
}) {
  const actions = [
    {
      k: '文',
      title: '导入内容',
      detail: '把真实韩语材料变成句子、词汇和语法资产。',
      path: '/learning/text-import',
      tone: 'mint',
    },
    {
      k: '筆',
      title: '写作教练',
      detail: 'TOPIK 作文批改、弱点复练和重写计划。',
      path: '/topik/writing-coach',
      tone: 'lilac',
    },
    {
      k: 'S',
      title: t('mobileSpeakingModule.title', { defaultValue: 'Speaking Practice' }),
      detail: t('mobileSpeakingModule.commandDescription', {
        defaultValue: 'Read aloud, shadowing, and pronunciation feedback.',
      }),
      path: '/speaking',
      tone: 'sky',
    },
    {
      k: '詞',
      title: '词汇资产',
      detail: `${formatNumber(stats?.vocabStats?.total ?? 0)} 个词 · ${formatNumber(stats?.vocabStats?.dueReviews ?? 0)} 个待复习`,
      path: '/vocab-book',
      tone: 'pink',
    },
    {
      k: '記',
      title: '笔记本',
      detail:
        noteCount === undefined ? t('common.loading', 'Loading...') : `${noteCount} 条学习记录`,
      path: '/notebook',
      tone: 'butter',
    },
  ];

  return (
    <DesktopCard pad={0} className="overflow-hidden">
      <div className="border-b border-k-line px-5 py-4">
        <SectionHeading seal="入" title="常用入口" subtitle="只保留和今日学习闭环最相关的入口。" />
      </div>
      <div className="grid grid-cols-2">
        {actions.map((action, index) => (
          <button
            key={action.path}
            type="button"
            onClick={() => navigate(action.path)}
            className="min-h-[94px] border-k-line px-5 py-3.5 text-left transition-colors hover:bg-k-bg2"
            style={{
              borderRight: index % 2 === 0 ? '1px solid var(--color-k-line)' : undefined,
              borderBottom: index < 2 ? '1px solid var(--color-k-line)' : undefined,
            }}
          >
            <div className="flex items-center gap-3">
              <HanjaSeal
                c={action.k}
                size={34}
                bg={`var(--color-k-${action.tone}-deep)`}
                round={9}
              />
              <div className="text-[14px] font-black text-k-ink">{action.title}</div>
            </div>
            <div className="mt-2 text-[11px] font-semibold leading-5 text-k-sub">
              {action.detail}
            </div>
          </button>
        ))}
      </div>
    </DesktopCard>
  );
}

function ReviewAssetsCard({
  plan,
  navigate,
  t,
}: {
  plan: DailyTaskPlanDto | null | undefined;
  navigate: DashboardNavigate;
  t: TFunction;
}) {
  const summary = plan?.reviewSummary;
  const dueItems = [
    { k: '詞', label: '词汇', count: summary?.dueVocabCount ?? 0, path: '/review/quiz?mode=full' },
    {
      k: '句',
      label: '句子',
      count: summary?.dueSentenceCount ?? 0,
      path: '/review/quiz?mode=sentences',
    },
    {
      k: '法',
      label: '语法',
      count: summary?.dueGrammarCount ?? 0,
      path: '/review/quiz?mode=grammar',
    },
    { k: '記', label: '笔记', count: summary?.dueNoteCount ?? 0, path: '/notebook' },
  ];

  return (
    <DesktopCard pad={18}>
      <SectionHeading seal="復" title="复习资产" subtitle="今天真正需要回看的内容。" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        {dueItems.map(item => (
          <button
            key={item.label}
            type="button"
            onClick={() => navigate(item.path)}
            className="rounded-[12px] bg-k-bg2 px-3 py-3 text-left transition-colors hover:bg-k-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-k-serif text-[13px] text-k-crimson">{item.k}</span>
              <span className="text-[17px] font-black text-k-ink">{item.count}</span>
            </div>
            <div className="mt-1 text-[10px] font-bold text-k-sub">{item.label}</div>
          </button>
        ))}
      </div>
      {!summary?.dueVocabCount &&
        !summary?.dueSentenceCount &&
        !summary?.dueGrammarCount &&
        !summary?.dueNoteCount && (
          <div className="mt-3 rounded-[12px] bg-k-bg2 px-3 py-2 text-[11px] font-semibold text-k-sub">
            {t('dashboard.desktop.nothingDue', { defaultValue: 'All caught up!' })}
          </div>
        )}
    </DesktopCard>
  );
}

function WeeklyActivityCard({ stats, t }: { stats: LearnerStatsDto | undefined; t: TFunction }) {
  return (
    <DesktopCard pad={18}>
      <SectionHeading
        seal="火"
        title={t('dashboard.desktop.weeklyActivity')}
        subtitle="只看趋势，不抢主任务。"
      />
      <div className="mt-4">
        <HeatmapGrid stats={stats} />
      </div>
      <div className="mt-2 flex justify-between text-[9px] font-bold text-k-sub">
        <span>
          {t('dashboard.desktop.approxTime', { count: 14 * 7, defaultValue: '14 weeks ago' })}
        </span>
        <span className="flex items-center gap-1">
          -
          <span className="flex gap-0.5">
            {[
              'var(--color-k-bg2)',
              'var(--color-k-line2)',
              'var(--color-k-mint)',
              'var(--color-k-mint-deep)',
            ].map((color, index) => (
              <span
                key={`${color}-${index}`}
                className="h-2 w-2 rounded-sm"
                style={{ background: color }}
              />
            ))}
          </span>
          +
        </span>
      </div>
    </DesktopCard>
  );
}

export default function DesktopDashboardPage() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation('public');
  const navigate = useLocalizedNavigate();
  const dashboardLanguage = i18n.language || 'en';
  const [now] = useState(() => Date.now());
  const dashboardReturnPath = '/dashboard';

  // 获取用户统计数据
  const stats = useQuery(qRef<Record<string, never>, LearnerStatsDto>('userStats:getStats'));

  // 获取笔记统计数据
  const noteFacets = useQuery(NOTE_PAGES.listFacets, {});

  // 获取今日任务计划
  const dailyTaskPlan = useQuery(
    DAILY_TASK.getTodayPlan,
    user ? { language: dashboardLanguage } : 'skip'
  );
  const updateTaskCompletion = useMutation(DAILY_TASK.updateTaskCompletion);

  // 继续学习 (PRD §16 — Continue Learning)
  const recentReading = useQuery(READING_PROGRESS.getRecentReading, user ? { limit: 3 } : 'skip');
  // AI 学习建议 (PRD §16 — AI Learning Suggestion)
  const nextAction = useQuery(
    RECOMMENDATIONS.getNextBestAction,
    user ? { localHour: new Date().getHours() } : 'skip'
  );

  // Ability Profiler (P2-C)
  const abilityScores = useQuery(ABILITY_PROFILER.getLiveAbilityScores, user ? {} : 'skip');
  const handleTaskComplete = useCallback(
    (taskId: string) => {
      void updateTaskCompletion({ taskId, completed: true });
    },
    [updateTaskCompletion]
  );

  // 计算加入天数
  const daysJoined = useMemo(() => {
    if (!user?.joinDate) return 0;
    return Math.max(1, Math.floor((now - user.joinDate) / 86400000));
  }, [user?.joinDate, now]);

  // 用户等级计算
  const userLevel = useMemo(() => {
    const totalMinutes = stats?.totalMinutes ?? 0;
    const hours = totalMinutes / 60;
    // 简单等级算法：每 10 小时升一级
    return Math.max(1, Math.floor(hours / 10) + 1);
  }, [stats?.totalMinutes]);

  const content = (
    <div>
      <LearningLoopSummary
        plan={dailyTaskPlan}
        stats={stats}
        abilityScores={abilityScores}
        nextAction={nextAction}
        navigate={navigate}
        dashboardReturnPath={dashboardReturnPath}
        t={t}
      />

      {/* Today's Tasks Cockpit */}
      {dailyTaskPlan && dailyTaskPlan.tasks.length > 0 && (
        <DailyTaskCockpit
          plan={dailyTaskPlan}
          t={t}
          navigate={navigate}
          dashboardReturnPath={dashboardReturnPath}
          _onComplete={handleTaskComplete}
        />
      )}

      <div className="mb-[18px] grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-[18px]">
        <LearningFeedbackCard
          plan={dailyTaskPlan}
          abilityScores={abilityScores}
          nextAction={nextAction}
          navigate={navigate}
          t={t}
        />
        <EssentialActionsCard
          stats={stats}
          noteCount={noteFacets?.total}
          navigate={navigate}
          t={t}
        />
      </div>
    </div>
  );

  const right = (
    <div className="space-y-[18px]">
      <LearnerSnapshotCard
        user={user}
        stats={stats}
        userLevel={userLevel}
        daysJoined={daysJoined}
        t={t}
      />
      <ContinueLearningCard recentReading={recentReading} navigate={navigate} t={t} />
      <ReviewAssetsCard plan={dailyTaskPlan} navigate={navigate} t={t} />
      <WeeklyActivityCard stats={stats} t={t} />
    </div>
  );

  return (
    <div className="p-[24px]">
      <div className="grid grid-cols-[minmax(0,1fr)_300px] gap-[16px]">
        <div>{content}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}
