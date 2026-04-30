export type AchievementCategory =
  | 'STREAK'
  | 'VOCAB'
  | 'GRAMMAR'
  | 'LISTENING'
  | 'TYPING'
  | 'TOPIK'
  | 'SOCIAL';

export type AchievementTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'DIAMOND';

export type AchievementMetric =
  | 'streakDays'
  | 'vocabCount'
  | 'grammarCount'
  | 'listeningMinutes'
  | 'typingWpm'
  | 'topikPassedCount'
  | 'topikHighScoreCount'
  | 'friendCount'
  | 'groupJoinedCount'
  | 'groupCreatedCount';

export type AchievementIconKey =
  | 'fire'
  | 'word'
  | 'grammar'
  | 'listen'
  | 'typing'
  | 'topik'
  | 'friends'
  | 'group';

export type AchievementRule = Readonly<{
  id: string;
  category: AchievementCategory;
  tier: AchievementTier;
  metric: AchievementMetric;
  targetValue: number;
  rewardXp: number;
  titleKey: string;
  descriptionKey: string;
  iconKey: AchievementIconKey;
}>;

export type AchievementProgressSnapshot = Record<AchievementMetric, number>;

export type AchievementBadgeView = Readonly<{
  badgeId: string;
  category: AchievementCategory;
  tier: AchievementTier;
  targetValue: number;
  progressValue: number;
  rewardXp: number;
  titleKey: string;
  descriptionKey: string;
  iconKey: AchievementIconKey;
  isUnlocked: boolean;
  unlockedAt: number | null;
  isNew: boolean;
}>;

export type AchievementSectionView = Readonly<{
  category: AchievementCategory;
  titleKey: string;
  unlockedCount: number;
  totalCount: number;
  badges: AchievementBadgeView[];
}>;

export type AchievementOverviewView = Readonly<{
  unlockedCount: number;
  totalCount: number;
  progressPct: number;
  sections: AchievementSectionView[];
}>;

export const ACHIEVEMENT_CATEGORY_ORDER: AchievementCategory[] = [
  'STREAK',
  'VOCAB',
  'GRAMMAR',
  'LISTENING',
  'TYPING',
  'TOPIK',
  'SOCIAL',
];

export const ACHIEVEMENT_CATALOG: AchievementRule[] = [
  {
    id: 'streak_7',
    category: 'STREAK',
    tier: 'BRONZE',
    metric: 'streakDays',
    targetValue: 7,
    rewardXp: 30,
    titleKey: 'achievements.badges.streak7.title',
    descriptionKey: 'achievements.badges.streak7.description',
    iconKey: 'fire',
  },
  {
    id: 'streak_14',
    category: 'STREAK',
    tier: 'BRONZE',
    metric: 'streakDays',
    targetValue: 14,
    rewardXp: 50,
    titleKey: 'achievements.badges.streak14.title',
    descriptionKey: 'achievements.badges.streak14.description',
    iconKey: 'fire',
  },
  {
    id: 'streak_30',
    category: 'STREAK',
    tier: 'SILVER',
    metric: 'streakDays',
    targetValue: 30,
    rewardXp: 100,
    titleKey: 'achievements.badges.streak30.title',
    descriptionKey: 'achievements.badges.streak30.description',
    iconKey: 'fire',
  },
  {
    id: 'streak_60',
    category: 'STREAK',
    tier: 'GOLD',
    metric: 'streakDays',
    targetValue: 60,
    rewardXp: 150,
    titleKey: 'achievements.badges.streak60.title',
    descriptionKey: 'achievements.badges.streak60.description',
    iconKey: 'fire',
  },
  {
    id: 'streak_100',
    category: 'STREAK',
    tier: 'GOLD',
    metric: 'streakDays',
    targetValue: 100,
    rewardXp: 250,
    titleKey: 'achievements.badges.streak100.title',
    descriptionKey: 'achievements.badges.streak100.description',
    iconKey: 'fire',
  },
  {
    id: 'streak_365',
    category: 'STREAK',
    tier: 'DIAMOND',
    metric: 'streakDays',
    targetValue: 365,
    rewardXp: 800,
    titleKey: 'achievements.badges.streak365.title',
    descriptionKey: 'achievements.badges.streak365.description',
    iconKey: 'fire',
  },
  {
    id: 'vocab_100',
    category: 'VOCAB',
    tier: 'BRONZE',
    metric: 'vocabCount',
    targetValue: 100,
    rewardXp: 50,
    titleKey: 'achievements.badges.vocab100.title',
    descriptionKey: 'achievements.badges.vocab100.description',
    iconKey: 'word',
  },
  {
    id: 'vocab_500',
    category: 'VOCAB',
    tier: 'SILVER',
    metric: 'vocabCount',
    targetValue: 500,
    rewardXp: 120,
    titleKey: 'achievements.badges.vocab500.title',
    descriptionKey: 'achievements.badges.vocab500.description',
    iconKey: 'word',
  },
  {
    id: 'vocab_1000',
    category: 'VOCAB',
    tier: 'GOLD',
    metric: 'vocabCount',
    targetValue: 1000,
    rewardXp: 250,
    titleKey: 'achievements.badges.vocab1000.title',
    descriptionKey: 'achievements.badges.vocab1000.description',
    iconKey: 'word',
  },
  {
    id: 'grammar_20',
    category: 'GRAMMAR',
    tier: 'BRONZE',
    metric: 'grammarCount',
    targetValue: 20,
    rewardXp: 60,
    titleKey: 'achievements.badges.grammar20.title',
    descriptionKey: 'achievements.badges.grammar20.description',
    iconKey: 'grammar',
  },
  {
    id: 'grammar_100',
    category: 'GRAMMAR',
    tier: 'GOLD',
    metric: 'grammarCount',
    targetValue: 100,
    rewardXp: 180,
    titleKey: 'achievements.badges.grammar100.title',
    descriptionKey: 'achievements.badges.grammar100.description',
    iconKey: 'grammar',
  },
  {
    id: 'listening_20h',
    category: 'LISTENING',
    tier: 'SILVER',
    metric: 'listeningMinutes',
    targetValue: 1200,
    rewardXp: 100,
    titleKey: 'achievements.badges.listening20h.title',
    descriptionKey: 'achievements.badges.listening20h.description',
    iconKey: 'listen',
  },
  {
    id: 'listening_100h',
    category: 'LISTENING',
    tier: 'DIAMOND',
    metric: 'listeningMinutes',
    targetValue: 6000,
    rewardXp: 260,
    titleKey: 'achievements.badges.listening100h.title',
    descriptionKey: 'achievements.badges.listening100h.description',
    iconKey: 'listen',
  },
  {
    id: 'typing_wpm_40',
    category: 'TYPING',
    tier: 'BRONZE',
    metric: 'typingWpm',
    targetValue: 40,
    rewardXp: 40,
    titleKey: 'achievements.badges.typing40.title',
    descriptionKey: 'achievements.badges.typing40.description',
    iconKey: 'typing',
  },
  {
    id: 'typing_wpm_80',
    category: 'TYPING',
    tier: 'SILVER',
    metric: 'typingWpm',
    targetValue: 80,
    rewardXp: 100,
    titleKey: 'achievements.badges.typing80.title',
    descriptionKey: 'achievements.badges.typing80.description',
    iconKey: 'typing',
  },
  {
    id: 'typing_wpm_100',
    category: 'TYPING',
    tier: 'GOLD',
    metric: 'typingWpm',
    targetValue: 100,
    rewardXp: 180,
    titleKey: 'achievements.badges.typing100.title',
    descriptionKey: 'achievements.badges.typing100.description',
    iconKey: 'typing',
  },
  {
    id: 'topik_pass_1',
    category: 'TOPIK',
    tier: 'SILVER',
    metric: 'topikPassedCount',
    targetValue: 1,
    rewardXp: 150,
    titleKey: 'achievements.badges.topikPass.title',
    descriptionKey: 'achievements.badges.topikPass.description',
    iconKey: 'topik',
  },
  {
    id: 'topik_high_score_1',
    category: 'TOPIK',
    tier: 'DIAMOND',
    metric: 'topikHighScoreCount',
    targetValue: 1,
    rewardXp: 300,
    titleKey: 'achievements.badges.topikHighScore.title',
    descriptionKey: 'achievements.badges.topikHighScore.description',
    iconKey: 'topik',
  },
  {
    id: 'friends_1',
    category: 'SOCIAL',
    tier: 'BRONZE',
    metric: 'friendCount',
    targetValue: 1,
    rewardXp: 40,
    titleKey: 'achievements.badges.friends1.title',
    descriptionKey: 'achievements.badges.friends1.description',
    iconKey: 'friends',
  },
  {
    id: 'friends_10',
    category: 'SOCIAL',
    tier: 'GOLD',
    metric: 'friendCount',
    targetValue: 10,
    rewardXp: 120,
    titleKey: 'achievements.badges.friends10.title',
    descriptionKey: 'achievements.badges.friends10.description',
    iconKey: 'friends',
  },
  {
    id: 'group_join_1',
    category: 'SOCIAL',
    tier: 'BRONZE',
    metric: 'groupJoinedCount',
    targetValue: 1,
    rewardXp: 60,
    titleKey: 'achievements.badges.groupJoin.title',
    descriptionKey: 'achievements.badges.groupJoin.description',
    iconKey: 'group',
  },
  {
    id: 'group_create_1',
    category: 'SOCIAL',
    tier: 'SILVER',
    metric: 'groupCreatedCount',
    targetValue: 1,
    rewardXp: 80,
    titleKey: 'achievements.badges.groupCreate.title',
    descriptionKey: 'achievements.badges.groupCreate.description',
    iconKey: 'group',
  },
];

const SECTION_KEYS: Record<AchievementCategory, string> = {
  STREAK: 'achievements.categories.streak',
  VOCAB: 'achievements.categories.vocab',
  GRAMMAR: 'achievements.categories.grammar',
  LISTENING: 'achievements.categories.listening',
  TYPING: 'achievements.categories.typing',
  TOPIK: 'achievements.categories.topik',
  SOCIAL: 'achievements.categories.social',
};

export function buildAchievementOverview(args: {
  progress: AchievementProgressSnapshot;
  unlockedByBadgeId: Map<string, { unlockedAt: number; isNew: boolean }>;
}): AchievementOverviewView {
  const badges = ACHIEVEMENT_CATALOG.map(rule => {
    const progressValue = Math.max(0, args.progress[rule.metric] ?? 0);
    const unlocked = args.unlockedByBadgeId.get(rule.id);
    return {
      badgeId: rule.id,
      category: rule.category,
      tier: rule.tier,
      targetValue: rule.targetValue,
      progressValue,
      rewardXp: rule.rewardXp,
      titleKey: rule.titleKey,
      descriptionKey: rule.descriptionKey,
      iconKey: rule.iconKey,
      isUnlocked: unlocked !== undefined,
      unlockedAt: unlocked?.unlockedAt ?? null,
      isNew: unlocked?.isNew ?? false,
    } satisfies AchievementBadgeView;
  });

  const sections = ACHIEVEMENT_CATEGORY_ORDER.map(category => {
    const sectionBadges = badges.filter(badge => badge.category === category);
    const unlockedCount = sectionBadges.filter(badge => badge.isUnlocked).length;
    return {
      category,
      titleKey: SECTION_KEYS[category],
      unlockedCount,
      totalCount: sectionBadges.length,
      badges: sectionBadges,
    } satisfies AchievementSectionView;
  }).filter(section => section.totalCount > 0);

  const unlockedCount = badges.filter(badge => badge.isUnlocked).length;
  const totalCount = badges.length;
  return {
    unlockedCount,
    totalCount,
    progressPct: totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0,
    sections,
  };
}
