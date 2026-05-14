import { ConvexError, v } from 'convex/values';
import { api, internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server';
import type { LearnerStatsDto } from './learningStats';
import { startOfDay } from './userStatsHelpers';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export type DailyChallengeKind = 'vocab_20' | 'grammar_drill' | 'listening_10min' | 'typing_wpm';
export type SupportedLanguage = 'zh' | 'en' | 'vi' | 'mn';

export type DailyChallengeTemplate = {
  kind: DailyChallengeKind;
  titleZh: string;
  titleEn: string;
  titleVi: string;
  titleMn: string;
  subZh: string;
  subEn: string;
  subVi: string;
  subMn: string;
  targetCount: number;
  rewardXp: number;
};

export type DailyChallengeDto = {
  date: string;
  kind: DailyChallengeKind;
  title: string;
  subtitle: string;
  targetCount: number;
  currentCount: number;
  rewardXp: number;
  isCompleted: boolean;
  isClaimed: boolean;
  claimedAt: number | null;
};

export type DailyChallengeClaimResult = {
  status: 'claimed' | 'already_claimed';
  rewardXp: number;
  currentWeekXp?: number;
  totalXp?: number;
};

export const DEFAULT_CHALLENGE_ROTATION: readonly DailyChallengeTemplate[] = [
  {
    kind: 'vocab_20',
    titleZh: '复习 20 个到期单词',
    titleEn: 'Review 20 due words',
    titleVi: 'Ôn 20 từ đến hạn',
    titleMn: 'Хугацаатай 20 үг давтах',
    subZh: '把今天该复习的记忆刷新完一轮。',
    subEn: 'Clear a full round of today’s due review words.',
    subVi: 'Làm xong một vòng ôn tập các từ đến hạn hôm nay.',
    subMn: 'Өнөөдөр хугацаатай үгсээ нэг бүтэн давтлагаар шинэчил.',
    targetCount: 20,
    rewardXp: 25,
  },
  {
    kind: 'grammar_drill',
    titleZh: '完成 3 个语法点',
    titleEn: 'Complete 3 grammar points',
    titleVi: 'Hoàn thành 3 điểm ngữ pháp',
    titleMn: '3 дүрмийн цэг дуусгах',
    subZh: '做一轮语法操练，巩固今天的句型。',
    subEn: 'Finish a short grammar drill and lock in today’s patterns.',
    subVi: 'Làm một vòng luyện ngữ pháp để củng cố mẫu câu hôm nay.',
    subMn: 'Өнөөдрийн өгүүлбэрийн хэвийг бататгах богино дүрмийн дасгал хий.',
    targetCount: 3,
    rewardXp: 20,
  },
  {
    kind: 'listening_10min',
    titleZh: '听满 10 分钟韩语',
    titleEn: 'Listen for 10 minutes',
    titleVi: 'Nghe tiếng Hàn trong 10 phút',
    titleMn: 'Солонгос хэл 10 минут сонсох',
    subZh: '用播客或课程内容完成今天的沉浸式听力。',
    subEn: 'Use podcasts or lessons to finish today’s immersion block.',
    subVi: 'Dùng podcast hoặc bài học để hoàn thành khối nghe hôm nay.',
    subMn: 'Подкаст эсвэл хичээлээр өнөөдрийн шимтэн сонсох блокоo дуусга.',
    targetCount: 10,
    rewardXp: 25,
  },
  {
    kind: 'typing_wpm',
    titleZh: '达到 35 WPM 打字速度',
    titleEn: 'Reach 35 WPM typing speed',
    titleVi: 'Đạt tốc độ gõ 35 WPM',
    titleMn: '35 WPM бичих хурд хүрэх',
    subZh: '完成一次打字训练，把今天的速度顶上去。',
    subEn: 'Finish one typing run and push today’s speed higher.',
    subVi: 'Hoàn thành một lượt gõ và đẩy tốc độ hôm nay lên.',
    subMn: 'Нэг удаагийн бичгийн дасгал дуусгаад өнөөдрийн хурдаа өсгө.',
    targetCount: 35,
    rewardXp: 30,
  },
] as const;

export function normalizeDailyChallengeLanguage(language?: string): SupportedLanguage {
  if (language?.startsWith('zh')) return 'zh';
  if (language?.startsWith('vi')) return 'vi';
  if (language?.startsWith('mn')) return 'mn';
  return 'en';
}

export function formatDailyChallengeDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getDailyChallengeTemplateForDate(dateKey: string): DailyChallengeTemplate {
  const [yearRaw, monthRaw, dayRaw] = dateKey.split('-').map(Number);
  const year = Number.isFinite(yearRaw) ? yearRaw : 1970;
  const month = Number.isFinite(monthRaw) ? monthRaw : 1;
  const day = Number.isFinite(dayRaw) ? dayRaw : 1;
  const dayIndex = Math.floor(Date.UTC(year, month - 1, day) / ONE_DAY_MS);
  const rotationIndex =
    ((dayIndex % DEFAULT_CHALLENGE_ROTATION.length) + DEFAULT_CHALLENGE_ROTATION.length) %
    DEFAULT_CHALLENGE_ROTATION.length;
  return DEFAULT_CHALLENGE_ROTATION[rotationIndex];
}

function resolveLocalizedField(
  challenge: Pick<
    Doc<'daily_challenges'>,
    'titleZh' | 'titleEn' | 'titleVi' | 'titleMn' | 'subZh' | 'subEn' | 'subVi' | 'subMn'
  >,
  field: 'title' | 'sub',
  language: SupportedLanguage
): string {
  if (field === 'title') {
    if (language === 'zh') return challenge.titleZh;
    if (language === 'vi') return challenge.titleVi;
    if (language === 'mn') return challenge.titleMn;
    return challenge.titleEn;
  }
  if (language === 'zh') return challenge.subZh;
  if (language === 'vi') return challenge.subVi;
  if (language === 'mn') return challenge.subMn;
  return challenge.subEn;
}

async function getPersistedChallengeByDate(
  ctx: QueryCtx | MutationCtx,
  date: string
): Promise<Doc<'daily_challenges'> | null> {
  return await ctx.db
    .query('daily_challenges')
    .withIndex('by_date', q => q.eq('date', date))
    .first();
}

async function ensurePersistedChallenge(
  ctx: MutationCtx,
  date: string,
  now: number
): Promise<Doc<'daily_challenges'>> {
  const existing = await getPersistedChallengeByDate(ctx, date);
  if (existing) {
    return existing;
  }

  const template = getDailyChallengeTemplateForDate(date);
  const challengeId = await ctx.db.insert('daily_challenges', {
    date,
    kind: template.kind,
    titleZh: template.titleZh,
    titleEn: template.titleEn,
    titleVi: template.titleVi,
    titleMn: template.titleMn,
    subZh: template.subZh,
    subEn: template.subEn,
    subVi: template.subVi,
    subMn: template.subMn,
    targetCount: template.targetCount,
    rewardXp: template.rewardXp,
    createdAt: now,
    updatedAt: now,
  });

  const challenge = await ctx.db.get(challengeId);
  if (!challenge) {
    throw new ConvexError({ code: 'CHALLENGE_CREATE_FAILED' });
  }
  return challenge;
}

async function getTodayListeningMinutes(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  todayStart: number
): Promise<number> {
  const events = await ctx.db
    .query('learning_events')
    .withIndex('by_user_eventAt', q => q.eq('userId', userId).gte('eventAt', todayStart))
    .collect();

  if (events.length > 0) {
    const totalDurationSec = events.reduce((sum, event) => {
      if (event.module !== 'LISTENING' && event.module !== 'PODCAST') {
        return sum;
      }
      return sum + Math.max(0, event.durationSec ?? 0);
    }, 0);
    return Math.floor(totalDurationSec / 60);
  }

  const legacyLogs = await ctx.db
    .query('activity_logs')
    .withIndex('by_user_createdAt', q => q.eq('userId', userId).gte('createdAt', todayStart))
    .collect();

  return Math.floor(
    legacyLogs.reduce((sum, log) => {
      if (log.activityType !== 'LISTENING' && log.activityType !== 'PODCAST') {
        return sum;
      }
      return sum + Math.max(0, log.duration ?? 0);
    }, 0)
  );
}

async function getTodayTypingPeakWpm(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  todayStart: number
): Promise<number> {
  const records = await ctx.db
    .query('typing_records')
    .withIndex('by_user_createdAt', q => q.eq('userId', userId).gte('createdAt', todayStart))
    .collect();

  return records.reduce((best, record) => Math.max(best, record.wpm), 0);
}

export async function deriveDailyChallengeCurrentCount(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
  kind: DailyChallengeKind,
  todayStart: number
): Promise<number> {
  const stats = await ctx.runQuery(api.userStats.getStats, {});
  const typedStats: LearnerStatsDto = stats;

  if (kind === 'vocab_20') {
    return Math.max(0, typedStats.todayActivities.wordsLearned);
  }
  if (kind === 'grammar_drill') {
    return Math.max(0, typedStats.todayGrammarStudied);
  }
  if (kind === 'listening_10min') {
    return await getTodayListeningMinutes(ctx, userId, todayStart);
  }
  return await getTodayTypingPeakWpm(ctx, userId, todayStart);
}

function toDailyChallengeDto(args: {
  challenge: Pick<
    Doc<'daily_challenges'>,
    | 'date'
    | 'kind'
    | 'titleZh'
    | 'titleEn'
    | 'titleVi'
    | 'titleMn'
    | 'subZh'
    | 'subEn'
    | 'subVi'
    | 'subMn'
    | 'targetCount'
    | 'rewardXp'
  >;
  currentCount: number;
  claimedAt?: number;
  language: SupportedLanguage;
}): DailyChallengeDto {
  const currentCount = Math.max(0, args.currentCount);
  return {
    date: args.challenge.date,
    kind: args.challenge.kind,
    title: resolveLocalizedField(args.challenge, 'title', args.language),
    subtitle: resolveLocalizedField(args.challenge, 'sub', args.language),
    targetCount: args.challenge.targetCount,
    currentCount,
    rewardXp: args.challenge.rewardXp,
    isCompleted: currentCount >= args.challenge.targetCount,
    isClaimed: typeof args.claimedAt === 'number',
    claimedAt: args.claimedAt ?? null,
  };
}

export const getTodayChallenge = query({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DailyChallengeDto> => {
    const now = Date.now();
    const todayStart = startOfDay(now);
    const date = formatDailyChallengeDateKey(todayStart);
    const language = normalizeDailyChallengeLanguage(args.language);
    const persistedChallenge = await getPersistedChallengeByDate(ctx, date);
    const challenge = persistedChallenge ?? {
      date,
      ...getDailyChallengeTemplateForDate(date),
    };

    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return toDailyChallengeDto({
        challenge,
        currentCount: 0,
        language,
      });
    }

    const progress = await ctx.db
      .query('user_daily_progress')
      .withIndex('by_user_date', q => q.eq('userId', userId).eq('date', date))
      .first();

    const dailyTaskPlan = await ctx.runQuery(api.dailyTask.getTodayPlan, {
      language: args.language,
    });
    const compatibleTask = dailyTaskPlan.tasks.find(task => task.kind === challenge.kind);
    if (compatibleTask) {
      const rewardXp =
        typeof compatibleTask.metadata?.rewardXp === 'number'
          ? compatibleTask.metadata.rewardXp
          : challenge.rewardXp;
      return {
        date,
        kind: challenge.kind,
        title: compatibleTask.title,
        subtitle: compatibleTask.description ?? resolveLocalizedField(challenge, 'sub', language),
        targetCount: compatibleTask.targetCount ?? challenge.targetCount,
        currentCount: Math.max(0, compatibleTask.currentCount ?? 0),
        rewardXp,
        isCompleted: compatibleTask.completed,
        isClaimed: typeof progress?.claimedAt === 'number',
        claimedAt: progress?.claimedAt ?? null,
      };
    }

    const currentCount = await deriveDailyChallengeCurrentCount(
      ctx,
      userId,
      challenge.kind,
      todayStart
    );
    return toDailyChallengeDto({
      challenge,
      currentCount,
      claimedAt: progress?.claimedAt,
      language,
    });
  },
});

export const claimReward = mutation({
  args: {},
  handler: async (ctx): Promise<DailyChallengeClaimResult> => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const todayStart = startOfDay(now);
    const date = formatDailyChallengeDateKey(todayStart);
    const challenge = await ensurePersistedChallenge(ctx, date, now);
    const currentCount = await deriveDailyChallengeCurrentCount(
      ctx,
      userId,
      challenge.kind,
      todayStart
    );

    if (currentCount < challenge.targetCount) {
      throw new ConvexError({
        code: 'DAILY_CHALLENGE_NOT_COMPLETE',
        message: 'Challenge progress has not reached the target yet.',
      });
    }

    const existingProgress = await ctx.db
      .query('user_daily_progress')
      .withIndex('by_user_date', q => q.eq('userId', userId).eq('date', date))
      .first();

    if (existingProgress?.claimedAt) {
      if (
        existingProgress.currentCount !== currentCount ||
        existingProgress.challengeId !== challenge._id
      ) {
        await ctx.db.patch(existingProgress._id, {
          challengeId: challenge._id,
          currentCount,
          updatedAt: now,
        });
      }
      return {
        status: 'already_claimed',
        rewardXp: challenge.rewardXp,
      };
    }

    const xpResult = await ctx.runMutation(internal.xp.addXP, {
      userId,
      amount: challenge.rewardXp,
      source: 'DAILY_CHALLENGE',
    });

    if (existingProgress) {
      await ctx.db.patch(existingProgress._id, {
        challengeId: challenge._id,
        currentCount,
        completedAt: existingProgress.completedAt ?? now,
        claimedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('user_daily_progress', {
        userId,
        date,
        challengeId: challenge._id,
        currentCount,
        completedAt: now,
        claimedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      status: 'claimed',
      rewardXp: challenge.rewardXp,
      currentWeekXp: xpResult.currentWeekXp,
      totalXp: xpResult.totalXp,
    };
  },
});
