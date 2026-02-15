import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { ChevronRight, Clock3, RefreshCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NEWS } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';

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

function getDifficultyChip(
  level: 'L1' | 'L2' | 'L3',
  t: (key: string, options?: Record<string, unknown>) => string
) {
  if (level === 'L1') {
    return {
      text: t('readingDiscovery.difficulty.l1', { defaultValue: 'A2 Beginner' }),
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (level === 'L2') {
    return {
      text: t('readingDiscovery.difficulty.l2', { defaultValue: 'B2 Intermediate' }),
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  return {
    text: t('readingDiscovery.difficulty.l3', { defaultValue: 'C1 Advanced' }),
    className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  };
}

function getSourceLabel(sourceKey: string) {
  const map: Record<string, string> = {
    khan: '경향신문',
    donga: '동아일보',
    hankyung: '한국경제',
    mk: '매일경제',
    itdonga: 'IT동아',
    voa_ko: 'VOA 한국어',
    naver_news_search: 'NAVER News',
    wiki_ko_featured: '위키백과 알찬 글',
  };
  return map[sourceKey] || sourceKey;
}

function formatRelativeTime(publishedAt: number, language: string) {
  const diffMs = Date.now() - publishedAt;
  const diffMinutes = Math.floor(diffMs / 60000);
  const locale =
    language === 'zh'
      ? 'zh-CN'
      : language === 'vi'
        ? 'vi-VN'
        : language === 'mn'
          ? 'mn-MN'
          : 'en-US';
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (diffMinutes < 1) return rtf.format(0, 'minute');
  if (diffMinutes < 60) return rtf.format(-diffMinutes, 'minute');
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return rtf.format(-diffHours, 'hour');
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return rtf.format(-diffDays, 'day');
  return new Date(publishedAt).toLocaleDateString(locale);
}

function estimateReadingMinutes(bodyText: string) {
  const length = bodyText?.length ?? 0;
  return Math.max(1, Math.round(length / 450));
}

export default function ReadingDiscoveryPage() {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const language =
    i18n.language === 'zh' ||
    i18n.language === 'en' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn'
      ? i18n.language
      : 'en';
  const userId = user?.id;
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>('ALL');
  const [feedReady, setFeedReady] = useState<boolean>(() => !userId);
  const [manualRefreshing, setManualRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState<string>('');
  const autoRefreshLockRef = useRef(false);
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
  ) as
    | {
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
      }
    | undefined;

  useEffect(() => {
    if (!feedReady || !userId || !feed?.refresh.autoRefreshEligible || autoRefreshLockRef.current)
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
  const curatedArticles = useMemo<CuratedArticle[]>(
    () => [
      {
        id: 'wiki-hanok',
        source: 'Wikipedia',
        sourceType: t('readingDiscovery.fallback.wikipediaSource', {
          defaultValue: 'Korean Culture Encyclopedia',
        }),
        icon: '🏛️',
        title: '한옥 (韩屋)',
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
        title: '서시 (序诗)',
        subtitle: '윤동주 (尹东柱)',
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
          <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl">
            {t('readingDiscovery.title', { defaultValue: 'Reading Discovery' })}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 md:text-base">
            {t('readingDiscovery.subtitle', {
              defaultValue: 'Sync real Korean news and build a long-term reading library',
            })}
          </p>
        </div>
        <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('readingDiscovery.stats.weeklyRead', { defaultValue: 'Fresh this week' })}
            </span>
            <span className="text-xl font-black text-slate-800">
              {weeklyReadCount}{' '}
              <span className="text-sm font-medium text-slate-400">
                {t('readingDiscovery.stats.articles', { defaultValue: 'articles' })}
              </span>
            </span>
          </div>
          <div className="h-8 w-px bg-slate-100" />
          <div className="flex flex-col">
            <span className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {t('readingDiscovery.stats.estimatedWords', { defaultValue: 'Estimated new words' })}
            </span>
            <span className="text-xl font-black text-indigo-600">
              {estimatedWords}{' '}
              <span className="text-sm font-medium text-slate-400">
                {t('readingDiscovery.stats.words', { defaultValue: 'words' })}
              </span>
            </span>
          </div>
        </div>
      </div>

      <section className="mb-14">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-black text-slate-900">
              <span>📰 {t('readingDiscovery.news.title', { defaultValue: 'Live News' })}</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600 animate-pulse">
                LIVE
              </span>
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {t('readingDiscovery.news.subtitle', {
                defaultValue:
                  'Auto-ingested by RSS, great for extensive reading and current affairs',
              })}
            </p>
            {refreshMessage && (
              <p className="mt-2 text-xs font-semibold text-blue-600">{refreshMessage}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {userId && (
              <button
                type="button"
                onClick={() => {
                  void onManualRefresh();
                }}
                disabled={manualRefreshing || (feed?.refresh.manualRefreshRemaining ?? 0) <= 0}
                className={`inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                  manualRefreshing || (feed?.refresh.manualRefreshRemaining ?? 0) <= 0
                    ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400'
                    : 'border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300'
                }`}
              >
                <RefreshCcw size={13} className={manualRefreshing ? 'animate-spin' : ''} />
                {t('readingDiscovery.news.manualRefresh', { defaultValue: 'Refresh' })}
                <span className="text-[11px]">{feed?.refresh.manualRefreshRemaining ?? 0}/3</span>
              </button>
            )}
            {(['ALL', 'L1', 'L2', 'L3'] as DifficultyFilter[]).map(item => {
              const selected = difficultyFilter === item;
              const label =
                item === 'ALL'
                  ? t('readingDiscovery.filters.all', { defaultValue: 'All' })
                  : item === 'L1'
                    ? t('readingDiscovery.filters.l1', { defaultValue: 'Beginner' })
                    : item === 'L2'
                      ? t('readingDiscovery.filters.l2', { defaultValue: 'Intermediate' })
                      : t('readingDiscovery.filters.l3', { defaultValue: 'Advanced' });
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficultyFilter(item)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {!feedReady || feed === undefined ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-[280px] animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : topNews.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center text-sm font-semibold text-slate-500">
            {t('readingDiscovery.news.empty', {
              defaultValue: 'No news available yet. Please run ingestion from admin.',
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr,1fr,1fr]">
            {featuredNews && (
              <button
                type="button"
                onClick={() => navigate(`/reading/${featuredNews._id}`)}
                className="group relative overflow-hidden rounded-3xl bg-slate-900 p-6 text-left transition hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/25 to-transparent" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="mb-16 flex items-start justify-between gap-2">
                    <span className="rounded-lg border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-white">
                      {getSourceLabel(featuredNews.sourceKey)}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {formatRelativeTime(featuredNews.publishedAt, language)}
                    </span>
                  </div>
                  <div>
                    {(() => {
                      const chip = getDifficultyChip(featuredNews.difficultyLevel, t);
                      return (
                        <span
                          className={`mb-3 inline-block rounded border px-2 py-1 text-[10px] font-bold ${chip.className}`}
                        >
                          {chip.text}
                        </span>
                      );
                    })()}
                    <h3 className="mb-3 text-2xl font-black leading-snug text-white transition group-hover:text-blue-200">
                      {featuredNews.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
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
                  </div>
                </div>
              </button>
            )}

            {secondaryNews.map(item => {
              const chip = getDifficultyChip(item.difficultyLevel, t);
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => navigate(`/reading/${item._id}`)}
                  className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-left transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <div className="mb-6 flex items-start justify-between">
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-700">
                      {getSourceLabel(item.sourceKey)}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {formatRelativeTime(item.publishedAt, language)}
                    </span>
                  </div>
                  <div>
                    <span className="mb-3 inline-block rounded border border-slate-200 bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">
                      {chip.text}
                    </span>
                    <h3 className="mb-3 text-lg font-black leading-snug text-slate-900 transition group-hover:text-indigo-600">
                      {item.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
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
                </button>
              );
            })}
          </div>
        )}
      </section>

      <div className="mb-14 h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      <section>
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">
              📚 {t('readingDiscovery.articles.title', { defaultValue: 'Culture & Archive' })}
            </h2>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {t('readingDiscovery.articles.subtitle', {
                defaultValue:
                  'Korean folktales, Wikipedia featured entries, and literature for close reading',
              })}
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-600 hover:text-blue-700"
          >
            {t('readingDiscovery.articles.viewAll', { defaultValue: 'View all articles' })}
            <ChevronRight size={16} />
          </button>
        </div>

        {!feedReady || featuredArticles === undefined ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-[260px] animate-pulse rounded-3xl bg-slate-200" />
            <div className="h-[260px] animate-pulse rounded-3xl bg-slate-100" />
            <div className="h-[260px] animate-pulse rounded-3xl bg-slate-100" />
          </div>
        ) : featuredArticles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {featuredArticles.slice(0, 6).map((item, index) => {
              const tone = index % 3;
              const baseClass =
                tone === 2
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : tone === 1
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100'
                    : 'bg-white border-slate-200';
              const titleClass =
                tone === 2
                  ? 'text-white group-hover:text-indigo-300'
                  : tone === 1
                    ? 'text-slate-900 group-hover:text-orange-600'
                    : 'text-slate-900 group-hover:text-blue-600';
              const textClass = tone === 2 ? 'text-slate-400' : 'text-slate-600';
              const badgeClass =
                tone === 2
                  ? 'bg-slate-700 text-slate-200 border-slate-600'
                  : tone === 1
                    ? 'bg-orange-100/70 text-orange-700 border-orange-200'
                    : 'bg-blue-100/60 text-blue-700 border-blue-200';
              const sourceTypeText = item.section || '위키백과 알찬 글';

              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => navigate(`/reading/${item._id}`)}
                  className={`group flex h-full flex-col rounded-3xl border p-6 text-left transition hover:-translate-y-1 hover:shadow-xl ${baseClass}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full text-xl ${
                        tone === 2 ? 'border border-slate-600 bg-slate-700' : 'bg-white'
                      }`}
                    >
                      🏛️
                    </div>
                    <div>
                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          tone === 2 ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        Wikipedia
                      </div>
                      <div
                        className={`text-sm font-bold ${tone === 2 ? 'text-slate-200' : 'text-slate-800'}`}
                      >
                        {sourceTypeText}
                      </div>
                    </div>
                  </div>

                  <h3
                    className={`mb-3 text-2xl font-black tracking-tight transition ${titleClass}`}
                  >
                    {item.title}
                  </h3>

                  <p className={`mb-6 line-clamp-3 text-sm leading-relaxed ${textClass}`}>
                    {(item.summary || item.bodyText || '').slice(0, 160)}
                  </p>

                  <div
                    className={`mt-auto flex items-center justify-between border-t pt-4 ${
                      tone === 2 ? 'border-slate-700/60' : 'border-slate-200/70'
                    }`}
                  >
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold ${badgeClass}`}
                    >
                      {getDifficultyChip(item.difficultyLevel, t).text} •{' '}
                      {t('readingDiscovery.articles.typeEncyclopedia', {
                        defaultValue: 'Encyclopedia',
                      })}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      🔖{' '}
                      {t('readingDiscovery.articles.recommended', { defaultValue: 'Recommended' })}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {curatedArticles.map(item => {
              const baseClass =
                item.tone === 'dark'
                  ? 'bg-slate-900 border-slate-800 text-white'
                  : item.tone === 'warm'
                    ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-orange-100'
                    : 'bg-white border-slate-200';
              const titleClass =
                item.tone === 'dark'
                  ? 'text-white group-hover:text-indigo-300'
                  : item.tone === 'warm'
                    ? 'text-slate-900 group-hover:text-orange-600'
                    : 'text-slate-900 group-hover:text-blue-600';
              const textClass = item.tone === 'dark' ? 'text-slate-400' : 'text-slate-600';
              const badgeClass =
                item.tone === 'dark'
                  ? 'bg-slate-700 text-slate-200 border-slate-600'
                  : item.tone === 'warm'
                    ? 'bg-orange-100/70 text-orange-700 border-orange-200'
                    : 'bg-blue-100/60 text-blue-700 border-blue-200';

              return (
                <article
                  key={item.id}
                  className={`group flex h-full flex-col rounded-3xl border p-6 transition hover:-translate-y-1 hover:shadow-xl ${baseClass}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 place-items-center rounded-full text-xl ${
                        item.tone === 'dark' ? 'bg-slate-700 border border-slate-600' : 'bg-white'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div
                        className={`text-[11px] font-bold uppercase tracking-wider ${
                          item.tone === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        {item.source}
                      </div>
                      <div
                        className={`text-sm font-bold ${
                          item.tone === 'dark' ? 'text-slate-200' : 'text-slate-800'
                        }`}
                      >
                        {item.sourceType}
                      </div>
                    </div>
                  </div>

                  <h3
                    className={`mb-3 text-2xl font-black tracking-tight transition ${titleClass}`}
                  >
                    {item.title}
                    {item.subtitle && (
                      <span
                        className={`mt-1 block text-lg font-bold ${
                          item.tone === 'dark' ? 'text-slate-400' : 'text-slate-500'
                        }`}
                      >
                        ({item.subtitle})
                      </span>
                    )}
                  </h3>

                  <p className={`mb-6 line-clamp-3 text-sm leading-relaxed ${textClass}`}>
                    {item.excerpt}
                  </p>

                  <div
                    className={`mt-auto flex items-center justify-between border-t pt-4 ${
                      item.tone === 'dark' ? 'border-slate-700/60' : 'border-slate-200/70'
                    }`}
                  >
                    <span
                      className={`rounded-md border px-2.5 py-1 text-xs font-bold ${badgeClass}`}
                    >
                      {item.badge}
                    </span>
                    <span
                      className={`text-xs font-semibold ${item.tone === 'dark' ? 'text-slate-500' : 'text-slate-500'}`}
                    >
                      🔖 {item.bookmarkText}
                    </span>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-10 flex items-center justify-end gap-2 text-xs font-semibold text-slate-400">
        <Clock3 size={14} />
        {t('readingDiscovery.footer', {
          defaultValue:
            'Powered by Convex `newsIngestion:getUserFeed` (auto refresh after 24h post-read, manual refresh up to 3/day)',
        })}
      </div>
    </div>
  );
}
