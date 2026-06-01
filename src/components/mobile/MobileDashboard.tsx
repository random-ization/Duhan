import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { Bell, BookOpen, ShieldAlert, UserRoundPlus, Users } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { DailyTaskItemDto } from '../../../convex/dailyTask/shared';
import type { FriendSearchItemDto } from '../../../convex/friends';
import type { PartnershipDto } from '../../../convex/partnerships';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import {
  COMMUNITY,
  DAILY_CHALLENGES,
  DAILY_TASK,
  FRIENDS,
  LEADERBOARD,
  NEWS,
  NoArgs,
  NOTIFICATIONS,
  PARTNERSHIPS,
  qRef,
  RECOMMENDATIONS,
  ABILITY_PROFILER,
  COMMUNITY_INSIGHTS,
  type AbilityDimensions,
  type LiveAbilityScores,
  type NextBestAction,
  type NotificationDto,
} from '../../utils/convexRefs';
import { buildMediaPath } from '../../utils/mediaRoutes';
import { appendReturnToPath } from '../../utils/navigation';
import { notify } from '../../utils/notify';
import { buildPodcastPlayerPath } from '../../utils/podcastRoutes';
import { buildTodayTaskPath } from '../../utils/todayFlow';
import type { ExamAttempt, Institute } from '../../types';
import { formatNotificationTime } from '../../utils/notificationFormat';
import { Chip, HanjaSeal, KT, SectionHead, StreakRow } from './ksoft/ksoft';
import {
  CommunityLikeOverride,
  EMPTY_LEARNER_STATS,
  PodcastHistoryItem,
  TOPIK_GRAMMAR_COURSE_ID,
  formatChallengeActionLabel,
  formatChallengeProgressLabel,
  formatChallengeRewardLabel,
  formatCommunityAction,
  formatCommunityTime,
  getCommunityTone,
  getConvexErrorCode,
  getDashboardCopy,
  getTargetAlreadyPairedMessage,
  type LearningEntryTarget,
} from './MobileDashboard.helpers';

const estimateDailyTaskMinutes = (kind: DailyTaskItemDto['kind']): number => {
  if (kind === 'vocab_20') return 12;
  if (kind === 'grammar_drill') return 15;
  if (kind === 'listening_10min') return 10;
  if (kind === 'typing_wpm') return 8;
  if (kind === 'note_review') return 8;
  if (kind === 'sentence_review') return 10;
  if (kind === 'grammar_review') return 10;
  if (kind === 'topik_rewrite') return 20;
  return 10;
};

const formatTodayPathTitle = (language: string): string => {
  if (language.startsWith('zh')) return '今日之路';
  if (language.startsWith('vi')) return 'Lộ trình hôm nay';
  if (language.startsWith('mn')) return 'Өнөөдрийн зам';
  return "Today's Path";
};

const formatTodayPathEstimate = (language: string, minutes: number): string => {
  if (language.startsWith('zh')) return `预计 ${minutes} 分钟`;
  if (language.startsWith('vi')) return `Dự kiến ${minutes} phút`;
  if (language.startsWith('mn')) return `Ойролцоогоор ${minutes} мин`;
  return `Est. ${minutes} min`;
};

const formatStartTodayPathLabel = (language: string): string => {
  if (language.startsWith('zh')) return '开始今日学习';
  if (language.startsWith('vi')) return 'Bắt đầu hôm nay';
  if (language.startsWith('mn')) return 'Өнөөдөр эхлэх';
  return "Start Today's Path";
};

const MOBILE_ABILITY_COPY: Record<keyof AbilityDimensions, { zh: string; en: string }> = {
  vocabulary: { zh: '词汇', en: 'Vocab' },
  grammar: { zh: '语法', en: 'Grammar' },
  reading: { zh: '阅读', en: 'Reading' },
  writing: { zh: '写作', en: 'Writing' },
  listening: { zh: '听力', en: 'Listening' },
};

const findWeakestMobileAbilityDimension = (dimensions: AbilityDimensions | undefined) => {
  if (!dimensions) return null;

  return (Object.entries(dimensions) as Array<[keyof AbilityDimensions, number]>).reduce<{
    key: keyof AbilityDimensions;
    score: number;
  } | null>((weakest, [key, score]) => {
    if (!weakest || score < weakest.score) return { key, score };
    return weakest;
  }, null);
};

function MobileLearningLoopSummary({
  plan,
  stats,
  abilityScores,
  nextBestAction,
  nextDailyTask,
  language,
}: {
  plan: { rationale?: string; reviewSummary?: { weakPointSummary?: string } } | null | undefined;
  stats: LearnerStatsDto;
  abilityScores: LiveAbilityScores | null | undefined;
  nextBestAction: NextBestAction | null | undefined;
  nextDailyTask: DailyTaskItemDto | null;
  language: string;
}) {
  const isZh = language.startsWith('zh');
  const weakest = findWeakestMobileAbilityDimension(abilityScores?.dimensions);
  const weakestLabel = weakest
    ? MOBILE_ABILITY_COPY[weakest.key][isZh ? 'zh' : 'en']
    : isZh
      ? '待诊断'
      : 'Pending';
  const learnedWords = stats.vocabStats.mastered ?? 0;
  const learnedHours = Math.round((stats.totalMinutes ?? 0) / 60);
  const actionTitle =
    nextDailyTask?.title ??
    (nextBestAction ? nextBestAction.kind : isZh ? '打开课程中心' : 'Open course center');
  const actionDetail =
    nextDailyTask?.description ??
    plan?.rationale ??
    (isZh ? '从最有收益的一步开始。' : 'Start with the highest-impact step.');
  const gapDetail =
    plan?.reviewSummary?.weakPointSummary ??
    (weakest
      ? `${weakestLabel} ${Math.round(weakest.score)}/100`
      : isZh
        ? '多完成几次练习后会生成薄弱项。'
        : 'More practice will unlock a gap estimate.');
  const items = [
    {
      k: '做',
      label: isZh ? '先做' : 'Next',
      title: actionTitle,
      detail: actionDetail,
      bg: KT.crimson,
    },
    {
      k: '得',
      label: isZh ? '已学' : 'Learned',
      title: isZh ? `${learnedWords} 词已掌握` : `${learnedWords} mastered`,
      detail: isZh ? `累计 ${learnedHours} 小时` : `${learnedHours} total hours`,
      bg: KT.mint,
    },
    {
      k: '缺',
      label: isZh ? '不足' : 'Gap',
      title: weakestLabel,
      detail: gapDetail,
      bg: KT.butter,
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gap: 8,
        padding: '12px 14px',
        borderBottom: `1px solid ${KT.line}`,
        background: KT.bg2,
      }}
    >
      {items.map(item => (
        <div
          key={item.label}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            minWidth: 0,
          }}
        >
          <HanjaSeal c={item.k} size={28} bg={item.bg} round={7} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', gap: 7, alignItems: 'baseline', minWidth: 0 }}>
              <span style={{ fontSize: 10, fontWeight: 900, color: KT.crimson, flexShrink: 0 }}>
                {item.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: KT.ink,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {item.title}
              </span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: KT.sub,
                fontWeight: 600,
                marginTop: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {item.detail}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export const MobileDashboard: React.FC<{
  learningEntryTarget: LearningEntryTarget | null;
  institutes: Institute[] | undefined;
  institutesLoading: boolean;
}> = () => {
  const { user } = useAuth();
  const { i18n, t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const ensureUserFeed = useMutation(NEWS.ensureUserFeed);
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const userName = user?.name?.split(' ')[0] || user?.name || '';
  const copy = useMemo(() => getDashboardCopy(language, userName), [language, userName]);
  const [notificationPanelOpen, setNotificationPanelOpen] = React.useState(false);
  const latestUnreadIdRef = useRef<string | null>(null);
  const latestUnreadCreatedAtRef = useRef<number | null>(null);

  const userStats = useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats'));
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 6 } : 'skip'
  );
  const podcastHistory = useQuery(
    qRef<NoArgs, PodcastHistoryItem[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );
  const communityActivities = useQuery(
    COMMUNITY.getRecentFriendActivity,
    user ? { limit: 3 } : 'skip'
  );
  const dailyChallenge = useQuery(DAILY_CHALLENGES.getTodayChallenge, { language });
  // Freeze localHour for the lifetime of the component so re-renders
  // don't re-issue the recommendation query every minute.
  const [localHour] = React.useState(() => new Date().getHours());
  const nextBestAction = useQuery(RECOMMENDATIONS.getNextBestAction, user ? { localHour } : 'skip');
  const dailyTaskPlan = useQuery(DAILY_TASK.getTodayPlan, user ? { language } : 'skip');
  const unreadNotificationCount = useQuery(NOTIFICATIONS.getUnreadCount, user ? {} : 'skip') ?? 0;
  const recentNotifications = useQuery(
    NOTIFICATIONS.listRecent,
    user && notificationPanelOpen ? { limit: 20 } : 'skip'
  );
  const myRank = useQuery(LEADERBOARD.getMyRank, user ? {} : 'skip');
  const abilityScores = useQuery(ABILITY_PROFILER.getLiveAbilityScores, user ? {} : 'skip');
  const communityStanding = useQuery(COMMUNITY_INSIGHTS.getMyStanding, user ? {} : 'skip');
  const activePartnership = useQuery(PARTNERSHIPS.getActivePartnership, user ? {} : 'skip');
  const pendingPartnerships = useQuery(PARTNERSHIPS.listPending, user ? {} : 'skip');
  const [friendSearchInput, setFriendSearchInput] = React.useState('');
  const [friendSearchQuery, setFriendSearchQuery] = React.useState('');
  const friendSearchResults = useQuery(
    FRIENDS.searchUsers,
    user && friendSearchQuery.length >= 2 ? { query: friendSearchQuery, limit: 6 } : 'skip'
  );
  const likeCommunityActivity = useMutation(COMMUNITY.likeActivity);
  const unlikeCommunityActivity = useMutation(COMMUNITY.unlikeActivity);
  const claimDailyChallenge = useMutation(DAILY_CHALLENGES.claimReward);
  const markNotificationRead = useMutation(NOTIFICATIONS.markRead);
  const markAllNotificationsRead = useMutation(NOTIFICATIONS.markAllRead);
  const dismissNotification = useMutation(NOTIFICATIONS.dismiss);
  const sendRequestByCodeMutation = useMutation(FRIENDS.sendRequestByCode);
  const invitePartnerMutation = useMutation(PARTNERSHIPS.invitePartner);
  const acceptPartnershipMutation = useMutation(PARTNERSHIPS.acceptPartnership);
  const declinePartnershipMutation = useMutation(PARTNERSHIPS.declinePartnership);
  const [isClaimingDailyChallenge, setIsClaimingDailyChallenge] = React.useState(false);
  const [likeOverrides, setLikeOverrides] = React.useState<
    Record<string, CommunityLikeOverride | undefined>
  >({});
  const [likePending, setLikePending] = React.useState<Record<string, boolean>>({});
  const [invitePending, setInvitePending] = React.useState<Record<string, boolean>>({});
  const [invitedUsers, setInvitedUsers] = React.useState<Record<string, boolean>>({});
  const [partnershipActionPending, setPartnershipActionPending] = React.useState<
    Record<string, boolean>
  >({});
  const [friendSearchBusy, setFriendSearchBusy] = React.useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!user?.id) return;
    void ensureUserFeed({ newsLimit: 3, articleLimit: 3 }).catch(() => undefined);
  }, [ensureUserFeed, user?.id]);

  useEffect(() => {
    if (!recentNotifications || recentNotifications.length === 0) return;
    const newestUnread = recentNotifications.find(item => !item.readAt);
    if (!newestUnread) return;
    if (latestUnreadIdRef.current === null) {
      latestUnreadIdRef.current = newestUnread.id;
      latestUnreadCreatedAtRef.current = newestUnread.createdAt;
      return;
    }
    if (
      typeof latestUnreadCreatedAtRef.current === 'number' &&
      newestUnread.createdAt <= latestUnreadCreatedAtRef.current
    ) {
      latestUnreadIdRef.current = newestUnread.id;
      return;
    }
    if (latestUnreadIdRef.current === newestUnread.id) return;
    latestUnreadIdRef.current = newestUnread.id;
    latestUnreadCreatedAtRef.current = newestUnread.createdAt;
    notify.info(newestUnread.title);
  }, [recentNotifications]);

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setFriendSearchQuery(friendSearchInput.trim());
    }, 250);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [friendSearchInput]);

  const stats = userStats ?? EMPTY_LEARNER_STATS;
  const dueReviews = Math.max(
    stats.vocabStats.dueReviews,
    stats.reviewStats.dueNow,
    stats.wordsToReview
  );
  const streak = stats.streak ?? 0;

  const latestPodcast = podcastHistory?.[0];
  const dashboardPath = `${location.pathname}${location.search}`;

  const goReview = () => navigate('/review');
  const goGrammar = () =>
    navigate(appendReturnToPath(`/course/${TOPIK_GRAMMAR_COURSE_ID}/grammar`, dashboardPath));
  const goPodcast = () => {
    if (latestPodcast) {
      navigate(buildPodcastPlayerPath(dashboardPath), {
        state: {
          episode: {
            guid: latestPodcast.episodeGuid,
            title: latestPodcast.episodeTitle,
            audioUrl: latestPodcast.episodeUrl,
            channel: {
              title: latestPodcast.channelName,
              artworkUrl: latestPodcast.channelImage,
            },
          },
        },
      });
      return;
    }
    navigate(buildMediaPath('podcast'));
  };
  const goTyping = () => navigate(appendReturnToPath('/typing', dashboardPath));

  const nextDailyTask = useMemo(() => {
    if (!dailyTaskPlan) return null;
    return (
      dailyTaskPlan.tasks.find(task => !task.completed && task.linkPath) ??
      dailyTaskPlan.tasks.find(task => task.linkPath) ??
      null
    );
  }, [dailyTaskPlan]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const auto = searchParams.get('auto') === '1';
    const taskPath = nextDailyTask ? buildTodayTaskPath(nextDailyTask, dashboardPath) : null;
    if (auto && taskPath) {
      navigate(taskPath, {
        replace: true,
      });
    }
  }, [nextDailyTask, navigate, dashboardPath]);

  const streakDoneDays = Math.min(7, Math.max(0, streak % 7 || (streak > 0 ? 7 : 0)));

  const dateLabel = useMemo(() => {
    const d = new Date();
    const monthCn = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'][
      d.getMonth()
    ];
    const toCnDay = (n: number) => {
      if (n < 10) return ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][n];
      if (n === 10) return '十';
      if (n < 20) return '十' + ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][n - 10];
      if (n === 20) return '二十';
      if (n < 30)
        return '二十' + ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][n - 20];
      return '三十' + (n === 30 ? '' : ['', '一'][n - 30]);
    };
    return `${monthCn}月 ${toCnDay(d.getDate())}日`;
  }, []);

  const recentScoreCount = examAttempts?.length ?? 0;
  const achievements = [
    {
      e: '⚡',
      l: copy.reviewKind,
      s: `${stats.todayActivities?.wordsLearned || 0}`,
      visible: true,
    },
    { e: '📚', l: copy.grammarKind, s: `+${stats.todayGrammarStudied || 0}`, visible: true },
    { e: '🎯', l: 'TOPIK', s: `${recentScoreCount}`, visible: recentScoreCount > 0 },
  ].filter(a => a.visible);

  const friendFeed = useMemo(() => {
    if (!communityActivities) return [];
    return communityActivities.map(item => {
      const key = String(item.activityId);
      const override = likeOverrides[key];
      const resolvedLiked = override?.liked ?? item.likedByMe;
      const resolvedLikeCount = override?.likeCount ?? item.likeCount;
      const tone = getCommunityTone(item.module, language);
      return {
        ...item,
        key,
        resolvedLiked,
        resolvedLikeCount: Math.max(0, resolvedLikeCount),
        ...tone,
        action: formatCommunityAction(item, language),
        time: formatCommunityTime(item.eventAt, language),
      };
    });
  }, [communityActivities, language, likeOverrides]);

  const challengeProgressRatio = dailyChallenge
    ? Math.min(1, dailyChallenge.currentCount / Math.max(1, dailyChallenge.targetCount))
    : 0;
  const challengeActionLabel = formatChallengeActionLabel({
    challenge: dailyChallenge,
    language,
    isClaiming: isClaimingDailyChallenge,
  });

  const handleChallengeAction = async () => {
    if (!dailyChallenge || isClaimingDailyChallenge) return;
    if (dailyChallenge.isClaimed) return;
    if (dailyChallenge.isCompleted) {
      try {
        setIsClaimingDailyChallenge(true);
        await claimDailyChallenge({});
      } catch {
        // Query invalidation will reconcile already-claimed cases; keep this action silent on dashboard.
      } finally {
        setIsClaimingDailyChallenge(false);
      }
      return;
    }

    if (dailyChallenge.kind === 'vocab_20') {
      goReview();
      return;
    }
    if (dailyChallenge.kind === 'grammar_drill') {
      goGrammar();
      return;
    }
    if (dailyChallenge.kind === 'listening_10min') {
      goPodcast();
      return;
    }
    goTyping();
  };

  const handleToggleLike = async (activityId: string) => {
    const key = String(activityId);
    if (likePending[key]) return;

    const source = communityActivities?.find(item => String(item.activityId) === key);
    if (!source) return;
    const override = likeOverrides[key];
    const currentLiked = override?.liked ?? source.likedByMe;
    const currentCount = override?.likeCount ?? source.likeCount;
    const nextLiked = !currentLiked;
    const nextCount = Math.max(0, currentCount + (nextLiked ? 1 : -1));

    setLikePending(prev => ({ ...prev, [key]: true }));
    setLikeOverrides(prev => ({
      ...prev,
      [key]: { liked: nextLiked, likeCount: nextCount },
    }));

    try {
      const result = nextLiked
        ? await likeCommunityActivity({ activityId, kind: 'event' })
        : await unlikeCommunityActivity({ activityId, kind: 'event' });
      setLikeOverrides(prev => ({
        ...prev,
        [key]: { liked: result.liked, likeCount: result.likeCount },
      }));
    } catch {
      setLikeOverrides(prev => ({
        ...prev,
        [key]: { liked: currentLiked, likeCount: currentCount },
      }));
    } finally {
      setLikePending(prev => ({ ...prev, [key]: false }));
    }
  };

  const renderNotificationTypeIcon = (notification: NotificationDto) => {
    if (notification.category === 'learning') return <BookOpen size={13} />;
    if (notification.category === 'exam') return <ShieldAlert size={13} />;
    if (notification.kind === 'friend_request') return <UserRoundPlus size={13} />;
    if (notification.category === 'social') return <Users size={13} />;
    return <Bell size={13} />;
  };

  const openNotification = async (notification: NotificationDto) => {
    setNotificationPanelOpen(false);
    if (!notification.readAt) {
      try {
        await markNotificationRead({ id: notification.id });
      } catch {
        // non-blocking
      }
    }
    if (notification.linkPath) {
      navigate(notification.linkPath);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await markAllNotificationsRead({});
    } catch {
      notify.error(
        t('notifications.markAllFailed', { defaultValue: 'Could not mark all as read.' })
      );
    }
  };

  const handleDismissNotification = async (notificationId: NotificationDto['id']) => {
    try {
      await dismissNotification({ id: notificationId });
    } catch {
      // non-blocking
    }
  };

  const handleInvitePartner = async (targetUserId: Id<'users'>) => {
    const key = String(targetUserId);
    if (invitePending[key] || invitedUsers[key]) return;
    setInvitePending(prev => ({ ...prev, [key]: true }));
    try {
      await invitePartnerMutation({ targetUserId });
      setInvitedUsers(prev => ({ ...prev, [key]: true }));
    } catch (error) {
      if (getConvexErrorCode(error) === 'TARGET_ALREADY_PAIRED') {
        notify.error(getTargetAlreadyPairedMessage(language));
      }
    } finally {
      setInvitePending(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleAcceptPartnership = async (partnershipId: PartnershipDto['id']) => {
    const key = String(partnershipId);
    if (partnershipActionPending[key]) return;
    setPartnershipActionPending(prev => ({ ...prev, [key]: true }));
    try {
      await acceptPartnershipMutation({ partnershipId });
    } catch {
      // NOT_FOUND / FORBIDDEN — stale UI, the next query tick will clean up.
    } finally {
      setPartnershipActionPending(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleDeclinePartnership = async (partnershipId: PartnershipDto['id']) => {
    const key = String(partnershipId);
    if (partnershipActionPending[key]) return;
    setPartnershipActionPending(prev => ({ ...prev, [key]: true }));
    try {
      await declinePartnershipMutation({ partnershipId });
    } catch {
      // Same as above — stale state; rely on reactive invalidation.
    } finally {
      setPartnershipActionPending(prev => ({ ...prev, [key]: false }));
    }
  };

  const friendLinkButtonCopy = {
    addFriend: language.startsWith('zh')
      ? '添加好友'
      : language.startsWith('vi')
        ? 'Thêm bạn'
        : language.startsWith('mn')
          ? 'Найз нэмэх'
          : 'Add friend',
    failed: language.startsWith('zh')
      ? '操作失败，请稍后再试'
      : language.startsWith('vi')
        ? 'Thao tác thất bại, hãy thử lại'
        : language.startsWith('mn')
          ? 'Амжилтгүй боллоо, дахин оролдоно уу'
          : 'Action failed. Please try again.',
    codeLabel: language.startsWith('zh')
      ? '好友码'
      : language.startsWith('vi')
        ? 'Mã bạn bè'
        : language.startsWith('mn')
          ? 'Найзын код'
          : 'Friend code',
    searchPlaceholder: language.startsWith('zh')
      ? '输入昵称或好友码'
      : language.startsWith('vi')
        ? 'Nhập tên hoặc mã bạn bè'
        : language.startsWith('mn')
          ? 'Нэр эсвэл найзын код оруулна уу'
          : 'Search by nickname or friend code',
    searchHint: language.startsWith('zh')
      ? '输入 2 个以上字符开始搜索'
      : language.startsWith('vi')
        ? 'Nhập ít nhất 2 ký tự để tìm kiếm'
        : language.startsWith('mn')
          ? 'Хайхын тулд 2+ тэмдэгт оруулна уу'
          : 'Type at least 2 characters to search',
    searchEmpty: language.startsWith('zh')
      ? '未找到匹配用户'
      : language.startsWith('vi')
        ? 'Không tìm thấy người dùng phù hợp'
        : language.startsWith('mn')
          ? 'Тохирох хэрэглэгч олдсонгүй'
          : 'No matching users found',
    searchAdd: language.startsWith('zh')
      ? '加好友'
      : language.startsWith('vi')
        ? 'Kết bạn'
        : language.startsWith('mn')
          ? 'Найз болгох'
          : 'Add',
    searchSent: language.startsWith('zh')
      ? '已发送'
      : language.startsWith('vi')
        ? 'Đã gửi'
        : language.startsWith('mn')
          ? 'Илгээгдсэн'
          : 'Sent',
    searchAlready: language.startsWith('zh')
      ? '已是好友'
      : language.startsWith('vi')
        ? 'Đã là bạn'
        : language.startsWith('mn')
          ? 'Аль хэдийн найз'
          : 'Friends',
    requestSentToast: language.startsWith('zh')
      ? '好友请求已发送'
      : language.startsWith('vi')
        ? 'Đã gửi lời mời kết bạn'
        : language.startsWith('mn')
          ? 'Найзын хүсэлт илгээгдлээ'
          : 'Friend request sent',
  };

  const handleAddFriendFromSearch = async (item: FriendSearchItemDto) => {
    const key = String(item.userId);
    if (friendSearchBusy[key]) return;
    setFriendSearchBusy(prev => ({ ...prev, [key]: true }));
    try {
      const result = await sendRequestByCodeMutation({ code: item.friendCode });
      if (result.status === 'sent') {
        notify.success(friendLinkButtonCopy.requestSentToast);
        return;
      }
      if (result.status === 'already_friends') {
        notify.info(friendLinkButtonCopy.searchAlready);
        return;
      }
      notify.info(friendLinkButtonCopy.searchSent);
    } catch (error) {
      const code = getConvexErrorCode(error);
      if (code === 'SELF_ADD_NOT_ALLOWED') {
        notify.error(
          language.startsWith('zh')
            ? '不能添加自己为好友'
            : language.startsWith('vi')
              ? 'Bạn không thể tự thêm chính mình'
              : language.startsWith('mn')
                ? 'Өөрийгөө найзаар нэмэх боломжгүй'
                : 'You cannot add yourself'
        );
      } else if (code === 'INVALID_CODE' || code === 'TARGET_NOT_FOUND') {
        notify.error(
          language.startsWith('zh')
            ? '好友码无效'
            : language.startsWith('vi')
              ? 'Mã bạn bè không hợp lệ'
              : language.startsWith('mn')
                ? 'Найзын код буруу байна'
                : 'Invalid friend code'
        );
      } else {
        notify.error(friendLinkButtonCopy.failed);
      }
    } finally {
      setFriendSearchBusy(prev => ({ ...prev, [key]: false }));
    }
  };

  // Localized title + subtitle for the recommendation "Resume" card.
  const resumeCopy = (action: NextBestAction) => {
    const zh = language.startsWith('zh');
    const vi = language.startsWith('vi');
    const mn = language.startsWith('mn');
    switch (action.kind) {
      case 'review_due_vocab': {
        const n = action.count || dueReviews || 0;
        const title = zh
          ? `立刻复习 ${n} 张卡片`
          : vi
            ? `Ôn ${n} thẻ ngay bây giờ`
            : mn
              ? `${n} карт яг одоо давт`
              : `Review ${n} cards now`;
        const sub =
          action.reasonCode === 'cold_start_with_reviews'
            ? zh
              ? '回来啦，先把积压清掉'
              : vi
                ? 'Trở lại — xử lý phần tồn đọng'
                : mn
                  ? 'Буцаж ирлээ — хоцрогдлоо цэвэрлэе'
                  : 'Welcome back — clear the backlog'
            : zh
              ? 'FSRS · 最优复习时机'
              : vi
                ? 'FSRS · thời điểm ôn tối ưu'
                : mn
                  ? 'FSRS · хамгийн оновчтой давтах үе'
                  : 'FSRS · optimal review window';
        return { title, sub };
      }
      case 'podcast_resume':
        return {
          title: zh
            ? '通勤时光，来段韩语播客'
            : vi
              ? 'Giờ đi làm — nghe podcast tiếng Hàn'
              : mn
                ? 'Замын цагт солонгос подкаст'
                : 'Commute time — a Korean podcast',
          sub: zh
            ? '沉浸聆听 · 10-15 分钟'
            : vi
              ? 'Nghe đắm chìm · 10-15 phút'
              : mn
                ? 'Гүнзгий сонсгол · 10-15 мин'
                : 'Immersive listening · 10-15 min',
        };
      case 'reading_continue':
        return {
          title: zh
            ? '晚间阅读时刻'
            : vi
              ? 'Khoảnh khắc đọc buổi tối'
              : mn
                ? 'Үдшийн унших цаг'
                : 'Evening reading time',
          sub: zh
            ? '精选文章 · 放松阅读'
            : vi
              ? 'Bài chọn lọc · đọc thư thái'
              : mn
                ? 'Шилмэл нийтлэлүүд'
                : 'Hand-picked articles · unwind',
        };
      case 'exam_practice':
        return {
          title: zh
            ? '继续 TOPIK 练习'
            : vi
              ? 'Tiếp tục luyện TOPIK'
              : mn
                ? 'TOPIK дасгалаа үргэлжлүүл'
                : 'Continue TOPIK practice',
          sub: zh
            ? '上次在这里中断'
            : vi
              ? 'Bạn đã dừng ở đây'
              : mn
                ? 'Та эндээс зогссон'
                : 'You left off here',
        };
      case 'continue_course':
        return {
          title: zh
            ? '回到语法课堂'
            : vi
              ? 'Quay lại lớp ngữ pháp'
              : mn
                ? 'Дүрмийн хичээл рүүгээ буц'
                : 'Back to grammar',
          sub: zh
            ? '接着上次继续'
            : vi
              ? 'Tiếp tục từ lần trước'
              : mn
                ? 'Сүүлд зогссон газраасаа'
                : 'Pick up where you left off',
        };
      case 'typing_drill':
        return {
          title: zh ? '打字训练' : vi ? 'Luyện gõ chữ' : mn ? 'Бичих дасгал' : 'Typing drill',
          sub: zh
            ? '提升速度和准确率'
            : vi
              ? 'Tăng tốc độ và độ chính xác'
              : mn
                ? 'Хурд ба нарийвчлалыг сайжруул'
                : 'Boost speed & accuracy',
        };
      case 'new_vocab':
      default:
        return {
          title: zh
            ? '开启今日学习'
            : vi
              ? 'Bắt đầu học hôm nay'
              : mn
                ? 'Өнөөдрийн сургалтаа эхлүүл'
                : 'Start today’s lesson',
          sub: zh
            ? '从课程开始新的一天'
            : vi
              ? 'Khởi đầu ngày mới từ khóa học'
              : mn
                ? 'Курсээс өдрөө эхлүүл'
                : 'Kick off the day from courses',
        };
    }
  };

  return (
    <div
      className="min-h-[100dvh] pb-mobile-nav"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
        color: KT.ink,
        fontFamily: KT.font,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Warm gradient header */}
      <div
        style={{
          padding: '18px 22px 24px',
          paddingTop: 'calc(env(safe-area-inset-top) + 18px)',
          background: `linear-gradient(180deg, ${KT.pink}40 0%, ${KT.bg} 100%)`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: 22,
          }}
        >
          <div>
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 13,
                color: KT.crimson,
                letterSpacing: 4,
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              {dateLabel}
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.8,
                lineHeight: 1.1,
              }}
            >
              {copy.greeting.split(',')[0]},{' '}
              <span style={{ color: KT.crimson }}>{copy.greeting.split(',')[1]?.trim() || ''}</span>
            </div>
            <div style={{ fontSize: 14, color: KT.sub, marginTop: 6, fontWeight: 500 }}>
              {copy.greetingSub}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 5,
              fontFamily: KT.font,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                position: 'relative',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  background: KT.card,
                  padding: '6px 10px',
                  borderRadius: 20,
                  boxShadow: KT.shSm,
                }}
              >
                <span style={{ fontSize: 13 }}>🔥</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: KT.ink }}>{streak}</span>
                <span style={{ fontSize: 11, color: KT.sub, fontWeight: 600 }}>
                  {copy.streakUnit}
                </span>
              </div>
              <button
                type="button"
                aria-label={t('notifications.open', { defaultValue: 'Notifications' })}
                onClick={() => setNotificationPanelOpen(current => !current)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: `1px solid ${KT.line}`,
                  background: KT.card,
                  color: KT.ink,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  boxShadow: KT.shSm,
                  position: 'relative',
                }}
              >
                <Bell size={16} />
                {unreadNotificationCount > 0 ? (
                  <span
                    style={{
                      position: 'absolute',
                      top: 3,
                      right: 3,
                      minWidth: 14,
                      height: 14,
                      borderRadius: 7,
                      background: KT.crimson,
                      color: KT.card,
                      fontSize: 9,
                      fontWeight: 800,
                      display: 'grid',
                      placeItems: 'center',
                      lineHeight: 1,
                      padding: '0 3px',
                      boxShadow: `0 0 0 2px ${KT.card}`,
                    }}
                  >
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </span>
                ) : null}
              </button>
              {notificationPanelOpen ? (
                <div
                  role="menu"
                  style={{
                    position: 'absolute',
                    top: 40,
                    right: 0,
                    width: 292,
                    maxHeight: 360,
                    overflowY: 'auto',
                    borderRadius: 18,
                    border: `1px solid ${KT.line}`,
                    background: KT.card,
                    boxShadow: KT.shLg,
                    padding: 8,
                    zIndex: 12,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 1.2,
                        textTransform: 'uppercase',
                        color: KT.sub,
                      }}
                    >
                      {t('notifications.title', { defaultValue: 'Notifications' })}
                    </span>
                    {unreadNotificationCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkAllNotificationsRead()}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: KT.crimson,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          padding: 0,
                        }}
                      >
                        {t('notifications.markAll', { defaultValue: 'Mark all read' })}
                      </button>
                    ) : null}
                  </div>
                  {recentNotifications === undefined ? (
                    <div style={{ color: KT.sub, fontSize: 12, padding: '8px 4px' }}>
                      {t('common.loading', { defaultValue: 'Loading…' })}
                    </div>
                  ) : recentNotifications.length === 0 ? (
                    <div style={{ color: KT.sub, fontSize: 12, padding: '8px 4px' }}>
                      {t('notifications.empty', { defaultValue: "You're all caught up." })}
                    </div>
                  ) : (
                    recentNotifications.map(notification => (
                      <div
                        key={notification.id}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 8,
                          borderRadius: 12,
                          padding: '8px 9px',
                          background: notification.readAt
                            ? 'transparent'
                            : notification.priority === 'high'
                              ? `${KT.butter}55`
                              : `${KT.pink}33`,
                          marginBottom: 2,
                        }}
                      >
                        <span
                          style={{
                            display: 'grid',
                            placeItems: 'center',
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            border: `1px solid ${KT.line}`,
                            color: KT.sub,
                            background: KT.card,
                            marginTop: 2,
                            flexShrink: 0,
                          }}
                        >
                          {renderNotificationTypeIcon(notification)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openNotification(notification)}
                          style={{
                            flex: 1,
                            textAlign: 'left',
                            border: 'none',
                            background: 'none',
                            padding: 0,
                            cursor: 'pointer',
                            minWidth: 0,
                          }}
                        >
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: KT.ink,
                              marginBottom: 2,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {notification.title}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: KT.sub,
                              lineHeight: 1.3,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {notification.body}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: KT.sub,
                              marginTop: 3,
                              letterSpacing: 1,
                              textTransform: 'uppercase',
                            }}
                          >
                            {formatNotificationTime(notification.createdAt, defaultLabel =>
                              t('time.now', { defaultValue: defaultLabel })
                            )}
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDismissNotification(notification.id)}
                          aria-label={t('notifications.dismiss', { defaultValue: 'Dismiss' })}
                          style={{
                            fontSize: 12,
                            color: KT.sub,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            fontWeight: 800,
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              ) : null}
            </div>
            {copy.streakLabel ? (
              <div
                style={{
                  fontSize: 10,
                  color: KT.sub,
                  fontWeight: 600,
                  width: '100%',
                  textAlign: 'right',
                }}
              >
                {copy.streakLabel}
              </div>
            ) : null}
          </div>
        </div>

        {/* Learning Feedback Entry (Mobile) */}
        <div style={{ padding: '0 18px 14px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard/weekly-report')}
            style={{
              width: '100%',
              background: `linear-gradient(135deg, ${KT.mint}20 0%, ${KT.sky}20 100%)`,
              borderRadius: 18,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              border: `1px solid ${KT.mint}40`,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: KT.mint,
                color: '#fff',
                display: 'grid',
                placeItems: 'center',
                fontSize: 16,
              }}
            >
              📊
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: KT.ink }}>
                {language.startsWith('zh') ? '学习反馈' : 'Learning Feedback'}
              </div>
              <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600 }}>
                {language.startsWith('zh')
                  ? '周报 · 能力画像 · 复习资产'
                  : 'Weekly report · ability profile · review assets'}
              </div>
            </div>
            <div style={{ color: KT.sub, fontSize: 14 }}>→</div>
          </button>
        </div>

        <StreakRow done={streakDoneDays} />
      </div>

      {/* Resume card — one prominent "next best action" from recommendations engine. */}
      {nextBestAction && nextBestAction.kind !== 'review_due_vocab' && (
        <div style={{ padding: '0 18px 14px' }}>
          <button
            type="button"
            onClick={() => navigate(nextBestAction.path)}
            style={{
              width: '100%',
              background: `linear-gradient(135deg, ${KT.pink}60 0%, ${KT.card} 60%)`,
              border: `1px solid ${KT.line}`,
              borderRadius: 22,
              padding: '14px 16px',
              boxShadow: KT.sh,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: KT.font,
            }}
            aria-label={resumeCopy(nextBestAction).title}
          >
            <HanjaSeal c={nextBestAction.seal} size={48} bg={`${KT.crimson}15`} round={14} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: KT.serif,
                  fontSize: 11,
                  color: KT.crimson,
                  letterSpacing: 3,
                  marginBottom: 2,
                  fontWeight: 500,
                }}
              >
                繼續 · RESUME
              </div>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  color: KT.ink,
                  letterSpacing: -0.3,
                  lineHeight: 1.2,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {resumeCopy(nextBestAction).title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: KT.sub,
                  marginTop: 3,
                  fontWeight: 500,
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {resumeCopy(nextBestAction).sub}
              </div>
            </div>
            <div
              style={{
                fontSize: 20,
                fontFamily: KT.serif,
                color: KT.crimson,
                opacity: 0.7,
                flexShrink: 0,
              }}
            >
              →
            </div>
          </button>
        </div>
      )}

      {/* DAILY TASK COCKPIT */}
      {dailyTaskPlan &&
        dailyTaskPlan.tasks.length > 0 &&
        (() => {
          const allDone = dailyTaskPlan.status === 'completed';
          const completedCount = dailyTaskPlan.tasks.filter(
            (tk: DailyTaskItemDto) => tk.completed
          ).length;
          const totalCount = dailyTaskPlan.tasks.length;
          const estimatedMinutes = dailyTaskPlan.tasks.reduce(
            (sum: number, task: DailyTaskItemDto) => sum + estimateDailyTaskMinutes(task.kind),
            0
          );
          const startPath =
            !allDone && nextDailyTask ? buildTodayTaskPath(nextDailyTask, dashboardPath) : null;
          const taskKindMeta: Record<string, { k: string; bg: string }> = {
            vocab_20: { k: '詞', bg: KT.pink },
            grammar_drill: { k: '法', bg: KT.mint },
            listening_10min: { k: '聽', bg: KT.butter },
            typing_wpm: { k: '寫', bg: KT.lilac },
            note_review: { k: '記', bg: KT.butter },
            sentence_review: { k: '句', bg: KT.mint },
            grammar_review: { k: '法', bg: KT.butter },
            topik_rewrite: { k: '改', bg: KT.lilac },
          };
          return (
            <div style={{ padding: '0 18px', marginTop: 10 }}>
              <div
                style={{
                  background: KT.card,
                  borderRadius: 22,
                  boxShadow: KT.sh,
                  overflow: 'hidden',
                  border: `1px solid ${KT.line}`,
                }}
              >
                {/* Header */}
                <div
                  style={{
                    padding: '14px 18px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: allDone
                      ? `linear-gradient(135deg, ${KT.mint}30 0%, transparent 100%)`
                      : `linear-gradient(135deg, ${KT.butter}20 0%, transparent 100%)`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                    <HanjaSeal c="道" size={26} bg={KT.crimson} round={6} />
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: KT.ink,
                          letterSpacing: -0.2,
                        }}
                      >
                        {formatTodayPathTitle(language)}
                      </div>
                      <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600, marginTop: 1 }}>
                        {completedCount}/{totalCount} · {dailyTaskPlan.date} ·{' '}
                        {formatTodayPathEstimate(language, estimatedMinutes)}
                      </div>
                    </div>
                  </div>
                  {allDone && (
                    <Chip tone="mint" size="sm">
                      ✓ DONE
                    </Chip>
                  )}
                </div>

                {/* Global progress bar */}
                <div style={{ height: 3, background: KT.line }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                      background: allDone ? KT.mint : KT.crimson,
                      transition: 'width 0.6s ease-out',
                    }}
                  />
                </div>

                <MobileLearningLoopSummary
                  plan={dailyTaskPlan}
                  stats={stats}
                  abilityScores={abilityScores}
                  nextBestAction={nextBestAction}
                  nextDailyTask={nextDailyTask}
                  language={language}
                />

                {/* Task rows */}
                {dailyTaskPlan.tasks.map((task: DailyTaskItemDto, idx: number) => {
                  const meta = taskKindMeta[task.kind] ?? { k: '?', bg: KT.sub };
                  const target = task.targetCount ?? 1;
                  const current = Math.min(task.currentCount ?? 0, target);
                  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
                  const xp =
                    typeof task.metadata?.rewardXp === 'number' ? task.metadata.rewardXp : 0;
                  return (
                    <button
                      key={task.taskId}
                      type="button"
                      onClick={() => {
                        const taskPath = buildTodayTaskPath(task, dashboardPath);
                        if (!task.completed && taskPath) {
                          navigate(taskPath);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 18px',
                        width: '100%',
                        background: 'none',
                        border: 'none',
                        borderBottom:
                          idx < dailyTaskPlan.tasks.length - 1 ? `1px solid ${KT.line}` : 'none',
                        cursor: task.completed ? 'default' : 'pointer',
                        opacity: task.completed ? 0.6 : 1,
                        textAlign: 'left',
                        fontFamily: KT.font,
                      }}
                    >
                      <HanjaSeal
                        c={meta.k}
                        size={32}
                        bg={task.completed ? KT.mint : meta.bg}
                        round={8}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: KT.ink,
                              letterSpacing: -0.2,
                              textDecoration: task.completed ? 'line-through' : 'none',
                            }}
                          >
                            {task.title}
                          </span>
                          {xp > 0 && (
                            <span
                              style={{
                                fontSize: 9,
                                fontWeight: 900,
                                color: KT.crimson,
                                letterSpacing: 0.5,
                              }}
                            >
                              +{xp} XP
                            </span>
                          )}
                        </div>
                        {task.description && (
                          <div
                            style={{
                              fontSize: 11,
                              color: KT.sub,
                              fontWeight: 500,
                              marginTop: 2,
                              overflow: 'hidden',
                              display: '-webkit-box',
                              WebkitLineClamp: 1,
                              WebkitBoxOrient: 'vertical',
                            }}
                          >
                            {task.description}
                          </div>
                        )}
                        {target > 1 && (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}
                          >
                            <div
                              style={{
                                flex: 1,
                                height: 4,
                                borderRadius: 2,
                                background: KT.line,
                                overflow: 'hidden',
                              }}
                            >
                              <div
                                style={{
                                  height: '100%',
                                  borderRadius: 2,
                                  width: `${pct}%`,
                                  background: task.completed ? KT.mint : KT.crimson,
                                  transition: 'width 0.5s ease',
                                }}
                              />
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 900,
                                color: KT.sub,
                                flexShrink: 0,
                              }}
                            >
                              {current}/{target}
                            </span>
                          </div>
                        )}
                      </div>
                      {task.completed ? (
                        <span
                          style={{ fontSize: 14, color: KT.mint, fontWeight: 900, flexShrink: 0 }}
                        >
                          ✓
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: 16,
                            fontFamily: KT.serif,
                            color: KT.crimson,
                            opacity: 0.6,
                            flexShrink: 0,
                          }}
                        >
                          →
                        </span>
                      )}
                    </button>
                  );
                })}

                {/* Review summary footer */}
                {dailyTaskPlan.reviewSummary &&
                  (dailyTaskPlan.reviewSummary.dueVocabCount ||
                    dailyTaskPlan.reviewSummary.weakPointSummary) && (
                    <div
                      style={{
                        padding: '8px 18px',
                        borderTop: `1px solid ${KT.line}`,
                        background: KT.bg2,
                        display: 'flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        fontSize: 10,
                        fontWeight: 600,
                        color: KT.sub,
                      }}
                    >
                      {dailyTaskPlan.reviewSummary.dueVocabCount != null &&
                        dailyTaskPlan.reviewSummary.dueVocabCount > 0 && (
                          <span>
                            📚 {dailyTaskPlan.reviewSummary.dueVocabCount}{' '}
                            {language.startsWith('zh') ? '词待复习' : 'vocab due'}
                          </span>
                        )}
                      {dailyTaskPlan.reviewSummary.weakPointSummary && (
                        <span style={{ fontStyle: 'italic', opacity: 0.8 }}>
                          💡 {dailyTaskPlan.reviewSummary.weakPointSummary}
                        </span>
                      )}
                    </div>
                  )}
                {startPath && (
                  <div
                    style={{
                      padding: '12px 18px 16px',
                      borderTop: `1px solid ${KT.line}`,
                      background: KT.card,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => navigate(startPath)}
                      style={{
                        width: '100%',
                        padding: 15,
                        borderRadius: 18,
                        border: 'none',
                        background: KT.ink,
                        color: KT.bg,
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: 'pointer',
                        fontFamily: KT.font,
                        boxShadow: '0 4px 14px rgba(31,27,23,0.18)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <span>{formatStartTodayPathLabel(language)}</span>
                      <span style={{ fontSize: 15 }}>▶</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

      <div style={{ padding: '14px 18px 0' }}>
        <button
          type="button"
          onClick={() => navigate('/topik/writing-coach')}
          aria-label={t('dashboard.topik.writingCoachTitle', { defaultValue: 'TOPIK 写作教练' })}
          style={{
            width: '100%',
            border: `1px solid ${KT.line}`,
            borderRadius: 22,
            background: `linear-gradient(135deg, ${KT.ink} 0%, #413a34 100%)`,
            boxShadow: KT.sh,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            cursor: 'pointer',
            textAlign: 'left',
            fontFamily: KT.font,
          }}
        >
          <HanjaSeal c="筆" size={38} bg={KT.mint} round={10} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.62)',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
              }}
            >
              AI COACH
            </div>
            <div
              style={{
                fontSize: 14,
                fontWeight: 900,
                color: KT.bg,
                marginTop: 2,
                letterSpacing: -0.1,
              }}
            >
              {t('dashboard.topik.writingCoachTitle', { defaultValue: 'TOPIK 写作教练' })}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.66)',
                marginTop: 2,
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 1,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {t('dashboard.topik.writingCoachDesc', {
                defaultValue: 'AI 实时批改、深度解析及提分建议。',
              })}
            </div>
          </div>
          <span
            aria-hidden="true"
            style={{
              color: KT.bg,
              fontSize: 20,
              fontFamily: KT.serif,
              opacity: 0.8,
              flexShrink: 0,
            }}
          >
            →
          </span>
        </button>
      </div>

      {achievements.length > 0 && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead kanji="成" title={copy.achievementsTitle} />
          <div
            className="hide-scroll"
            style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}
          >
            {achievements.map((a, i) => (
              <div
                key={i}
                style={{
                  flex: '0 0 auto',
                  background: KT.card,
                  padding: '10px 14px',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: KT.shSm,
                  minWidth: 120,
                }}
              >
                <div style={{ fontSize: 20 }}>{a.e}</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: KT.ink }}>{a.s}</div>
                  <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600 }}>{a.l}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ability Profile (P2-C) */}
      {abilityScores && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead
            kanji="能"
            title={
              language === 'zh'
                ? '能力画像'
                : language === 'vi'
                  ? 'Năng lực'
                  : language === 'mn'
                    ? 'Чадвар'
                    : 'Ability Profile'
            }
          />
          <div
            style={{
              background: KT.card,
              borderRadius: 20,
              border: `1px solid ${KT.line}`,
              padding: '16px',
            }}
          >
            {/* Dimension bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  key: 'vocabulary' as const,
                  label: language === 'zh' ? '词汇' : 'Vocab',
                  color: KT.pink,
                },
                {
                  key: 'grammar' as const,
                  label: language === 'zh' ? '语法' : 'Grammar',
                  color: KT.lilac,
                },
                {
                  key: 'reading' as const,
                  label: language === 'zh' ? '阅读' : 'Reading',
                  color: KT.sky,
                },
                {
                  key: 'writing' as const,
                  label: language === 'zh' ? '写作' : 'Writing',
                  color: KT.mint,
                },
                {
                  key: 'listening' as const,
                  label: language === 'zh' ? '听力' : 'Listening',
                  color: KT.butter,
                },
              ].map(dim => {
                const val = Math.round(abilityScores.dimensions[dim.key] ?? 0);
                return (
                  <div key={dim.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: 36,
                        fontSize: 11,
                        fontWeight: 800,
                        color: KT.sub,
                        textAlign: 'right',
                      }}
                    >
                      {dim.label}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: KT.bg2,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${val}%`,
                          borderRadius: 3,
                          background: dim.color,
                          transition: 'width 0.6s ease',
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: 28,
                        fontSize: 11,
                        fontWeight: 800,
                        color: KT.ink,
                        textAlign: 'right',
                      }}
                    >
                      {val}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Overall + TOPIK level */}
            <div
              style={{
                marginTop: 14,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `1px solid ${KT.line}`,
                paddingTop: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {language === 'zh' ? '预估 TOPIK' : 'Est. TOPIK'}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: KT.crimson,
                    fontFamily: 'var(--font-k-serif)',
                  }}
                >
                  Lv.{abilityScores.estimatedTopikLevel ?? '?'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}
                >
                  {language === 'zh' ? '综合' : 'Overall'}
                </div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 900,
                    color: KT.ink,
                    fontFamily: 'var(--font-k-serif)',
                  }}
                >
                  {Math.round(abilityScores.overallScore)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Community Standing (P2-D) */}
      {communityStanding &&
        communityStanding.totalWords > 0 &&
        communityStanding.communityAvgWords > 0 && (
          <div style={{ padding: '20px 18px 0' }}>
            <SectionHead
              kanji="群"
              title={
                language === 'zh'
                  ? '社区对比'
                  : language === 'vi'
                    ? 'Cộng đồng'
                    : language === 'mn'
                      ? 'Нийгэм'
                      : 'Community'
              }
            />
            <div
              style={{
                background: KT.card,
                borderRadius: 20,
                border: `1px solid ${KT.line}`,
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: KT.sub }}>
                      {language === 'zh' ? '你的词汇' : 'Your words'}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: KT.ink,
                        fontFamily: 'var(--font-k-serif)',
                      }}
                    >
                      {communityStanding.totalWords}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: KT.sub }}>
                      {language === 'zh' ? '社区平均' : 'Avg'}
                    </div>
                    <div
                      style={{
                        fontSize: 18,
                        fontWeight: 900,
                        color: KT.sub,
                        fontFamily: 'var(--font-k-serif)',
                      }}
                    >
                      {communityStanding.communityAvgWords}
                    </div>
                  </div>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: KT.bg2, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.round((communityStanding.totalWords / Math.max(communityStanding.communityAvgWords * 2, 1)) * 100))}%`,
                      borderRadius: 3,
                      background: KT.crimson,
                      transition: 'width 0.6s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

      {myRank && myRank.myEntry && myRank.neighbours.length > 0 && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead
            kanji="榜"
            title={
              language === 'zh'
                ? '本週排名'
                : language === 'vi'
                  ? 'Xếp hạng tuần'
                  : language === 'mn'
                    ? 'Долоо хоногийн байр'
                    : 'Weekly rank'
            }
          />
          <div
            style={{
              background: KT.card,
              borderRadius: 20,
              border: `1px solid ${KT.line}`,
              boxShadow: KT.shSm,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                padding: '14px 16px 10px',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                  }}
                >
                  {language === 'zh'
                    ? '你目前第'
                    : language === 'vi'
                      ? 'Hiện tại bạn đứng thứ'
                      : language === 'mn'
                        ? 'Одоо та'
                        : 'You are ranked'}
                </div>
                <div
                  style={{
                    fontFamily: KT.serif,
                    fontSize: 32,
                    fontWeight: 800,
                    color: KT.crimson,
                    letterSpacing: -1,
                  }}
                >
                  #{myRank.myEntry.rank}
                </div>
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: KT.sub,
                  textAlign: 'right',
                }}
              >
                {myRank.myEntry.currentWeekXp}
                {language === 'zh'
                  ? ' XP · 本週'
                  : language === 'vi'
                    ? ' XP · tuần này'
                    : language === 'mn'
                      ? ' XP · энэ 7 хоног'
                      : ' XP this week'}
                <div style={{ color: KT.sub, marginTop: 2 }}>
                  {language === 'zh'
                    ? `共 ${myRank.totalRanked} 位學員`
                    : language === 'vi'
                      ? `Trong số ${myRank.totalRanked}`
                      : language === 'mn'
                        ? `${myRank.totalRanked} хэрэглэгчээс`
                        : `of ${myRank.totalRanked} learners`}
                </div>
              </div>
            </div>
            <div style={{ borderTop: `1px solid ${KT.line}` }}>
              {myRank.neighbours.map((entry, idx) => (
                <div
                  key={String(entry.userId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 16px',
                    background: entry.isMe ? `${KT.pink}40` : 'transparent',
                    borderTop: idx === 0 ? 'none' : `1px solid ${KT.line}`,
                  }}
                >
                  <div
                    style={{
                      fontFamily: KT.serif,
                      fontSize: 14,
                      fontWeight: 800,
                      color: entry.isMe ? KT.crimson : KT.sub,
                      minWidth: 36,
                    }}
                  >
                    #{entry.rank}
                  </div>
                  {entry.avatarUrl ? (
                    <img
                      src={entry.avatarUrl}
                      alt={entry.name || ''}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 10,
                        objectFit: 'cover',
                        border: `1px solid ${KT.line}`,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 10,
                        background: `${KT.crimson}22`,
                        display: 'grid',
                        placeItems: 'center',
                        fontSize: 11,
                        fontWeight: 800,
                        color: KT.crimson,
                      }}
                    >
                      {(entry.name || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div
                    style={{
                      flex: 1,
                      fontSize: 13,
                      fontWeight: entry.isMe ? 800 : 600,
                      color: KT.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.name || (entry.isMe ? 'You' : '—')}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: KT.sub }}>
                    {entry.currentWeekXp} XP
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {user && (activePartnership || (pendingPartnerships && pendingPartnerships.length > 0)) && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead
            kanji="伴"
            title={
              language.startsWith('zh')
                ? '學習搭檔'
                : language.startsWith('vi')
                  ? 'Bạn đồng hành'
                  : language.startsWith('mn')
                    ? 'Сурах хань'
                    : 'Study buddy'
            }
          />
          {activePartnership && (
            <div
              style={{
                background: `linear-gradient(135deg, ${KT.butter}55 0%, ${KT.card} 75%)`,
                borderRadius: 20,
                padding: '16px 18px',
                border: `1px solid ${KT.line}`,
                boxShadow: KT.shSm,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
              }}
            >
              {activePartnership.partner.avatarUrl ? (
                <img
                  src={activePartnership.partner.avatarUrl}
                  alt={activePartnership.partner.name || ''}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    objectFit: 'cover',
                    border: `1px solid ${KT.line}`,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    background: `${KT.crimson}22`,
                    display: 'grid',
                    placeItems: 'center',
                    fontFamily: KT.serif,
                    fontSize: 18,
                    fontWeight: 800,
                    color: KT.crimson,
                    flexShrink: 0,
                  }}
                >
                  {(activePartnership.partner.name || '?').slice(0, 1).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: KT.sub,
                    letterSpacing: 1.4,
                    textTransform: 'uppercase',
                  }}
                >
                  {language.startsWith('zh')
                    ? '並肩學習中'
                    : language.startsWith('vi')
                      ? 'Đang học cùng'
                      : language.startsWith('mn')
                        ? 'Хамт сурч байна'
                        : 'Studying with'}
                </div>
                <div
                  style={{
                    fontFamily: KT.serif,
                    fontSize: 18,
                    fontWeight: 800,
                    color: KT.ink,
                    letterSpacing: -0.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {activePartnership.partner.name ||
                    (language.startsWith('zh')
                      ? '匿名同伴'
                      : language.startsWith('vi')
                        ? 'Bạn ẩn danh'
                        : language.startsWith('mn')
                          ? 'Нэргүй хань'
                          : 'Anonymous partner')}
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: KT.sub, marginTop: 2 }}>
                  {language.startsWith('zh')
                    ? `自 ${new Date(activePartnership.acceptedAt ?? activePartnership.startedAt).toLocaleDateString('zh-CN')} 起`
                    : language.startsWith('vi')
                      ? `Từ ${new Date(activePartnership.acceptedAt ?? activePartnership.startedAt).toLocaleDateString('vi-VN')}`
                      : language.startsWith('mn')
                        ? `${new Date(activePartnership.acceptedAt ?? activePartnership.startedAt).toLocaleDateString('mn-MN')}-нд`
                        : `Since ${new Date(activePartnership.acceptedAt ?? activePartnership.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <Chip tone="butter">
                  {language.startsWith('zh')
                    ? '啟航'
                    : language.startsWith('vi')
                      ? 'Đang hoạt động'
                      : language.startsWith('mn')
                        ? 'Идэвхтэй'
                        : 'Active'}
                </Chip>
                <div
                  style={{
                    fontFamily: KT.serif,
                    fontSize: 13,
                    fontWeight: 800,
                    color: KT.crimson,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 4,
                    lineHeight: 1,
                  }}
                  aria-label="combined streak"
                  title={
                    language.startsWith('zh')
                      ? '共同連續天數（取兩人中的較低值）'
                      : language.startsWith('vi')
                        ? 'Chuỗi chung (lấy giá trị nhỏ hơn của hai bên)'
                        : language.startsWith('mn')
                          ? 'Хамтарсан цуврал'
                          : 'Combined streak (min of both)'
                  }
                >
                  <span style={{ fontSize: 16 }}>🔥</span>
                  <span>{activePartnership.combinedStreak}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: KT.sub }}>
                    {language.startsWith('zh')
                      ? '天'
                      : language.startsWith('vi')
                        ? 'ngày'
                        : language.startsWith('mn')
                          ? 'өдөр'
                          : 'd'}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: KT.sub,
                    letterSpacing: 0.5,
                    textAlign: 'right',
                  }}
                  aria-label="shared minutes today"
                >
                  {language.startsWith('zh')
                    ? `今日合計 ${activePartnership.sharedMinutesToday}分`
                    : language.startsWith('vi')
                      ? `Hôm nay ${activePartnership.sharedMinutesToday}ph`
                      : language.startsWith('mn')
                        ? `Өнөөдөр ${activePartnership.sharedMinutesToday}мин`
                        : `${activePartnership.sharedMinutesToday} min today`}
                </div>
              </div>
            </div>
          )}
          {pendingPartnerships &&
            pendingPartnerships
              .filter(p => p.role === 'invitee' && p.status === 'pending')
              .map(invite => {
                const key = String(invite.id);
                const busy = !!partnershipActionPending[key];
                return (
                  <div
                    key={key}
                    style={{
                      background: KT.card,
                      borderRadius: 20,
                      padding: '14px 16px',
                      border: `1px solid ${KT.line}`,
                      boxShadow: KT.shSm,
                      marginTop: activePartnership ? 10 : 0,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    {invite.partner.avatarUrl ? (
                      <img
                        src={invite.partner.avatarUrl}
                        alt={invite.partner.name || ''}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          objectFit: 'cover',
                          border: `1px solid ${KT.line}`,
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 12,
                          background: `${KT.crimson}1A`,
                          display: 'grid',
                          placeItems: 'center',
                          fontFamily: KT.serif,
                          fontSize: 15,
                          fontWeight: 800,
                          color: KT.crimson,
                          flexShrink: 0,
                        }}
                      >
                        {(invite.partner.name || '?').slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 800,
                          color: KT.crimson,
                          letterSpacing: 1.2,
                          textTransform: 'uppercase',
                        }}
                      >
                        {language.startsWith('zh')
                          ? '新邀請'
                          : language.startsWith('vi')
                            ? 'Lời mời mới'
                            : language.startsWith('mn')
                              ? 'Шинэ урилга'
                              : 'New invite'}
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 800,
                          color: KT.ink,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {invite.partner.name ||
                          (language.startsWith('zh')
                            ? '某位同學'
                            : language.startsWith('vi')
                              ? 'Một bạn học'
                              : language.startsWith('mn')
                                ? 'Нэг сурагч'
                                : 'A learner')}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void handleAcceptPartnership(invite.id);
                      }}
                      disabled={busy}
                      style={{
                        height: 30,
                        padding: '0 12px',
                        borderRadius: 15,
                        border: 'none',
                        background: KT.crimson,
                        color: KT.card,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: busy ? 'default' : 'pointer',
                        opacity: busy ? 0.6 : 1,
                      }}
                    >
                      {language.startsWith('zh')
                        ? '接受'
                        : language.startsWith('vi')
                          ? 'Chấp nhận'
                          : language.startsWith('mn')
                            ? 'Зөвшөөрөх'
                            : 'Accept'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleDeclinePartnership(invite.id);
                      }}
                      disabled={busy}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 15,
                        border: `1px solid ${KT.line}`,
                        background: 'transparent',
                        color: KT.sub,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: busy ? 'default' : 'pointer',
                        opacity: busy ? 0.5 : 1,
                      }}
                    >
                      {language.startsWith('zh')
                        ? '謝絕'
                        : language.startsWith('vi')
                          ? 'Từ chối'
                          : language.startsWith('mn')
                            ? 'Татгалзах'
                            : 'Decline'}
                    </button>
                  </div>
                );
              })}
        </div>
      )}

      <div style={{ padding: '24px 18px 20px' }}>
        <SectionHead
          kanji="會"
          title={copy.communityTitle}
          action={copy.communityAction}
          onAction={() => navigate('/community')}
        />
        {user && (
          <div
            style={{
              marginBottom: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/community')}
              style={{
                height: 30,
                borderRadius: 15,
                border: `1px solid ${KT.line2}`,
                padding: '0 12px',
                background: KT.card,
                color: KT.crimson,
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              {friendLinkButtonCopy.addFriend}
            </button>
          </div>
        )}
        {user && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                value={friendSearchInput}
                onChange={event => {
                  setFriendSearchInput(event.target.value);
                }}
                placeholder={friendLinkButtonCopy.searchPlaceholder}
                style={{
                  flex: 1,
                  height: 34,
                  borderRadius: 12,
                  border: `1px solid ${KT.line}`,
                  background: KT.card,
                  color: KT.ink,
                  padding: '0 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  outline: 'none',
                }}
              />
            </div>
            {friendSearchInput.trim().length > 0 && friendSearchInput.trim().length < 2 && (
              <div style={{ marginTop: 6, fontSize: 11, fontWeight: 600, color: KT.sub }}>
                {friendLinkButtonCopy.searchHint}
              </div>
            )}
            {friendSearchQuery.length >= 2 && (
              <div
                style={{
                  marginTop: 8,
                  border: `1px solid ${KT.line}`,
                  borderRadius: 14,
                  background: KT.card,
                  overflow: 'hidden',
                }}
              >
                {friendSearchResults === undefined ? (
                  <div
                    style={{ padding: '10px 12px', fontSize: 12, color: KT.sub, fontWeight: 600 }}
                  >
                    {language.startsWith('zh')
                      ? '搜索中...'
                      : language.startsWith('vi')
                        ? 'Đang tìm...'
                        : language.startsWith('mn')
                          ? 'Хайж байна...'
                          : 'Searching...'}
                  </div>
                ) : friendSearchResults.length === 0 ? (
                  <div
                    style={{ padding: '10px 12px', fontSize: 12, color: KT.sub, fontWeight: 600 }}
                  >
                    {friendLinkButtonCopy.searchEmpty}
                  </div>
                ) : (
                  friendSearchResults.map((item, index) => {
                    const key = String(item.userId);
                    const busy = !!friendSearchBusy[key];
                    const disabled = busy || item.relation !== 'none';
                    const buttonLabel =
                      item.relation === 'already_friends'
                        ? friendLinkButtonCopy.searchAlready
                        : item.relation === 'already_requested'
                          ? friendLinkButtonCopy.searchSent
                          : friendLinkButtonCopy.searchAdd;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 12px',
                          borderBottom:
                            index < friendSearchResults.length - 1
                              ? `1px solid ${KT.line}`
                              : 'none',
                        }}
                      >
                        {item.avatarUrl ? (
                          <img
                            src={item.avatarUrl}
                            alt={item.name}
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 10,
                              objectFit: 'cover',
                              border: `1px solid ${KT.line}`,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 30,
                              height: 30,
                              borderRadius: 10,
                              background: `${KT.crimson}22`,
                              display: 'grid',
                              placeItems: 'center',
                              fontSize: 12,
                              fontWeight: 800,
                              color: KT.crimson,
                              flexShrink: 0,
                            }}
                          >
                            {(item.name || '?').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: KT.ink,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {item.name}
                          </div>
                          <div
                            style={{ fontSize: 10, fontWeight: 700, color: KT.sub, marginTop: 1 }}
                          >
                            {friendLinkButtonCopy.codeLabel}: {item.friendCode}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            if (disabled) return;
                            void handleAddFriendFromSearch(item);
                          }}
                          style={{
                            height: 28,
                            borderRadius: 14,
                            border: `1px solid ${disabled ? KT.line : KT.line2}`,
                            background: item.relation === 'none' ? 'transparent' : `${KT.butter}7A`,
                            color: item.relation === 'none' ? KT.crimson : '#7A5F1F',
                            padding: '0 10px',
                            fontSize: 11,
                            fontWeight: 800,
                            cursor: disabled ? 'default' : 'pointer',
                            opacity: busy ? 0.65 : 1,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {busy
                            ? language.startsWith('zh')
                              ? '发送中...'
                              : language.startsWith('vi')
                                ? 'Đang gửi...'
                                : language.startsWith('mn')
                                  ? 'Илгээж байна...'
                                  : 'Sending...'
                            : buttonLabel}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
        <div
          style={{
            background: KT.card,
            borderRadius: 28,
            boxShadow: KT.sh,
            overflow: 'hidden',
          }}
        >
          {communityActivities === undefined && (
            <>
              {[0, 1, 2].map(index => (
                <div
                  key={index}
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    borderBottom: index < 2 ? `1px solid ${KT.line}` : 'none',
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      background: KT.bg2,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        width: '50%',
                        height: 10,
                        borderRadius: 6,
                        background: KT.bg2,
                        marginBottom: 8,
                      }}
                    />
                    <div
                      style={{
                        width: '78%',
                        height: 9,
                        borderRadius: 6,
                        background: KT.bg2,
                        marginBottom: 6,
                      }}
                    />
                    <div
                      style={{
                        width: '24%',
                        height: 8,
                        borderRadius: 6,
                        background: KT.bg2,
                      }}
                    />
                  </div>
                </div>
              ))}
            </>
          )}
          {communityActivities !== undefined && friendFeed.length === 0 && (
            <div
              style={{
                padding: '20px 18px',
                fontSize: 13,
                color: KT.sub,
                lineHeight: 1.6,
                fontWeight: 600,
              }}
            >
              {language.startsWith('zh')
                ? '关注同学后，这里会显示他们的学习动态。'
                : language.startsWith('vi')
                  ? 'Hãy theo dõi bạn học để thấy tiến độ học tập tại đây.'
                  : language.startsWith('mn')
                    ? 'Найзуудаа дагавал тэдний сургалтын явц энд харагдана.'
                    : 'Follow classmates to see their learning activity here.'}
            </div>
          )}
          {friendFeed.map((item, index) => (
            <div
              key={item.key}
              style={{
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: index < friendFeed.length - 1 ? `1px solid ${KT.line}` : 'none',
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  background: item.bg,
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {item.emoji}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginBottom: 2,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 800, color: KT.ink }}>
                    {item.actorName}
                  </span>
                  <Chip tone={item.tagTone}>{item.tag}</Chip>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: KT.ink2,
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {item.action}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: KT.sub,
                    marginTop: 2,
                    fontWeight: 600,
                  }}
                >
                  {item.time}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                {(() => {
                  const actorKey = String(item.actorUserId);
                  const alreadyInvited =
                    !!invitedUsers[actorKey] ||
                    (pendingPartnerships ?? []).some(p => String(p.partner.userId) === actorKey);
                  const isSelf = user?.id === actorKey;
                  const canInvite = !!user && !isSelf && !activePartnership && !alreadyInvited;
                  const inviteBusy = !!invitePending[actorKey];
                  if (!canInvite && !alreadyInvited) return null;
                  return (
                    <button
                      type="button"
                      onClick={() => {
                        if (!canInvite) return;
                        void handleInvitePartner(item.actorUserId);
                      }}
                      disabled={!canInvite || inviteBusy}
                      style={{
                        height: 30,
                        padding: '0 10px',
                        borderRadius: 15,
                        border: `1px solid ${alreadyInvited ? KT.line : KT.line2}`,
                        background: alreadyInvited ? `${KT.butter}80` : 'transparent',
                        color: alreadyInvited ? '#7A5F1F' : KT.crimson,
                        fontSize: 11,
                        fontWeight: 800,
                        cursor: canInvite && !inviteBusy ? 'pointer' : 'default',
                        opacity: inviteBusy ? 0.65 : 1,
                        whiteSpace: 'nowrap',
                      }}
                      aria-label={alreadyInvited ? 'Invite pending' : 'Invite as study partner'}
                    >
                      {alreadyInvited
                        ? language.startsWith('zh')
                          ? '邀請中'
                          : language.startsWith('vi')
                            ? 'Đã mời'
                            : language.startsWith('mn')
                              ? 'Хүлээгдэж буй'
                              : 'Invited'
                        : language.startsWith('zh')
                          ? '＋ 搭檔'
                          : language.startsWith('vi')
                            ? '＋ Bạn học'
                            : language.startsWith('mn')
                              ? '＋ Хань'
                              : '＋ Buddy'}
                    </button>
                  );
                })()}
                <button
                  type="button"
                  onClick={() => {
                    void handleToggleLike(item.activityId);
                  }}
                  disabled={!!likePending[item.key]}
                  style={{
                    minWidth: 30,
                    height: 30,
                    borderRadius: 15,
                    border: `1px solid ${KT.line2}`,
                    background: item.resolvedLiked ? `${KT.pink}66` : 'transparent',
                    cursor: likePending[item.key] ? 'default' : 'pointer',
                    color: item.resolvedLiked ? KT.crimson : KT.sub,
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '0 8px',
                    opacity: likePending[item.key] ? 0.65 : 1,
                  }}
                  aria-label="Like"
                >
                  <span>{item.resolvedLiked ? '♥' : '♡'}</span>
                  <span>{item.resolvedLikeCount}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '0 18px 28px' }}>
        <div
          style={{
            background: KT.indigo,
            color: KT.card,
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 28,
            boxShadow: KT.sh,
            padding: 20,
          }}
        >
          <div
            style={{
              position: 'absolute',
              right: -10,
              top: -10,
              fontFamily: KT.serif,
              fontSize: 120,
              color: 'rgba(255,255,255,0.08)',
              fontWeight: 500,
              lineHeight: 1,
            }}
          >
            挑戰
          </div>
          <div style={{ position: 'relative' }}>
            <Chip tone="ink">
              {copy.challengeBadge}
              {dailyChallenge ? ` · +${dailyChallenge.rewardXp} XP` : ''}
            </Chip>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                marginTop: 10,
                lineHeight: 1.3,
                letterSpacing: -0.3,
              }}
            >
              {dailyChallenge?.title || copy.challengeBadge}
            </div>
            <div
              style={{
                fontSize: 12,
                opacity: 0.75,
                marginTop: 6,
              }}
            >
              {dailyChallenge?.subtitle || ''}
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                marginTop: 14,
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 0.2,
                }}
              >
                {dailyChallenge ? formatChallengeProgressLabel(dailyChallenge, language) : ''}
              </div>
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.86,
                  fontWeight: 700,
                }}
              >
                {dailyChallenge
                  ? formatChallengeRewardLabel(dailyChallenge.rewardXp, language)
                  : ''}
              </div>
            </div>
            <div
              style={{
                width: '100%',
                height: 8,
                borderRadius: 999,
                background: 'rgba(255,255,255,0.18)',
                overflow: 'hidden',
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  width: `${Math.max(0, challengeProgressRatio) * 100}%`,
                  height: '100%',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.92)',
                  transition: 'width 180ms ease',
                }}
              />
            </div>
            <button
              type="button"
              onClick={() => {
                void handleChallengeAction();
              }}
              disabled={!dailyChallenge || dailyChallenge.isClaimed || isClaimingDailyChallenge}
              style={{
                padding: '12px 20px',
                borderRadius: 14,
                border: `1.5px solid ${KT.card}`,
                background: !dailyChallenge || dailyChallenge.isClaimed ? 'transparent' : KT.card,
                color: !dailyChallenge || dailyChallenge.isClaimed ? KT.card : KT.indigo,
                fontSize: 13,
                fontWeight: 800,
                cursor:
                  !dailyChallenge || dailyChallenge.isClaimed || isClaimingDailyChallenge
                    ? 'default'
                    : 'pointer',
                fontFamily: KT.font,
                letterSpacing: 0.3,
                opacity: !dailyChallenge ? 0.8 : 1,
              }}
            >
              {challengeActionLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
