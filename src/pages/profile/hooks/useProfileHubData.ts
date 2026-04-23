import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import type { LearnerStatsDto, RecentLearningSessionDto } from '../../../../convex/learningStats';
import { useAuth } from '../../../contexts/AuthContext';
import { useGlobalSettings } from '../../../hooks/useGlobalSettings';
import { getLanguageLabel } from '../../../utils/languageUtils';
import { localeFromLanguage } from '../../../utils/locale';
import { NoArgs, qRef } from '../../../utils/convexRefs';
import type { ExamAttempt, Language, User } from '../../../types';
import type { ProfileLabels } from '../types';

type LinkedAccount = {
  provider: string;
};

type PodcastHistoryItem = {
  id: string;
  episodeGuid: string;
  episodeTitle: string;
  episodeUrl: string;
  channelName: string;
  channelImage?: string;
  playedAt: number;
};

type ResumeSessionKind = 'listen' | 'dictation' | 'immersive';

type ResumeSessionCard = {
  id: string;
  kind: ResumeSessionKind;
  timestamp: number;
  title: string;
  subtitle: string;
  path: string;
};

export type ProfileRouteKey =
  | 'dashboard'
  | 'account'
  | 'learning'
  | 'activity'
  | 'settings'
  | 'security';

export type ProfileLearningMetric = {
  id: 'streak' | 'words' | 'books' | 'exams' | 'activeDays';
  label: string;
  value: string;
  detail: string;
};

export type ProfileActivityEntry = {
  id: string;
  kind: 'listen' | 'dictation' | 'podcast' | 'topik' | 'session';
  title: string;
  subtitle: string;
  detail: string;
  path: string;
  timestamp: number;
};

export type ProfileAchievement = {
  id: 'streak' | 'words' | 'exams' | 'premium';
  title: string;
  description: string;
  value: string;
  status: 'achieved' | 'next';
};

export type ProfileSettingsSummaryRow = {
  id: 'language' | 'flashcards' | 'audio';
  label: string;
  value: string;
  description: string;
  path: string;
};

export type ProfileSecuritySummaryItem = {
  id: 'accountStatus' | 'linkedAccounts' | 'verification';
  label: string;
  value: string;
  description: string;
};

export type ProfileHubData = {
  identity: {
    displayName: string;
    email: string;
    avatar?: string;
    joinedDateLabel: string;
    joinedTimestamp: number;
    userIdDisplay: string;
    linkedCount: number;
    isProfileIncomplete: boolean;
    accountStatus: 'ACTIVE' | 'DISABLED';
  };
  membership: {
    planLabel: string;
    statusLabel: string;
    primaryActionLabel: string;
    primaryActionPath: string;
    secondaryActionLabel: string;
    secondaryActionPath: string;
    summary: string;
  };
  learningSnapshot: ProfileLearningMetric[];
  recentActivity: ProfileActivityEntry[];
  achievements: ProfileAchievement[];
  settingsSummary: ProfileSettingsSummaryRow[];
  securitySummary: ProfileSecuritySummaryItem[];
  examHistory: ExamAttempt[];
  podcastHistory: PodcastHistoryItem[];
  recentSessions: RecentLearningSessionDto[];
  linkedAccounts: LinkedAccount[];
  userStats: LearnerStatsDto | null;
  isLoading: boolean;
};

const LISTEN_SESSION_PREFIX = 'vocab-book-listen-session:';
const DICTATION_SESSION_PREFIX = 'vocab-book-dictation-session:';
const IMMERSIVE_SESSION_PREFIX = 'vocab-book-immersive-session:';

const firstString = (...values: Array<string | null | undefined>): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value;
  }
  return '';
};

const firstPositiveTimestamp = (...values: Array<number | null | undefined>): number => {
  for (const value of values) {
    if (typeof value === 'number' && value > 0) return value;
  }
  return 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const readSessionStorageEntries = (): Array<[string, string]> => {
  if (typeof globalThis.window === 'undefined') return [];

  try {
    const entries: Array<[string, string]> = [];
    const storage = globalThis.window.sessionStorage;
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const value = storage.getItem(key);
      if (value === null) continue;
      entries.push([key, value]);
    }
    return entries;
  } catch {
    return [];
  }
};

const toQuerySuffix = (rawQuery: string): string =>
  rawQuery && rawQuery !== 'default' ? `?${rawQuery}` : '';

const formatAbsoluteDate = (language: Language, timestamp: number): string => {
  return new Intl.DateTimeFormat(localeFromLanguage(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp));
};

const getWeeklyActiveDays = (userStats: LearnerStatsDto | null): number => {
  if (!userStats) return 0;
  return userStats.weeklyActivity.filter(point => point.minutes > 0).length;
};

const toPercentScore = (attempt: ExamAttempt): number =>
  attempt.maxScore > 0 ? Math.round((attempt.score / attempt.maxScore) * 100) : 0;

const getNextMilestone = (value: number, targets: readonly number[]): number => {
  const next = targets.find(target => value < target);
  return next ?? targets[targets.length - 1];
};

const buildResumeSessionCards = (labels: ProfileLabels): ResumeSessionCard[] => {
  const dashboardLabels = labels.profile?.dashboard;
  const entries = readSessionStorageEntries();
  const cards: ResumeSessionCard[] = [];

  for (const [key, rawValue] of entries) {
    let kind: ResumeSessionKind | null = null;
    let basePath = '';
    let rawQuery = '';

    if (key.startsWith(LISTEN_SESSION_PREFIX)) {
      kind = 'listen';
      basePath = '/vocab-book/listen';
      rawQuery = key.slice(LISTEN_SESSION_PREFIX.length);
    } else if (key.startsWith(DICTATION_SESSION_PREFIX)) {
      kind = 'dictation';
      basePath = '/vocab-book/dictation';
      rawQuery = key.slice(DICTATION_SESSION_PREFIX.length);
    } else if (key.startsWith(IMMERSIVE_SESSION_PREFIX)) {
      kind = 'immersive';
      basePath = '/vocab-book/immerse';
      rawQuery = key.slice(IMMERSIVE_SESSION_PREFIX.length);
    }

    if (!kind) continue;

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (!isRecord(parsed) || !isFiniteNumber(parsed.timestamp) || !isFiniteNumber(parsed.index)) {
        continue;
      }

      const itemNumber = parsed.index + 1;
      if (kind === 'listen') {
        cards.push({
          id: `${kind}-${rawQuery || 'default'}`,
          kind,
          timestamp: parsed.timestamp,
          title:
            dashboardLabels?.recentListenTitle ??
            dashboardLabels?.continueListening ??
            'Listen practice',
          subtitle: (
            dashboardLabels?.resumeItemLabel ?? 'Paused at item {{count}}'
          ).replace('{{count}}', String(itemNumber)),
          path: `${basePath}${toQuerySuffix(rawQuery)}`,
        });
        continue;
      }

      if (kind === 'dictation') {
        cards.push({
          id: `${kind}-${rawQuery || 'default'}`,
          kind,
          timestamp: parsed.timestamp,
          title:
            dashboardLabels?.recentDictationTitle ??
            dashboardLabels?.continueDictation ??
            'Dictation session',
          subtitle: (
            dashboardLabels?.resumeItemLabel ?? 'Paused at item {{count}}'
          ).replace('{{count}}', String(itemNumber)),
          path: `${basePath}${toQuerySuffix(rawQuery)}`,
        });
        continue;
      }

      cards.push({
        id: `${kind}-${rawQuery || 'default'}`,
        kind,
        timestamp: parsed.timestamp,
        title:
          dashboardLabels?.recentFlashcardTitle ??
          dashboardLabels?.continueFlashcards ??
          'Flashcard session',
        subtitle: (
          dashboardLabels?.resumeItemLabel ?? 'Paused at item {{count}}'
        ).replace('{{count}}', String(itemNumber)),
        path: `${basePath}${toQuerySuffix(rawQuery)}`,
      });
    } catch {
      continue;
    }
  }

  return cards.sort((left, right) => right.timestamp - left.timestamp);
};

const buildPlanLabel = (labels: ProfileLabels, plan: 'FREE' | 'PRO' | 'LIFETIME'): string => {
  const dashboardLabels = labels.profile?.dashboard;

  switch (plan) {
    case 'PRO':
      return dashboardLabels?.planPro ?? 'Premium';
    case 'LIFETIME':
      return dashboardLabels?.planLifetime ?? 'Lifetime';
    default:
      return dashboardLabels?.planFree ?? 'Free';
  }
};

const buildMembershipSummary = ({
  labels,
  isPremium,
  linkedCount,
}: {
  labels: ProfileLabels;
  isPremium: boolean;
  linkedCount: number;
}): string => {
  const dashboardLabels = labels.profile?.dashboard;
  const linkedAccountsLabel = (
    dashboardLabels?.linkedAccountsValue ?? '{{count}} linked methods'
  ).replace('{{count}}', String(linkedCount));

  if (isPremium) {
    return (
      dashboardLabels?.membershipPremiumSummary ??
      `Premium access is active. ${linkedAccountsLabel}`
    ).replace('{{linkedCount}}', String(linkedCount));
  }

  return (
    dashboardLabels?.membershipFreeSummary ??
    `Free plan active. ${linkedAccountsLabel}`
  ).replace('{{linkedCount}}', String(linkedCount));
};

export function useProfileHubData(language: Language, labels: ProfileLabels): ProfileHubData {
  const { user, viewerAccess } = useAuth();
  const { settings, isLoading: settingsLoading } = useGlobalSettings();

  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean }, { count: number }>('vocab:getVocabBookCount'),
    user ? { includeMastered: true } : 'skip'
  );
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 20 } : 'skip'
  );
  const userStats = useQuery(
    qRef<NoArgs, LearnerStatsDto>('userStats:getStats'),
    user ? {} : 'skip'
  );
  const linkedAccounts = useQuery(
    qRef<NoArgs, LinkedAccount[]>('auth:linkedAuthAccounts'),
    user ? {} : 'skip'
  );
  const podcastHistory = useQuery(
    qRef<NoArgs, PodcastHistoryItem[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );

  const dashboardLabels = labels.profile?.dashboard;
  const examHistory = examAttempts ?? [];
  const resolvedLinkedAccounts = linkedAccounts ?? [];
  const resolvedPodcastHistory = podcastHistory ?? [];
  const linkedCount = resolvedLinkedAccounts.length;
  const userMeta = (user ?? null) as (User & {
    _id?: string;
    _creationTime?: number;
    createdAt?: number;
    joinDate?: number;
  }) | null;
  const joinedTimestamp = firstPositiveTimestamp(
    userMeta?.createdAt,
    userMeta?.joinDate,
    userMeta?._creationTime,
    0
  );
  const displayName = firstString(
    user?.name,
    user?.email?.split('@')[0],
    labels.profile?.unnamed,
    'Unnamed'
  );
  const rawUserId = firstString(user?.id, userMeta?._id, '');
  const userIdDisplay = rawUserId ? rawUserId.slice(0, 8) : '—';
  const isPremium = Boolean(viewerAccess?.isPremium);
  const resumeSessions = buildResumeSessionCards(labels);

  const learningSnapshot = useMemo<ProfileLearningMetric[]>(() => {
    const safeUserStats = userStats ?? null;
    const bookCount = vocabBookCount?.count ?? 0;
    const activeDays = getWeeklyActiveDays(safeUserStats);

    return [
      {
        id: 'streak',
        label: dashboardLabels?.streakLabel ?? 'Streak',
        value: String(safeUserStats?.streak ?? 0),
        detail: dashboardLabels?.streakDetail ?? 'Consecutive learning days',
      },
      {
        id: 'words',
        label: dashboardLabels?.wordsLabel ?? 'Words learned',
        value: String(safeUserStats?.totalWordsLearned ?? 0),
        detail: dashboardLabels?.wordsDetail ?? 'Vocabulary you have already retained',
      },
      {
        id: 'books',
        label: dashboardLabels?.booksLabel ?? 'Word books',
        value: String(bookCount),
        detail: dashboardLabels?.booksDetail ?? 'Saved lists and study collections',
      },
      {
        id: 'exams',
        label: dashboardLabels?.examsLabel ?? 'Exam attempts',
        value: String(examHistory.length),
        detail: dashboardLabels?.examsDetail ?? 'TOPIK practice records',
      },
      {
        id: 'activeDays',
        label: dashboardLabels?.activeDaysLabel ?? '7-day activity',
        value: String(activeDays),
        detail: dashboardLabels?.activeDaysDetail ?? 'Days active in the last week',
      },
    ];
  }, [dashboardLabels, examHistory.length, userStats, vocabBookCount?.count]);

  const recentActivity = useMemo<ProfileActivityEntry[]>(() => {
    const entries: ProfileActivityEntry[] = [];

    for (const session of resumeSessions.slice(0, 2)) {
      entries.push({
        id: session.id,
        kind: session.kind === 'immersive' ? 'session' : session.kind,
        title: session.title,
        subtitle: session.subtitle,
        detail:
          dashboardLabels?.recentContextSavedDetail ??
          'Your paused position is saved here for a smooth return.',
        path: session.path,
        timestamp: session.timestamp,
      });
    }

    const latestPodcast = resolvedPodcastHistory[0];
    if (latestPodcast) {
      entries.push({
        id: `podcast-${latestPodcast.id}`,
        kind: 'podcast',
        title:
          latestPodcast.episodeTitle ||
          dashboardLabels?.recentPodcastTitle ||
          'Podcast record',
        subtitle: latestPodcast.channelName,
        detail:
          dashboardLabels?.recentPodcastDetail ??
          'Listening history keeps the latest media context attached to your account.',
        path: '/podcasts/history',
        timestamp: latestPodcast.playedAt,
      });
    }

    const latestExam = examHistory[0];
    if (latestExam) {
      entries.push({
        id: `topik-${latestExam.id}`,
        kind: 'topik',
        title: latestExam.examTitle,
        subtitle:
          dashboardLabels?.recentTopikSubtitle ??
          'Latest TOPIK practice result saved to your history',
        detail: `${toPercentScore(latestExam)}%`,
        path: '/topik/history',
        timestamp: latestExam.timestamp,
      });
    }

    const latestSession = userStats?.recentSessions[0];
    if (latestSession) {
      entries.push({
        id: `session-${latestSession.sessionId}`,
        kind: 'session',
        title: latestSession.eventName,
        subtitle: dashboardLabels?.recentSessionTitle ?? 'Recent learning record',
        detail: latestSession.module,
        path: '/dashboard',
        timestamp: latestSession.eventAt,
      });
    }

    return entries
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 5);
  }, [dashboardLabels, examHistory, language, resolvedPodcastHistory, resumeSessions, userStats]);

  const achievements = useMemo<ProfileAchievement[]>(() => {
    const streakValue = userStats?.streak ?? 0;
    const wordsValue = userStats?.totalWordsLearned ?? 0;
    const examsValue = examHistory.length;
    const nextStreak = getNextMilestone(streakValue, [7, 30, 100]);
    const nextWords = getNextMilestone(wordsValue, [100, 500, 1000]);
    const nextExams = getNextMilestone(examsValue, [1, 5, 10]);

    return [
      {
        id: 'streak',
        title: dashboardLabels?.achievementStreakTitle ?? 'Streak milestone',
        description:
          streakValue >= nextStreak
            ? dashboardLabels?.achievementStreakDone ?? 'Your learning streak is on track.'
            : (
                dashboardLabels?.achievementStreakPending ?? '{{count}} days to unlock the next tier'
              ).replace('{{count}}', String(nextStreak)),
        value: `${streakValue}/${nextStreak}`,
        status: streakValue >= nextStreak ? 'achieved' : 'next',
      },
      {
        id: 'words',
        title: dashboardLabels?.achievementWordsTitle ?? 'Vocabulary milestone',
        description:
          wordsValue >= nextWords
            ? dashboardLabels?.achievementWordsDone ?? 'You have crossed a major vocab threshold.'
            : (
                dashboardLabels?.achievementWordsPending ?? '{{count}} words marks the next milestone'
              ).replace('{{count}}', String(nextWords)),
        value: `${wordsValue}/${nextWords}`,
        status: wordsValue >= nextWords ? 'achieved' : 'next',
      },
      {
        id: 'exams',
        title: dashboardLabels?.achievementExamsTitle ?? 'Exam milestone',
        description:
          examsValue >= nextExams
            ? dashboardLabels?.achievementExamsDone ?? 'Practice history is already building depth.'
            : (
                dashboardLabels?.achievementExamsPending ?? 'Reach {{count}} attempts for the next checkpoint'
              ).replace('{{count}}', String(nextExams)),
        value: `${examsValue}/${nextExams}`,
        status: examsValue >= nextExams ? 'achieved' : 'next',
      },
      {
        id: 'premium',
        title: dashboardLabels?.achievementPremiumTitle ?? 'Membership unlock',
        description: isPremium
          ? dashboardLabels?.achievementPremiumDone ?? 'Premium tools are active across your account.'
          : dashboardLabels?.achievementPremiumPending ?? 'Unlock media controls and expanded history.',
        value: isPremium
          ? dashboardLabels?.achievementPremiumValueActive ?? 'Active'
          : dashboardLabels?.achievementPremiumValueLocked ?? 'Upgrade',
        status: isPremium ? 'achieved' : 'next',
      },
    ];
  }, [dashboardLabels, examHistory.length, isPremium, userStats]);

  const settingsSummary = useMemo<ProfileSettingsSummaryRow[]>(
    () => [
      {
        id: 'language',
        label: dashboardLabels?.settingsLanguageLabel ?? 'Language',
        value: getLanguageLabel(settings.displayLanguage),
        description:
          dashboardLabels?.settingsLanguageDescription ??
          'Display language follows your account everywhere.',
        path: '/profile/settings',
      },
      {
        id: 'flashcards',
        label: dashboardLabels?.settingsFlashcardsLabel ?? 'Flashcards',
        value: [
          settings.flashcardFront === 'KOREAN'
            ? dashboardLabels?.flashcardFrontKorean ?? 'Korean first'
            : dashboardLabels?.flashcardFrontMeaning ?? 'Meaning first',
          settings.flashcardRatingMode === 'PASS_FAIL'
            ? dashboardLabels?.ratingModePassFail ?? 'Pass / Fail'
            : dashboardLabels?.ratingModeFourButtons ?? '4 Buttons',
          settings.flashcardAutoTTS
            ? dashboardLabels?.autoPlayOn ?? 'Auto play on'
            : dashboardLabels?.autoPlayOff ?? 'Auto play off',
        ].join(' · '),
        description:
          dashboardLabels?.settingsFlashcardsDescription ??
          'Front side, grading mode, and auto-audio are already synced.',
        path: '/profile/settings',
      },
      {
        id: 'audio',
        label: dashboardLabels?.settingsAudioLabel ?? 'Audio & Dictation',
        value: [
          `${settings.audioSpeed}x`,
          settings.audioRepeatCount === 'INFINITE'
            ? dashboardLabels?.repeatInfinite ?? 'Infinite repeat'
            : (
                dashboardLabels?.repeatCountValue ?? '{{count}} repeats'
              ).replace('{{count}}', String(settings.audioRepeatCount)),
          (
            dashboardLabels?.dictationGapValue ?? '{{count}}s gap'
          ).replace('{{count}}', String(settings.dictationGapSeconds)),
        ].join(' · '),
        description:
          dashboardLabels?.settingsAudioDescription ??
          'Playback speed, repeat behavior, and dictation pacing are aligned.',
        path: '/profile/settings',
      },
    ],
    [dashboardLabels, settings]
  );

  const securitySummary = useMemo<ProfileSecuritySummaryItem[]>(
    () => [
      {
        id: 'accountStatus',
        label: dashboardLabels?.securityStatusLabel ?? 'Account status',
        value:
          user?.accountStatus === 'DISABLED'
            ? dashboardLabels?.accountDisabled ?? 'Disabled'
            : dashboardLabels?.accountActive ?? 'Active',
        description:
          dashboardLabels?.securityStatusDescription ??
          'The account can sign in and access learning data normally.',
      },
      {
        id: 'linkedAccounts',
        label: dashboardLabels?.securityLinkedLabel ?? 'Linked methods',
        value: (
          dashboardLabels?.linkedAccountsValue ?? '{{count}} linked methods'
        ).replace('{{count}}', String(linkedCount)),
        description:
          dashboardLabels?.securityLinkedDescription ??
          'Google and Kakao connections can be managed from Security.',
      },
      {
        id: 'verification',
        label: dashboardLabels?.securityVerificationLabel ?? 'Email verification',
        value: user?.emailVerificationTime
          ? dashboardLabels?.verificationComplete ?? 'Verified'
          : dashboardLabels?.verificationPending ?? 'Pending',
        description:
          user?.emailVerificationTime
            ? dashboardLabels?.verificationCompleteDescription ??
              'Verified email improves recovery and sign-in safety.'
            : dashboardLabels?.verificationPendingDescription ??
              'Complete verification to strengthen recovery options.',
      },
    ],
    [dashboardLabels, linkedCount, user?.accountStatus, user?.emailVerificationTime]
  );

  return {
    identity: {
      displayName,
      email: user?.email ?? '',
      avatar: user?.avatar,
      joinedDateLabel: joinedTimestamp ? formatAbsoluteDate(language, joinedTimestamp) : '—',
      joinedTimestamp,
      userIdDisplay,
      linkedCount,
      isProfileIncomplete: !user?.name?.trim() || !user.avatar,
      accountStatus: user?.accountStatus === 'DISABLED' ? 'DISABLED' : 'ACTIVE',
    },
    membership: {
      planLabel: buildPlanLabel(labels, viewerAccess?.plan ?? 'FREE'),
      statusLabel: isPremium
        ? dashboardLabels?.membershipStatusPremium ?? 'Premium active'
        : dashboardLabels?.membershipStatusFree ?? 'Free plan',
      primaryActionLabel: isPremium
        ? dashboardLabels?.manageMembership ?? 'Manage membership'
        : dashboardLabels?.upgradeMembership ?? 'Upgrade',
      primaryActionPath: isPremium
        ? '/pricing/details?source=profile_hub'
        : '/pricing?source=profile_hub',
      secondaryActionLabel: dashboardLabels?.editProfile ?? 'Edit profile',
      secondaryActionPath: '/profile/account',
      summary: buildMembershipSummary({
        labels,
        isPremium,
        linkedCount,
      }),
    },
    learningSnapshot,
    recentActivity,
    achievements,
    settingsSummary,
    securitySummary,
    examHistory,
    podcastHistory: resolvedPodcastHistory,
    recentSessions: userStats?.recentSessions ?? [],
    linkedAccounts: resolvedLinkedAccounts,
    userStats: userStats ?? null,
    isLoading:
      user === null ||
      vocabBookCount === undefined ||
      examAttempts === undefined ||
      userStats === undefined ||
      linkedAccounts === undefined ||
      podcastHistory === undefined ||
      settingsLoading,
  };
}
