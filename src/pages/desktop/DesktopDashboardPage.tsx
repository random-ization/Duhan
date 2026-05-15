import React, { useMemo, useState, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { HanjaSeal } from '../../components/desktop/ui/HanjaSeal';
import { UserAvatar } from '../../components/common';
import { DRail } from '../../components/desktop/ui/DRail';
import { qRef, NOTE_PAGES, DAILY_TASK } from '../../utils/convexRefs';
import { DesktopKsoftDashboardRail } from '../../components/desktop/DesktopKsoftDashboardRail';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import type { DailyTaskPlanDto, DailyTaskItemDto, DailyTaskKind } from '../../../convex/dailyTask/shared';
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
};

// --- DailyTaskCockpit ---
function DailyTaskCockpit({
  plan,
  t,
  navigate,
  onComplete,
}: {
  plan: DailyTaskPlanDto;
  t: TFunction;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  _onComplete: (taskId: string) => void;
}) {
  const allDone = plan.status === 'completed';
  const completedCount = plan.tasks.filter(task => task.completed).length;
  const totalCount = plan.tasks.length;

  return (
    <DesktopCard pad={0} className="mb-[22px] overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-[20px] py-[14px] border-b"
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
            <span className="text-[11px] font-black text-k-mint-deep tracking-wide">
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

      {/* Task items */}
      {plan.tasks.map((task, i) => (
        <DailyTaskRow
          key={task.taskId}
          task={task}
          isLast={i === plan.tasks.length - 1}
          navigate={navigate}
          onComplete={onComplete}
        />
      ))}

      {/* Review summary footer */}
      {plan.reviewSummary && (plan.reviewSummary.dueVocabCount || plan.reviewSummary.weakPointSummary) && (
        <div
          className="px-[20px] py-[10px] border-t flex items-center gap-3 text-[11px] font-semibold text-k-sub"
          style={{ borderColor: 'var(--color-k-line)', background: 'var(--color-k-bg2)' }}
        >
          {plan.reviewSummary.dueVocabCount != null && plan.reviewSummary.dueVocabCount > 0 && (
            <span>📚 {t('dashboard.desktop.dueVocab', { count: plan.reviewSummary.dueVocabCount, defaultValue: `${plan.reviewSummary.dueVocabCount} vocab due` })}</span>
          )}
          {plan.reviewSummary.dueNoteCount != null && plan.reviewSummary.dueNoteCount > 0 && (
            <span>📝 {plan.reviewSummary.dueNoteCount} {t('dashboard.desktop.notesDue', { defaultValue: 'notes queued' })}</span>
          )}
          {plan.reviewSummary.weakPointSummary && (
            <span className="ml-auto italic opacity-70 max-w-[280px] truncate" title={plan.reviewSummary.weakPointSummary}>
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
  _onComplete,
}: {
  task: DailyTaskItemDto;
  isLast: boolean;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  _onComplete: (taskId: string) => void;
}) {
  const meta = TASK_KIND_META[task.kind] ?? { k: '?', tone: 'muted' };
  const target = task.targetCount ?? 1;
  const current = Math.min(task.currentCount ?? 0, target);
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const xp = typeof task.metadata?.rewardXp === 'number' ? task.metadata.rewardXp : 0;

  return (
    <div
      className="flex items-center gap-3.5 px-[20px] py-[13px] transition-colors hover:bg-k-bg2 group"
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
          <span className={`text-[13px] font-extrabold text-k-ink ${task.completed ? 'line-through' : ''}`}>
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
                  background: task.completed ? 'var(--color-k-mint-deep)' : 'var(--color-k-crimson)',
                }}
              />
            </div>
            <span className="text-[10px] font-black text-k-sub shrink-0">{current}/{target}</span>
          </div>
        )}
      </div>

      {/* Action */}
      {task.completed ? (
        <span className="text-[14px] text-k-mint-deep font-black shrink-0">✓</span>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (task.linkPath) {
              navigate(task.linkPath);
            }
          }}
          className="shrink-0 rounded-lg bg-k-ink px-3 py-1.5 text-[10px] font-black text-k-bg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-k-ink/85"
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
        const dayIndex = (week * 7 + day);
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
        const c = v > 0.7 ? 'var(--color-k-mint-deep)' : v > 0.45 ? 'var(--color-k-mint)' : v > 0.2 ? 'var(--color-k-line2)' : 'var(--color-k-bg2)';
        return <div key={i} className="aspect-square rounded-[3px]" style={{ background: c }} />;
      })}
    </div>
  );
}

// 徽章组件
function BadgesRail({ stats, t }: { stats: LearnerStatsDto | undefined, t: TFunction }) {
  // TODO: 连接真实徽章数据
  const badges = [
    { k: '百', l: t('dashboard.desktop.vocabBook'), got: (stats?.vocabStats?.mastered ?? 0) >= 100 },
    { k: '聽', l: t('courseDashboard.modules.listening'), got: ((stats?.totalMinutes ?? 0) / 60) >= 20 },
    { k: '法', l: t('courseDashboard.modules.grammar'), got: (stats?.grammarStats?.mastered ?? 0) >= 50 },
  ];

  return (
    <div className="grid grid-cols-3 gap-2">
      {badges.map((b, i) => (
        <div key={i} className="text-center" style={{ opacity: b.got ? 1 : 0.4 }}>
          <div className="mx-auto flex justify-center">
            <HanjaSeal c={b.k} size={48} bg={b.got ? 'var(--color-k-crimson)' : 'var(--color-k-line2)'} round={12} />
          </div>
          <div className="mt-1 text-[9px] font-bold text-k-ink">{b.l}</div>
        </div>
      ))}
    </div>
  );
}

export default function DesktopDashboardPage() {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation('public');
  const navigate = useLocalizedNavigate();
  const dashboardLanguage = i18n.language || 'en';
  const [now] = useState(() => Date.now());
  
  // 获取用户统计数据
  const stats = useQuery(qRef<Record<string, never>, LearnerStatsDto>('userStats:getStats'));
  
  // 获取笔记统计数据
  const noteFacets = useQuery(NOTE_PAGES.listFacets, {});

  // 获取今日任务计划
  const dailyTaskPlan = useQuery(DAILY_TASK.getTodayPlan, user ? { language: dashboardLanguage } : 'skip');
  const updateTaskCompletion = useMutation(DAILY_TASK.updateTaskCompletion);

  const handleTaskComplete = useCallback((taskId: string) => {
    void updateTaskCompletion({ taskId, completed: true });
  }, [updateTaskCompletion]);

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
      {/* Profile hero */}
      <DesktopCard
        pad={24}
        className="mb-[22px]"
        style={{ background: 'linear-gradient(135deg, var(--color-k-mint)50 0%, var(--color-k-pink)40 100%)' }}
      >
        <div className="flex items-center gap-[18px]">
          <UserAvatar 
            user={user}
            className="h-[96px] w-[96px] rounded-[28px] shadow-k-sh"
            fallbackClassName="text-[42px]"
          />
          <div className="flex-1">
            <div className="text-[28px] font-extrabold tracking-[-0.6px] text-k-ink">
              {user?.name || 'Learner'}
            </div>
            <div className="mt-1 text-[12px] font-semibold text-k-sub">
              {stats?.currentProgress?.instituteName || 'Duhan Learner'} · {stats?.currentProgress?.level || 'Intermediate'} · Lv.{userLevel} · {t('dashboard.desktop.dayJoined', { count: daysJoined })}
            </div>
            <div className="mt-2 flex gap-1.5">
              {(user?.subscriptionType === SubscriptionType.MONTHLY || user?.tier === UserTier.PREMIUM) && (
                <DesignChip tone="crimson" size="sm">PREMIUM</DesignChip>
              )}
              {stats && stats.streak > 0 && (
                <DesignChip tone="muted" size="sm">{t('dashboard.desktop.streak', { defaultValue: 'Streak' })} {stats.streak}{t('dashboard.desktop.consecutiveDays', { defaultValue: 'd' })}</DesignChip>
              )}
              {stats && (
                <DesignChip tone="muted" size="sm">{t('dashboard.desktop.tasksLeft', { count: stats.vocabStats?.mastered ?? 0, defaultValue: 'Mastered' })}</DesignChip>
              )}
            </div>
          </div>
          <div className="flex gap-6">
            {[
              { n: formatNumber(stats?.vocabStats?.total ?? 0), l: t('dashboard.desktop.vocabBook'), k: '詞' },
              { n: formatNumber(stats?.grammarStats?.total ?? 0), l: t('courseDashboard.modules.grammar'), k: '法' },
              { n: formatStudyHours(stats?.totalMinutes ?? 0), l: t('dashboard.desktop.hours', { defaultValue: 'Hours' }), k: '時' },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <div className="font-k-serif text-[12px] font-medium text-k-crimson">{s.k}</div>
                <div className="mt-0.5 text-[24px] font-extrabold tracking-[-0.5px] text-k-ink">{s.n}</div>
                <div className="text-[10px] font-bold text-k-sub">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </DesktopCard>

      {/* Today's Tasks Cockpit */}
      {dailyTaskPlan && dailyTaskPlan.tasks.length > 0 && (
        <DailyTaskCockpit
          plan={dailyTaskPlan}
          t={t}
          navigate={navigate}
          onComplete={handleTaskComplete}
        />
      )}

      {/* 2-col: Library + Settings */}
      <div className="grid grid-cols-[1.3fr_1fr] gap-[18px]">
        <DesktopCard pad={0}>
          <div
            className="flex items-center border-b px-[20px] py-[16px]"
            style={{ borderColor: 'var(--color-k-line)' }}
          >
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">庫</span>
            <span className="text-[14px] font-extrabold text-k-ink">{t('dashboard.desktop.myResources')}</span>
          </div>
          {[
            { k: '詞', l: t('dashboard.desktop.vocabBook'), s: stats ? `${formatNumber(stats.vocabStats?.total ?? 0)} ${t('dashboard.desktop.vocabBook')} · ${formatNumber(stats.vocabStats?.dueReviews ?? 0)} ${t('dashboard.desktop.reviewCta')}` : t('common.loading', 'Loading...'), tone: 'pink', path: '/vocab-book', id: 'vocab-book-button' },
            { k: '誤', l: t('dashboard.desktop.incorrectBook'), s: noteFacets ? `${noteFacets.noteTypes.find(nt => nt.key === '错题' || nt.key === t('coursesOverview.desktop.notebook.types.mistakes'))?.count || 0} ${t('common.items', 'items')}` : t('common.loading', 'Loading...'), tone: 'crimson', path: '/review' },
            { k: '記', l: t('dashboard.desktop.notebook'), s: noteFacets ? `${noteFacets.total} ${t('coursesOverview.desktop.notebook.noteCount', { count: noteFacets.total })}` : t('common.loading', 'Loading...'), tone: 'butter', path: '/notebook' },
            { k: '旗', l: t('dashboard.desktop.achievements'), s: stats ? `${t('dashboard.desktop.tasksLeft', { count: stats.vocabStats?.mastered ?? 0 })}` : t('common.loading', 'Loading...'), tone: 'mint', path: '/achievements' },
            { k: '錄', l: t('dashboard.desktop.history'), s: t('dashboard.desktop.daysActivity', { count: 90, defaultValue: '90 Days Activity' }), tone: 'lilac', path: '/history' },
          ].map((m, i, a) => (
            <div
              key={i}
              id={m.id}
              onClick={() => navigate(m.path)}
              className="flex cursor-pointer items-center gap-3.5 px-[20px] py-[14px] transition-colors hover:bg-k-bg2"
              style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
            >
              <HanjaSeal c={m.k} size={36} bg={`var(--color-k-${m.tone}-deep)`} round={9} />
              <div className="flex-1">
                <div className="text-[13px] font-extrabold text-k-ink">{m.l}</div>
                <div className="mt-0.5 text-[11px] font-semibold text-k-sub">{m.s}</div>
              </div>
              <span className="text-[18px] text-k-sub-light">›</span>
            </div>
          ))}
        </DesktopCard>

        <DesktopCard pad={0}>
          <div
            className="flex items-center border-b px-[20px] py-[16px]"
            style={{ borderColor: 'var(--color-k-line)' }}
          >
            <span className="mr-2 font-k-serif text-[16px] font-medium text-k-crimson">設</span>
            <span className="text-[14px] font-extrabold text-k-ink">{t('dashboard.desktop.settings')}</span>
          </div>
          {[
            { l: t('dashboard.desktop.subscription'), s: (user?.subscriptionType === SubscriptionType.MONTHLY || user?.tier === UserTier.PREMIUM) ? 'Premium' : 'Free', path: '/subscription' },
            { l: t('dashboard.desktop.notifications'), path: '/profile' },
            { l: t('dashboard.desktop.language'), path: '/profile' },
            { l: t('dashboard.desktop.help'), path: '/profile' },
            { l: t('dashboard.desktop.logout'), danger: true, action: logout },
          ].map((m, i, a) => (
            <div
              key={i}
              onClick={m.action ? m.action : m.path ? () => navigate(m.path) : undefined}
              className="flex cursor-pointer items-center px-[20px] py-[13px] transition-colors hover:bg-k-bg2"
              style={{ borderBottom: i < a.length - 1 ? '1px solid var(--color-k-line)' : 'none' }}
            >
              <div className="flex-1">
                <div
                  className="text-[13px] font-bold"
                  style={{ color: m.danger ? 'var(--color-k-crimson)' : 'var(--color-k-ink)' }}
                >
                  {m.l}
                </div>
                {m.s && <div className="mt-0.5 text-[11px] font-semibold text-k-sub">{m.s}</div>}
              </div>
              <span className="text-[18px] text-k-sub-light">›</span>
            </div>
          ))}
        </DesktopCard>
      </div>
    </div>
  );

  const right = (
    <div>
      {/* Review Status Rail */}
      {dailyTaskPlan && (
        <DRail kanji="復" title={t('dashboard.desktop.reviewStatus', { defaultValue: 'Review Status' })} pad={14}>
          <div className="space-y-2.5">
            {dailyTaskPlan.reviewSummary?.dueVocabCount != null && dailyTaskPlan.reviewSummary.dueVocabCount > 0 && (
              <div
                className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 transition-colors hover:bg-k-bg2"
                onClick={() => navigate('/review')}
              >
                <HanjaSeal c="詞" size={28} bg="var(--color-k-pink-deep)" round={7} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-extrabold text-k-ink">{dailyTaskPlan.reviewSummary.dueVocabCount}</div>
                  <div className="text-[9px] font-bold text-k-sub">{t('dashboard.desktop.vocabDueToday', { defaultValue: 'Vocab due today' })}</div>
                </div>
                <span className="text-[14px] text-k-sub-light">›</span>
              </div>
            )}
            {dailyTaskPlan.reviewSummary?.dueNoteCount != null && dailyTaskPlan.reviewSummary.dueNoteCount > 0 && (
              <div
                className="flex items-center gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 transition-colors hover:bg-k-bg2"
                onClick={() => navigate('/notebook')}
              >
                <HanjaSeal c="記" size={28} bg="var(--color-k-butter-deep)" round={7} />
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-extrabold text-k-ink">{dailyTaskPlan.reviewSummary.dueNoteCount}</div>
                  <div className="text-[9px] font-bold text-k-sub">{t('dashboard.desktop.notesQueued', { defaultValue: 'Notes queued' })}</div>
                </div>
                <span className="text-[14px] text-k-sub-light">›</span>
              </div>
            )}
            {dailyTaskPlan.reviewSummary?.weakPointSummary && (
              <div className="px-2.5 py-1.5 rounded-lg bg-k-bg2">
                <div className="text-[10px] font-bold text-k-sub italic leading-relaxed">
                  💡 {dailyTaskPlan.reviewSummary.weakPointSummary}
                </div>
              </div>
            )}
            {!dailyTaskPlan.reviewSummary?.dueVocabCount && !dailyTaskPlan.reviewSummary?.dueNoteCount && !dailyTaskPlan.reviewSummary?.weakPointSummary && (
              <div className="text-center text-[11px] font-bold text-k-sub/50 py-2 italic">
                {t('dashboard.desktop.nothingDue', { defaultValue: 'All caught up! 🎉' })}
              </div>
            )}
          </div>
        </DRail>
      )}

      <DRail kanji="火" title={t('dashboard.desktop.weeklyActivity')} pad={14}>
        <HeatmapGrid stats={stats} />
        <div className="mt-2 flex justify-between text-[9px] font-bold text-k-sub">
          <span>{t('dashboard.desktop.approxTime', { count: 14 * 7, defaultValue: '14 weeks ago' })}</span>
          <span className="flex items-center gap-1">
            -
            <span className="flex gap-0.5">
              {['var(--color-k-bg2)', 'var(--color-k-line2)', 'var(--color-k-mint)', 'var(--color-k-mint-deep)'].map((c, i) => (
                <span key={i} className="h-2 w-2 rounded-sm" style={{ background: c }} />
              ))}
            </span>
            +
          </span>
        </div>
      </DRail>

      <DRail kanji="旗" title={t('dashboard.desktop.achievements')} pad={14}>
        <BadgesRail stats={stats} t={t} />
      </DRail>

      <DesktopKsoftDashboardRail language={dashboardLanguage} />
    </div>
  );

  return (
    <div className="p-[28px]">
      <div className="grid grid-cols-[1fr_320px] gap-[18px]">
        <div>{content}</div>
        <div>{right}</div>
      </div>
    </div>
  );
}
