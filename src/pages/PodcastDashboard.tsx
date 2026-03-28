import React, { useState } from 'react';
import { Play, Library, Search, Disc, History as HistoryIcon, ArrowLeft } from 'lucide-react';
import { useAction, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { localeFromLanguage } from '../utils/locale';
import { useLocation, useSearchParams } from 'react-router-dom';
import { resolveSafeReturnTo } from '../utils/navigation';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import { Badge } from '../components/ui';
import { Card, CardContent } from '../components/ui';
import { Skeleton } from '../components/ui';
import { getLabel, getLabels, Labels } from '../utils/i18n';
import { NoArgs, aRef, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobilePodcastDashboard } from '../components/mobile/MobilePodcastDashboard';
import { buildPodcastChannelPath, buildPodcastSearchPath } from '../utils/podcastRoutes';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';
import { formatSafeDateLabel } from '../utils/dateLabel';
import type { Language } from '../types';

interface PodcastChannel {
  _id?: string;
  id?: string;
  title: string;
  author?: string;
  artwork?: string;
  artworkUrl?: string;
  feedUrl?: string;
  itunesId?: string;
  views?: number;
}

interface HistoryItem {
  _id?: string;
  id?: string;
  episodeGuid?: string;
  episodeTitle: string;
  episodeUrl?: string;
  channelName: string;
  channelImage?: string;
  playedAt: number;
  progress?: number;
  duration?: number;
}

type NavigateFn = ReturnType<typeof useLocalizedNavigate>;

const getPodcastMessages = (labels: Labels) => ({
  DASHBOARD_TITLE: labels.podcastDashboard || 'Podcast Dashboard',
  ACTION_SEARCH: getLabel(labels, ['search']) || 'Search',
  DASHBOARD_COMMUNITY: labels.dashboard?.podcast?.community || 'Trending',
  DASHBOARD_EDITOR_PICKS: labels.dashboard?.podcast?.editorPicks || 'Editor Picks',
  DASHBOARD_VIEW_ALL: labels.viewAll || 'View All',
  EMPTY_TRENDING: labels.dashboard?.podcast?.msg?.NO_TRENDING || 'No trending podcasts yet',
  DASHBOARD_NO_RECOMMENDATIONS:
    labels.dashboard?.podcast?.msg?.NO_RECOMMENDATIONS || 'No recommendations yet',
  HISTORY_TITLE: labels.history || 'History',
});

const CHART_CACHE_KEY = 'podcast:koreanChart';
const CHART_CACHE_TS_KEY = 'podcast:koreanChart:ts';
const CHART_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const resolveLabel = (
  labels: Labels,
  paths: readonly (readonly string[])[],
  fallback: string
): string => {
  for (const path of paths) {
    const value = getLabel(labels, path);
    if (value) return value;
  }
  return fallback;
};

const useScrollButtons = () => {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = React.useState(false);
  const [canScrollRight, setCanScrollRight] = React.useState(false);

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < max - 1);
  }, []);

  React.useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const handle = () => update();
    el.addEventListener('scroll', handle, { passive: true });
    window.addEventListener('resize', handle);
    return () => {
      el.removeEventListener('scroll', handle);
      window.removeEventListener('resize', handle);
    };
  }, [update]);

  const scrollByAmount = (direction: 'left' | 'right') => {
    const el = ref.current;
    if (!el) return;
    const amount = Math.max(240, Math.round(el.clientWidth * 0.7));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return { ref, canScrollLeft, canScrollRight, scrollByAmount };
};

const useCachedKoreanChart = ({
  getTopKoreanPodcasts,
}: {
  getTopKoreanPodcasts: (args: { limit?: number }) => Promise<PodcastChannel[]>;
}) => {
  const [chartChannels, setChartChannels] = useState<PodcastChannel[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    let cached: PodcastChannel[] | null = null;
    let cachedAt = 0;

    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = safeGetLocalStorageItem(CHART_CACHE_KEY);
        const cachedTs = safeGetLocalStorageItem(CHART_CACHE_TS_KEY);
        cachedAt = cachedTs ? Number(cachedTs) : 0;
        if (cachedRaw) cached = JSON.parse(cachedRaw) as PodcastChannel[];
      } catch {
        cached = null;
        cachedAt = 0;
      }
    }

    const hasCache = Array.isArray(cached) && cached.length > 0;
    const isStale = !cached || now - cachedAt >= CHART_CACHE_TTL_MS;

    if (hasCache) {
      setChartChannels(cached!);
      setChartLoading(false);
    } else {
      setChartLoading(true);
    }

    if (!isStale) {
      return () => {
        cancelled = true;
      };
    }

    getTopKoreanPodcasts({ limit: 12 })
      .then(results => {
        if (cancelled) return;
        const next = results ?? [];
        setChartChannels(next);
        safeSetLocalStorageItem(CHART_CACHE_KEY, JSON.stringify(next));
        safeSetLocalStorageItem(CHART_CACHE_TS_KEY, String(Date.now()));
      })
      .catch(() => {
        if (cancelled) return;
        if (!hasCache) setChartChannels([]);
      })
      .finally(() => {
        if (!cancelled) setChartLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [getTopKoreanPodcasts]);

  return { chartChannels, chartLoading };
};

const channelArtwork = (
  channel?: Partial<PodcastChannel> | null,
  fallback = 'https://placehold.co/220x220'
) => channel?.artworkUrl || channel?.artwork || fallback;

const FeaturedHeroSection = ({
  lastPlayed,
  featuredChannel,
  labels,
  podcastMsgs,
  navigate,
  currentPath,
}: {
  lastPlayed: HistoryItem | null;
  featuredChannel: PodcastChannel | null;
  labels: Labels;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  currentPath: string;
}) => {
  if (lastPlayed) {
    return (
      <Button
        type="button"
        size="auto"
        onClick={() =>
          navigate(`/podcasts/player?returnTo=${encodeURIComponent(currentPath)}`, {
            state: {
              episode: {
                guid: lastPlayed.episodeGuid,
                title: lastPlayed.episodeTitle,
                audioUrl: lastPlayed.episodeUrl,
                channel: {
                  title: lastPlayed.channelName,
                  artworkUrl: lastPlayed.channelImage,
                },
              },
            },
          })
        }
        className="w-full text-left bg-primary rounded-[2rem] p-6 text-white border-2 border-foreground shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6 font-normal"
      >
        <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
          <Disc size={200} />
        </div>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-indigo-900/50 dark:from-indigo-300/20 to-transparent pointer-events-none"></div>

        <div className="w-28 h-28 rounded-2xl bg-indigo-500 dark:bg-indigo-400/70 border-2 border-primary-foreground/40 shadow-lg overflow-hidden shrink-0 z-10">
          <img
            src={lastPlayed.channelImage || 'https://placehold.co/400x400/indigo/white?text=Pod'}
            className="w-full h-full object-cover"
            alt={resolveLabel(labels, [['podcast', 'coverAlt']], 'album-art')}
          />
        </div>
        <div className="z-10 flex-1 text-center md:text-left">
          <div className="text-xs font-bold text-green-400 dark:text-green-300 mb-1 flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider">
            <span className="w-2 h-2 bg-green-400 dark:bg-green-300 rounded-full animate-pulse"></span>{' '}
            {labels.dashboard?.podcast?.continueListening || 'Continue Listening'}
          </div>
          <h3 className="text-2xl font-black mb-1 line-clamp-1">{lastPlayed.episodeTitle}</h3>
          <p className="text-primary-foreground/80 text-sm mb-4">{lastPlayed.channelName}</p>
          <div className="w-full bg-primary-foreground/20 h-1.5 rounded-full overflow-hidden max-w-md mx-auto md:mx-0">
            <div className="bg-green-400 dark:bg-green-300 h-full w-[45%]"></div>
          </div>
        </div>
        <div className="z-10 hidden md:flex w-12 h-12 bg-primary-foreground/95 rounded-full items-center justify-center text-primary hover:scale-110 transition shadow-lg shrink-0">
          <Play fill="currentColor" size={20} />
        </div>
      </Button>
    );
  }

  if (featuredChannel) {
    return (
      <Button
        type="button"
        size="auto"
        onClick={() =>
          navigate(buildPodcastChannelPath(featuredChannel, currentPath), {
            state: { channel: featuredChannel },
          })
        }
        className="w-full text-left bg-primary rounded-[2rem] p-6 text-white border-2 border-foreground shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6 font-normal"
      >
        <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
          <Disc size={200} />
        </div>
        <div className="w-28 h-28 rounded-2xl bg-indigo-500 dark:bg-indigo-400/70 border-2 border-primary-foreground/40 shadow-lg overflow-hidden shrink-0 z-10">
          <img
            src={channelArtwork(
              featuredChannel,
              'https://placehold.co/400x400/indigo/white?text=Pod'
            )}
            className="w-full h-full object-cover"
            alt={resolveLabel(labels, [['podcast', 'coverAlt']], 'album-art')}
          />
        </div>
        <div className="z-10 flex-1 text-center md:text-left">
          <div className="text-xs font-bold text-yellow-400 dark:text-amber-200 mb-1 flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider">
            <span className="w-2 h-2 bg-yellow-400 dark:bg-amber-200 rounded-full animate-pulse"></span>{' '}
            {labels.dashboard?.podcast?.featured || 'Featured Podcast'}
          </div>
          <h3 className="text-2xl font-black mb-1 line-clamp-1">{featuredChannel.title}</h3>
          <p className="text-primary-foreground/80 text-sm">{featuredChannel.author}</p>
        </div>
      </Button>
    );
  }

  return (
    <Card className="bg-muted rounded-[2rem] p-8 text-center text-muted-foreground border-border">
      <p>{podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}</p>
    </Card>
  );
};

const HorizontalScrollButtons = ({
  canLeft,
  canRight,
  onLeft,
  onRight,
  labels,
}: {
  canLeft: boolean;
  canRight: boolean;
  onLeft: () => void;
  onRight: () => void;
  labels: Labels;
}) => (
  <>
    {canLeft && (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onLeft}
        className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
        aria-label={resolveLabel(labels, [['common', 'scrollLeft']], 'scroll-left')}
      >
        ‹
      </Button>
    )}
    {canRight && (
      <Button
        type="button"
        size="icon"
        variant="outline"
        onClick={onRight}
        className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
        aria-label={resolveLabel(labels, [['common', 'scrollRight']], 'scroll-right')}
      >
        ›
      </Button>
    )}
  </>
);

const SubscriptionChannelCard = ({
  channel,
  navigate,
  currentPath,
}: {
  channel: PodcastChannel;
  navigate: NavigateFn;
  currentPath: string;
}) => {
  const cardKey = channel.itunesId || channel.id || channel._id || channel.title;
  return (
    <Button
      key={cardKey}
      type="button"
      size="auto"
      onClick={() =>
        navigate(buildPodcastChannelPath(channel, currentPath), { state: { channel } })
      }
      className="min-w-[220px] max-w-[220px] text-left bg-card p-4 rounded-2xl border-2 border-foreground shadow-sm hover:shadow-pop hover:-translate-y-1 transition flex flex-col gap-3 snap-start font-normal whitespace-normal"
    >
      <div className="w-full aspect-square rounded-xl border-2 border-border overflow-hidden bg-muted">
        <img
          src={channelArtwork(channel)}
          alt={channel.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0">
        <h4 className="font-black text-sm text-foreground line-clamp-2 break-words [overflow-wrap:anywhere]">
          {channel.title}
        </h4>
        <p className="text-xs font-bold text-muted-foreground line-clamp-1 mt-1">
          {channel.author}
        </p>
      </div>
    </Button>
  );
};

const SubscriptionsBody = ({
  user,
  labels,
  subscriptionsLoading,
  subscriptions,
  subscriptionsRef,
  subscriptionsCanLeft,
  subscriptionsCanRight,
  scrollSubscriptions,
  navigate,
  currentPath,
}: {
  user: unknown;
  labels: Labels;
  subscriptionsLoading: boolean;
  subscriptions: PodcastChannel[];
  subscriptionsRef: React.RefObject<HTMLDivElement | null>;
  subscriptionsCanLeft: boolean;
  subscriptionsCanRight: boolean;
  scrollSubscriptions: (direction: 'left' | 'right') => void;
  navigate: NavigateFn;
  currentPath: string;
}) => {
  if (!user) {
    return (
      <Card className="border-2 border-foreground">
        <CardContent className="p-6 text-center space-y-4">
          <p className="font-bold text-muted-foreground">
            {resolveLabel(
              labels,
              [['dashboard', 'podcast', 'loginRequired']],
              'Please login first'
            )}
          </p>
          <Button
            type="button"
            onClick={() => navigate('/login')}
            className="px-6 py-3 rounded-xl shadow-pop hover:shadow-pop-hover hover:-translate-y-0.5 transition-all"
          >
            {resolveLabel(labels, [['login']], 'Login')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (subscriptionsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 dark:border-indigo-300 border-t-transparent" />
      </div>
    );
  }

  if (subscriptions.length === 0) {
    return (
      <Card className="rounded-[2rem] border-2 border-foreground text-muted-foreground font-bold text-center">
        <CardContent className="py-12">
          {resolveLabel(
            labels,
            [['dashboard', 'podcast', 'msg', 'EMPTY_SUBSCRIPTIONS']],
            'No subscriptions yet'
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="relative">
      <div
        ref={subscriptionsRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
      >
        {subscriptions.map(channel => (
          <SubscriptionChannelCard
            key={channel.itunesId || channel.id || channel._id || channel.title}
            channel={channel}
            navigate={navigate}
            currentPath={currentPath}
          />
        ))}
      </div>
      <HorizontalScrollButtons
        canLeft={subscriptionsCanLeft}
        canRight={subscriptionsCanRight}
        onLeft={() => scrollSubscriptions('left')}
        onRight={() => scrollSubscriptions('right')}
        labels={labels}
      />
    </div>
  );
};

const SubscriptionsSection = ({
  user,
  labels,
  subscriptionsLoading,
  subscriptions,
  subscriptionsRef,
  subscriptionsCanLeft,
  subscriptionsCanRight,
  scrollSubscriptions,
  navigate,
  currentPath,
}: {
  user: unknown;
  labels: Labels;
  subscriptionsLoading: boolean;
  subscriptions: PodcastChannel[];
  subscriptionsRef: React.RefObject<HTMLDivElement | null>;
  subscriptionsCanLeft: boolean;
  subscriptionsCanRight: boolean;
  scrollSubscriptions: (direction: 'left' | 'right') => void;
  navigate: NavigateFn;
  currentPath: string;
}) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2 text-foreground">
      <Library size={20} className="text-indigo-500 dark:text-indigo-300" />
      <h3 className="font-black text-xl">
        {resolveLabel(labels, [['dashboard', 'podcast', 'mySubs']], 'My Subscriptions')}
      </h3>
    </div>
    <SubscriptionsBody
      user={user}
      labels={labels}
      subscriptionsLoading={subscriptionsLoading}
      subscriptions={subscriptions}
      subscriptionsRef={subscriptionsRef}
      subscriptionsCanLeft={subscriptionsCanLeft}
      subscriptionsCanRight={subscriptionsCanRight}
      scrollSubscriptions={scrollSubscriptions}
      navigate={navigate}
      currentPath={currentPath}
    />
  </section>
);

const TrendingSection = ({
  activeTab,
  setActiveTab,
  podcastMsgs,
  displayedTrending,
  activeLoading,
  trendingRef,
  trendingCanLeft,
  trendingCanRight,
  scrollTrending,
  labels,
  navigate,
  currentPath,
}: {
  activeTab: 'community' | 'weekly';
  setActiveTab: (tab: 'community' | 'weekly') => void;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
  displayedTrending: PodcastChannel[];
  activeLoading: boolean;
  trendingRef: React.RefObject<HTMLDivElement | null>;
  trendingCanLeft: boolean;
  trendingCanRight: boolean;
  scrollTrending: (direction: 'left' | 'right') => void;
  labels: Labels;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  currentPath: string;
}) => (
  <section className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-2 text-foreground">
        <Play size={20} className="text-indigo-500 dark:text-indigo-300" />
        <h3 className="font-black text-xl">
          {activeTab === 'community'
            ? podcastMsgs.DASHBOARD_COMMUNITY
            : podcastMsgs.DASHBOARD_EDITOR_PICKS}
        </h3>
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('community')}
          className={`px-4 py-2 rounded-full text-sm font-black transition ${
            activeTab === 'community'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground border-2 border-border hover:border-foreground'
          }`}
        >
          {podcastMsgs.DASHBOARD_COMMUNITY}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setActiveTab('weekly')}
          className={`px-4 py-2 rounded-full text-sm font-black transition ${
            activeTab === 'weekly'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground border-2 border-border hover:border-foreground'
          }`}
        >
          {podcastMsgs.DASHBOARD_EDITOR_PICKS}
        </Button>
      </div>
    </div>

    <div className="relative">
      <div
        ref={trendingRef}
        className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
      >
        {displayedTrending.slice(0, 12).map((pod, idx) => (
          <Button
            key={pod.id || pod.title || idx}
            type="button"
            size="auto"
            onClick={() => {
              navigate(buildPodcastChannelPath(pod, currentPath), { state: { channel: pod } });
            }}
            variant="ghost"
            className="min-w-[220px] max-w-[220px] text-left bg-card p-4 rounded-2xl border-2 border-foreground shadow-sm hover:shadow-pop hover:-translate-y-1 transition flex flex-col gap-3 snap-start font-normal whitespace-normal"
          >
            <div className="relative w-full aspect-square rounded-xl border-2 border-border overflow-hidden bg-muted">
              <img
                src={channelArtwork(pod)}
                className="w-full h-full object-cover"
                alt={pod.title}
              />
              <Badge
                className={`absolute top-2 left-2 text-[10px] ${idx < 3 ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground'}`}
              >
                #{idx + 1}
              </Badge>
            </div>
            <div className="min-w-0">
              <h4 className="font-black text-sm text-foreground line-clamp-2 break-words [overflow-wrap:anywhere]">
                {pod.title}
              </h4>
              {pod.author && pod.author.trim() && pod.author.trim().toLowerCase() !== 'unknown' && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{pod.author}</p>
              )}
              {activeTab === 'weekly' && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-[10px]">
                    {pod.views || 0} {labels.dashboard?.podcast?.plays || 'plays'}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase text-muted-foreground">
                    {labels.dashboard?.podcast?.editorPicks || 'User Hot'}
                  </Badge>
                </div>
              )}
            </div>
          </Button>
        ))}

        {activeLoading &&
          [1, 2, 3, 4].map(i => (
            <Card
              key={i}
              className="min-w-[220px] max-w-[220px] bg-card p-4 rounded-2xl border-2 border-foreground shadow-sm snap-start"
            >
              <Skeleton className="w-full aspect-square rounded-xl" />
              <div className="mt-3 space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16 bg-muted" />
              </div>
            </Card>
          ))}
      </div>
      <HorizontalScrollButtons
        canLeft={trendingCanLeft}
        canRight={trendingCanRight}
        onLeft={() => scrollTrending('left')}
        onRight={() => scrollTrending('right')}
        labels={labels}
      />
    </div>

    {!activeLoading && displayedTrending.length === 0 && (
      <Card className="text-center py-8 text-muted-foreground font-bold text-sm border-2 border-foreground">
        {podcastMsgs.EMPTY_TRENDING}
      </Card>
    )}
  </section>
);

const HistorySection = ({
  history,
  historyRef,
  historyCanLeft,
  historyCanRight,
  scrollHistory,
  podcastMsgs,
  language,
  labels,
  navigate,
  currentPath,
}: {
  history: HistoryItem[];
  historyRef: React.RefObject<HTMLDivElement | null>;
  historyCanLeft: boolean;
  historyCanRight: boolean;
  scrollHistory: (direction: 'left' | 'right') => void;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
  language: Language;
  labels: Labels;
  navigate: ReturnType<typeof useLocalizedNavigate>;
  currentPath: string;
}) => {
  if (history.length === 0) return null;
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2 text-foreground">
        <HistoryIcon size={20} className="text-indigo-500 dark:text-indigo-300" />
        <h3 className="font-black text-xl">{podcastMsgs.HISTORY_TITLE}</h3>
      </div>
      <div className="relative">
        <div
          ref={historyRef}
          className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
        >
          {history.map(record => (
            <Button
              key={record.id}
              type="button"
              size="auto"
              onClick={() =>
                navigate(`/podcasts/player?returnTo=${encodeURIComponent(currentPath)}`, {
                  state: {
                    episode: {
                      guid: record.episodeGuid,
                      title: record.episodeTitle,
                      audioUrl: record.episodeUrl,
                      channel: {
                        title: record.channelName,
                        artworkUrl: record.channelImage,
                      },
                    },
                  },
                })
              }
              variant="ghost"
              className="min-w-[260px] max-w-[260px] text-left bg-card p-3 rounded-2xl border-2 border-foreground shadow-sm hover:shadow-pop hover:-translate-y-1 transition cursor-pointer flex gap-3 items-center group snap-start font-normal"
            >
              <div className="relative w-14 h-14 shrink-0">
                <img
                  src={record.channelImage || 'https://placehold.co/100x100'}
                  className="w-full h-full rounded-xl border border-border object-cover"
                  alt={resolveLabel(labels, [['podcast', 'coverAlt']], 'cover')}
                />
                <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                  <Play size={16} className="text-white fill-white" />
                </div>
              </div>
              <div className="overflow-hidden flex-1 min-w-0">
                <div className="text-sm font-bold text-foreground truncate mb-1">
                  {record.episodeTitle}
                </div>
                <div className="text-xs font-bold text-muted-foreground truncate flex items-center gap-1">
                  {record.channelName}
                  <span className="text-muted-foreground">•</span>
                  {formatSafeDateLabel(
                    record.playedAt,
                    localeFromLanguage(language),
                    resolveLabel(labels, [['common', 'recently']], 'Recently')
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
        <HorizontalScrollButtons
          canLeft={historyCanLeft}
          canRight={historyCanRight}
          onLeft={() => scrollHistory('left')}
          onRight={() => scrollHistory('right')}
          labels={labels}
        />
      </div>
    </section>
  );
};

const pickFeaturedChannel = ({
  lastPlayed,
  trending,
}: {
  lastPlayed: HistoryItem | null;
  trending: { internal: PodcastChannel[]; external: PodcastChannel[] };
}): PodcastChannel | null => {
  if (lastPlayed) return null;
  if (trending.internal.length > 0) return trending.internal[0];
  if (trending.external.length > 0) return trending.external[0];
  return null;
};

const DashboardHeader = ({
  navigate,
  backPath,
  labels,
  podcastMsgs,
}: {
  navigate: NavigateFn;
  backPath: string;
  labels: Labels;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
}) => (
  <div className="flex items-center gap-4 mb-6">
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => navigate(backPath)}
      className="w-12 h-12 border-2 border-foreground rounded-xl shadow-pop hover:shadow-pop-sm hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150"
      aria-label={resolveLabel(labels, [['errors', 'backToHome']], 'Back')}
    >
      <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.5} />
    </Button>
    <div>
      <h2 className="text-4xl font-black font-display text-foreground tracking-tight">
        {podcastMsgs.DASHBOARD_TITLE}
      </h2>
      <p className="text-muted-foreground font-bold">
        {resolveLabel(labels, [['dashboard', 'podcast', 'headerSubtitle']], 'Listening Skills')}
      </p>
    </div>
    <img
      src="/emojis/Headphone.png"
      className="w-14 h-14 animate-bounce-slow"
      alt={resolveLabel(labels, [['podcast', 'headphoneAlt']], 'headphone')}
    />
  </div>
);

const SearchAndFilterBar = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
  podcastMsgs,
  labels,
}: {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
  labels: Labels;
}) => (
  <div className="flex flex-col md:flex-row gap-4 mb-8">
    <form onSubmit={handleSearch} className="relative flex-1 group">
      <Input
        type="text"
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        placeholder={podcastMsgs.ACTION_SEARCH}
        className="border-2 border-foreground px-12 font-bold focus:translate-y-1 focus:shadow-none"
      />
      <Search
        className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-foreground transition"
        size={20}
      />
    </form>
    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
      <span className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border-2 border-primary bg-primary px-4 text-sm font-bold text-primary-foreground shadow-pop">
        {resolveLabel(
          labels,
          [
            ['dashboard', 'podcast', 'filters', 'all'],
            ['common', 'all'],
          ],
          'All'
        )}
      </span>
      <span className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border-2 border-border bg-card px-4 text-sm font-bold text-muted-foreground">
        {resolveLabel(
          labels,
          [
            ['dashboard', 'podcast', 'filters', 'beginner'],
            ['dashboard', 'level', 'beginner'],
          ],
          'Beginner'
        )}
      </span>
      <span className="inline-flex h-11 items-center justify-center whitespace-nowrap rounded-xl border-2 border-border bg-card px-4 text-sm font-bold text-muted-foreground">
        {resolveLabel(labels, [['dashboard', 'podcast', 'dailyConv']], 'Daily Conv')}
      </span>
    </div>
  </div>
);

const FeaturedSection = ({
  lastPlayed,
  labels,
  podcastMsgs,
  featuredChannel,
  navigate,
  currentPath,
}: {
  lastPlayed: HistoryItem | null;
  labels: Labels;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
  featuredChannel: PodcastChannel | null;
  navigate: NavigateFn;
  currentPath: string;
}) => (
  <section className="space-y-4">
    <div className="flex items-center gap-2 text-foreground">
      <Disc size={20} className="text-indigo-500 dark:text-indigo-300" />
      <h3 className="font-black text-xl">
        {lastPlayed
          ? resolveLabel(
              labels,
              [['dashboard', 'podcast', 'continueListening']],
              'Continue Listening'
            )
          : resolveLabel(labels, [['dashboard', 'podcast', 'featured']], 'Featured Podcast')}
      </h3>
    </div>
    <FeaturedHeroSection
      lastPlayed={lastPlayed}
      featuredChannel={featuredChannel}
      labels={labels}
      podcastMsgs={podcastMsgs}
      navigate={navigate}
      currentPath={currentPath}
    />
  </section>
);

const DesktopPodcastDashboard = ({
  navigate,
  backPath,
  labels,
  podcastMsgs,
  searchTerm,
  setSearchTerm,
  handleSearch,
  lastPlayed,
  featuredChannel,
  user,
  subscriptionsLoading,
  subscriptions,
  subscriptionsRef,
  subscriptionsCanLeft,
  subscriptionsCanRight,
  scrollSubscriptions,
  activeTab,
  setActiveTab,
  displayedTrending,
  activeLoading,
  trendingRef,
  trendingCanLeft,
  trendingCanRight,
  scrollTrending,
  history,
  historyRef,
  historyCanLeft,
  historyCanRight,
  scrollHistory,
  language,
  currentPath,
}: {
  navigate: NavigateFn;
  backPath: string;
  labels: Labels;
  podcastMsgs: ReturnType<typeof getPodcastMessages>;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  handleSearch: (e: React.FormEvent) => void;
  lastPlayed: HistoryItem | null;
  featuredChannel: PodcastChannel | null;
  user: unknown;
  subscriptionsLoading: boolean;
  subscriptions: PodcastChannel[];
  subscriptionsRef: React.RefObject<HTMLDivElement | null>;
  subscriptionsCanLeft: boolean;
  subscriptionsCanRight: boolean;
  scrollSubscriptions: (direction: 'left' | 'right') => void;
  activeTab: 'community' | 'weekly';
  setActiveTab: (tab: 'community' | 'weekly') => void;
  displayedTrending: PodcastChannel[];
  activeLoading: boolean;
  trendingRef: React.RefObject<HTMLDivElement | null>;
  trendingCanLeft: boolean;
  trendingCanRight: boolean;
  scrollTrending: (direction: 'left' | 'right') => void;
  history: HistoryItem[];
  historyRef: React.RefObject<HTMLDivElement | null>;
  historyCanLeft: boolean;
  historyCanRight: boolean;
  scrollHistory: (direction: 'left' | 'right') => void;
  language: Language;
  currentPath: string;
}) => (
  <div
    className="min-h-screen bg-background p-6 md:p-12 font-sans pb-32"
    style={{
      backgroundImage: 'radial-gradient(hsl(var(--border) / 0.75) 1.5px, transparent 1.5px)',
      backgroundSize: '24px 24px',
    }}
  >
    <div className="max-w-7xl mx-auto space-y-12">
      <DashboardHeader
        navigate={navigate}
        backPath={backPath}
        labels={labels}
        podcastMsgs={podcastMsgs}
      />

      <SearchAndFilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleSearch={handleSearch}
        podcastMsgs={podcastMsgs}
        labels={labels}
      />

      <div className="space-y-12">
        <FeaturedSection
          lastPlayed={lastPlayed}
          labels={labels}
          podcastMsgs={podcastMsgs}
          featuredChannel={featuredChannel}
          navigate={navigate}
          currentPath={currentPath}
        />

        <SubscriptionsSection
          user={user}
          labels={labels}
          subscriptionsLoading={subscriptionsLoading}
          subscriptions={subscriptions}
          subscriptionsRef={subscriptionsRef}
          subscriptionsCanLeft={subscriptionsCanLeft}
          subscriptionsCanRight={subscriptionsCanRight}
          scrollSubscriptions={scrollSubscriptions}
          navigate={navigate}
          currentPath={currentPath}
        />

        <TrendingSection
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          podcastMsgs={podcastMsgs}
          displayedTrending={displayedTrending}
          activeLoading={activeLoading}
          trendingRef={trendingRef}
          trendingCanLeft={trendingCanLeft}
          trendingCanRight={trendingCanRight}
          scrollTrending={scrollTrending}
          labels={labels}
          navigate={navigate}
          currentPath={currentPath}
        />

        <HistorySection
          history={history}
          historyRef={historyRef}
          historyCanLeft={historyCanLeft}
          historyCanRight={historyCanRight}
          scrollHistory={scrollHistory}
          podcastMsgs={podcastMsgs}
          language={language}
          labels={labels}
          navigate={navigate}
          currentPath={currentPath}
        />
      </div>
    </div>
  </div>
);

export default function PodcastDashboard() {
  const navigate = useLocalizedNavigate();
  const { user, language } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isMobile = useIsMobile();
  const labels = getLabels(language);
  const podcastMsgs = getPodcastMessages(labels);
  const backPath = React.useMemo(() => {
    return resolveSafeReturnTo(searchParams.get('returnTo'), '/media?tab=podcasts');
  }, [searchParams]);
  const currentPath = `${location.pathname}${location.search}`;

  // State
  const [activeTab, setActiveTab] = useState<'community' | 'weekly'>('community');
  const [searchTerm, setSearchTerm] = useState('');
  const {
    ref: subscriptionsRef,
    canScrollLeft: subscriptionsCanLeft,
    canScrollRight: subscriptionsCanRight,
    scrollByAmount: scrollSubscriptions,
  } = useScrollButtons();
  const {
    ref: trendingRef,
    canScrollLeft: trendingCanLeft,
    canScrollRight: trendingCanRight,
    scrollByAmount: scrollTrending,
  } = useScrollButtons();
  const {
    ref: historyRef,
    canScrollLeft: historyCanLeft,
    canScrollRight: historyCanRight,
    scrollByAmount: scrollHistory,
  } = useScrollButtons();

  // Convex Integration
  type TrendingResult = {
    internal: (PodcastChannel & { _id: string })[];
    external: (PodcastChannel & { _id: string })[];
  };
  const trendingData = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));
  const getTopKoreanPodcasts = useAction(
    aRef<{ limit?: number }, PodcastChannel[]>('podcastActions:getTopKoreanPodcasts')
  );
  // Note: getHistory and getSubscriptions use authentication internally, no userId arg needed
  const historyData = useQuery(
    qRef<NoArgs, (HistoryItem & { _id: string })[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );
  const subscriptionsData = useQuery(
    qRef<NoArgs, PodcastChannel[]>('podcasts:getSubscriptions'),
    user ? {} : 'skip'
  );

  // Derived State
  const trending = React.useMemo(() => {
    if (!trendingData) return { external: [], internal: [] };
    return {
      internal: trendingData.internal.map(channel => ({
        ...channel,
        id: channel._id,
      })),
      external: trendingData.external.map(channel => ({
        ...channel,
        id: channel._id,
      })),
    };
  }, [trendingData]);

  const history = React.useMemo(() => {
    if (!historyData) return [];
    return historyData.map(h => ({
      ...h,
      id: h._id,
    }));
  }, [historyData]);

  const loading = trendingData === undefined;
  const subscriptionsLoading = user ? subscriptionsData === undefined : false;
  const subscriptions = React.useMemo(() => subscriptionsData ?? [], [subscriptionsData]);

  const { chartChannels, chartLoading } = useCachedKoreanChart({ getTopKoreanPodcasts });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const target = buildPodcastSearchPath(searchTerm, currentPath);
    if (!target) return;
    navigate(target);
  };

  const lastPlayed = history.length > 0 ? history[0] : null;
  const featuredChannel = pickFeaturedChannel({ lastPlayed, trending });

  const activeTrending = activeTab === 'community' ? chartChannels : trending.internal;
  const activeLoading = activeTab === 'community' ? chartLoading : loading;
  const displayedTrending = React.useMemo(() => {
    if (activeTab !== 'weekly') return activeTrending;
    return activeTrending.filter(
      pod => pod.title && pod.title.trim() && pod.title.trim().toLowerCase() !== 'unknown'
    );
  }, [activeTab, activeTrending]);

  // Mobile View (after all hooks)
  if (isMobile) {
    return <MobilePodcastDashboard />;
  }

  return (
    <DesktopPodcastDashboard
      navigate={navigate}
      backPath={backPath}
      labels={labels}
      podcastMsgs={podcastMsgs}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      handleSearch={handleSearch}
      lastPlayed={lastPlayed}
      featuredChannel={featuredChannel}
      user={user}
      subscriptionsLoading={subscriptionsLoading}
      subscriptions={subscriptions}
      subscriptionsRef={subscriptionsRef}
      subscriptionsCanLeft={subscriptionsCanLeft}
      subscriptionsCanRight={subscriptionsCanRight}
      scrollSubscriptions={scrollSubscriptions}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      displayedTrending={displayedTrending}
      activeLoading={activeLoading}
      trendingRef={trendingRef}
      trendingCanLeft={trendingCanLeft}
      trendingCanRight={trendingCanRight}
      scrollTrending={scrollTrending}
      history={history}
      historyRef={historyRef}
      historyCanLeft={historyCanLeft}
      historyCanRight={historyCanRight}
      scrollHistory={scrollHistory}
      language={language}
      currentPath={currentPath}
    />
  );
}
