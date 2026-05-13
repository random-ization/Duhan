import { v } from 'convex/values';
import { query, type QueryCtx } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { api } from './_generated/api';
import { evaluateCourseUnitAccess, getViewerEntitlementSnapshot } from './entitlements';
import { getOptionalAuthUserId } from './utils';

type AndroidTopikWritingSessionDto = {
  sessionId: Id<'topik_writing_sessions'>;
  examDocumentId: string;
  examLegacyId: string | null;
  examTitle: string;
  status: string;
  updatedAt: number;
  completedAt: number | null;
  score: number | null;
  answers: Record<string, string>;
};

type AndroidActivityHeatmapLevel = 'idle' | 'active' | 'strong';

type AndroidPodcastEpisodeDto = {
  episodeId: Id<'podcast_episodes'>;
  title: string;
  description: string;
  durationSec: number;
  pubDate: number;
  audioUrl: string;
};

type AndroidPodcastChannelEpisodesDto = {
  channelId: Id<'podcast_channels'>;
  channelTitle: string;
  channelAuthor: string;
  episodes: AndroidPodcastEpisodeDto[];
};

type AndroidPodcastNowPlayingDto = {
  episodeId: string;
  episodeTitle: string;
  channelTitle: string;
  elapsedSec: number;
  durationSec: number | null;
  transcriptText: string;
  translationText: string;
};

type AndroidLearningShortcutDto = {
  seal: string;
  label: string;
  subtitle: string;
  accent: 'pink' | 'mint' | 'butter' | 'lilac';
  route: string;
};

type AndroidLearningCourseDto = {
  courseId: string;
  title: string;
  subtitle: string;
  progress: number;
  completedHours: number | null;
  totalHours: number | null;
  etaDays: number | null;
  route: string;
};

type AndroidMobileLearningSurfaceDto = {
  currentCourse: AndroidLearningCourseDto | null;
  shortcuts: AndroidLearningShortcutDto[];
  writingWeeklyGoalTarget: number;
  writingCompletedThisWeek: number;
};

type AndroidGrammarExampleDto = {
  kr: string;
  cn: string;
};

type AndroidGrammarQuizItemDto = {
  prompt: string;
  answer: string;
};

type AndroidGrammarPointDetailDto = {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  status: string;
  proficiency: number;
  translation: string;
  rules: Record<string, string>;
  examples: AndroidGrammarExampleDto[];
  quizzes: AndroidGrammarQuizItemDto[];
};

type AndroidGrammarModuleDetailDto = {
  deckTitle: string;
  deckLevel: string;
  totalCount: number;
  masteredCount: number;
  learningCount: number;
  points: AndroidGrammarPointDetailDto[];
};

type AndroidDailyChallengeCardDto = {
  title: string;
  subtitle: string;
  progressText: string;
  rewardText: string;
  badgeLabel: string;
  actionLabel: string;
  isCompleted: boolean;
  isClaimed: boolean;
  route: string;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_WEEK_MS = 7 * ONE_DAY_MS;
const DEFAULT_WRITING_WEEKLY_GOAL_TARGET = 5;
const ANDROID_LEARNING_DEFAULTS_KEY = 'android_learning_defaults';
const ANDROID_DICTIONARY_SUGGESTIONS_KEY = 'android_dictionary_suggestions';
const DEFAULT_ANDROID_DICTIONARY_SUGGESTIONS = [
  '안녕하세요',
  'TOPIK',
  '문법',
  '한국어',
  '읽기',
  '쓰기',
  '듣기',
  '발음',
];

const startOfUtcDay = (timestamp: number): number => {
  const date = new Date(timestamp);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const normalizeDays = (days?: number): number => {
  if (!Number.isFinite(days)) return 98;
  const normalized = Math.floor(days as number);
  if (normalized < 7) return 7;
  if (normalized > 365) return 365;
  return normalized;
};

const normalizeLimit = (limit?: number): number => {
  if (!Number.isFinite(limit)) return 30;
  const normalized = Math.floor(limit as number);
  if (normalized < 1) return 1;
  if (normalized > 80) return 80;
  return normalized;
};

const normalizeShortLimit = (limit?: number): number => {
  if (!Number.isFinite(limit)) return 8;
  const normalized = Math.floor(limit as number);
  if (normalized < 1) return 1;
  if (normalized > 20) return 20;
  return normalized;
};

const normalizeWeeklyGoalTarget = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_WRITING_WEEKLY_GOAL_TARGET;
  }
  const normalized = Math.floor(value);
  if (normalized < 1) return 1;
  if (normalized > 20) return 20;
  return normalized;
};

const clampProgressPercent = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
};

const getSiteSettingValue = async (ctx: QueryCtx, key: string): Promise<unknown> => {
  const setting = await ctx.db
    .query('site_settings')
    .withIndex('by_key', q => q.eq('key', key))
    .first();
  return setting?.value;
};

const parseRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
};

const parseStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (normalized.includes(trimmed)) continue;
    normalized.push(trimmed);
  }
  return normalized;
};

const getNumberField = (record: Record<string, unknown> | null, key: string): number | null => {
  if (!record) return null;
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const getStringField = (record: Record<string, unknown> | null, key: string): string | null => {
  if (!record) return null;
  const value = record[key];
  return typeof value === 'string' ? value : null;
};

const parseLocalizedText = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  const record = parseRecord(value);
  if (!record) return '';
  const candidates = ['zh', 'en', 'vi', 'mn'];
  for (const key of candidates) {
    const localized = record[key];
    if (typeof localized === 'string' && localized.trim().length > 0) {
      return localized.trim();
    }
  }
  return '';
};

const normalizeRules = (value: unknown): Record<string, string> => {
  const record = parseRecord(value);
  if (!record) return {};
  const normalized: Record<string, string> = {};
  for (const [key, raw] of Object.entries(record)) {
    if (!key.trim()) continue;
    if (typeof raw === 'string' && raw.trim().length > 0) {
      normalized[key.trim()] = raw.trim();
      continue;
    }
    const itemRecord = parseRecord(raw);
    if (!itemRecord) continue;
    const joined = Object.values(itemRecord)
      .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      .join(' / ')
      .trim();
    if (joined) {
      normalized[key.trim()] = joined;
    }
  }
  return normalized;
};

const buildWritingStatusLabel = (status: string | undefined): string => {
  return status === 'EVALUATED'
    ? 'AI 评估已完成'
    : status === 'EVALUATING'
      ? 'AI 评估中'
      : status === 'IN_PROGRESS'
        ? '写作草稿进行中'
        : '开始写作训练';
};

const buildDailyChallengeActionLabel = (isCompleted: boolean, isClaimed: boolean): string => {
  if (isClaimed) return '已领取';
  if (isCompleted) return '领取奖励';
  return '继续挑战';
};

const resolveHeatmapLevel = (
  count: number,
  strongThreshold: number
): AndroidActivityHeatmapLevel => {
  if (count <= 0) return 'idle';
  if (count >= strongThreshold) return 'strong';
  return 'active';
};

export const getTopikWritingSessions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AndroidTopikWritingSessionDto[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const limit = Math.max(1, Math.min(args.limit ?? 200, 500));
    const sessions = await ctx.db
      .query('topik_writing_sessions')
      .withIndex('by_user', q => q.eq('userId', userId))
      .order('desc')
      .take(limit);

    const examCache = new Map<string, { legacyId: string | null; title: string }>();
    const results: AndroidTopikWritingSessionDto[] = [];

    for (const session of sessions) {
      const examIdKey = String(session.examId);
      if (!examCache.has(examIdKey)) {
        const exam = await ctx.db.get(session.examId);
        examCache.set(examIdKey, {
          legacyId: exam?.legacyId ?? null,
          title: exam?.title ?? 'TOPIK 写作',
        });
      }
      const examInfo = examCache.get(examIdKey);
      const answers = session.answers ?? {};
      const normalizedAnswers: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        normalizedAnswers[key] = typeof value === 'string' ? value : '';
      }

      results.push({
        sessionId: session._id,
        examDocumentId: examIdKey,
        examLegacyId: examInfo?.legacyId ?? null,
        examTitle: examInfo?.title ?? 'TOPIK 写作',
        status: session.status,
        updatedAt:
          session.completedAt ??
          session.endTime ??
          session.startTime ??
          session._creationTime,
        completedAt: session.completedAt ?? null,
        score: typeof session.totalScore === 'number' ? session.totalScore : null,
        answers: normalizedAnswers,
      });
    }

    return results;
  },
});

export const getActivityHeatmap = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AndroidActivityHeatmapLevel[]> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const days = normalizeDays(args.days);
    const now = Date.now();
    const todayStart = startOfUtcDay(now);
    const startTs = todayStart - (days - 1) * ONE_DAY_MS;

    const events = await ctx.db
      .query('learning_events')
      .withIndex('by_user_eventAt', q => q.eq('userId', userId).gte('eventAt', startTs))
      .collect();

    const dailyCounts = new Map<number, number>();
    for (const event of events) {
      const dayKey = startOfUtcDay(event.eventAt);
      dailyCounts.set(dayKey, (dailyCounts.get(dayKey) ?? 0) + 1);
    }

    let maxCount = 0;
    for (const count of dailyCounts.values()) {
      if (count > maxCount) {
        maxCount = count;
      }
    }
    const strongThreshold = Math.max(3, Math.ceil(maxCount * 0.6));

    const levels: AndroidActivityHeatmapLevel[] = [];
    for (let offset = 0; offset < days; offset += 1) {
      const dayStart = startTs + offset * ONE_DAY_MS;
      const count = dailyCounts.get(dayStart) ?? 0;
      levels.push(resolveHeatmapLevel(count, strongThreshold));
    }
    return levels;
  },
});

export const getMobileLearningSurface = query({
  args: {},
  handler: async (ctx): Promise<AndroidMobileLearningSurfaceDto> => {
    const defaultSettingsValue = await getSiteSettingValue(ctx, ANDROID_LEARNING_DEFAULTS_KEY);
    const defaultSettings = parseRecord(defaultSettingsValue);
    const writingWeeklyGoalTarget = normalizeWeeklyGoalTarget(
      defaultSettings?.writingWeeklyGoalTarget
    );
    const userId = await getOptionalAuthUserId(ctx);

    if (!userId) {
      return {
        currentCourse: null,
        shortcuts: [],
        writingWeeklyGoalTarget,
        writingCompletedThisWeek: 0,
      };
    }

    const [statsRaw, typingStatsRaw, nowPlayingRaw, topikHistoryRaw, writingSessions] =
      await Promise.all([
        ctx.runQuery(api.userStats.getStats, {}),
        ctx.runQuery(api.typing.getUserStats, {}),
        ctx.runQuery(api.android.getLatestPodcastNowPlaying, {}),
        ctx.runQuery(api.topik.getMyHistory, { limit: 1 }),
        ctx.db
          .query('topik_writing_sessions')
          .withIndex('by_user', q => q.eq('userId', userId))
          .order('desc')
          .take(40),
      ]);

    const stats = parseRecord(statsRaw);
    const typingStats = parseRecord(typingStatsRaw);
    const nowPlaying = parseRecord(nowPlayingRaw);

    const courseRowsRaw = Array.isArray(stats?.courseProgress) ? stats.courseProgress : [];
    const courseRows: Record<string, unknown>[] = [];
    for (const row of courseRowsRaw) {
      const record = parseRecord(row);
      if (record) {
        courseRows.push(record);
      }
    }

    const currentProgress = parseRecord(stats?.currentProgress);
    const preferredCourseId = getStringField(currentProgress, 'instituteId');
    const currentCourseRow =
      courseRows.find(row => getStringField(row, 'courseId') === preferredCourseId) ??
      courseRows[0] ??
      null;

    const currentCourseId = getStringField(currentCourseRow, 'courseId');
    const completedUnits = Math.max(0, Math.floor(getNumberField(currentCourseRow, 'completedUnits') ?? 0));
    const totalUnits = Math.max(0, Math.floor(getNumberField(currentCourseRow, 'totalUnits') ?? 0));
    const progress =
      totalUnits > 0 ? clampProgressPercent((completedUnits / totalUnits) * 100) : 0;

    let currentCourse: AndroidLearningCourseDto | null = null;
    if (currentCourseId) {
      const institute = await ctx.db
        .query('institutes')
        .withIndex('by_legacy_id', q => q.eq('id', currentCourseId))
        .first();
      const estimatedMinutesRaw = (institute as { estimatedTotalMinutes?: unknown } | null)
        ?.estimatedTotalMinutes;
      const estimatedTotalMinutes =
        typeof estimatedMinutesRaw === 'number' && Number.isFinite(estimatedMinutesRaw)
          ? Math.max(0, Math.floor(estimatedMinutesRaw))
          : null;
      const completedMinutes =
        estimatedTotalMinutes !== null && totalUnits > 0
          ? Math.max(0, Math.round((estimatedTotalMinutes * completedUnits) / totalUnits))
          : null;
      const totalHours =
        estimatedTotalMinutes !== null ? Math.max(1, Math.round(estimatedTotalMinutes / 60)) : null;
      const completedHours =
        completedMinutes !== null ? Math.max(0, Math.round(completedMinutes / 60)) : null;
      const dailyGoal = Math.max(0, Math.floor(getNumberField(stats, 'dailyGoal') ?? 0));
      const remainingMinutes =
        estimatedTotalMinutes !== null && completedMinutes !== null
          ? Math.max(0, estimatedTotalMinutes - completedMinutes)
          : null;
      const etaDays =
        remainingMinutes !== null && dailyGoal > 0
          ? Math.ceil(remainingMinutes / dailyGoal)
          : null;

      currentCourse = {
        courseId: currentCourseId,
        title:
          institute?.nameZh?.trim() ||
          institute?.name?.trim() ||
          getStringField(currentCourseRow, 'courseName') ||
          '学习课程',
        subtitle: institute?.displayLevel?.trim() || '',
        progress,
        completedHours,
        totalHours,
        etaDays,
        route: `main/grammar/${currentCourseId}`,
      };
    }

    const weekStart = Date.now() - ONE_WEEK_MS;
    const writingCompletedThisWeek = writingSessions.filter(session => {
      if (session.status === 'IN_PROGRESS') return false;
      const completedAt = session.completedAt ?? session.endTime ?? session.startTime;
      return typeof completedAt === 'number' && completedAt >= weekStart;
    }).length;
    const latestWritingStatus = writingSessions[0]?.status;
    const writingStatusLabel = buildWritingStatusLabel(latestWritingStatus);

    const reviewStats = parseRecord(stats?.reviewStats);
    const dueNow = Math.max(0, Math.floor(getNumberField(reviewStats, 'dueNow') ?? 0));
    const highestWpm = getNumberField(typingStats, 'highestWpm');
    const podcastTitle = getStringField(nowPlaying, 'episodeTitle')?.trim() || '';
    const podcastSubtitle = podcastTitle.length > 0 ? podcastTitle : '暂无播放记录';

    const topikHistory = Array.isArray(topikHistoryRaw) ? topikHistoryRaw : [];
    const latestTopik = parseRecord(topikHistory[0]);
    const topikScore = getNumberField(latestTopik, 'score');
    const topikSubtitle =
      topikScore !== null
        ? `最近客观题 ${Math.round(topikScore)} 分`
        : writingStatusLabel;

    return {
      currentCourse,
      shortcuts: [
        {
          seal: '詞',
          label: '单词闪卡',
          subtitle: dueNow > 0 ? `${dueNow} 张待办` : '暂无待复习词卡',
          accent: 'pink',
          route: 'main/vocab',
        },
        {
          seal: '聽',
          label: '播客听力',
          subtitle: podcastSubtitle,
          accent: 'mint',
          route: 'main/podcasts',
        },
        {
          seal: '寫',
          label: '打字练习',
          subtitle:
            highestWpm !== null ? `最高 ${Math.round(highestWpm)} WPM` : '暂无速度记录',
          accent: 'butter',
          route: 'main/writing',
        },
        {
          seal: '說',
          label: '考试训练',
          subtitle: topikSubtitle,
          accent: 'lilac',
          route: 'main/topik',
        },
      ],
      writingWeeklyGoalTarget,
      writingCompletedThisWeek,
    };
  },
});

export const getGrammarModuleDetail = query({
  args: {
    courseId: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AndroidGrammarModuleDetailDto | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    const viewer = userId ? await ctx.db.get(userId) : null;
    const snapshot = await getViewerEntitlementSnapshot(ctx, userId);
    const isAdmin = viewer?.role === 'ADMIN';

    let effectiveCourseId = args.courseId;
    const instituteId = ctx.db.normalizeId('institutes', args.courseId);
    const institute = instituteId
      ? await ctx.db.get(instituteId)
      : await ctx.db
          .query('institutes')
          .withIndex('by_legacy_id', q => q.eq('id', args.courseId))
          .unique();

    if (!institute || institute.isArchived === true) {
      return null;
    }

    effectiveCourseId = institute.id || institute._id;
    const links = await ctx.db
      .query('course_grammars')
      .withIndex('by_course_unit', q => q.eq('courseId', effectiveCourseId))
      .collect();

    const visibleLinks = isAdmin
      ? links
      : links.filter(link => evaluateCourseUnitAccess(snapshot.plan, link.unitId).allowed);

    const grammarRows = await Promise.all(
      visibleLinks.map(async link => {
        const grammar = await ctx.db.get(link.grammarId);
        if (!grammar) return null;
        if (userId) {
          const progress = await ctx.db
            .query('user_grammar_progress')
            .withIndex('by_user_grammar', q =>
              q.eq('userId', userId).eq('grammarId', link.grammarId)
            )
            .first();

          const status = progress?.status ?? 'NEW';
          const proficiency =
            typeof progress?.proficiency === 'number'
              ? Math.max(0, Math.min(100, Math.round(progress.proficiency)))
              : 0;
          return { link, grammar, status, proficiency };
        }
        return { link, grammar, status: 'NEW', proficiency: 0 };
      })
    );

    const points: AndroidGrammarPointDetailDto[] = [];
    for (const row of grammarRows) {
      if (!row) continue;
      const grammarRecord = parseRecord(row.grammar);
      if (!grammarRecord) continue;
      const grammarId = String(row.grammar._id);
      const title =
        getStringField(grammarRecord, 'titleZh') ||
        getStringField(grammarRecord, 'title') ||
        getStringField(grammarRecord, 'titleEn') ||
        '';
      const summary =
        getStringField(grammarRecord, 'summary') ||
        getStringField(grammarRecord, 'summaryEn') ||
        '';
      const explanation =
        getStringField(grammarRecord, 'explanation') ||
        getStringField(grammarRecord, 'explanationEn') ||
        '';
      const rules = normalizeRules(grammarRecord['conjugationRules']);
      const examplesRaw = Array.isArray(grammarRecord['examples'])
        ? grammarRecord['examples']
        : [];
      const examples: AndroidGrammarExampleDto[] = [];
      for (const example of examplesRaw) {
        const exampleRecord = parseRecord(example);
        if (!exampleRecord) continue;
        const kr = getStringField(exampleRecord, 'kr')?.trim() ?? '';
        const cn =
          getStringField(exampleRecord, 'cn')?.trim() ||
          getStringField(exampleRecord, 'en')?.trim() ||
          '';
        if (!kr && !cn) continue;
        examples.push({ kr, cn });
      }
      const quizRaw = Array.isArray(grammarRecord['quizItems'])
        ? grammarRecord['quizItems']
        : [];
      const quizzes: AndroidGrammarQuizItemDto[] = [];
      for (const quiz of quizRaw) {
        const quizRecord = parseRecord(quiz);
        if (!quizRecord) continue;
        const prompt = parseLocalizedText(quizRecord['prompt']);
        const answer = parseLocalizedText(quizRecord['answer']);
        if (!prompt && !answer) continue;
        quizzes.push({ prompt, answer });
      }

      points.push({
        id: grammarId,
        title,
        summary,
        explanation,
        status: row.status,
        proficiency: row.proficiency,
        translation: summary,
        rules,
        examples,
        quizzes,
      });
    }

    points.sort((a, b) => {
      const linkA = visibleLinks.find(link => String(link.grammarId) == a.id);
      const linkB = visibleLinks.find(link => String(link.grammarId) == b.id);
      if (!linkA || !linkB) return 0;
      return linkA.unitId - linkB.unitId;
    });

    const totalCount = points.length;
    const masteredCount = points.filter(point => point.status === 'MASTERED').length;
    const learningCount = points.filter(point => point.status === 'LEARNING').length;

    return {
      deckTitle: institute.nameZh?.trim() || institute.name?.trim() || '语法课程',
      deckLevel: institute.displayLevel?.trim() || '',
      totalCount,
      masteredCount,
      learningCount,
      points,
    };
  },
});

export const getDailyChallengeCard = query({
  args: {
    language: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<AndroidDailyChallengeCardDto> => {
    const challenge = await ctx.runQuery(api.dailyChallenges.getTodayChallenge, {
      language: args.language,
    });
    const currentCount = Math.max(0, Math.floor(challenge.currentCount));
    const targetCount = Math.max(1, Math.floor(challenge.targetCount));
    const route =
      challenge.kind === 'vocab_20'
        ? 'main/vocab'
        : challenge.kind === 'grammar_drill'
          ? 'main/grammar'
          : challenge.kind === 'listening_10min'
            ? 'main/podcasts'
            : 'main/writing';

    return {
      title: challenge.title,
      subtitle: challenge.subtitle,
      progressText: `${Math.min(currentCount, targetCount)} / ${targetCount}`,
      rewardText: `${challenge.rewardXp} XP`,
      badgeLabel: '今日挑战',
      actionLabel: buildDailyChallengeActionLabel(challenge.isCompleted, challenge.isClaimed),
      isCompleted: challenge.isCompleted,
      isClaimed: challenge.isClaimed,
      route,
    };
  },
});

export const getDictionarySuggestions = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const value = await getSiteSettingValue(ctx, ANDROID_DICTIONARY_SUGGESTIONS_KEY);
    const suggestions = parseStringArray(value);
    const resolvedSuggestions =
      suggestions.length > 0 ? suggestions : DEFAULT_ANDROID_DICTIONARY_SUGGESTIONS;
    return resolvedSuggestions.slice(0, normalizeShortLimit(args.limit));
  },
});

export const getPodcastChannelEpisodes = query({
  args: {
    channelId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<AndroidPodcastChannelEpisodesDto | null> => {
    const channelId = ctx.db.normalizeId('podcast_channels', args.channelId);
    if (!channelId) {
      return null;
    }

    const channel = await ctx.db.get(channelId);
    if (!channel) {
      return null;
    }

    const limit = normalizeLimit(args.limit);
    const episodes = await ctx.db
      .query('podcast_episodes')
      .withIndex('by_channel', q => q.eq('channelId', channelId))
      .order('desc')
      .take(limit);

    const mappedEpisodes: AndroidPodcastEpisodeDto[] = [];
    for (const episode of episodes) {
      const audioUrl = episode.audioUrl?.trim() ?? '';
      if (!audioUrl) continue;
      mappedEpisodes.push({
        episodeId: episode._id,
        title: episode.title?.trim() || 'Untitled Episode',
        description: episode.description?.trim() || '',
        durationSec: typeof episode.duration === 'number' ? Math.max(0, episode.duration) : 0,
        pubDate: episode.pubDate ?? episode.createdAt,
        audioUrl,
      });
    }

    return {
      channelId,
      channelTitle: channel.title?.trim() || 'Podcast',
      channelAuthor: channel.author?.trim() || 'Unknown',
      episodes: mappedEpisodes,
    };
  },
});

export const getLatestPodcastNowPlaying = query({
  args: {},
  handler: async (ctx): Promise<AndroidPodcastNowPlayingDto | null> => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const latestHistory = await ctx.db
      .query('listening_history')
      .withIndex('by_user_playedAt', q => q.eq('userId', userId))
      .order('desc')
      .take(1);
    const row = latestHistory[0];
    if (!row) return null;

    const elapsedSec = Math.max(0, Math.floor(row.progress));
    const durationSec = typeof row.duration === 'number' ? Math.max(0, Math.floor(row.duration)) : null;
    let transcriptText = '';
    let translationText = '';

    if (row.episodeId) {
      const transcriptRecord = await ctx.db
        .query('podcast_transcripts')
        .withIndex('by_episode', q => q.eq('episodeId', String(row.episodeId)))
        .unique();

      if (transcriptRecord && transcriptRecord.segments.length > 0) {
        let segmentIndex = 0;
        for (let idx = 0; idx < transcriptRecord.segments.length; idx += 1) {
          const segment = transcriptRecord.segments[idx];
          if (segment.start <= elapsedSec && elapsedSec <= segment.end) {
            segmentIndex = idx;
            break;
          }
        }

        const targetSegment = transcriptRecord.segments[segmentIndex];
        transcriptText = targetSegment?.text?.trim() || transcriptRecord.segments[0].text?.trim() || '';

        const zhTranslations = transcriptRecord.translations?.zh;
        if (Array.isArray(zhTranslations)) {
          const candidate = zhTranslations[segmentIndex] ?? zhTranslations[0];
          if (typeof candidate === 'string' && candidate.trim().length > 0) {
            translationText = candidate.trim();
          }
        }

        if (!translationText) {
          const fallbackTranslation = targetSegment?.translation;
          if (typeof fallbackTranslation === 'string' && fallbackTranslation.trim().length > 0) {
            translationText = fallbackTranslation.trim();
          }
        }
      }
    }

    return {
      episodeId: row.episodeId ? String(row.episodeId) : row.episodeGuid,
      episodeTitle: row.episodeTitle,
      channelTitle: row.channelName,
      elapsedSec,
      durationSec,
      transcriptText,
      translationText,
    };
  },
});
