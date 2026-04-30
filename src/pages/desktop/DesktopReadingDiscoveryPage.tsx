import React from 'react';
import { ChevronRight, Clock3, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/ui';
import { PictureBookShelf } from '../../components/reading/PictureBookShelf';
import { ReadingDiscoverySection } from '../../components/reading/ReadingDiscoverySection';
import { cn } from '../../lib/utils';
import type { PictureBook } from '../../types';
import { buildPictureBookPath, buildReadingArticlePath, buildEpubLibraryPath } from '../../utils/readingRoutes';
import { formatReadingRelativeTime, getReadingSourceLabel } from '../../utils/readingMetadata';

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

interface DesktopReadingDiscoveryPageProps {
  t: DifficultyTranslator;
  language: string;
  weeklyReadCount: number;
  estimatedWords: number;
  pictureBooks: PictureBook[] | undefined;
  pictureBookLevelOptions: Array<{ value: string; count: number; label: string }>;
  pictureBookLevelFilter: string;
  filteredPictureBooks: PictureBook[] | undefined;
  feedReady: boolean;
  feed: UserFeedData | undefined;
  topNews: NewsItem[];
  featuredNews: NewsItem | undefined;
  secondaryNews: NewsItem[];
  wikiArticles: Array<{
    id: string;
    title: string;
    excerpt: string;
    publishedAt: number;
    sourceLabel: string;
  }>;
  userId: string | undefined;
  manualRefreshing: boolean;
  refreshMessage: string;
  difficultyFilter: DifficultyFilter;
  currentPath: string;
  updateFilterParams: (updates: Partial<{ difficulty: DifficultyFilter; level: string }>) => void;
  onManualRefresh: () => Promise<void>;
  navigate: (path: string) => void;
}

function getDifficultyChip(
  level: 'L1' | 'L2' | 'L3',
  t: DifficultyTranslator
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
  t: DifficultyTranslator
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

export const DesktopReadingDiscoveryPage: React.FC<DesktopReadingDiscoveryPageProps> = ({
  t,
  language,
  weeklyReadCount,
  estimatedWords,
  pictureBooks,
  pictureBookLevelOptions,
  pictureBookLevelFilter,
  filteredPictureBooks,
  feedReady,
  feed,
  topNews,
  featuredNews,
  secondaryNews,
  wikiArticles,
  userId,
  manualRefreshing,
  refreshMessage,
  difficultyFilter,
  currentPath,
  updateFilterParams,
  onManualRefresh,
  navigate,
}) => {
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
            defaultValue:
              'No picture books are available in this level yet. Swipe to another level.',
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
        <ReadingDiscoverySection
          wikiArticles={wikiArticles}
          wikiLoading={feedReady && feed?.articles === undefined}
          onViewWiki={id => navigate(buildReadingArticlePath(id, currentPath))}
          onViewBook={slug => navigate(buildEpubLibraryPath(slug, currentPath))}
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
};

export default DesktopReadingDiscoveryPage;
