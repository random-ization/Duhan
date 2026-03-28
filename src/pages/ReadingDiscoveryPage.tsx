import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ChevronRight, Clock3, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useSearchParams } from 'react-router-dom';
import { NEWS, READING_BOOKS } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';
import { PictureBookShelf } from '../components/reading/PictureBookShelf';
import { cn } from '../lib/utils';
import type { PictureBook } from '../types';
import { buildPictureBookPath, buildReadingArticlePath } from '../utils/readingRoutes';
import { formatReadingRelativeTime, getReadingSourceLabel } from '../utils/readingMetadata';
import {
  buildReadingDiscoveryPath,
  normalizeReadingDifficultyFilter,
  resolvePictureBookLevelFilter,
} from '../utils/readingDiscoveryFilters';

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

type CuratedArticle = {
  id: string;
  source: string;
  sourceType: string;
  icon: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  badge: string;
  bookmarkText: string;
  tone: 'default' | 'warm' | 'dark';
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

function formatRelativeTime(publishedAt: number, language: string) {
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
    language === 'zh'
      ? '最近更新'
      : language === 'vi'
        ? 'Mới cập nhật'
        : language === 'mn'
          ? 'Саяхан шинэчлэгдсэн'
          : 'Recently updated'
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
            {formatRelativeTime(featuredNews.publishedAt, language)}
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
          {formatRelativeTime(item.publishedAt, language)}
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

type CardTone = 'default' | 'warm' | 'dark';

function getCardToneStyles(tone: CardTone) {
  if (tone === 'dark') {
    return {
      baseClass: 'border-border bg-gradient-to-br from-foreground to-foreground/90 text-background',
      titleClass: 'text-background',
      textClass: 'text-background/80',
      badgeClass: 'border-background/25 bg-background/10 text-background',
      sourceTypeClass: 'text-background/85',
      sourceClass: 'text-background/75',
      iconClass: 'border border-background/30 bg-background/10',
      borderClass: 'border-background/20',
      bookmarkClass: 'text-background/80',
    };
  }
  if (tone === 'warm') {
    return {
      baseClass:
        'border-orange-100 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-orange-900/60 dark:from-orange-950/35 dark:to-amber-950/25',
      titleClass: 'text-foreground group-hover:text-orange-600 dark:group-hover:text-orange-300',
      textClass: 'text-muted-foreground',
      badgeClass:
        'border-orange-200 bg-orange-100/70 text-orange-700 dark:border-orange-900/70 dark:bg-orange-950/45 dark:text-orange-300',
      sourceTypeClass: 'text-muted-foreground',
      sourceClass: 'text-muted-foreground',
      iconClass: 'bg-card',
      borderClass: 'border-border/70',
      bookmarkClass: 'text-muted-foreground',
    };
  }
  return {
    baseClass: 'bg-card border-border',
    titleClass: 'text-foreground group-hover:text-primary',
    textClass: 'text-muted-foreground',
    badgeClass:
      'border-blue-200 bg-blue-100/60 text-blue-700 dark:border-blue-900 dark:bg-blue-950/45 dark:text-blue-300',
    sourceTypeClass: 'text-muted-foreground',
    sourceClass: 'text-muted-foreground',
    iconClass: 'bg-card',
    borderClass: 'border-border/70',
    bookmarkClass: 'text-muted-foreground',
  };
}

function getToneFromIndex(index: number): CardTone {
  const tone = index % 3;
  if (tone === 2) return 'dark';
  if (tone === 1) return 'warm';
  return 'default';
}

const ArticleNewsCard: React.FC<{
  item: NewsItem;
  tone: CardTone;
  t: DifficultyTranslator;
  onOpen: (id: string) => void;
}> = ({ item, tone, t, onOpen }) => {
  const styles = getCardToneStyles(tone);
  const sourceTypeText = item.section || '위키백과 알찬 글';
  return (
    <Button
      key={item._id}
      type="button"
      variant="ghost"
      size="auto"
      onClick={() => onOpen(item._id)}
      className={`group !flex !items-stretch !justify-start h-full flex-col rounded-3xl border-2 p-6 text-left transition hover:-translate-y-1 hover:shadow-pop-sm ${styles.baseClass}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full text-xl ${styles.iconClass}`}
        >
          🏛️
        </div>
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${styles.sourceClass}`}>
            {t('readingDiscovery.articles.sourceWikipedia', {
              defaultValue: 'Wikipedia',
            })}
          </div>
          <div className={`text-sm font-bold ${styles.sourceTypeClass}`}>{sourceTypeText}</div>
        </div>
      </div>
      <h3 className={`mb-3 text-2xl font-black tracking-tight transition ${styles.titleClass}`}>
        {item.title}
      </h3>
      <p className={`mb-6 line-clamp-3 text-sm leading-relaxed ${styles.textClass}`}>
        {(item.summary || item.bodyText || '').slice(0, 160)}
      </p>
      <div
        className={`mt-auto flex items-center justify-between border-t pt-4 ${styles.borderClass}`}
      >
        <span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${styles.badgeClass}`}>
          {getDifficultyChip(item.difficultyLevel, t).text} •{' '}
          {t('readingDiscovery.articles.typeEncyclopedia', {
            defaultValue: 'Encyclopedia',
          })}
        </span>
        <span className={`text-xs font-semibold ${styles.bookmarkClass}`}>
          🔖 {t('readingDiscovery.articles.recommended', { defaultValue: 'Recommended' })}
        </span>
      </div>
    </Button>
  );
};

const CuratedArticleCard: React.FC<{ item: CuratedArticle; onOpen?: (id: string) => void }> = ({
  item,
  onOpen,
}) => {
  const styles = getCardToneStyles(item.tone);
  const content = (
    <>
      <div className="mb-4 flex items-center gap-3">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full text-xl ${styles.iconClass}`}
        >
          {item.icon}
        </div>
        <div>
          <div className={`text-[11px] font-bold uppercase tracking-wider ${styles.sourceClass}`}>
            {item.source}
          </div>
          <div className={`text-sm font-bold ${styles.sourceTypeClass}`}>{item.sourceType}</div>
        </div>
      </div>
      <h3 className={`mb-3 text-2xl font-black tracking-tight transition ${styles.titleClass}`}>
        {item.title}
        {item.subtitle ? (
          <span className={`mt-1 block text-lg font-bold ${styles.sourceTypeClass}`}>
            ({item.subtitle})
          </span>
        ) : null}
      </h3>
      <p className={`mb-6 line-clamp-3 text-sm leading-relaxed ${styles.textClass}`}>
        {item.excerpt}
      </p>
      <div
        className={`mt-auto flex items-center justify-between border-t pt-4 ${styles.borderClass}`}
      >
        <span className={`rounded-md border px-2.5 py-1 text-xs font-bold ${styles.badgeClass}`}>
          {item.badge}
        </span>
        <span className={`text-xs font-semibold ${styles.bookmarkClass}`}>
          🔖 {item.bookmarkText}
        </span>
      </div>
    </>
  );

  if (!onOpen) {
    return (
      <div className={`flex h-full flex-col rounded-3xl border p-6 ${styles.baseClass}`}>
        {content}
      </div>
    );
  }

  return (
    <Button
      key={item.id}
      type="button"
      variant="ghost"
      size="auto"
      onClick={() => onOpen(item.id)}
      className={`group !flex h-full !items-stretch !justify-start flex-col rounded-3xl border p-6 text-left transition hover:-translate-y-1 hover:shadow-xl ${styles.baseClass}`}
    >
      {content}
    </Button>
  );
};

const ArchiveContent: React.FC<{
  feedReady: boolean;
  featuredArticles: NewsItem[] | undefined;
  curatedArticles: CuratedArticle[];
  t: DifficultyTranslator;
  onOpen: (id: string) => void;
  showAll: boolean;
}> = ({ feedReady, featuredArticles, curatedArticles, t, onOpen, showAll }) => {
  if (!feedReady || featuredArticles === undefined) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <div className="h-[260px] animate-pulse rounded-3xl bg-muted" />
        <div className="h-[260px] animate-pulse rounded-3xl bg-muted" />
        <div className="h-[260px] animate-pulse rounded-3xl bg-muted" />
      </div>
    );
  }

  if (featuredArticles.length > 0) {
    const visibleArticles = showAll ? featuredArticles : featuredArticles.slice(0, 6);
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleArticles.map((item, index) => (
          <ArticleNewsCard
            key={item._id}
            item={item}
            tone={getToneFromIndex(index)}
            t={t}
            onOpen={onOpen}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {curatedArticles.map(item => (
        <CuratedArticleCard key={item.id} item={item} />
      ))}
    </div>
  );
};

export default function ReadingDiscoveryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const language = resolveFeedLanguage(i18n.language);
  const userId = user?.id;
  const [feedReady, setFeedReady] = useState<boolean>(() => !userId);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string>('');
  const [showAllArchiveArticles, setShowAllArchiveArticles] = useState(false);
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
  const hasExpandableArchive = (featuredArticles?.length ?? 0) > 6;
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
  const curatedArticles = useMemo<CuratedArticle[]>(
    () => [
      {
        id: 'wiki-hanok',
        source: 'Wikipedia',
        sourceType: t('readingDiscovery.fallback.wikipediaSource', {
          defaultValue: 'Korean Culture Encyclopedia',
        }),
        icon: '🏛️',
        title: '한옥',
        excerpt:
          '한옥은 한국의 전통 건축 양식으로 지어진 집을 말한다. 자연과의 조화를 중요하게 생각하며, 온돌과 마루가 있는 것이 특징이다...',
        badge: t('readingDiscovery.fallback.wikipediaBadge', {
          defaultValue: 'B2 Intermediate • Expository',
        }),
        bookmarkText: t('readingDiscovery.fallback.wikipediaBookmark', {
          defaultValue: 'Close Reading',
        }),
        tone: 'default',
      },
      {
        id: 'folktale-sun-moon',
        source: 'Folktale',
        sourceType: t('readingDiscovery.fallback.folktaleSource', {
          defaultValue: 'Korean Traditional Folktale',
        }),
        icon: '🦊',
        title: '해와 달이 된 오누이',
        subtitle: t('readingDiscovery.fallback.folktaleSubtitle', {
          defaultValue: 'Siblings Who Became the Sun and Moon',
        }),
        excerpt:
          '옛날 옛적에, 홀어머니와 오누이가 살고 있었어요. 어느 날 고개를 넘던 어머니는 무서운 호랑이를 만나고 말았답니다...',
        badge: t('readingDiscovery.fallback.folktaleBadge', {
          defaultValue: 'A1 Beginner • Narrative',
        }),
        bookmarkText: t('readingDiscovery.fallback.folktaleBookmark', {
          defaultValue: 'Bedtime Reading',
        }),
        tone: 'warm',
      },
      {
        id: 'poem-seosi',
        source: 'Literature',
        sourceType: t('readingDiscovery.fallback.literatureSource', {
          defaultValue: 'Public Domain Classics',
        }),
        icon: '✍️',
        title: '서시',
        subtitle: '윤동주',
        excerpt:
          '죽는 날까지 하늘을 우러러 한 점 부끄럼이 없기를, 잎새에 이는 바람에도 나는 괴로워했다...',
        badge: t('readingDiscovery.fallback.literatureBadge', {
          defaultValue: 'C2 Near-Native • Poetry',
        }),
        bookmarkText: t('readingDiscovery.fallback.literatureBookmark', {
          defaultValue: 'Literary Notes',
        }),
        tone: 'dark',
      },
    ],
    [t]
  );

  return (
    <div className="mx-auto w-full max-w-[1400px] px-2 pb-16 pt-4 sm:px-4 lg:px-6">
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
            {t('readingDiscovery.title', { defaultValue: 'Reading Discovery' })}
          </h1>
          <p className="mt-2 text-sm font-medium text-muted-foreground md:text-base">
            {t('readingDiscovery.subtitle', {
              defaultValue: 'Sync real Korean news and build a long-term reading library',
            })}
          </p>
        </div>
        <div className="flex items-center gap-6 rounded-2xl border border-border bg-card px-5 py-3 shadow-sm">
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('readingDiscovery.stats.weeklyRead', { defaultValue: 'Fresh this week' })}
            </span>
            <span className="text-xl font-black text-muted-foreground">
              {weeklyReadCount}{' '}
              <span className="text-sm font-medium text-muted-foreground">
                {t('readingDiscovery.stats.articles', { defaultValue: 'articles' })}
              </span>
            </span>
          </div>
          <div className="h-8 w-px bg-muted" />
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {t('readingDiscovery.stats.estimatedWords', { defaultValue: 'Estimated new words' })}
            </span>
            <span className="text-xl font-black text-primary">
              {estimatedWords}{' '}
              <span className="text-sm font-medium text-muted-foreground">
                {t('readingDiscovery.stats.words', { defaultValue: 'words' })}
              </span>
            </span>
          </div>
        </div>
      </div>

      <section className="mb-14">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">
              🎨 {t('readingDiscovery.pictureBooks.title', { defaultValue: 'Picture Books' })}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {t('readingDiscovery.pictureBooks.subtitle', {
                defaultValue:
                  'Open a storybook, listen line by line, and follow sentence-level highlighting.',
              })}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-4 py-2 text-xs font-bold text-muted-foreground">
            {pictureBooks?.length ?? 0}/{pictureBooks?.length ?? 0}{' '}
            {t('readingDiscovery.pictureBooks.count', { defaultValue: 'books ready' })}
          </div>
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {pictureBookLevelOptions.map(option => (
            <Button
              key={option.value}
              type="button"
              variant="ghost"
              onClick={() => updateFilterParams({ level: option.value })}
              className={cn(
                'shrink-0 rounded-full border px-4 py-2 text-left transition',
                pictureBookLevelFilter === option.value
                  ? 'border-foreground/20 bg-foreground text-background shadow-sm'
                  : 'border-border bg-card/80 text-foreground hover:border-foreground/15'
              )}
            >
              <div className="flex min-w-[128px] items-center justify-between gap-3">
                <div className="text-sm font-black">{option.label}</div>
                <div
                  className={cn(
                    'inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-black',
                    pictureBookLevelFilter === option.value
                      ? 'bg-background/15 text-background'
                      : 'bg-muted text-foreground'
                  )}
                >
                  {option.count}
                </div>
              </div>
            </Button>
          ))}
        </div>

        <PictureBookShelf
          books={filteredPictureBooks}
          loading={pictureBooks === undefined}
          onOpen={slug => navigate(buildPictureBookPath(slug, currentPath))}
          emptyStateText={t('readingDiscovery.pictureBooks.emptyFiltered', {
            defaultValue: '这个等级下还没有可阅读的画册。左右滑动切换别的等级试试。',
          })}
        />
      </section>

      <div className="mb-14 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <section className="mb-14">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-foreground">
              <span>📰 {t('readingDiscovery.news.title', { defaultValue: 'Live News' })}</span>
              <span className="animate-pulse rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:bg-red-950/50 dark:text-red-300">
                LIVE
              </span>
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {t('readingDiscovery.news.subtitle', {
                defaultValue:
                  'Auto-ingested by RSS, great for extensive reading and current affairs',
              })}
            </p>
            {refreshMessage && (
              <p className="mt-2 text-xs font-semibold text-primary">{refreshMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {userId && (
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => {
                  void onManualRefresh();
                }}
                disabled={manualRefreshing || (feed?.refresh.manualRefreshRemaining ?? 0) <= 0}
                loading={manualRefreshing}
                loadingText={
                  <>
                    {t('readingDiscovery.news.manualRefresh', { defaultValue: 'Refresh' })}
                    <span className="text-[11px]">
                      {feed?.refresh.manualRefreshRemaining ?? 0}/3
                    </span>
                  </>
                }
                loadingIconClassName="w-[13px] h-[13px]"
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  manualRefreshing || (feed?.refresh.manualRefreshRemaining ?? 0) <= 0
                    ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                    : 'border-primary/35 bg-primary/10 text-primary hover:border-primary/50 dark:border-primary/50 dark:bg-primary/20 dark:text-primary-foreground'
                }`}
              >
                <RefreshCcw size={13} className={manualRefreshing ? 'animate-spin' : ''} />
                {t('readingDiscovery.news.manualRefresh', { defaultValue: 'Refresh' })}
                <span className="text-[11px]">{feed?.refresh.manualRefreshRemaining ?? 0}/3</span>
              </Button>
            )}
            <DifficultyFilterButtons
              difficultyFilter={difficultyFilter}
              onSelect={item => updateFilterParams({ difficulty: item })}
              t={t}
            />
          </div>
        </div>
        <LiveNewsContent
          feedReady={feedReady}
          feed={feed}
          topNews={topNews}
          featuredNews={featuredNews}
          secondaryNews={secondaryNews}
          language={language}
          t={t}
          onOpen={id => navigate(buildReadingArticlePath(id, currentPath))}
        />
      </section>

      <div className="mb-14 h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />

      <section>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-foreground">
              📚 {t('readingDiscovery.articles.title', { defaultValue: 'Culture & Archive' })}
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {t('readingDiscovery.articles.subtitle', {
                defaultValue:
                  'Korean folktales, Wikipedia featured entries, and literature for close reading',
              })}
            </p>
          </div>
          {hasExpandableArchive ? (
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setShowAllArchiveArticles(current => !current)}
              className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:text-primary/80"
            >
              {showAllArchiveArticles
                ? t('readingDiscovery.articles.showLess', { defaultValue: 'Show less' })
                : t('readingDiscovery.articles.viewAll', { defaultValue: 'View all articles' })}
              <ChevronRight
                size={16}
                className={cn('transition-transform', showAllArchiveArticles && 'rotate-90')}
              />
            </Button>
          ) : null}
        </div>

        <ArchiveContent
          feedReady={feedReady}
          featuredArticles={featuredArticles}
          curatedArticles={curatedArticles}
          t={t}
          onOpen={id => navigate(buildReadingArticlePath(id, currentPath))}
          showAll={showAllArchiveArticles}
        />
      </section>

      <div className="mt-10 flex items-center justify-end gap-2 text-xs font-semibold text-muted-foreground">
        <Clock3 size={14} />
        {t('readingDiscovery.footer', {
          defaultValue:
            'Powered by Convex `newsIngestion:getUserFeed` (auto refresh after 24h post-read, manual refresh up to 3/day)',
        })}
      </div>
    </div>
  );
}
