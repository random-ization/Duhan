import React, { useState, lazy, Suspense } from 'react';
import { useAction, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useSearchParams } from 'react-router-dom';
import { resolveSafeReturnTo } from '../utils/navigation';
import { getLabel, getLabels, Labels } from '../utils/i18n';
import { NoArgs, aRef, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobilePodcastHubPage } from '../components/mobile/MobilePodcastHubPage';
import { buildPodcastSearchPath } from '../utils/podcastRoutes';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';

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

const DesktopPodcastHubPage = lazy(() => import('./desktop/DesktopPodcastHubPage'));

export default function PodcastHubPage() {
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
    return <MobilePodcastHubPage />;
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-background text-muted-foreground font-sans">
          Loading...
        </div>
      }
    >
      <DesktopPodcastHubPage
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
    </Suspense>
  );
}
