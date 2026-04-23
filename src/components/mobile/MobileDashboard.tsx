import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../../convex/_generated/dataModel';
import type { CommunityActivityDto } from '../../../convex/community';
import type { DailyChallengeDto } from '../../../convex/dailyChallenges';
import type { PartnershipDto } from '../../../convex/partnerships';
import type { GrammarItemDto } from '../../../convex/grammars';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import {
  COMMUNITY,
  DAILY_CHALLENGES,
  GRAMMARS,
  LEADERBOARD,
  NEWS,
  NoArgs,
  PARTNERSHIPS,
  qRef,
  RECOMMENDATIONS,
  VOCAB,
  type NextBestAction,
} from '../../utils/convexRefs';
import { buildMediaPath } from '../../utils/mediaRoutes';
import { appendReturnToPath } from '../../utils/navigation';
import { notify } from '../../utils/notify';
import { buildPodcastPlayerPath } from '../../utils/podcastRoutes';
import type { ExamAttempt, Institute } from '../../types';
import { ChipTone, Chip, HanjaSeal, KT, SectionHead, StreakRow } from './ksoft/ksoft';

type LearningEntryTarget = {
  instituteId: string;
  level: number;
};

type PodcastHistoryItem = {
  _id: string;
  episodeGuid?: string;
  episodeTitle: string;
  episodeUrl?: string;
  channelName: string;
  channelImage?: string;
  playedAt: number;
  progress?: number;
  duration?: number;
};

const TOPIK_GRAMMAR_COURSE_ID = 'topik-grammar';

const EMPTY_LEARNER_STATS: LearnerStatsDto = {
  streak: 0,
  todayMinutes: 0,
  dailyGoal: 30,
  dailyProgress: 0,
  weeklyActivity: [],
  todayActivities: {
    wordsLearned: 0,
    readingsCompleted: 0,
    listeningsCompleted: 0,
    examsCompleted: 0,
  },
  courseProgress: [],
  currentProgress: null,
  totalWordsLearned: 0,
  totalGrammarLearned: 0,
  wordsToReview: 0,
  vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
  grammarStats: { total: 0, mastered: 0 },
  reviewStats: { dueNow: 0, dueSoon: 0, savedWords: 0 },
  moduleBreakdown: [],
  recentSessions: [],
  totalMinutes: 0,
  todayWordsStudied: 0,
  todayGrammarStudied: 0,
};

type Copy = {
  greeting: string;
  greetingSub: string;
  streakUnit: string;
  streakLabel: string;
  pathTitle: string;
  pathSub: string;
  pathStart: string;
  pathSkip: string;
  pathLater: string;
  minsShort: (n: number) => string;
  minsDone: string;
  achievementsTitle: string;
  dailyPhraseTitle: string;
  communityTitle: string;
  communityAction: string;
  challengeBadge: string;
  challengeTitle: string;
  challengeSub: string;
  challengeCta: string;
  reviewKind: string;
  reviewEn: string;
  reviewTitle: (n: number) => string;
  reviewSub: string;
  grammarKind: string;
  grammarEn: string;
  grammarSub: string;
  grammarStartTitle: string;
  listenKind: string;
  listenEn: string;
  listenFallbackTitle: string;
  listenFallbackSub: string;
  topikKind: string;
  topikEn: string;
  topikTitle: string;
  topikSub: string;
};

const getDashboardCopy = (language: string, userName: string): Copy => {
  const name = userName || '친구';
  if (language.startsWith('zh')) {
    return {
      greeting: `你好，${name}`,
      greetingSub: '今天的学习已就绪',
      streakUnit: '天',
      streakLabel: '连续学习',
      pathTitle: '今日之路',
      pathSub: "TODAY'S PATH",
      pathStart: '开始',
      pathSkip: '跳过',
      pathLater: '稍后 →',
      minsShort: n => `${n}分`,
      minsDone: '完成',
      achievementsTitle: '今日成就',
      dailyPhraseTitle: '今日片语',
      communityTitle: '学习伙伴',
      communityAction: '社区',
      challengeBadge: '今日挑战',
      challengeTitle: '背完 10 个春天单词',
      challengeSub: '127 人参与中 · 你排名 24',
      challengeCta: '参加 →',
      reviewKind: '复习',
      reviewEn: 'Review',
      reviewTitle: n => `到期单词 ${n} 张`,
      reviewSub: 'FSRS · 今日复习',
      grammarKind: '语法',
      grammarEn: 'Grammar',
      grammarSub: '下一个语法',
      grammarStartTitle: '开始 TOPIK 语法',
      listenKind: '听',
      listenEn: 'Listen',
      listenFallbackTitle: '继续播客',
      listenFallbackSub: '沉浸式听力',
      topikKind: 'TOPIK',
      topikEn: 'Exam',
      topikTitle: '今日一题',
      topikSub: 'II 级阅读',
    };
  }
  if (language.startsWith('vi')) {
    return {
      greeting: `Xin chào, ${name}`,
      greetingSub: 'Bài học hôm nay đã sẵn sàng',
      streakUnit: 'ngày',
      streakLabel: 'Học liên tục',
      pathTitle: 'Hành trình hôm nay',
      pathSub: "TODAY'S PATH",
      pathStart: 'Bắt đầu',
      pathSkip: 'Bỏ qua',
      pathLater: 'Sau →',
      minsShort: n => `${n} phút`,
      minsDone: 'hoàn thành',
      achievementsTitle: 'Thành tựu hôm nay',
      dailyPhraseTitle: 'Câu nói hôm nay',
      communityTitle: 'Bạn học',
      communityAction: 'Cộng đồng',
      challengeBadge: 'Thử thách hôm nay',
      challengeTitle: 'Nhớ 10 từ mùa xuân',
      challengeSub: '127 người đang tham gia · Bạn xếp 24',
      challengeCta: 'Tham gia →',
      reviewKind: 'Ôn',
      reviewEn: 'Review',
      reviewTitle: n => `${n} thẻ ôn tập`,
      reviewSub: 'FSRS · hôm nay',
      grammarKind: 'Ngữ pháp',
      grammarEn: 'Grammar',
      grammarSub: 'Ngữ pháp tiếp theo',
      grammarStartTitle: 'Bắt đầu ngữ pháp TOPIK',
      listenKind: 'Nghe',
      listenEn: 'Listen',
      listenFallbackTitle: 'Tiếp tục nghe podcast',
      listenFallbackSub: 'Nhập vai tiếng Hàn',
      topikKind: 'TOPIK',
      topikEn: 'Exam',
      topikTitle: 'Một câu hôm nay',
      topikSub: 'Đọc cấp II',
    };
  }
  if (language.startsWith('mn')) {
    return {
      greeting: `Сайн уу, ${name}`,
      greetingSub: 'Өнөөдрийн сургалт бэлэн',
      streakUnit: 'өдөр',
      streakLabel: 'Дараалан',
      pathTitle: 'Өнөөдрийн зам',
      pathSub: "TODAY'S PATH",
      pathStart: 'Эхлэх',
      pathSkip: 'Алгасах',
      pathLater: 'Дараа →',
      minsShort: n => `${n} мин`,
      minsDone: 'дууссан',
      achievementsTitle: 'Өнөөдрийн амжилт',
      dailyPhraseTitle: 'Өнөөдрийн хэллэг',
      communityTitle: 'Сургалтын найзууд',
      communityAction: 'Нийгэмлэг',
      challengeBadge: 'Өнөөдрийн сорилт',
      challengeTitle: '10 хаврын үг цээжлэх',
      challengeSub: '127 хүн оролцож байна · чиний зэрэг 24',
      challengeCta: 'Нэгдэх →',
      reviewKind: 'Давтлага',
      reviewEn: 'Review',
      reviewTitle: n => `${n} карт хугацаатай`,
      reviewSub: 'FSRS · өнөөдөр',
      grammarKind: 'Дүрэм',
      grammarEn: 'Grammar',
      grammarSub: 'Дараагийн дүрэм',
      grammarStartTitle: 'TOPIK дүрэм эхлэх',
      listenKind: 'Сонсох',
      listenEn: 'Listen',
      listenFallbackTitle: 'Подкаст үргэлжлүүлэх',
      listenFallbackSub: 'Солонгос хэл шингээх',
      topikKind: 'TOPIK',
      topikEn: 'Exam',
      topikTitle: 'Өнөөдрийн нэг асуулт',
      topikSub: 'II түвшин унших',
    };
  }
  return {
    greeting: `Hi, ${name}`,
    greetingSub: "Today's session is ready",
    streakUnit: 'd',
    streakLabel: 'Streak',
    pathTitle: "Today's Path",
    pathSub: "TODAY'S PATH",
    pathStart: 'Start',
    pathSkip: 'Skip',
    pathLater: 'Later →',
    minsShort: n => `${n} min`,
    minsDone: 'done',
    achievementsTitle: "Today's wins",
    dailyPhraseTitle: 'Phrase of the day',
    communityTitle: 'Study friends',
    communityAction: 'Community',
    challengeBadge: "Today's challenge",
    challengeTitle: 'Memorize 10 spring words',
    challengeSub: '127 joined · You rank #24',
    challengeCta: 'Join →',
    reviewKind: 'Review',
    reviewEn: 'Review',
    reviewTitle: n => `${n} cards due`,
    reviewSub: 'FSRS · due today',
    grammarKind: 'Grammar',
    grammarEn: 'Grammar',
    grammarSub: 'Next grammar',
    grammarStartTitle: 'Start TOPIK grammar',
    listenKind: 'Listen',
    listenEn: 'Listen',
    listenFallbackTitle: 'Resume a podcast',
    listenFallbackSub: 'Korean immersion',
    topikKind: 'TOPIK',
    topikEn: 'Exam',
    topikTitle: "Today's question",
    topikSub: 'Level II · reading',
  };
};

const getGrammarLocalizedTitle = (grammar: GrammarItemDto | null, language: string) => {
  if (!grammar) return '';
  if (language.startsWith('zh')) return grammar.titleZh || grammar.title;
  if (language.startsWith('vi')) return grammar.titleVi || grammar.titleEn || grammar.title;
  if (language.startsWith('mn')) return grammar.titleMn || grammar.titleEn || grammar.title;
  return grammar.titleEn || grammar.title;
};

const formatChallengeProgressLabel = (challenge: DailyChallengeDto, language: string) => {
  const current = Math.min(challenge.currentCount, challenge.targetCount);
  if (challenge.kind === 'vocab_20') {
    if (language.startsWith('zh')) return `${current} / ${challenge.targetCount} 个单词`;
    if (language.startsWith('vi')) return `${current} / ${challenge.targetCount} từ`;
    if (language.startsWith('mn')) return `${current} / ${challenge.targetCount} үг`;
    return `${current} / ${challenge.targetCount} words`;
  }
  if (challenge.kind === 'grammar_drill') {
    if (language.startsWith('zh')) return `${current} / ${challenge.targetCount} 个语法点`;
    if (language.startsWith('vi')) return `${current} / ${challenge.targetCount} điểm ngữ pháp`;
    if (language.startsWith('mn')) return `${current} / ${challenge.targetCount} дүрмийн цэг`;
    return `${current} / ${challenge.targetCount} grammar points`;
  }
  if (challenge.kind === 'listening_10min') {
    if (language.startsWith('zh')) return `${current} / ${challenge.targetCount} 分钟听力`;
    if (language.startsWith('vi')) return `${current} / ${challenge.targetCount} phút nghe`;
    if (language.startsWith('mn')) return `${current} / ${challenge.targetCount} минут сонссон`;
    return `${current} / ${challenge.targetCount} listening min`;
  }
  if (language.startsWith('zh')) return `${current} / ${challenge.targetCount} WPM`;
  if (language.startsWith('vi')) return `${current} / ${challenge.targetCount} WPM`;
  if (language.startsWith('mn')) return `${current} / ${challenge.targetCount} WPM`;
  return `${current} / ${challenge.targetCount} WPM`;
};

const formatChallengeRewardLabel = (rewardXp: number, language: string) => {
  if (language.startsWith('zh')) return `奖励 +${rewardXp} XP`;
  if (language.startsWith('vi')) return `Thưởng +${rewardXp} XP`;
  if (language.startsWith('mn')) return `Шагнал +${rewardXp} XP`;
  return `Reward +${rewardXp} XP`;
};

const formatChallengeActionLabel = (args: {
  challenge: DailyChallengeDto | undefined;
  language: string;
  isClaiming: boolean;
}) => {
  if (!args.challenge) {
    if (args.language.startsWith('zh')) return '加载中…';
    if (args.language.startsWith('vi')) return 'Đang tải...';
    if (args.language.startsWith('mn')) return 'Ачаалж байна...';
    return 'Loading...';
  }
  if (args.isClaiming) {
    if (args.language.startsWith('zh')) return '领取中…';
    if (args.language.startsWith('vi')) return 'Đang nhận...';
    if (args.language.startsWith('mn')) return 'Ашиг авч байна...';
    return 'Claiming...';
  }
  if (args.challenge.isClaimed) {
    if (args.language.startsWith('zh')) return '已完成';
    if (args.language.startsWith('vi')) return 'Đã hoàn thành';
    if (args.language.startsWith('mn')) return 'Дууссан';
    return 'Completed';
  }
  if (args.challenge.isCompleted) {
    if (args.language.startsWith('zh')) return `领取 +${args.challenge.rewardXp} XP`;
    if (args.language.startsWith('vi')) return `Nhận +${args.challenge.rewardXp} XP`;
    if (args.language.startsWith('mn')) return `+${args.challenge.rewardXp} XP авах`;
    return `Claim +${args.challenge.rewardXp} XP`;
  }
  if (args.language.startsWith('zh')) return '去完成 →';
  if (args.language.startsWith('vi')) return 'Bắt đầu →';
  if (args.language.startsWith('mn')) return 'Эхлэх →';
  return 'Start →';
};

type PathTone = 'pink' | 'mint' | 'butter' | 'lilac';

type PathStep = {
  key: string;
  kind: string;
  en: string;
  mins: number;
  title: string;
  sub: string;
  tone: PathTone;
  kanji: string;
  onStart: () => void;
};

type CommunityCardTone = {
  tag: string;
  tagTone: ChipTone;
  emoji: string;
  bg: string;
};

type CommunityLikeOverride = {
  liked: boolean;
  likeCount: number;
};

const moduleToneMap: Record<string, CommunityCardTone> = {
  EXAM: { tag: '考試', tagTone: 'ink', emoji: '🎯', bg: KT.butter },
  TYPING: { tag: '打字', tagTone: 'butter', emoji: '⌨️', bg: KT.lilac },
  LISTENING: { tag: '聽力', tagTone: 'mint', emoji: '🎧', bg: KT.mint },
  PODCAST: { tag: '聽力', tagTone: 'mint', emoji: '🎧', bg: KT.mint },
  GRAMMAR: { tag: '文法', tagTone: 'crimson', emoji: '📘', bg: KT.pink },
  VOCAB: { tag: '單詞', tagTone: 'crimson', emoji: '📚', bg: KT.pink },
  READING: { tag: '閱讀', tagTone: 'ink', emoji: '📖', bg: KT.butter },
};

function getCommunityTone(module: string, language: string): CommunityCardTone {
  const base = moduleToneMap[module] ?? {
    tag: '學習',
    tagTone: 'ink' as ChipTone,
    emoji: '✨',
    bg: KT.card,
  };
  if (language.startsWith('zh')) return base;
  if (language.startsWith('vi')) {
    return {
      ...base,
      tag:
        module === 'EXAM'
          ? 'Thi'
          : module === 'TYPING'
            ? 'Gõ'
            : module === 'LISTENING' || module === 'PODCAST'
              ? 'Nghe'
              : module === 'GRAMMAR'
                ? 'Ngữ pháp'
                : module === 'VOCAB'
                  ? 'Từ vựng'
                  : module === 'READING'
                    ? 'Đọc'
                    : 'Học',
    };
  }
  if (language.startsWith('mn')) {
    return {
      ...base,
      tag:
        module === 'EXAM'
          ? 'Шалгалт'
          : module === 'TYPING'
            ? 'Бичих'
            : module === 'LISTENING' || module === 'PODCAST'
              ? 'Сонсох'
              : module === 'GRAMMAR'
                ? 'Дүрэм'
                : module === 'VOCAB'
                  ? 'Үг'
                  : module === 'READING'
                    ? 'Унших'
                    : 'Сургалт',
    };
  }
  return {
    ...base,
    tag:
      module === 'EXAM'
        ? 'Exam'
        : module === 'TYPING'
          ? 'Typing'
          : module === 'LISTENING' || module === 'PODCAST'
            ? 'Listening'
            : module === 'GRAMMAR'
              ? 'Grammar'
              : module === 'VOCAB'
                ? 'Vocab'
                : module === 'READING'
                  ? 'Reading'
                  : 'Study',
  };
}

function formatCommunityAction(item: CommunityActivityDto, language: string): string {
  const minutes = Math.max(1, Math.round(item.durationSec / 60));
  if (item.module === 'EXAM') {
    if (typeof item.score === 'number' && item.score > 0) {
      const roundedScore = Math.round(item.score);
      if (language.startsWith('zh')) return `TOPIK 模考得分 ${roundedScore}`;
      if (language.startsWith('vi')) return `TOPIK mock đạt ${roundedScore} điểm`;
      if (language.startsWith('mn')) return `TOPIK сорилд ${roundedScore} оноо авлаа`;
      return `Scored ${roundedScore} on a TOPIK mock`;
    }
    if (language.startsWith('zh')) return '完成了一套 TOPIK 练习';
    if (language.startsWith('vi')) return 'Vừa hoàn thành một bộ TOPIK';
    if (language.startsWith('mn')) return 'TOPIK дасгалын нэг сет дуусгалаа';
    return 'Completed a TOPIK practice session';
  }
  if (item.module === 'VOCAB') {
    const count = Math.max(1, item.itemCount);
    if (language.startsWith('zh')) return `完成了 ${count} 个单词复习`;
    if (language.startsWith('vi')) return `Đã ôn ${count} từ vựng`;
    if (language.startsWith('mn')) return `${count} үгийн давтлага хийлээ`;
    return `Reviewed ${count} vocabulary items`;
  }
  if (item.module === 'GRAMMAR') {
    if (language.startsWith('zh')) return '完成了语法训练';
    if (language.startsWith('vi')) return 'Đã hoàn thành một lượt ngữ pháp';
    if (language.startsWith('mn')) return 'Дүрмийн дасгалын нэг сет дуусгалаа';
    return 'Completed a grammar drill';
  }
  if (item.module === 'TYPING') {
    if (typeof item.accuracy === 'number' && item.accuracy > 0) {
      const accuracy = Math.round(item.accuracy);
      if (language.startsWith('zh')) return `完成打字训练，准确率 ${accuracy}%`;
      if (language.startsWith('vi')) return `Hoàn thành bài gõ, độ chính xác ${accuracy}%`;
      if (language.startsWith('mn')) return `Бичгийн дасгал дуусгаж, нарийвчлал ${accuracy}%`;
      return `Finished a typing session at ${accuracy}% accuracy`;
    }
    if (language.startsWith('zh')) return '完成了一次打字练习';
    if (language.startsWith('vi')) return 'Đã hoàn thành một lượt gõ chữ';
    if (language.startsWith('mn')) return 'Бичгийн дасгал дуусгалаа';
    return 'Completed a typing session';
  }
  if (item.module === 'LISTENING' || item.module === 'PODCAST') {
    if (language.startsWith('zh')) return `完成了 ${minutes} 分钟听力`;
    if (language.startsWith('vi')) return `Đã nghe ${minutes} phút`;
    if (language.startsWith('mn')) return `${minutes} минут сонсгол хийлээ`;
    return `Completed ${minutes} minutes of listening`;
  }
  if (item.module === 'READING') {
    if (language.startsWith('zh')) return '完成了一篇阅读内容';
    if (language.startsWith('vi')) return 'Đã hoàn thành một bài đọc';
    if (language.startsWith('mn')) return 'Нэг унших контент дуусгалаа';
    return 'Completed a reading session';
  }
  if (language.startsWith('zh')) return '完成了一次学习活动';
  if (language.startsWith('vi')) return 'Đã hoàn thành một hoạt động học';
  if (language.startsWith('mn')) return 'Нэг сургалтын үйлдэл дуусгалаа';
  return 'Completed a learning activity';
}

function formatCommunityTime(eventAt: number, language: string): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - eventAt) / 1000));
  if (diffSec < 60) {
    if (language.startsWith('zh')) return '刚刚';
    if (language.startsWith('vi')) return 'Vừa xong';
    if (language.startsWith('mn')) return 'Дөнгөж сая';
    return 'Just now';
  }
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    if (language.startsWith('zh')) return `${diffMin} 分钟前`;
    if (language.startsWith('vi')) return `${diffMin} phút trước`;
    if (language.startsWith('mn')) return `${diffMin} минутын өмнө`;
    return `${diffMin}m ago`;
  }
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    if (language.startsWith('zh')) return `${diffHour} 小时前`;
    if (language.startsWith('vi')) return `${diffHour} giờ trước`;
    if (language.startsWith('mn')) return `${diffHour} цагийн өмнө`;
    return `${diffHour}h ago`;
  }
  const diffDay = Math.floor(diffHour / 24);
  if (language.startsWith('zh')) return `${diffDay} 天前`;
  if (language.startsWith('vi')) return `${diffDay} ngày trước`;
  if (language.startsWith('mn')) return `${diffDay} хоногийн өмнө`;
  return `${diffDay}d ago`;
}

function getConvexErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const payload = error as { data?: { code?: string }; message?: string };
  if (typeof payload.data?.code === 'string') return payload.data.code;
  if (typeof payload.message === 'string' && payload.message.includes('TARGET_ALREADY_PAIRED')) {
    return 'TARGET_ALREADY_PAIRED';
  }
  return null;
}

function getTargetAlreadyPairedMessage(language: string): string {
  if (language.startsWith('zh')) return '对方已有学习搭档，无法重复邀请。';
  if (language.startsWith('vi')) return 'Người học này đã có bạn đồng hành.';
  if (language.startsWith('mn')) return 'Энэ хэрэглэгч аль хэдийн суралцах хамтрагчтай байна.';
  return 'That learner already has a study buddy.';
}

export const MobileDashboard: React.FC<{
  learningEntryTarget: LearningEntryTarget | null;
  institutes: Institute[] | undefined;
  institutesLoading: boolean;
}> = () => {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const ensureUserFeed = useMutation(NEWS.ensureUserFeed);
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const userName = user?.name?.split(' ')[0] || user?.name || '';
  const copy = useMemo(() => getDashboardCopy(language, userName), [language, userName]);

  const userStats = useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats'));
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 6 } : 'skip'
  );
  const podcastHistory = useQuery(
    qRef<NoArgs, PodcastHistoryItem[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );
  const topikGrammarList = useQuery(
    GRAMMARS.getByCourse,
    user ? { courseId: TOPIK_GRAMMAR_COURSE_ID, language } : 'skip'
  );
  const communityActivities = useQuery(
    COMMUNITY.getRecentFriendActivity,
    user ? { limit: 3 } : 'skip'
  );
  const dailyPhrase = useQuery(VOCAB.getDailyPhrase, { language });
  const dailyChallenge = useQuery(DAILY_CHALLENGES.getTodayChallenge, { language });
  // Freeze localHour for the lifetime of the component so re-renders
  // don't re-issue the recommendation query every minute.
  const [localHour] = React.useState(() => new Date().getHours());
  const nextBestAction = useQuery(RECOMMENDATIONS.getNextBestAction, user ? { localHour } : 'skip');
  const myRank = useQuery(LEADERBOARD.getMyRank, user ? {} : 'skip');
  const activePartnership = useQuery(PARTNERSHIPS.getActivePartnership, user ? {} : 'skip');
  const pendingPartnerships = useQuery(PARTNERSHIPS.listPending, user ? {} : 'skip');
  const likeCommunityActivity = useMutation(COMMUNITY.likeActivity);
  const unlikeCommunityActivity = useMutation(COMMUNITY.unlikeActivity);
  const claimDailyChallenge = useMutation(DAILY_CHALLENGES.claimReward);
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

  useEffect(() => {
    if (!user?.id) return;
    void ensureUserFeed({ newsLimit: 3, articleLimit: 3 }).catch(() => undefined);
  }, [ensureUserFeed, user?.id]);

  const stats = userStats ?? EMPTY_LEARNER_STATS;
  const dueReviews = Math.max(
    stats.vocabStats.dueReviews,
    stats.reviewStats.dueNow,
    stats.wordsToReview
  );
  const streak = stats.streak ?? 0;

  const featuredTopikGrammar = useMemo(() => {
    const grammars = topikGrammarList ?? [];
    const learningGrammar = grammars.find(item => item.status === 'LEARNING');
    if (learningGrammar) return learningGrammar;
    const learned = grammars.filter(
      item => item.status === 'MASTERED' || item.status === 'LEARNING'
    );
    return learned.length > 0 ? learned[learned.length - 1] : null;
  }, [topikGrammarList]);

  const grammarTitle =
    getGrammarLocalizedTitle(featuredTopikGrammar, language) || copy.grammarStartTitle;

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
  const goTopik = () => navigate(appendReturnToPath('/topik', dashboardPath));
  const goTyping = () => navigate(appendReturnToPath('/typing', dashboardPath));

  const path: PathStep[] = [
    {
      key: 'review',
      kind: copy.reviewKind,
      en: copy.reviewEn,
      mins: 8,
      title: copy.reviewTitle(dueReviews || 24),
      sub: copy.reviewSub,
      tone: 'pink',
      kanji: '復',
      onStart: goReview,
    },
    {
      key: 'grammar',
      kind: copy.grammarKind,
      en: copy.grammarEn,
      mins: 6,
      title: grammarTitle,
      sub: copy.grammarSub,
      tone: 'mint',
      kanji: '文',
      onStart: goGrammar,
    },
    {
      key: 'listen',
      kind: copy.listenKind,
      en: copy.listenEn,
      mins: 12,
      title: latestPodcast?.episodeTitle || copy.listenFallbackTitle,
      sub: latestPodcast?.channelName || copy.listenFallbackSub,
      tone: 'butter',
      kanji: '聽',
      onStart: goPodcast,
    },
    {
      key: 'topik',
      kind: copy.topikKind,
      en: copy.topikEn,
      mins: 2,
      title: copy.topikTitle,
      sub: copy.topikSub,
      tone: 'lilac',
      kanji: '試',
      onStart: goTopik,
    },
  ];

  // Derive "done" steps from today's activity counts
  const { wordsLearned, listeningsCompleted, examsCompleted } = stats.todayActivities;
  const doneCount =
    (wordsLearned > 0 ? 1 : 0) +
    (stats.todayGrammarStudied > 0 ? 1 : 0) +
    (listeningsCompleted > 0 ? 1 : 0) +
    (examsCompleted > 0 ? 1 : 0);
  const step = Math.min(doneCount, path.length);
  const done = path.slice(0, step);
  const next = path[step] ?? null;
  const totalMin = path.reduce((s, x) => s + x.mins, 0);
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
    { e: '⚡', l: copy.reviewKind, s: `${wordsLearned || 0}`, visible: true },
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

  const handleToggleLike = async (activityId: Id<'learning_events'>) => {
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
        ? await likeCommunityActivity({ activityId })
        : await unlikeCommunityActivity({ activityId });
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
              gap: 4,
              fontFamily: KT.font,
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
            <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600 }}>{copy.streakLabel}</div>
          </div>
        </div>
        <StreakRow done={streakDoneDays} />
      </div>

      {/* Resume card — one prominent "next best action" from recommendations engine. */}
      {nextBestAction && (
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
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
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

      {/* TODAY'S PATH hero */}
      <div style={{ padding: '0 18px', marginTop: -4 }}>
        <div
          style={{
            background: KT.card,
            borderRadius: 28,
            boxShadow: KT.sh,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px 14px',
              borderBottom: `1px solid ${KT.line}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <HanjaSeal c="道" size={28} bg={KT.crimson} round={6} />
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 800,
                    color: KT.ink,
                    letterSpacing: -0.2,
                  }}
                >
                  {copy.pathTitle}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: KT.sub,
                    fontWeight: 600,
                    letterSpacing: 0.5,
                    marginTop: 1,
                  }}
                >
                  {copy.pathSub} · {copy.minsShort(totalMin)}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {path.map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: i === step ? 18 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i < step ? KT.mintDeep : i === step ? KT.ink : KT.line2,
                    transition: 'all .3s',
                  }}
                />
              ))}
            </div>
          </div>

          {done.map(p => (
            <div
              key={p.key}
              style={{
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                borderBottom: `1px solid ${KT.line}`,
                opacity: 0.55,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  background: KT.mint,
                  display: 'grid',
                  placeItems: 'center',
                  color: KT.mintDeep,
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                ✓
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: KT.ink,
                    textDecoration: 'line-through',
                    textDecorationColor: KT.subLight,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {p.title}
                </div>
                <div style={{ fontSize: 11, color: KT.sub, marginTop: 1 }}>
                  {p.kind} · {copy.minsShort(p.mins)} {copy.minsDone}
                </div>
              </div>
            </div>
          ))}

          {next && (
            <div
              style={{
                padding: '20px 20px 22px',
                background: `linear-gradient(180deg, ${KT[next.tone as keyof typeof KT]}30 0%, ${KT.card} 70%)`,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 14,
                  alignItems: 'flex-start',
                  marginBottom: 16,
                }}
              >
                <HanjaSeal
                  c={next.kanji}
                  size={52}
                  bg={KT[`${next.tone}Deep` as keyof typeof KT] as string}
                  round={12}
                />
                <div style={{ flex: 1, paddingTop: 2, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                    <Chip tone={next.tone}>
                      {next.kind.toUpperCase()} · {next.en}
                    </Chip>
                    <span style={{ fontSize: 10, color: KT.sub, fontWeight: 700 }}>
                      ≈ {copy.minsShort(next.mins)}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 19,
                      fontWeight: 800,
                      color: KT.ink,
                      lineHeight: 1.25,
                      letterSpacing: -0.4,
                    }}
                  >
                    {next.title}
                  </div>
                  <div style={{ fontSize: 12, color: KT.sub, marginTop: 4 }}>{next.sub}</div>
                </div>
              </div>
              <button
                type="button"
                onClick={next.onStart}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 18,
                  border: 'none',
                  background: KT.ink,
                  color: KT.bg,
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: 0.3,
                  cursor: 'pointer',
                  fontFamily: KT.font,
                  boxShadow: '0 4px 14px rgba(31,27,23,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>{copy.pathStart}</span>
                <span style={{ fontFamily: KT.serif, opacity: 0.7, fontSize: 13 }}>始</span>
                <span style={{ marginLeft: 'auto', fontSize: 16 }}>→</span>
              </button>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 10,
                  padding: '0 4px',
                }}
              >
                <button type="button" style={btnSub()}>
                  {copy.pathSkip}
                </button>
                <button type="button" style={btnSub()}>
                  {copy.pathLater}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {achievements.length > 0 && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead kanji="成" title={copy.achievementsTitle} />
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
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
                      minWidth: 28,
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

      {dailyPhrase && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead kanji="日" title={copy.dailyPhraseTitle} />
          <div
            style={{
              background: `linear-gradient(135deg, ${KT.butter}60 0%, ${KT.card} 70%)`,
              borderRadius: 24,
              padding: '18px 20px',
              border: `1px solid ${KT.line}`,
              boxShadow: KT.shSm,
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                right: 12,
                top: 8,
                fontFamily: KT.serif,
                fontSize: 56,
                color: 'rgba(162,59,46,0.08)',
                lineHeight: 1,
                pointerEvents: 'none',
              }}
            >
              語
            </div>
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: KT.ink,
                  letterSpacing: -0.5,
                  lineHeight: 1.2,
                  marginBottom: 4,
                }}
              >
                {dailyPhrase.korean}
              </div>
              {dailyPhrase.romanization && (
                <div style={{ fontSize: 12, color: KT.sub, fontWeight: 600, marginBottom: 8 }}>
                  [{dailyPhrase.romanization}]
                </div>
              )}
              <div style={{ fontSize: 14, color: KT.ink2, fontWeight: 600, lineHeight: 1.5 }}>
                {language.startsWith('zh')
                  ? dailyPhrase.translationZh || dailyPhrase.translation
                  : language.startsWith('vi')
                    ? dailyPhrase.translationVi || dailyPhrase.translation
                    : language.startsWith('mn')
                      ? dailyPhrase.translationMn || dailyPhrase.translation
                      : dailyPhrase.translation}
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: '24px 18px 20px' }}>
        <SectionHead kanji="會" title={copy.communityTitle} />
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
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
                background:
                  !dailyChallenge || dailyChallenge.isClaimed
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                color: KT.card,
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

function btnSub(): React.CSSProperties {
  return {
    background: 'transparent',
    border: 'none',
    color: KT.sub,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: KT.font,
    padding: 4,
  };
}
