import React, { useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Headphones,
  Play,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { GrammarItemDto } from '../../../convex/grammars';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { GRAMMARS, NEWS, NoArgs, qRef, READING_BOOKS } from '../../utils/convexRefs';
import { buildPodcastChannelPath } from '../../utils/podcastRoutes';
import { buildPictureBookPath, buildReadingArticlePath } from '../../utils/readingRoutes';
import type { ExamAttempt, Institute } from '../../types';
import { formatSafeDateLabel } from '../../utils/dateLabel';

type LearningEntryTarget = {
  instituteId: string;
  level: number;
};

type PodcastChannel = {
  _id?: string;
  id?: string;
  title: string;
  author?: string;
  artwork?: string;
  artworkUrl?: string;
  feedUrl?: string;
  itunesId?: string;
  views?: number;
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

type TrendingResult = {
  internal: Array<PodcastChannel & { _id: string }>;
  external: Array<PodcastChannel & { _id: string }>;
};

type HomeCopy = {
  studioLabel: string;
  pageTitle: string;
  streakLabel: string;
  heroBadge: string;
  heroStatus: string;
  heroTitle: string;
  heroSubtitle: string;
  heroAction: string;
  distributionLabels: [string, string, string];
  nextLearningLabel: string;
  nextLearningFallback: string;
  nextLearningMeta: string;
  topikLabel: string;
  topikMeta: string;
  exploreLabel: string;
  podcastLive: string;
  podcastFallback: string;
  readingFallback: string;
  openAction: string;
  readingMetaLabel: string;
  pagesUnit: string;
  minutesUnit: string;
  topikGrammarMeta: string;
  topikGrammarLead: string;
  topikGrammarStartTitle: string;
  topikGrammarStartMeta: string;
};

const NOISE_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")";

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

const getDashboardCopy = (language: string): HomeCopy => {
  if (language.startsWith('zh')) {
    return {
      studioLabel: '专属学习空间',
      pageTitle: 'Architect.',
      streakLabel: '连续打卡',
      heroBadge: 'FSRS 激活中',
      heroStatus: '今日复习',
      heroTitle: '开始专注复习',
      heroSubtitle: '把今天该过的卡片一口气清掉，学习节奏不会断。',
      heroAction: '开始复习',
      distributionLabels: ['新输入', '学习中', '待复习'],
      nextLearningLabel: '下一项学习',
      nextLearningFallback: '继续你的课程进度',
      nextLearningMeta: '课程路径',
      topikLabel: 'TOPIK 模考',
      topikMeta: '近期成绩趋势',
      exploreLabel: '沉浸探索区',
      podcastLive: '正在播放',
      podcastFallback: '开始播客沉浸',
      readingFallback: '打开阅读世界',
      openAction: '打开',
      readingMetaLabel: '推荐阅读',
      pagesUnit: '页',
      minutesUnit: '分钟',
      topikGrammarMeta: '语法学习',
      topikGrammarLead: '正在学习',
      topikGrammarStartTitle: '开始学习 TOPIK 语法',
      topikGrammarStartMeta: '从第一单元开始建立你的语法体系',
    };
  }

  return {
    studioLabel: 'Personal learning space',
    pageTitle: 'Architect.',
    streakLabel: 'Streak',
    heroBadge: 'FSRS enabled',
    heroStatus: 'Today',
    heroTitle: 'Review with focus',
    heroSubtitle: 'Clear the cards due today and keep your learning rhythm intact.',
    heroAction: 'Start review',
    distributionLabels: ['Fresh', 'Learning', 'Due'],
    nextLearningLabel: 'Next up',
    nextLearningFallback: 'Resume your course path',
    nextLearningMeta: 'Course path',
    topikLabel: 'TOPIK mock',
    topikMeta: 'Recent score trend',
    exploreLabel: 'Immersion',
    podcastLive: 'Now playing',
    podcastFallback: 'Jump back into podcasts',
    readingFallback: 'Open reading hub',
    openAction: 'Open',
    readingMetaLabel: 'Recommended reading',
    pagesUnit: 'pages',
    minutesUnit: 'min',
    topikGrammarMeta: 'Grammar',
    topikGrammarLead: 'In progress',
    topikGrammarStartTitle: 'Start TOPIK grammar',
    topikGrammarStartMeta: 'Begin with unit one and build your grammar foundation',
  };
};

const getLocaleForLanguage = (language: string) => {
  if (language.startsWith('zh')) return 'zh-CN';
  if (language.startsWith('vi')) return 'vi-VN';
  if (language.startsWith('mn')) return 'mn-MN';
  return 'en-US';
};

const getStreakIndicators = (streak: number) => {
  const activeDots = Math.min(4, Math.max(0, streak));
  return Array.from({ length: 4 }, (_, index) => index < activeDots);
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

const buildTrendValues = (attempts: ExamAttempt[]) => {
  const sorted = [...attempts]
    .filter(attempt => attempt.maxScore > 0)
    .sort((left, right) => left.timestamp - right.timestamp)
    .slice(-6);

  if (sorted.length === 0) {
    return [];
  }

  return sorted.map(attempt => Math.round((attempt.score / attempt.maxScore) * 100));
};

const buildSparkline = (values: number[]) => {
  if (values.length === 0) {
    return {
      areaPath: 'M0,24 L100,24 L100,30 L0,30 Z',
      linePath: 'M0,24 L100,24',
      point: { x: 100, y: 24, value: 0 },
    };
  }

  const max = Math.max(...values, 100);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 100 : (index / (values.length - 1)) * 100;
    const y = 26 - ((value - min) / range) * 20;
    return { x, y, value };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L100,30 L0,30 Z`;
  const point = points[points.length - 1];

  return { areaPath, linePath, point };
};

const resolveDifficultyLabel = (difficultyLevel: string, language: string) => {
  if (difficultyLevel === 'L1') {
    return language.startsWith('zh') ? '入门' : 'Beginner';
  }
  if (difficultyLevel === 'L2') {
    return language.startsWith('zh') ? '进阶' : 'Intermediate';
  }
  if (difficultyLevel === 'L3') {
    return language.startsWith('zh') ? '高阶' : 'Advanced';
  }
  return difficultyLevel;
};

const getInstituteLocalizedName = (institute: Institute | undefined, language: string) => {
  if (!institute) {
    return language.startsWith('zh') ? 'TOPIK语法合集' : 'TOPIK Grammar Collection';
  }

  if (language.startsWith('zh')) {
    return institute.nameZh || institute.name;
  }
  if (language.startsWith('vi')) {
    return institute.nameVi || institute.nameEn || institute.name;
  }
  if (language.startsWith('mn')) {
    return institute.nameMn || institute.nameEn || institute.name;
  }

  return institute.nameEn || institute.name;
};

const getInstituteLevelBadge = (institute: Institute | undefined, language: string) => {
  if (institute?.displayLevel?.trim()) {
    return institute.displayLevel.trim();
  }

  const firstLevel = institute?.levels[0];
  const levelValue =
    typeof firstLevel === 'number'
      ? firstLevel
      : typeof firstLevel?.level === 'number'
        ? firstLevel.level
        : null;

  if (levelValue == null) {
    return 'TOPIK';
  }

  return language.startsWith('zh') ? `${levelValue} 级` : `LV ${levelValue}`;
};

const getGrammarLocalizedTitle = (grammar: GrammarItemDto | null, language: string) => {
  if (!grammar) {
    return '';
  }

  if (language.startsWith('zh')) {
    return grammar.titleZh || grammar.title;
  }
  if (language.startsWith('vi')) {
    return grammar.titleVi || grammar.titleEn || grammar.title;
  }
  if (language.startsWith('mn')) {
    return grammar.titleMn || grammar.titleEn || grammar.title;
  }

  return grammar.titleEn || grammar.title;
};

const HomeSparkline = ({ values }: { values: number[] }) => {
  const sparkline = buildSparkline(values);

  return (
    <svg viewBox="0 0 100 30" className="h-10 w-full overflow-visible" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mobile-dashboard-topik-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={sparkline.areaPath} fill="url(#mobile-dashboard-topik-grad)" />
      <path
        d={sparkline.linePath}
        fill="none"
        stroke="#1e293b"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={sparkline.point.x}
        cy={sparkline.point.y}
        r="3"
        fill="#f43f5e"
        stroke="#ffffff"
        strokeWidth="1.5"
      />
    </svg>
  );
};

export const MobileDashboard: React.FC<{
  learningEntryTarget: LearningEntryTarget | null;
  institutes: Institute[] | undefined;
  institutesLoading: boolean;
}> = ({ institutes }) => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const ensureUserFeed = useMutation(NEWS.ensureUserFeed);
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const locale = getLocaleForLanguage(language);
  const copy = getDashboardCopy(language);

  const userStats = useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats'));
  const examAttempts = useQuery(
    qRef<{ limit?: number }, ExamAttempt[]>('user:getExamAttempts'),
    user ? { limit: 6 } : 'skip'
  );
  const podcastHistory = useQuery(
    qRef<NoArgs, PodcastHistoryItem[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );
  const podcastTrending = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));
  const newsFeed = useQuery(NEWS.getUserFeed, { newsLimit: 3, articleLimit: 3 });
  const pictureBooks = useQuery(READING_BOOKS.listPublishedBooks, {});
  const topikGrammarList = useQuery(
    GRAMMARS.getByCourse,
    user ? { courseId: TOPIK_GRAMMAR_COURSE_ID, language } : 'skip'
  );

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
  const activeLearning = Math.max(
    stats.vocabStats.total - stats.vocabStats.mastered - dueReviews,
    0
  );
  const freshInput = Math.max(stats.todayWordsStudied, 0);
  const segmentTotal = Math.max(freshInput + activeLearning + dueReviews, 1);
  const distributionItems = [
    {
      label: copy.distributionLabels[0],
      value: freshInput,
      width: clampPercentage((freshInput / segmentTotal) * 100),
      className: 'bg-slate-500 rounded-l-full',
    },
    {
      label: copy.distributionLabels[1],
      value: activeLearning,
      width: clampPercentage((activeLearning / segmentTotal) * 100),
      className: 'bg-slate-300',
    },
    {
      label: copy.distributionLabels[2],
      value: dueReviews,
      width: clampPercentage((dueReviews / segmentTotal) * 100),
      className: 'flex-1 bg-white rounded-r-full shadow-[0_0_10px_0_rgba(255,255,255,0.4)]',
    },
  ];
  const topikGrammarInstitute = useMemo(
    () => institutes?.find(item => item.id === TOPIK_GRAMMAR_COURSE_ID),
    [institutes]
  );
  const topikGrammarTitle = getInstituteLocalizedName(topikGrammarInstitute, language);
  const topikGrammarBadge = getInstituteLevelBadge(topikGrammarInstitute, language);
  const topikGrammarPath = `/course/${TOPIK_GRAMMAR_COURSE_ID}/grammar`;
  const featuredTopikGrammar = useMemo(() => {
    const grammars = topikGrammarList ?? [];
    const learningGrammar = grammars.find(item => item.status === 'LEARNING');
    if (learningGrammar) {
      return learningGrammar;
    }

    const learnedGrammars = grammars.filter(
      item => item.status === 'MASTERED' || item.status === 'LEARNING'
    );
    if (learnedGrammars.length > 0) {
      return learnedGrammars[learnedGrammars.length - 1];
    }

    return null;
  }, [topikGrammarList]);
  const hasTopikGrammarHistory = useMemo(
    () =>
      (topikGrammarList ?? []).some(
        item => item.status === 'MASTERED' || item.status === 'LEARNING'
      ),
    [topikGrammarList]
  );
  const topikGrammarHeadline = hasTopikGrammarHistory
    ? getGrammarLocalizedTitle(featuredTopikGrammar, language) || topikGrammarTitle
    : copy.topikGrammarStartTitle;
  const topikGrammarSubline = hasTopikGrammarHistory
    ? copy.topikGrammarMeta
    : copy.topikGrammarStartMeta;

  const recentScores = useMemo(() => buildTrendValues(examAttempts ?? []), [examAttempts]);
  const latestScore = recentScores[recentScores.length - 1] ?? 0;
  const dashboardPath = `${location.pathname}${location.search}`;
  const latestPodcast = podcastHistory?.[0];
  const trendingChannel = podcastTrending?.internal[0] ?? podcastTrending?.external[0] ?? null;
  const featuredNews = newsFeed?.news[0] ?? newsFeed?.articles[0] ?? null;
  const featuredBook = pictureBooks?.[0] ?? null;
  const bookLevelValue = Number.parseInt(featuredBook?.levelLabel?.match(/(\d+)/)?.[1] ?? '0', 10);
  const bookProgress = bookLevelValue > 0 ? clampPercentage((bookLevelValue / 6) * 100) : 35;
  const streakIndicators = getStreakIndicators(stats.streak);
  const avatarSource = user?.avatar || '/logo.png';

  const handleOpenPodcast = () => {
    if (latestPodcast) {
      navigate(`/podcasts/player?returnTo=${encodeURIComponent(dashboardPath)}`, {
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

    if (trendingChannel) {
      navigate(buildPodcastChannelPath(trendingChannel, dashboardPath), {
        state: { channel: trendingChannel },
      });
      return;
    }

    navigate('/podcasts');
  };

  const handleOpenReading = () => {
    if (featuredNews) {
      navigate(buildReadingArticlePath(featuredNews._id, dashboardPath));
      return;
    }
    if (featuredBook) {
      navigate(buildPictureBookPath(featuredBook.slug, dashboardPath));
      return;
    }
    navigate('/reading');
  };

  const readingTitle = featuredNews?.title || featuredBook?.title || copy.readingFallback;
  const readingMeta = featuredNews
    ? `${resolveDifficultyLabel(featuredNews.difficultyLevel, language)} · ${formatSafeDateLabel(
        featuredNews.publishedAt,
        locale,
        '—',
        { month: 'short', day: 'numeric' }
      )}`
    : featuredBook
      ? `${featuredBook.levelLabel || copy.readingMetaLabel} · ${featuredBook.pageCount} ${copy.pagesUnit}`
      : copy.readingMetaLabel;
  const readingProgress = featuredNews
    ? clampPercentage(
        Math.max(25, Math.min(100, Math.round((featuredNews.bodyText.length / 1200) * 100)))
      )
    : bookProgress;

  return (
    <div
      className="min-h-[100dvh] pb-mobile-nav text-slate-900"
      style={{
        backgroundColor: '#E6E7E9',
        backgroundImage: NOISE_BACKGROUND,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "SF Pro Display", sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <header className="sticky top-0 z-30 flex items-end justify-between px-6 pb-6 pt-[calc(env(safe-area-inset-top)+20px)] backdrop-blur-[40px] border-b border-white/40 bg-[rgba(230,231,233,0.68)]">
        <div>
          <p className="mb-1.5 text-[10px] font-black tracking-[0.2em] text-slate-500">
            {copy.studioLabel}
          </p>
          <h1 className="text-3xl font-black leading-none tracking-tight text-slate-900">
            {copy.pageTitle}
          </h1>
        </div>

        <div className="flex flex-col items-end space-y-2.5">
          <div className="flex items-center space-x-2 opacity-80">
            <span className="text-[10px] font-black tracking-widest text-slate-400">
              {copy.streakLabel}
            </span>
            <div className="flex space-x-1">
              {streakIndicators.map((active, index) => (
                <span
                  key={`${active ? 'active' : 'idle'}-${index}`}
                  className={`rounded-full ${
                    active ? 'h-1.5 w-1.5 bg-slate-900' : 'h-1.5 w-1 bg-slate-300'
                  }`}
                />
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="h-10 w-10 overflow-hidden rounded-full border border-white bg-white shadow-[0_2px_12px_rgba(0,0,0,0.1)]"
            aria-label={t('nav.profile', { defaultValue: 'Profile' })}
          >
            <img
              src={avatarSource}
              alt={user?.name ?? 'User'}
              className="h-full w-full object-cover"
            />
          </button>
        </div>
      </header>

      <main className="space-y-4 px-5 pt-3">
        <button
          type="button"
          onClick={() => navigate('/vocab-book')}
          className="relative w-full overflow-hidden rounded-[2.5rem] p-8 text-left text-white transition-transform duration-300 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(160deg, #2A2D33 0%, #0F0F10 100%)',
            boxShadow:
              '0 32px 64px -16px rgba(0,0,0,0.4), inset 0 1px 1px rgba(186, 218, 255, 0.15), inset 0 0 0 1px rgba(255,255,255,0.06)',
          }}
        >
          <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-500/15 blur-3xl" />

          <div className="relative z-10 mb-8 flex items-start justify-between">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 shadow-inner">
              <BookOpen className="h-5 w-5 text-white/80" />
            </div>
            <div className="flex items-center space-x-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
              <span className="text-[10px] font-black tracking-widest text-white/80">
                {copy.heroBadge}
              </span>
            </div>
          </div>

          <div className="relative z-10">
            <p className="mb-3 text-[11px] font-black tracking-[0.18em] text-white/45">
              {copy.heroStatus}
            </p>
            <div className="mb-1 text-6xl font-black leading-none tracking-tighter">
              {dueReviews}
            </div>
            <p className="mb-3 text-sm font-bold text-white/90">{copy.heroTitle}</p>
            <p className="mb-10 max-w-[18rem] text-xs font-medium tracking-wide text-white/45">
              {copy.heroSubtitle}
            </p>
          </div>

          <div className="relative z-10 mb-7 px-1">
            <div className="mb-2.5 flex justify-between text-[10px] font-bold tracking-wider text-white/40">
              {distributionItems.map(item => (
                <span key={item.label}>
                  {item.label} <span className="text-white/75">{item.value}</span>
                </span>
              ))}
            </div>
            <div className="flex h-1.5 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
              {distributionItems.map(item => (
                <div
                  key={`${item.label}-${item.value}`}
                  className={item.className}
                  style={{ width: `${item.width}%` }}
                />
              ))}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between rounded-2xl bg-white px-5 py-4 text-slate-900 shadow-[0_12px_24px_-8px_rgba(255,255,255,0.4)]">
            <span className="text-sm font-bold">{copy.heroAction}</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </button>

        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => navigate(topikGrammarPath)}
            className="relative flex h-48 flex-col justify-between overflow-hidden rounded-[2rem] p-6 text-left text-white transition-transform duration-300 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(150deg, #576359 0%, #404942 100%)',
              boxShadow:
                '0 24px 48px -12px rgba(64, 73, 66, 0.3), inset 0 1px 1px rgba(230, 255, 235, 0.15), inset 0 0 0 1px rgba(255,255,255,0.06)',
            }}
          >
            <div className="pointer-events-none absolute -bottom-4 -right-3 text-8xl opacity-[0.04]">
              <Sparkles />
            </div>

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] border border-white/10 bg-white/5">
                <Sparkles className="h-4 w-4 text-white/80" />
              </div>
              <span className="text-[10px] font-black tracking-widest text-white/50">
                {topikGrammarBadge}
              </span>
            </div>

            <div className="relative z-10">
              <p className="mb-1.5 text-[10px] font-bold tracking-widest text-white/50">
                {hasTopikGrammarHistory ? copy.topikGrammarLead : copy.nextLearningLabel}
              </p>
              <p className="line-clamp-2 text-xl font-black leading-tight tracking-tight">
                {topikGrammarHeadline}
              </p>
              <p className="mt-2 text-[11px] font-semibold tracking-wide text-white/70">
                {topikGrammarSubline}
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/topik')}
            className="relative flex h-48 flex-col justify-between rounded-[2rem] p-6 text-left text-white transition-transform duration-300 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #A8A096 0%, #8A8177 100%)',
              boxShadow:
                '0 16px 32px -8px rgba(138, 129, 119, 0.25), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.08)',
              border: '1px solid rgba(0,0,0,0.05)',
            }}
          >
            <div className="pointer-events-none absolute inset-0 m-auto h-32 w-32 rounded-full bg-white/5 blur-3xl" />

            <div className="relative z-10 flex items-start justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-[0.8rem] bg-slate-900 shadow-md">
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div className="rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-[10px] font-black tracking-widest text-rose-600 shadow-sm">
                {language.startsWith('zh')
                  ? `已做 ${examAttempts?.length ?? 0}`
                  : `${examAttempts?.length ?? 0} done`}
              </div>
            </div>

            <div className="relative z-10">
              <h3 className="mb-0.5 text-[12px] font-black tracking-widest text-slate-100">
                {copy.topikLabel}
              </h3>
              <p className="mb-3.5 text-[10px] font-medium tracking-wide text-slate-200">
                {recentScores.length > 0 ? `${copy.topikMeta} · ${latestScore}%` : copy.topikMeta}
              </p>
              <div className="h-10 w-full">
                <HomeSparkline values={recentScores} />
              </div>
            </div>
          </button>
        </div>

        <section className="pt-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <h3 className="text-[11px] font-black tracking-[0.2em] text-slate-400">
              {copy.exploreLabel}
            </h3>
            <button
              type="button"
              onClick={() => navigate('/media')}
              className="text-slate-300 transition-colors active:scale-90"
              aria-label={t('common.filter', { defaultValue: 'Filter' })}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOpenPodcast}
              className="flex w-full items-center space-x-4 rounded-[1.5rem] p-3 text-left text-white transition-transform duration-300 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7A8D9A 0%, #61717A 100%)',
                boxShadow:
                  '0 16px 32px -8px rgba(97, 113, 122, 0.25), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1.2rem] border border-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.1)]">
                {latestPodcast?.channelImage ||
                trendingChannel?.artworkUrl ||
                trendingChannel?.artwork ? (
                  <img
                    src={
                      latestPodcast?.channelImage ||
                      trendingChannel?.artworkUrl ||
                      trendingChannel?.artwork
                    }
                    alt={latestPodcast?.channelName || trendingChannel?.title || 'Podcast'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-white/10">
                    <Headphones className="h-6 w-6 text-white/80" />
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/15 backdrop-blur-[1px]">
                  <Play
                    className="ml-0.5 h-4 w-4 text-white opacity-90 drop-shadow-md"
                    fill="currentColor"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <div className="mb-1 flex items-center space-x-1.5">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)]" />
                  <p className="text-[10px] font-black tracking-[0.1em] text-rose-50">
                    {latestPodcast ? copy.podcastLive : copy.podcastFallback}
                  </p>
                </div>
                <h4 className="truncate text-sm font-bold tracking-wide text-white">
                  {latestPodcast?.episodeTitle || trendingChannel?.title || copy.podcastFallback}
                </h4>
                <p className="mt-1 text-[10px] font-medium tracking-wider text-slate-200 opacity-80">
                  {latestPodcast
                    ? `${latestPodcast.channelName} • ${formatSafeDateLabel(
                        latestPodcast.playedAt,
                        locale,
                        '—',
                        {
                          month: 'short',
                          day: 'numeric',
                        }
                      )}`
                    : trendingChannel?.author ||
                      t('dashboard.podcast.label', { defaultValue: 'Podcast' })}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenReading}
              className="flex w-full items-center space-x-4 rounded-[1.5rem] p-3 text-left text-white transition-transform duration-300 active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #7A8D9A 0%, #61717A 100%)',
                boxShadow:
                  '0 16px 32px -8px rgba(97, 113, 122, 0.25), inset 0 1px 1px rgba(255,255,255,0.2), inset 0 0 0 1px rgba(255,255,255,0.08)',
                border: '1px solid rgba(0,0,0,0.05)',
              }}
            >
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[1.2rem] border border-white/10 bg-white/5 shadow-inner">
                {featuredBook?.coverImageUrl ? (
                  <img
                    src={featuredBook.coverImageUrl}
                    alt={featuredBook.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <BookOpen className="h-6 w-6 text-white/60" />
                )}
              </div>

              <div className="min-w-0 flex-1 pr-3">
                <h4 className="mb-1 truncate text-sm font-bold tracking-wide text-white">
                  {readingTitle}
                </h4>
                <p className="text-[10px] font-medium tracking-wider text-slate-200 opacity-80">
                  {readingMeta}
                </p>
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full border border-white/5 bg-white/5">
                  <div
                    className="h-full rounded-full bg-white shadow-[0_0_10px_0_rgba(255,255,255,0.4)]"
                    style={{ width: `${readingProgress}%` }}
                  />
                </div>
              </div>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};
