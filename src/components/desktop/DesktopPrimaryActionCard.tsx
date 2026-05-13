import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { DesktopCard } from './ui/DesktopCard';
import { HanjaSeal } from './ui/HanjaSeal';
import { DesignChip } from './ui/DesignChip';

type ChallengeLike = {
  title: string;
  subtitle: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  isCompleted: boolean;
} | null | undefined;

type WeakArea = {
  type: string;
  score: number;
  label: string;
  subLabel: string;
};

type CourseProgressLike = {
  courseId: string;
  courseName: string;
  lastUnitIndex: number;
  completedUnits: number[];
} | null | undefined;

interface Props {
  dueNow: number;
  todayChallenge: ChallengeLike;
  weakAreas: WeakArea[];
  courseProgress: CourseProgressLike;
}

type Action = {
  kanji: string;
  tone: 'pink' | 'mint' | 'butter' | 'lilac' | 'sky';
  toneDeep: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  progress?: { current: number; target: number };
  rewardXp?: number;
  cta: string;
  navTo: string;
};

export function DesktopPrimaryActionCard({
  dueNow,
  todayChallenge,
  weakAreas,
  courseProgress,
}: Props) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();

  const action: Action = useMemo(() => {
    if (dueNow > 0) {
      const estMin = Math.max(3, Math.round(dueNow * 0.4));
      return {
        kanji: '復',
        tone: 'pink',
        toneDeep: 'pink-deep',
        eyebrow: t('dashboard.desktop.primaryAction.reviewEyebrow', { defaultValue: '复习 · REVIEW' }),
        title: t('dashboard.desktop.primaryAction.reviewTitle', {
          count: dueNow,
          defaultValue: `${dueNow} 张到期卡片`,
        }),
        subtitle: t('dashboard.desktop.primaryAction.reviewSubtitle', {
          minutes: estMin,
          defaultValue: `预计 ${estMin} 分钟 · FSRS 智能复习`,
        }),
        cta: t('dashboard.desktop.primaryAction.startReview', { defaultValue: '开始复习 →' }),
        navTo: '/review',
      };
    }

    if (todayChallenge && !todayChallenge.isCompleted) {
      return {
        kanji: '挑',
        tone: 'butter',
        toneDeep: 'butter-deep',
        eyebrow: t('dashboard.desktop.primaryAction.challengeEyebrow', { defaultValue: '今日挑战 · CHALLENGE' }),
        title: todayChallenge.title,
        subtitle: todayChallenge.subtitle,
        progress: {
          current: todayChallenge.currentCount,
          target: todayChallenge.targetCount,
        },
        rewardXp: todayChallenge.rewardXp,
        cta: t('dashboard.desktop.primaryAction.continueChallenge', { defaultValue: '继续挑战 →' }),
        navTo: '/review',
      };
    }

    if (weakAreas && weakAreas.length > 0) {
      const weak = weakAreas[0];
      const navTo = weak.type === 'WRITING' ? '/topik' : weak.type === 'LISTENING' ? '/topik' : weak.type === 'READING' ? '/topik' : '/grammar';
      return {
        kanji: '弱',
        tone: 'sky',
        toneDeep: 'sky-deep',
        eyebrow: t('dashboard.desktop.primaryAction.weakAreaEyebrow', { defaultValue: '强化薄弱 · WEAK AREA' }),
        title: t('dashboard.desktop.primaryAction.weakAreaTitle', {
          label: weak.label,
          score: weak.score,
          defaultValue: `${weak.label} · ${weak.score} 分`,
        }),
        subtitle: weak.subLabel,
        cta: t('dashboard.desktop.primaryAction.strengthen', { defaultValue: '专项练习 →' }),
        navTo,
      };
    }

    if (courseProgress && !courseProgress.completedUnits?.includes(courseProgress.lastUnitIndex)) {
      return {
        kanji: '文',
        tone: 'mint',
        toneDeep: 'mint-deep',
        eyebrow: t('dashboard.desktop.primaryAction.grammarEyebrow', { defaultValue: '继续学习 · GRAMMAR' }),
        title: t('dashboard.desktop.primaryAction.grammarTitle', {
          unit: courseProgress.lastUnitIndex + 1,
          defaultValue: `第 ${courseProgress.lastUnitIndex + 1} 单元`,
        }),
        subtitle: courseProgress.courseName || t('courseDashboard.modules.topikGrammarSub', { defaultValue: '全等级核心考点' }),
        cta: t('dashboard.desktop.primaryAction.continueLesson', { defaultValue: '继续学习 →' }),
        navTo: '/grammar',
      };
    }

    return {
      kanji: '聽',
      tone: 'lilac',
      toneDeep: 'lilac-deep',
      eyebrow: t('dashboard.desktop.primaryAction.podcastEyebrow', { defaultValue: '今日沉浸 · LISTEN' }),
      title: t('dashboard.desktop.primaryAction.podcastTitle', { defaultValue: '今日播客推荐' }),
      subtitle: t('dashboard.desktop.primaryAction.podcastSubtitle', { defaultValue: '坚持每天 10 分钟听力' }),
      cta: t('dashboard.desktop.primaryAction.openPodcast', { defaultValue: '打开播客 →' }),
      navTo: '/podcasts',
    };
  }, [dueNow, todayChallenge, weakAreas, courseProgress, t]);

  const progressPct = action.progress
    ? Math.min(100, Math.round((action.progress.current / Math.max(1, action.progress.target)) * 100))
    : null;

  return (
    <DesktopCard
      pad={0}
      className="relative mb-[22px] overflow-hidden"
      style={{
        background: `linear-gradient(135deg, var(--color-k-${action.tone}) 0%, var(--color-k-card) 72%)`,
      }}
    >
      <div className="flex items-start gap-[22px] p-[26px]">
        <HanjaSeal
          c={action.kanji}
          size={64}
          bg={`var(--color-k-${action.toneDeep})`}
          round={14}
        />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-center gap-2">
            <span className="text-[10px] font-extrabold tracking-[2px] text-k-sub">
              {action.eyebrow}
            </span>
            {action.rewardXp ? (
              <DesignChip tone="ink" size="sm">
                +{action.rewardXp} XP
              </DesignChip>
            ) : null}
          </div>
          <div className="text-[26px] font-extrabold leading-[1.15] tracking-[-0.6px] text-k-ink">
            {action.title}
          </div>
          <div className="mt-1.5 text-[13px] font-semibold text-k-sub">
            {action.subtitle}
          </div>
          {progressPct !== null && action.progress ? (
            <div className="mt-3 max-w-[440px]">
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-[11px] font-bold text-k-sub">
                  {action.progress.current} / {action.progress.target}
                </span>
                <span className="text-[11px] font-extrabold text-k-ink">{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[rgba(31,27,23,0.08)]">
                <div
                  className="h-full rounded-full bg-k-ink transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => navigate(action.navTo)}
            className="mt-4 cursor-pointer rounded-[12px] bg-k-ink px-[18px] py-[11px] text-[13px] font-extrabold text-k-bg transition-colors hover:bg-k-ink/90"
          >
            {action.cta}
          </button>
        </div>
      </div>
    </DesktopCard>
  );
}

export default DesktopPrimaryActionCard;
