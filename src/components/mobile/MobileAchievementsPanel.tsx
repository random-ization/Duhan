import React, { useEffect, useMemo, useRef } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { api } from '../../../convex/_generated/api';
import { Card, HanjaSeal, KT } from './ksoft/ksoft';

type AchievementCategory =
  | 'STREAK'
  | 'VOCAB'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'TYPING'
  | 'TOPIK'
  | 'SOCIAL';

type AchievementIconKey =
  | 'fire'
  | 'word'
  | 'grammar'
  | 'listen'
  | 'typing'
  | 'topik'
  | 'friends'
  | 'group';

type AchievementBadge = {
  badgeId: string;
  category: AchievementCategory;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';
  targetValue: number;
  progressValue: number;
  rewardXp: number;
  titleKey: string;
  descriptionKey: string;
  iconKey: AchievementIconKey;
  isUnlocked: boolean;
  unlockedAt: number | null;
  isNew: boolean;
};

type AchievementSection = {
  category: AchievementCategory;
  titleKey: string;
  unlockedCount: number;
  totalCount: number;
  badges: AchievementBadge[];
};

type AchievementOverview = {
  unlockedCount: number;
  totalCount: number;
  progressPct: number;
  sections: AchievementSection[];
};

const SEAL_BY_ICON: Record<AchievementIconKey, string> = {
  fire: '\u706B',
  word: '\u8A5E',
  grammar: '\u6CD5',
  listen: '\u807D',
  typing: '\u5BEB',
  topik: '\u8A66',
  friends: '\u53CB',
  group: '\u6703',
};

const FALLBACK_SECTION_LABELS: Record<AchievementCategory, string> = {
  STREAK: 'Learning streak',
  VOCAB: 'Vocabulary',
  GRAMMAR: 'Grammar',
  LISTENING: 'Listening',
  TYPING: 'Typing',
  TOPIK: 'TOPIK',
  SOCIAL: 'Social',
};

const FALLBACK_BADGE_LABELS: Record<string, string> = {
  streak_7: '7-day streak',
  streak_14: '14-day streak',
  streak_30: '30-day streak',
  streak_60: '60-day streak',
  streak_100: '100-day streak',
  streak_365: '365-day streak',
  vocab_100: 'Vocab 100',
  vocab_500: 'Vocab 500',
  vocab_1000: 'Vocab 1000',
  grammar_20: 'Grammar 20',
  grammar_100: 'Grammar 100',
  listening_20h: 'Listening 20h',
  listening_100h: 'Listening 100h',
  typing_wpm_40: 'WPM 40',
  typing_wpm_80: 'WPM 80',
  typing_wpm_100: 'WPM 100',
  topik_pass_1: 'TOPIK pass',
  topik_high_score_1: 'TOPIK high score',
  friends_1: 'First friend',
  friends_10: '10 friends',
  group_join_1: 'Join a group',
  group_create_1: 'Create a group',
};

function isAchievementOverview(value: unknown): value is AchievementOverview {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.unlockedCount === 'number' &&
    typeof record.totalCount === 'number' &&
    typeof record.progressPct === 'number' &&
    Array.isArray(record.sections)
  );
}

function clampProgress(value: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, value) / target) * 100));
}

function formatProgressValue(badge: AchievementBadge) {
  if (badge.badgeId.startsWith('listening_')) {
    const currentHours = Math.floor(badge.progressValue / 60);
    const targetHours = Math.floor(badge.targetValue / 60);
    return `${currentHours}/${targetHours}h`;
  }
  if (badge.targetValue === 1) {
    return badge.isUnlocked ? '1/1' : `${Math.min(badge.progressValue, 1)}/1`;
  }
  return `${Math.min(Math.floor(badge.progressValue), badge.targetValue)}/${badge.targetValue}`;
}

function formatUnlockedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
}

function LoadingGrid() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {['a', 'b', 'c', 'd', 'e', 'f'].map(item => (
        <div
          key={item}
          style={{
            height: 112,
            borderRadius: 22,
            background: 'rgba(31,27,23,0.05)',
            animation: 'pulse 1.6s ease-in-out infinite',
          }}
        />
      ))}
    </div>
  );
}

function AchievementTile({ badge }: { badge: AchievementBadge }) {
  const { t } = useTranslation();
  const isUnlocked = badge.isUnlocked;
  const progressPct = clampProgress(badge.progressValue, badge.targetValue);
  const title = t(badge.titleKey, {
    defaultValue: FALLBACK_BADGE_LABELS[badge.badgeId] ?? 'Achievement badge',
  });
  const bg = isUnlocked
    ? `linear-gradient(135deg, ${KT.crimson} 0%, ${KT.butterDeep} 100%)`
    : '#F1EDE6';
  const ink = isUnlocked ? KT.card : KT.sub;

  return (
    <div
      style={{
        minHeight: 112,
        borderRadius: 22,
        padding: 12,
        background: bg,
        boxShadow: isUnlocked ? '0 14px 26px rgba(174,69,53,0.18)' : 'none',
        border: isUnlocked ? '1px solid rgba(255,255,255,0.38)' : `1px solid ${KT.line}`,
        opacity: isUnlocked ? 1 : 0.72,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <HanjaSeal
          c={SEAL_BY_ICON[badge.iconKey]}
          size={34}
          bg={isUnlocked ? 'rgba(255,255,255,0.22)' : '#D8D3CB'}
          color={isUnlocked ? KT.card : '#A29A90'}
          round={10}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 800,
            color: ink,
            opacity: isUnlocked ? 0.95 : 0.58,
          }}
        >
          +{badge.rewardXp} XP
        </span>
      </div>
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 900,
            color: ink,
            lineHeight: 1.15,
            minHeight: 32,
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: ink, opacity: 0.72, marginTop: 6 }}>
          {isUnlocked && badge.unlockedAt
            ? t('achievements.mobile.unlockedAt', {
                date: formatUnlockedAt(badge.unlockedAt),
                defaultValue: `Unlocked ${formatUnlockedAt(badge.unlockedAt)}`,
              })
            : formatProgressValue(badge)}
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 999,
            background: isUnlocked ? 'rgba(255,255,255,0.35)' : 'rgba(31,27,23,0.08)',
            marginTop: 8,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${isUnlocked ? 100 : progressPct}%`,
              height: '100%',
              borderRadius: 999,
              background: isUnlocked ? KT.card : KT.ink,
            }}
          />
        </div>
      </div>
    </div>
  );
}

function StreakGrid({ section }: { section: AchievementSection }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {section.badges.map(badge => (
        <AchievementTile key={badge.badgeId} badge={badge} />
      ))}
    </div>
  );
}

function LearningBadgeGrid({ sections }: { sections: AchievementSection[] }) {
  const badges = useMemo(() => sections.flatMap(section => section.badges), [sections]);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
      {badges.map(badge => (
        <AchievementTile key={badge.badgeId} badge={badge} />
      ))}
    </div>
  );
}

export function MobileAchievementsPanel() {
  const { t } = useTranslation();
  const rawOverview = useQuery(api.achievements.getAchievementOverview, {});
  const syncAchievements = useMutation(api.achievements.syncMyAchievements);
  const didSyncRef = useRef(false);

  useEffect(() => {
    if (didSyncRef.current) return;
    didSyncRef.current = true;
    void syncAchievements().catch(error => {
      console.warn('Failed to sync achievements', error);
    });
  }, [syncAchievements]);

  const overview = isAchievementOverview(rawOverview) ? rawOverview : undefined;
  const streakSection = overview?.sections.find(section => section.category === 'STREAK') ?? null;
  const learningSections =
    overview?.sections.filter(section => section.category !== 'STREAK') ?? [];

  return (
    <div>
      <div
        style={{
          textAlign: 'center',
          padding: '6px 0 18px',
        }}
      >
        <div
          style={{
            color: KT.crimson,
            fontFamily: KT.serif,
            fontSize: 13,
            letterSpacing: 7,
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          {'\u65D7'} · ACHIEVEMENTS
        </div>
        <div style={{ fontSize: 28, fontWeight: 900, color: KT.ink, letterSpacing: -1 }}>
          {t('achievements.mobile.title', { defaultValue: 'Achievements & Badges' })}
        </div>
        <div style={{ fontFamily: KT.serif, color: KT.crimson, fontSize: 30, marginTop: 10 }}>
          {overview ? `${overview.unlockedCount} / ${overview.totalCount}` : '0 / 0'}
        </div>
        <div
          style={{
            height: 8,
            width: 138,
            borderRadius: 999,
            background: 'rgba(31,27,23,0.10)',
            margin: '10px auto 0',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${overview?.progressPct ?? 0}%`,
              height: '100%',
              borderRadius: 999,
              background: KT.ink,
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 24 }}>
        <div>
          <SectionLabel
            kanji={'\u706B'}
            title={
              streakSection
                ? t(streakSection.titleKey, {
                    defaultValue: FALLBACK_SECTION_LABELS[streakSection.category],
                  })
                : t('achievements.categories.streak', { defaultValue: 'Learning streak' })
            }
          />
          <Card pad={18}>
            {streakSection ? <StreakGrid section={streakSection} /> : <LoadingGrid />}
          </Card>
        </div>

        <div>
          <SectionLabel
            kanji={'\u7AE0'}
            title={t('achievements.mobile.learningBadges', { defaultValue: 'Learning badges' })}
          />
          <Card pad={18}>
            {overview ? <LearningBadgeGrid sections={learningSections} /> : <LoadingGrid />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ kanji, title }: { kanji: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
      <span
        style={{
          fontFamily: KT.serif,
          fontSize: 16,
          color: KT.crimson,
        }}
      >
        {kanji}
      </span>
      <span style={{ fontSize: 15, fontWeight: 900, color: KT.ink }}>{title}</span>
    </div>
  );
}
