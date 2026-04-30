import React, { useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { Bell, BookOpen, ShieldAlert, UserRoundPlus, Users } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';
import type { CommunityActivityDto } from '../../../convex/community';
import type { DailyChallengeDto } from '../../../convex/dailyChallenges';
import type { FriendSearchItemDto } from '../../../convex/friends';
import type { PartnershipDto } from '../../../convex/partnerships';
import type { GrammarItemDto } from '../../../convex/grammars';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import {
  COMMUNITY,
  DAILY_CHALLENGES,
  FRIENDS,
  GRAMMARS,
  INSTITUTES,
  LEADERBOARD,
  NEWS,
  NoArgs,
  NOTIFICATIONS,
  PARTNERSHIPS,
  qRef,
  RECOMMENDATIONS,
  VOCAB,
  WEAK_POINTS,
  type NextBestAction,
  type NotificationDto,
} from '../../utils/convexRefs';
import { useLearningSelection } from '../../contexts/LearningContext';
import { buildMediaPath } from '../../utils/mediaRoutes';
import { appendReturnToPath } from '../../utils/navigation';
import { notify } from '../../utils/notify';
import { buildPodcastPlayerPath } from '../../utils/podcastRoutes';
import { buildVocabTodayPath, type VocabPathStep } from '../../utils/todayPath';
import { getLocalizedContent } from '../../utils/languageUtils';
import type { ExamAttempt, Institute } from '../../types';
import { formatNotificationTime } from '../../utils/notificationFormat';
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
      streakLabel: '',
      pathTitle: '今日之路',
      pathSub: "TODAY'S PATH",
      pathStart: '开始',
      pathSkip: '跳过',
      pathLater: '稍后 →',
      minsShort: n => `${n}分`,
      minsDone: '完成',
      achievementsTitle: '今日成就',
      communityTitle: '学习伙伴',
      communityAction: '全部',
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
      communityTitle: 'Bạn học',
      communityAction: 'Tất cả',
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
      communityTitle: 'Сургалтын найзууд',
      communityAction: 'Бүгд',
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
    communityTitle: 'Study friends',
    communityAction: 'All',
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

function renderVocabPathRow(
  step: VocabPathStep,
  language: string
): { title: string; sub: string; tone: string } {
  const isZh = language.startsWith('zh');
  const isVi = language.startsWith('vi');
  const isMn = language.startsWith('mn');
  const isKo = language.startsWith('ko');

  if (step.kind === 'review') {
    const title = isZh
      ? `复习 ${step.count} 个到期词`
      : isVi
        ? `Ôn lại ${step.count} từ đến hạn`
        : isMn
          ? `${step.count} үг давтах`
          : isKo
            ? `복습 ${step.count}개`
            : `Review ${step.count} due words`;
    const sub = isZh
      ? 'FSRS · 优先到期'
      : isVi
        ? 'FSRS · ưu tiên đến hạn'
        : isMn
          ? 'FSRS · хугацаа дууссан'
          : isKo
            ? 'FSRS · 만기 우선'
            : 'FSRS · due first';
    return { title, sub, tone: KT.crimson };
  }

  if (step.kind === 'new') {
    const title = isZh
      ? `新学 ${step.count} 个新词`
      : isVi
        ? `Học ${step.count} từ mới`
        : isMn
          ? `${step.count} шинэ үг сурах`
          : isKo
            ? `새 단어 ${step.count}개`
            : `Learn ${step.count} new words`;
    const courseLabel = step.courseLabel;
    const unitLabel = step.unitId
      ? ` · ${isZh ? '單元' : isKo ? '단원' : 'Unit'} ${step.unitId}`
      : '';
    return { title, sub: `${courseLabel}${unitLabel}`, tone: KT.ink };
  }

  // weak
  const title = isZh
    ? `攻克 ${step.categoryLabel} 薄弱词类`
    : isVi
      ? `Khắc phục từ loại yếu (${step.categoryLabel})`
      : isMn
      ? `Сул талтай үг (${step.categoryLabel})`
      : isKo
        ? `약점 보완 · ${step.categoryLabel}`
        : `Drill weak ${step.categoryLabel}`;
  const sub = isZh
    ? `针对性练习 ${step.count} 词`
    : isVi
      ? `Luyện tập tập trung ${step.count} từ`
      : isMn
        ? `Зорилтот ${step.count} үг`
        : isKo
          ? `집중 연습 ${step.count}개`
          : `Focused drill of ${step.count} words`;
  return { title, sub, tone: KT.crimson };
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
  const topikGrammarList = useQuery(
    GRAMMARS.getByCourse,
    user ? { courseId: TOPIK_GRAMMAR_COURSE_ID, language } : 'skip'
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
  const vocabReviewSummary = useQuery(VOCAB.getReviewSummary, user ? {} : 'skip');
  const weakVocabCategories = useQuery(
    WEAK_POINTS.getWeakVocabCategories,
    user ? { limit: 3, language } : 'skip'
  );
  const unreadNotificationCount = useQuery(NOTIFICATIONS.getUnreadCount, user ? {} : 'skip') ?? 0;
  const recentNotifications = useQuery(
    NOTIFICATIONS.listRecent,
    user && notificationPanelOpen ? { limit: 20 } : 'skip'
  );
  const learningSelection = useLearningSelection();
  const recentVocabMaterial = learningSelection.recentMaterials.vocabulary ?? null;
  const recentVocabInstitute = useQuery(
    INSTITUTES.get,
    recentVocabMaterial?.instituteId ? { id: recentVocabMaterial.instituteId } : 'skip'
  );
  const myRank = useQuery(LEADERBOARD.getMyRank, user ? {} : 'skip');
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

  const recentInstituteName = recentVocabInstitute
    ? getLocalizedContent(recentVocabInstitute as unknown as Record<string, unknown>, 'name', language) ||
      recentVocabInstitute.name ||
      recentVocabMaterial?.instituteId
    : recentVocabMaterial?.instituteId;

  const vocabTodayPath = useMemo(
    () =>
      buildVocabTodayPath({
        reviewSummary: vocabReviewSummary ?? null,
        weakCategories: weakVocabCategories ?? null,
        recentVocab: recentVocabMaterial,
        recentInstituteName,
      }),
    [vocabReviewSummary, weakVocabCategories, recentVocabMaterial, recentInstituteName]
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const auto = searchParams.get('auto') === '1';
    if (auto && vocabTodayPath.steps.length > 0) {
      const target = vocabTodayPath.steps[0].target;
      const connector = target.includes('?') ? '&' : '?';
      navigate(appendReturnToPath(`${target}${connector}flow=today`, dashboardPath), { replace: true });
    }
  }, [vocabTodayPath.steps, navigate, dashboardPath]);

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
    { e: '⚡', l: copy.reviewKind, s: `${stats.todayActivities?.wordsLearned || 0}`, visible: true },
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

      {/* TODAY'S PATH hero (Vocab focus) */}
      <div style={{ padding: '0 18px', marginTop: 8 }}>
        <div
          style={{
            background: KT.card,
            borderRadius: 28,
            boxShadow: KT.sh,
            overflow: 'hidden',
            border: `1px solid ${KT.line}`,
            position: 'relative',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px 14px',
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
                  {vocabTodayPath.estimatedMinutes > 0 
                    ? `${language.startsWith('zh') ? '预计' : 'Est.'} ${vocabTodayPath.estimatedMinutes} ${language.startsWith('zh') ? '分钟' : 'min'}`
                    : language.startsWith('zh') ? '全部完成' : 'All done'}
                </div>
              </div>
            </div>
          </div>
          
          <div style={{ height: 1, background: KT.line }} />

          {/* Steps */}
          <div style={{ padding: '16px 20px' }}>
            {vocabTodayPath.steps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: KT.subLight, fontSize: 13, fontWeight: 500 }}>
                {language.startsWith('zh') ? '太棒了！今天的单词任务已全部完成。' : 'Awesome! All vocab tasks for today are done.'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {vocabTodayPath.steps.map((vstep, idx) => {
                  const meta = renderVocabPathRow(vstep, language);
                  return (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ 
                        width: 24, 
                        height: 24, 
                        borderRadius: 12, 
                        background: `${meta.tone}15`, 
                        color: meta.tone, 
                        display: 'grid', 
                        placeItems: 'center',
                        fontSize: 12,
                        fontWeight: 800,
                        fontFamily: KT.serif,
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: KT.ink, letterSpacing: -0.2 }}>
                          {meta.title}
                        </div>
                        {meta.sub && (
                          <div style={{ fontSize: 12, color: KT.sub, marginTop: 2, fontWeight: 500 }}>
                            {meta.sub}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Action */}
          {vocabTodayPath.steps.length > 0 && (
            <div style={{ padding: '0 20px 20px' }}>
              <button
                type="button"
                onClick={() => {
                  const target = vocabTodayPath.steps[0].target;
                  const connector = target.includes('?') ? '&' : '?';
                  navigate(appendReturnToPath(`${target}${connector}flow=today`, dashboardPath));
                }}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 18,
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
                <span>{language.startsWith('zh') ? '开始今日学习' : 'Start Today\'s Path'}</span>
                <span style={{ fontSize: 16 }}>▶</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {achievements.length > 0 && (
        <div style={{ padding: '20px 18px 0' }}>
          <SectionHead kanji="成" title={copy.achievementsTitle} />
          <div className="hide-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
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
                background:
                  !dailyChallenge || dailyChallenge.isClaimed
                    ? 'transparent'
                    : KT.card,
                color:
                  !dailyChallenge || dailyChallenge.isClaimed
                    ? KT.card
                    : KT.indigo,
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
