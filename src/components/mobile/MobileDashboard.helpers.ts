/**
 * Pure helpers and copy/format utilities extracted from MobileDashboard.tsx.
 *
 * This module contains:
 *  - Static constants (TOPIK_GRAMMAR_COURSE_ID, EMPTY_LEARNER_STATS)
 *  - Plain TypeScript types used only by the dashboard
 *  - i18n copy generation and locale-specific label formatters
 *
 * Everything here is pure: no React hooks, no Convex calls, no side effects.
 * It exists to keep MobileDashboard.tsx focused on the component itself.
 */

import type { CommunityActivityDto } from '../../../convex/community';
import type { DailyChallengeDto } from '../../../convex/dailyChallenges';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import type { VocabPathStep } from '../../utils/todayPath';
import { ChipTone, KT } from './ksoft/ksoft';

export const TOPIK_GRAMMAR_COURSE_ID = 'topik-grammar';

export type LearningEntryTarget = {
  instituteId: string;
  level: number;
};

export type PodcastHistoryItem = {
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

export const EMPTY_LEARNER_STATS: LearnerStatsDto = {
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
  vocabStats: { total: 0, dueReviews: 0, unlearned: 0, mastered: 0 },
  grammarStats: { total: 0, mastered: 0 },
  reviewStats: {
    dueNow: 0,
    dueSoon: 0,
    savedWords: 0,
    unlearned: 0,
    mastered: 0,
    total: 0,
    recommendedToday: 0,
  },
  moduleBreakdown: [],
  recentSessions: [],
  totalMinutes: 0,
  todayWordsStudied: 0,
  todayGrammarStudied: 0,
};

export type Copy = {
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

export const getDashboardCopy = (language: string, userName: string): Copy => {
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

export const formatChallengeProgressLabel = (challenge: DailyChallengeDto, language: string) => {
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

export const formatChallengeRewardLabel = (rewardXp: number, language: string) => {
  if (language.startsWith('zh')) return `奖励 +${rewardXp} XP`;
  if (language.startsWith('vi')) return `Thưởng +${rewardXp} XP`;
  if (language.startsWith('mn')) return `Шагнал +${rewardXp} XP`;
  return `Reward +${rewardXp} XP`;
};

export const formatChallengeActionLabel = (args: {
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

export type CommunityCardTone = {
  tag: string;
  tagTone: ChipTone;
  emoji: string;
  bg: string;
};

export type CommunityLikeOverride = {
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

export function getCommunityTone(module: string, language: string): CommunityCardTone {
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

export function formatCommunityAction(item: CommunityActivityDto, language: string): string {
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

export function formatCommunityTime(eventAt: number, language: string): string {
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

export function getConvexErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const payload = error as { data?: { code?: string }; message?: string };
  if (typeof payload.data?.code === 'string') return payload.data.code;
  if (typeof payload.message === 'string' && payload.message.includes('TARGET_ALREADY_PAIRED')) {
    return 'TARGET_ALREADY_PAIRED';
  }
  return null;
}

export function getTargetAlreadyPairedMessage(language: string): string {
  if (language.startsWith('zh')) return '对方已有学习搭档，无法重复邀请。';
  if (language.startsWith('vi')) return 'Người học này đã có bạn đồng hành.';
  if (language.startsWith('mn')) return 'Энэ хэрэглэгч аль хэдийн суралцах хамтрагчтай байна.';
  return 'That learner already has a study buddy.';
}

export function renderVocabPathRow(
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
