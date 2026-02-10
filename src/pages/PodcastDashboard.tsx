import React, { useState } from 'react';
import { Play, Library, Search, Disc, History as HistoryIcon, ArrowLeft } from 'lucide-react';
import { useAction, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { localeFromLanguage } from '../utils/locale';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { getLabel, getLabels, Labels } from '../utils/i18n';
import { NoArgs, aRef, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobilePodcastDashboard } from '../components/mobile/MobilePodcastDashboard';

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

export default function PodcastDashboard() {
  const navigate = useLocalizedNavigate();
  const { user, language } = useAuth();
  const isMobile = useIsMobile();
  const labels = getLabels(language);
  const podcastMsgs = getPodcastMessages(labels);

  // State
  const [activeTab, setActiveTab] = useState<'community' | 'weekly'>('community');
  const [searchTerm, setSearchTerm] = useState('');
  const [chartChannels, setChartChannels] = useState<PodcastChannel[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const chartCacheKey = 'podcast:koreanChart';
  const chartCacheTsKey = 'podcast:koreanChart:ts';
  const chartCacheTtlMs = 1000 * 60 * 60 * 24 * 7;
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

  React.useEffect(() => {
    let cancelled = false;
    const now = Date.now();
    let cached: PodcastChannel[] | null = null;
    let cachedAt = 0;

    if (typeof window !== 'undefined') {
      try {
        const cachedRaw = window.localStorage.getItem(chartCacheKey);
        const cachedTs = window.localStorage.getItem(chartCacheTsKey);
        cachedAt = cachedTs ? Number(cachedTs) : 0;
        if (cachedRaw) cached = JSON.parse(cachedRaw) as PodcastChannel[];
      } catch {
        cached = null;
        cachedAt = 0;
      }
    }

    const hasCache = Array.isArray(cached) && cached.length > 0;
    const isStale = !cached || now - cachedAt >= chartCacheTtlMs;

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
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(chartCacheKey, JSON.stringify(next));
          window.localStorage.setItem(chartCacheTsKey, String(Date.now()));
        }
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
  }, [getTopKoreanPodcasts, chartCacheKey, chartCacheTsKey, chartCacheTtlMs]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/podcasts/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  // Determine featured content: Last played episode OR Top Trending (Internal)
  const lastPlayed = history.length > 0 ? history[0] : null;

  let featuredChannel: PodcastChannel | null = null;
  if (!lastPlayed) {
    if (trending.internal.length > 0) {
      featuredChannel = trending.internal[0];
    } else if (trending.external.length > 0) {
      featuredChannel = trending.external[0];
    }
  }

  const renderFeaturedHero = () => {
    if (lastPlayed) {
      return (
        <Button
          type="button"
          size="auto"
          onClick={() =>
            navigate('/podcasts/player', {
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
          className="w-full text-left bg-slate-900 rounded-[2rem] p-6 text-white border-2 border-slate-900 shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6 font-normal"
        >
          <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
            <Disc size={200} />
          </div>
          <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-indigo-900/50 to-transparent pointer-events-none"></div>

          <div className="w-28 h-28 rounded-2xl bg-indigo-500 border-2 border-white shadow-lg overflow-hidden shrink-0 z-10">
            <img
              src={lastPlayed.channelImage || 'https://placehold.co/400x400/indigo/white?text=Pod'}
              className="w-full h-full object-cover"
              alt="album art"
            />
          </div>
          <div className="z-10 flex-1 text-center md:text-left">
            <div className="text-xs font-bold text-green-400 mb-1 flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>{' '}
              {labels.dashboard?.podcast?.continueListening || 'Continue Listening'}
            </div>
            <h3 className="text-2xl font-black mb-1 line-clamp-1">{lastPlayed.episodeTitle}</h3>
            <p className="text-slate-400 text-sm mb-4">{lastPlayed.channelName}</p>
            <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden max-w-md mx-auto md:mx-0">
              <div className="bg-green-400 h-full w-[45%]"></div>
            </div>
          </div>
          <div className="z-10 hidden md:flex w-12 h-12 bg-white rounded-full items-center justify-center text-black hover:scale-110 transition shadow-lg shrink-0">
            <Play fill="currentColor" size={20} />
          </div>
        </Button>
      );
    }

    if (featuredChannel) {
      const params = new URLSearchParams();
      const channelId = featuredChannel.itunesId || featuredChannel.id;
      if (channelId) params.set('id', String(channelId));
      if (featuredChannel.feedUrl) params.set('feedUrl', featuredChannel.feedUrl);
      const query = params.toString();
      return (
        <Button
          type="button"
          size="auto"
          onClick={() =>
            navigate(`/podcasts/channel${query ? `?${query}` : ''}`, {
              state: { channel: featuredChannel },
            })
          }
          className="w-full text-left bg-slate-900 rounded-[2rem] p-6 text-white border-2 border-slate-900 shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6 font-normal"
        >
          <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
            <Disc size={200} />
          </div>
          <div className="w-28 h-28 rounded-2xl bg-indigo-500 border-2 border-white shadow-lg overflow-hidden shrink-0 z-10">
            <img
              src={
                featuredChannel.artworkUrl ||
                featuredChannel.artwork ||
                'https://placehold.co/400x400/indigo/white?text=Pod'
              }
              className="w-full h-full object-cover"
              alt="album art"
            />
          </div>
          <div className="z-10 flex-1 text-center md:text-left">
            <div className="text-xs font-bold text-yellow-400 mb-1 flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider">
              <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>{' '}
              {labels.dashboard?.podcast?.featured || 'Featured Podcast'}
            </div>
            <h3 className="text-2xl font-black mb-1 line-clamp-1">{featuredChannel.title}</h3>
            <p className="text-slate-400 text-sm">{featuredChannel.author}</p>
          </div>
        </Button>
      );
    }

    return (
      <Card className="bg-slate-800 rounded-[2rem] p-8 text-center text-slate-400 border-slate-800">
        <p>{podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}</p>
      </Card>
    );
  };

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
    <div
      className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32"
      style={{
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="max-w-7xl mx-auto space-y-12">
        {/* 1. Header Section */}
        <div className="flex items-center gap-4 mb-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="w-12 h-12 border-2 border-slate-900 rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] active:shadow-none active:translate-x-[3px] active:translate-y-[3px] transition-all duration-150"
            aria-label={labels.errors?.backToHome || 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-slate-900" strokeWidth={2.5} />
          </Button>
          <div>
            <h2 className="text-4xl font-black font-display text-slate-900 tracking-tight">
              {podcastMsgs.DASHBOARD_TITLE}
            </h2>
            <p className="text-slate-500 font-bold">
              {labels.dashboard?.podcast?.headerSubtitle || 'Listening Skills'}
            </p>
          </div>
          <img
            src="/emojis/Headphone.png"
            className="w-14 h-14 animate-bounce-slow"
            alt="headphone"
          />
        </div>

        {/* 2. Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="relative flex-1 group">
            <Input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={podcastMsgs.ACTION_SEARCH}
              className="border-2 border-slate-900 px-12 font-bold focus:translate-y-1 focus:shadow-none"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition"
              size={20}
            />
          </form>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
            <Button type="button" variant="solid" size="md" className="whitespace-nowrap">
              {labels.dashboard?.podcast?.filters?.all || labels.common?.all || 'All'}
            </Button>
            <Button type="button" variant="outline" size="md" className="whitespace-nowrap">
              {labels.dashboard?.podcast?.filters?.beginner ||
                labels.dashboard?.level?.beginner ||
                'Beginner'}
            </Button>
            <Button type="button" variant="outline" size="md" className="whitespace-nowrap">
              {labels.dashboard?.podcast?.dailyConv || 'Daily Conv'}
            </Button>
          </div>
        </div>

        {/* 3. Main Content (Centered) */}
        <div className="space-y-12">
          {/* Featured */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Disc size={20} className="text-indigo-500" />
              <h3 className="font-black text-xl">
                {lastPlayed
                  ? labels.dashboard?.podcast?.continueListening || 'Continue Listening'
                  : labels.dashboard?.podcast?.featured || 'Featured Podcast'}
              </h3>
            </div>
            {renderFeaturedHero()}
          </section>

          {/* My Subscriptions */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Library size={20} className="text-indigo-500" />
              <h3 className="font-black text-xl">
                {labels.dashboard?.podcast?.mySubs || 'My Subscriptions'}
              </h3>
            </div>

            {!user && (
              <Card className="border-2 border-slate-900">
                <CardContent className="p-6 text-center space-y-4">
                  <p className="font-bold text-slate-600">
                    {labels.dashboard?.podcast?.loginRequired || 'Please login first'}
                  </p>
                  <Button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="px-6 py-3 rounded-xl shadow-pop hover:shadow-pop-hover hover:-translate-y-0.5 transition-all"
                  >
                    {labels.login || 'Login'}
                  </Button>
                </CardContent>
              </Card>
            )}

            {user && subscriptionsLoading && (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
              </div>
            )}

            {user && !subscriptionsLoading && subscriptions.length === 0 && (
              <Card className="rounded-[2rem] border-2 border-slate-900 text-slate-400 font-bold text-center">
                <CardContent className="py-12">
                  {labels.dashboard?.podcast?.msg?.EMPTY_SUBSCRIPTIONS || 'No subscriptions yet'}
                </CardContent>
              </Card>
            )}

            {user && !subscriptionsLoading && subscriptions.length > 0 && (
              <div className="relative">
                <div
                  ref={subscriptionsRef}
                  className="flex gap-4 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory"
                >
                  {subscriptions.map(channel => {
                    const channelId = channel.itunesId || channel.id || channel._id;
                    const params = new URLSearchParams();
                    if (channelId) params.set('id', String(channelId));
                    if (channel.feedUrl) params.set('feedUrl', channel.feedUrl);
                    const query = params.toString();
                    return (
                      <Button
                        key={channelId || channel.title}
                        type="button"
                        size="auto"
                        onClick={() => {
                          const finalQuery = query ? `?${query}` : '';
                          navigate(`/podcasts/channel${finalQuery}`, {
                            state: { channel },
                          });
                        }}
                        className="min-w-[220px] max-w-[220px] text-left bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-1 transition flex flex-col gap-3 snap-start font-normal"
                      >
                        <div className="w-full aspect-square rounded-xl border-2 border-slate-100 overflow-hidden bg-slate-50">
                          <img
                            src={
                              channel.artworkUrl ||
                              channel.artwork ||
                              'https://placehold.co/220x220'
                            }
                            alt={channel.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-black text-sm text-slate-900 line-clamp-2">
                            {channel.title}
                          </h4>
                          <p className="text-xs font-bold text-slate-500 line-clamp-1 mt-1">
                            {channel.author}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
                {subscriptionsCanLeft && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => scrollSubscriptions('left')}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
                    aria-label="Scroll left"
                  >
                    ‹
                  </Button>
                )}
                {subscriptionsCanRight && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => scrollSubscriptions('right')}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
                    aria-label="Scroll right"
                  >
                    ›
                  </Button>
                )}
              </div>
            )}
          </section>

          {/* Trending / Editor Picks */}
          <section className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-slate-900">
                <Play size={20} className="text-indigo-500" />
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
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-500 border-2 border-slate-200 hover:border-slate-900'
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
                      ? 'bg-slate-900 text-white'
                      : 'bg-white text-slate-500 border-2 border-slate-200 hover:border-slate-900'
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
                      const params = new URLSearchParams();
                      const channelId = pod.itunesId || pod.id;
                      if (channelId) params.set('id', String(channelId));
                      if (pod.feedUrl) params.set('feedUrl', pod.feedUrl);
                      const query = params.toString();
                      navigate(`/podcasts/channel${query ? `?${query}` : ''}`, {
                        state: { channel: pod },
                      });
                    }}
                    variant="ghost"
                    className="min-w-[220px] max-w-[220px] text-left bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-1 transition flex flex-col gap-3 snap-start font-normal"
                  >
                    <div className="relative w-full aspect-square rounded-xl border-2 border-slate-100 overflow-hidden bg-slate-50">
                      <img
                        src={pod.artworkUrl || pod.artwork || 'https://placehold.co/220x220'}
                        className="w-full h-full object-cover"
                        alt={pod.title}
                      />
                      <Badge
                        className={`absolute top-2 left-2 text-[10px] ${
                          idx < 3 ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600'
                        }`}
                      >
                        #{idx + 1}
                      </Badge>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-sm text-slate-900 line-clamp-2">
                        {pod.title}
                      </h4>
                      {pod.author &&
                        pod.author.trim() &&
                        pod.author.trim().toLowerCase() !== 'unknown' && (
                          <p className="text-xs text-slate-500 line-clamp-1 mt-1">{pod.author}</p>
                        )}
                      {activeTab === 'weekly' && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-[10px]">
                            {pod.views || 0} {labels.dashboard?.podcast?.plays || 'plays'}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] uppercase text-slate-400">
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
                      className="min-w-[220px] max-w-[220px] bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sm snap-start"
                    >
                      <Skeleton className="w-full aspect-square rounded-xl" />
                      <div className="mt-3 space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16 bg-slate-100" />
                      </div>
                    </Card>
                  ))}
              </div>
              {trendingCanLeft && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => scrollTrending('left')}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
                  aria-label="Scroll left"
                >
                  ‹
                </Button>
              )}
              {trendingCanRight && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => scrollTrending('right')}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
                  aria-label="Scroll right"
                >
                  ›
                </Button>
              )}
            </div>

            {!activeLoading && displayedTrending.length === 0 && (
              <Card className="text-center py-8 text-slate-400 font-bold text-sm border-2 border-slate-900">
                {podcastMsgs.EMPTY_TRENDING}
              </Card>
            )}
          </section>

          {/* Listening History */}
          {history.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-slate-900">
                <HistoryIcon size={20} className="text-indigo-500" />
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
                        navigate('/podcasts/player', {
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
                      className="min-w-[260px] max-w-[260px] text-left bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-1 transition cursor-pointer flex gap-3 items-center group snap-start font-normal"
                    >
                      <div className="relative w-14 h-14 shrink-0">
                        <img
                          src={record.channelImage || 'https://placehold.co/100x100'}
                          className="w-full h-full rounded-xl border border-slate-200 object-cover"
                          alt="cover"
                        />
                        <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                          <Play size={16} className="text-white fill-white" />
                        </div>
                      </div>
                      <div className="overflow-hidden flex-1 min-w-0">
                        <div className="text-sm font-bold text-slate-900 truncate mb-1">
                          {record.episodeTitle}
                        </div>
                        <div className="text-xs font-bold text-slate-400 truncate flex items-center gap-1">
                          {record.channelName}
                          <span className="text-slate-300">•</span>
                          {new Date(record.playedAt).toLocaleDateString(
                            localeFromLanguage(language)
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
                {historyCanLeft && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => scrollHistory('left')}
                    className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
                    aria-label="Scroll left"
                  >
                    ‹
                  </Button>
                )}
                {historyCanRight && (
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    onClick={() => scrollHistory('right')}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full shadow-pop hover:scale-105 transition"
                    aria-label="Scroll right"
                  >
                    ›
                  </Button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
