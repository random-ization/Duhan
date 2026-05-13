import React, { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { ContentSkeleton } from '../components/common';
import { NEWS, READING_BOOKS } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';
import type { PictureBook } from '../types';
import {
  buildEpubLibraryPath,
  buildPictureBookPath,
  buildReadingArticlePath,
} from '../utils/readingRoutes';
import { formatReadingRelativeTime, getReadingSourceLabel } from '../utils/readingMetadata';
import {
  buildReadingDiscoveryPath,
  normalizeReadingDifficultyFilter,
  resolvePictureBookLevelFilter,
} from '../utils/readingDiscoveryFilters';
const LazyMobileMediaPage = lazy(() =>
  import('../components/mobile/MobileMediaPage').then(module => ({
    default: module.MobileMediaPage,
  }))
);
import DesktopReadingDiscoveryPage from './desktop/DesktopReadingDiscoveryPage';

type DifficultyFilter = 'ALL' | 'L1' | 'L2' | 'L3';

type NewsItem = {
  _id: string;
  sourceKey: string;
  sourceUrl: string;
  title: string;
  summary?: string;
  bodyText: string;
  section?: string;
  publishedAt: number;
  difficultyLevel: 'L1' | 'L2' | 'L3';
  difficultyScore: number;
};

type UserFeedData = {
  news: NewsItem[];
  articles: NewsItem[];
  refresh: {
    needsInitialization: boolean;
    hasReadSinceRefresh: boolean;
    autoRefreshEligible: boolean;
    nextAutoRefreshAt: number | null;
    manualRefreshLimit: number;
    manualRefreshUsed: number;
    manualRefreshRemaining: number;
    lastRefreshedAt: number | null;
    userScoped: boolean;
  };
};

type DifficultyTranslator = (key: string, options?: Record<string, unknown>) => string;
type PictureBookLevelFilter = string;

const PICTURE_BOOK_LEVEL_OPTIONS = ['1단계', '2단계', '3단계', '4단계', '5단계', '6단계'] as const;

function normalizePictureBookLevel(levelLabel?: string) {
  return levelLabel?.trim() || '';
}

function getPictureBookLevelSortOrder(level: string) {
  const match = level.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 999;
}

function getPictureBookLevelNumber(levelLabel?: string) {
  const match = levelLabel?.match(/(\d+)/);
  return match?.[1] ?? '';
}

function formatPictureBookLevelLabel(
  levelLabel: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const levelNumber = getPictureBookLevelNumber(levelLabel);
  if (!levelNumber) return levelLabel;
  return t('readingDiscovery.pictureBooks.levelBadge', {
    defaultValue: 'Level {{level}}',
    level: levelNumber,
  });
}

function getDifficultyChip(
  level: 'L1' | 'L2' | 'L3',
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (level === 'L1') {
    return {
      text: t('readingDiscovery.difficulty.l1', { defaultValue: 'A2 Beginner' }),
      className:
        'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
  }
  if (level === 'L2') {
    return {
      text: t('readingDiscovery.difficulty.l2', { defaultValue: 'B2 Intermediate' }),
      className:
        'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300',
    };
  }
  return {
    text: t('readingDiscovery.difficulty.l3', { defaultValue: 'C1 Advanced' }),
    className:
      'border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300',
  };
}

function formatRelativeTime(
  publishedAt: number,
  language: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const locale =
    language === 'zh'
      ? 'zh-CN'
      : language === 'vi'
        ? 'vi-VN'
        : language === 'mn'
          ? 'mn-MN'
          : 'en-US';
  return formatReadingRelativeTime(
    publishedAt,
    locale,
    t('readingDiscovery.news.recentlyUpdated', {
      defaultValue: 'Recently updated',
    })
  );
}

function estimateReadingMinutes(bodyText: string) {
  const length = bodyText?.length ?? 0;
  return Math.max(1, Math.round(length / 450));
}

function resolveFeedLanguage(language: string): 'zh' | 'en' | 'vi' | 'mn' {
  if (language === 'zh' || language === 'en' || language === 'vi' || language === 'mn') {
    return language;
  }
  return 'en';
}

function canAutoRefreshFeed(params: {
  feedReady: boolean;
  userId: string | undefined;
  eligible: boolean | undefined;
  isLocked: boolean;
}): boolean {
  return Boolean(params.feedReady && params.userId && params.eligible && !params.isLocked);
}

function getDifficultyFilterLabel(item: DifficultyFilter, t: DifficultyTranslator): string {
  if (item === 'ALL') return t('readingDiscovery.filters.all', { defaultValue: 'All' });
  if (item === 'L1') return t('readingDiscovery.filters.l1', { defaultValue: 'Beginner' });
  if (item === 'L2') return t('readingDiscovery.filters.l2', { defaultValue: 'Intermediate' });
  return t('readingDiscovery.filters.l3', { defaultValue: 'Advanced' });
}

const DifficultyFilterButtons: React.FC<{
  difficultyFilter: DifficultyFilter;
  onSelect: (item: DifficultyFilter) => void;
  t: DifficultyTranslator;
}> = ({ difficultyFilter, onSelect, t }) => (
  <>
    {(['ALL', 'L1', 'L2', 'L3'] as DifficultyFilter[]).map(item => {
      const selected = difficultyFilter === item;
      return (
        <Button
          key={item}
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => onSelect(item)}
          className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
            selected
              ? 'border-foreground bg-primary text-primary-foreground'
              : 'border-border bg-card text-muted-foreground hover:border-border'
          }`}
        >
          {getDifficultyFilterLabel(item, t)}
        </Button>
      );
    })}
  </>
);

const FeaturedNewsCard: React.FC<{
  featuredNews: NewsItem;
  language: string;
  t: DifficultyTranslator;
  onOpen: (id: string) => void;
}> = ({ featuredNews, language, t, onOpen }) => {
  const chip = getDifficultyChip(featuredNews.difficultyLevel, t);
  const preview = (featuredNews.summary || featuredNews.bodyText || '').trim().slice(0, 150);
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={() => onOpen(featuredNews._id)}
      className="group !flex !items-stretch !justify-start relative overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-br from-card via-card to-accent/35 p-7 text-left transition hover:-translate-y-1 hover:border-foreground/20 hover:shadow-pop"
    >
      <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute bottom-0 right-0 h-28 w-28 rounded-tl-[2.5rem] bg-accent/35" />
      <div className="relative z-10 flex h-full flex-col">
        <div className="mb-5 flex items-start justify-between gap-3">
          <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">
            {getReadingSourceLabel(
              featuredNews.sourceKey,
              t('readingDiscovery.sourceFallback', { defaultValue: 'Unknown source' })
            )}
          </span>
          <span className="text-xs font-semibold text-muted-foreground">
            {formatRelativeTime(featuredNews.publishedAt, language, t)}
          </span>
        </div>
        <span
          className={`mb-4 inline-flex w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${chip.className}`}
        >
          {chip.text}
        </span>
        <h3 className="mb-3 text-3xl font-black leading-tight text-foreground">
          {featuredNews.title}
        </h3>
        <p className="mb-8 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
          {preview || featuredNews.title}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <span>
              {t('readingDiscovery.news.aiExtracted', {
                defaultValue: 'AI extracted {{count}} words',
                count: Math.max(5, Math.round(featuredNews.bodyText.length / 95)),
              })}
            </span>
            <span>•</span>
            <span>
              {t('readingDiscovery.news.readingMinutes', {
                defaultValue: '~{{minutes}} min read',
                minutes: estimateReadingMinutes(featuredNews.bodyText),
              })}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-bold text-foreground">
            {t('readingDiscovery.articles.readNow', { defaultValue: 'Read now' })}
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Button>
  );
};

const SecondaryNewsCard: React.FC<{
  item: NewsItem;
  language: string;
  t: DifficultyTranslator;
  onOpen: (id: string) => void;
}> = ({ item, language, t, onOpen }) => {
  const chip = getDifficultyChip(item.difficultyLevel, t);
  const preview = (item.summary || item.bodyText || '').trim().slice(0, 100);
  return (
    <Button
      key={item._id}
      type="button"
      variant="ghost"
      size="auto"
      onClick={() => onOpen(item._id)}
      className="group !flex !items-stretch !justify-between relative flex-col rounded-3xl border-2 border-border bg-card p-6 text-left transition hover:-translate-y-1 hover:border-foreground/20 hover:shadow-pop-sm"
    >
      <div className="absolute right-4 top-4 rounded-full border border-border bg-muted p-1.5 text-muted-foreground transition-colors group-hover:bg-accent group-hover:text-foreground">
        <ChevronRight className="h-3.5 w-3.5" />
      </div>
      <div className="mb-5 flex items-start justify-between gap-2 pr-7">
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-bold text-foreground">
          {getReadingSourceLabel(
            item.sourceKey,
            t('readingDiscovery.sourceFallback', { defaultValue: 'Unknown source' })
          )}
        </span>
        <span className="text-xs font-semibold text-muted-foreground">
          {formatRelativeTime(item.publishedAt, language, t)}
        </span>
      </div>
      <div>
        <span className="mb-3 inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
          {chip.text}
        </span>
        <h3 className="mb-3 text-xl font-black leading-snug text-foreground">{item.title}</h3>
        <p className="mb-6 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {preview || item.title}
        </p>
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span>
            {t('readingDiscovery.news.aiExtracted', {
              defaultValue: 'AI extracted {{count}} words',
              count: Math.max(5, Math.round(item.bodyText.length / 95)),
            })}
          </span>
          <span>•</span>
          <span>
            {t('readingDiscovery.news.readingMinutes', {
              defaultValue: '~{{minutes}} min read',
              minutes: estimateReadingMinutes(item.bodyText),
            })}
          </span>
        </div>
      </div>
    </Button>
  );
};

const LiveNewsContent: React.FC<{
  feedReady: boolean;
  feed: UserFeedData | undefined;
  topNews: NewsItem[];
  featuredNews: NewsItem | undefined;
  secondaryNews: NewsItem[];
  language: string;
  t: DifficultyTranslator;
  onOpen: (id: string) => void;
}> = ({ feedReady, feed, topNews, featuredNews, secondaryNews, language, t, onOpen }) => {
  if (!feedReady || feed === undefined) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
        <div className="h-[280px] animate-pulse rounded-3xl bg-muted" />
        <div className="h-[280px] animate-pulse rounded-3xl bg-muted" />
        <div className="h-[280px] animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (topNews.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-card px-6 py-16 text-center text-sm font-semibold text-muted-foreground">
        {t('readingDiscovery.news.empty', {
          defaultValue: 'No news available yet. Please run ingestion from admin.',
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
      {featuredNews ? (
        <FeaturedNewsCard featuredNews={featuredNews} language={language} t={t} onOpen={onOpen} />
      ) : null}
      {secondaryNews.map(item => (
        <SecondaryNewsCard key={item._id} item={item} language={language} t={t} onOpen={onOpen} />
      ))}
    </div>
  );
};

export default function ReadingDiscoveryPage() {
  const { t, i18n } = useTranslation();
  const isMobile = useIsMobile();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const language = resolveFeedLanguage(i18n.language);
  const userId = user?.id;
  const [feedReady, setFeedReady] = useState<boolean>(() => !userId);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string>('');
  const autoRefreshLockRef = useRef(false);
  const pictureBooks = useQuery(READING_BOOKS.listPublishedBooks, {}) as PictureBook[] | undefined;
  const sortedPictureBooks = useMemo(() => {
    if (!pictureBooks) return undefined;

    return [...pictureBooks].sort((left, right) => {
      const levelOrderDiff =
        getPictureBookLevelSortOrder(normalizePictureBookLevel(left.levelLabel)) -
        getPictureBookLevelSortOrder(normalizePictureBookLevel(right.levelLabel));
      if (levelOrderDiff !== 0) return levelOrderDiff;

      const sourceBookDiff =
        (left.sourceBookId ?? Number.MAX_SAFE_INTEGER) -
        (right.sourceBookId ?? Number.MAX_SAFE_INTEGER);
      if (sourceBookDiff !== 0) return sourceBookDiff;

      return left.title.localeCompare(right.title, 'ko');
    });
  }, [pictureBooks]);
  const pictureBookLevelOptions = useMemo(() => {
    if (!sortedPictureBooks) return [];

    const counts = new Map<string, number>();
    for (const book of sortedPictureBooks) {
      const level = normalizePictureBookLevel(book.levelLabel);
      if (!level) continue;
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }

    return PICTURE_BOOK_LEVEL_OPTIONS.map(level => ({
      value: level,
      count: counts.get(level) ?? 0,
      label: formatPictureBookLevelLabel(level, t),
    }));
  }, [sortedPictureBooks, t]);
  const availablePictureBookLevels = useMemo(
    () => pictureBookLevelOptions.filter(option => option.count > 0).map(option => option.value),
    [pictureBookLevelOptions]
  );
  const difficultyFilter = normalizeReadingDifficultyFilter(searchParams.get('difficulty'));
  const pictureBookLevelFilter = resolvePictureBookLevelFilter({
    requestedLevel: searchParams.get('level'),
    availableLevels: availablePictureBookLevels,
    fallbackLevel: PICTURE_BOOK_LEVEL_OPTIONS[0],
  }) as PictureBookLevelFilter;
  const currentPath = useMemo(
    () =>
      buildReadingDiscoveryPath({
        pathname: location.pathname,
        difficultyFilter,
        pictureBookLevelFilter,
      }),
    [difficultyFilter, location.pathname, pictureBookLevelFilter]
  );
  const filteredPictureBooks = useMemo(() => {
    if (!sortedPictureBooks) return undefined;
    return sortedPictureBooks.filter(
      book => normalizePictureBookLevel(book.levelLabel) === pictureBookLevelFilter
    );
  }, [pictureBookLevelFilter, sortedPictureBooks]);
  const updateFilterParams = useCallback(
    (updates: Partial<{ difficulty: DifficultyFilter; level: string }>) => {
      const nextDifficulty = updates.difficulty ?? difficultyFilter;
      const nextLevel = updates.level ?? pictureBookLevelFilter;
      const nextPath = buildReadingDiscoveryPath({
        pathname: location.pathname,
        difficultyFilter: nextDifficulty,
        pictureBookLevelFilter: nextLevel,
      });
      const nextQuery = nextPath.includes('?') ? nextPath.slice(nextPath.indexOf('?') + 1) : '';
      setSearchParams(nextQuery);
    },
    [difficultyFilter, location.pathname, pictureBookLevelFilter, setSearchParams]
  );
  const ensureUserFeed = useMutation(NEWS.ensureUserFeed);
  const refreshUserFeedIfEligible = useMutation(NEWS.refreshUserFeedIfEligible);
  const manualRefreshUserFeed = useMutation(NEWS.manualRefreshUserFeed);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setFeedReady(true);
      return () => {
        cancelled = true;
      };
    }
    setFeedReady(false);
    setRefreshMessage('');
    void ensureUserFeed({ newsLimit: 24, articleLimit: 12 })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) {
          setFeedReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [ensureUserFeed, userId]);

  const feed = useQuery(
    NEWS.getUserFeed,
    feedReady ? { newsLimit: 24, articleLimit: 12 } : 'skip'
  ) as UserFeedData | undefined;

  useEffect(() => {
    if (
      !canAutoRefreshFeed({
        feedReady,
        userId,
        eligible: feed?.refresh.autoRefreshEligible,
        isLocked: autoRefreshLockRef.current,
      })
    )
      return;
    autoRefreshLockRef.current = true;
    void refreshUserFeedIfEligible({ newsLimit: 24, articleLimit: 12 })
      .then(result => {
        if (result?.refreshed) {
          setRefreshMessage(
            t('readingDiscovery.news.autoRefreshed', {
              defaultValue: 'Recommendations updated automatically based on your reading activity',
            })
          );
        }
      })
      .catch(() => undefined)
      .finally(() => {
        autoRefreshLockRef.current = false;
      });
  }, [feed?.refresh.autoRefreshEligible, feedReady, refreshUserFeedIfEligible, t, userId]);

  const onManualRefresh = async () => {
    if (!userId || manualRefreshing) return;
    setManualRefreshing(true);
    setRefreshMessage('');
    try {
      const result = await manualRefreshUserFeed({ newsLimit: 24, articleLimit: 12 });
      if (!result.refreshed) {
        setRefreshMessage(
          t('readingDiscovery.news.manualLimitReached', {
            defaultValue: 'Manual refresh limit reached for today (3 times)',
          })
        );
      } else {
        setRefreshMessage(
          t('readingDiscovery.news.manualRefreshed', {
            defaultValue: 'Refreshed. Remaining today: {{count}}',
            count: result.manualRefreshRemaining,
          })
        );
      }
    } catch {
      setRefreshMessage(
        t('readingDiscovery.news.manualRefreshFailed', {
          defaultValue: 'Refresh failed. Please try again later.',
        })
      );
    } finally {
      setManualRefreshing(false);
    }
  };

  const news = useMemo(() => feed?.news ?? [], [feed?.news]);
  const featuredArticles = feed?.articles;
  const filteredNews = useMemo(
    () =>
      difficultyFilter === 'ALL'
        ? news
        : news.filter(item => item.difficultyLevel === difficultyFilter),
    [difficultyFilter, news]
  );
  const topNews = useMemo(() => filteredNews.slice(0, 8), [filteredNews]);
  const featuredNews = topNews[0];
  const secondaryNews = topNews.slice(1, 3);
  const weeklyReadCount = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return news.filter(item => item.publishedAt >= sevenDaysAgo).length;
  }, [news]);
  const estimatedWords = useMemo(
    () =>
      topNews.slice(0, 5).reduce((sum, item) => {
        const tokenGuess = Math.max(5, Math.round((item.bodyText?.length ?? 0) / 85));
        return sum + tokenGuess;
      }, 0),
    [topNews]
  );
  const wikiArticles = useMemo(() => {
    const articles = featuredArticles ?? [];
    const wikiOnly = articles.filter(article => article.sourceKey === 'wiki_ko_featured');
    const source = wikiOnly.length > 0 ? wikiOnly : articles;
    return source.slice(0, 5).map(article => ({
      id: article._id,
      title: article.title,
      excerpt: (article.summary || article.bodyText || '').trim().slice(0, 220),
      publishedAt: article.publishedAt,
      sourceLabel:
        article.sourceKey === 'wiki_ko_featured'
          ? t('readingDiscovery.wikipedia.source', { defaultValue: 'Korean Wikipedia Featured' })
          : getReadingSourceLabel(article.sourceKey, language),
    }));
  }, [featuredArticles, language, t]);

  if (isMobile) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileMediaPage />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopReadingDiscoveryPage />
    </Suspense>
  );
}
