import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { Search, ArrowLeft, PlayCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolveSafeReturnTo } from '../../utils/navigation';
import { buildPodcastChannelPath, buildPodcastSearchPath } from '../../utils/podcastRoutes';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { Button, Input } from '../ui';
import { motion } from 'framer-motion';

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
  level?: string;
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

const FILTER_OPTIONS = [
  { key: 'all', labelKey: 'podcast.filterOptions.all' },
  { key: 'beginner', labelKey: 'podcast.filterOptions.beginner' },
  { key: 'intermediate', labelKey: 'podcast.filterOptions.intermediate' },
  { key: 'daily', labelKey: 'podcast.filterOptions.daily' },
  { key: 'news', labelKey: 'podcast.filterOptions.news' },
];

export const MobilePodcastDashboard: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTab, setTrendingTab] = useState<'all' | 'picks'>('all');
  const backPath = useMemo(() => {
    return resolveSafeReturnTo(searchParams.get('returnTo'), '/media?tab=podcasts');
  }, [searchParams]);
  const currentPath = `${location.pathname}${location.search}`;

  // Data Fetching
  type TrendingResult = {
    internal: (PodcastChannel & { _id: string })[];
    external: (PodcastChannel & { _id: string })[];
  };
  const trendingData = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));
  const historyData = useQuery(
    qRef<NoArgs, (HistoryItem & { _id: string })[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );
  const subscriptionsData = useQuery(
    qRef<NoArgs, PodcastChannel[]>('podcasts:getSubscriptions'),
    user ? {} : 'skip'
  );

  const history = useMemo(() => historyData?.map(h => ({ ...h, id: h._id })) ?? [], [historyData]);
  const subscriptions = useMemo(() => subscriptionsData ?? [], [subscriptionsData]);
  const trending = useMemo(() => {
    if (!trendingData) return [];
    return trendingTab === 'all'
      ? [...trendingData.internal, ...trendingData.external].slice(0, 10)
      : trendingData.internal.slice(0, 5);
  }, [trendingData, trendingTab]);

  const latestHistory = history[0];
  const loadingTrending = trendingData === undefined;
  const loadingHistory = Boolean(user) && historyData === undefined;
  const loadingSubscriptions = Boolean(user) && subscriptionsData === undefined;
  const [showLoadingIssue, setShowLoadingIssue] = useState(false);

  useEffect(() => {
    const isLoading = loadingTrending || loadingHistory || loadingSubscriptions;
    if (!isLoading) return;
    const timer = globalThis.setTimeout(() => {
      setShowLoadingIssue(true);
    }, 7000);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [loadingTrending, loadingHistory, loadingSubscriptions]);

  const retryLoading = () => {
    setShowLoadingIssue(false);
    if (typeof window !== 'undefined') window.location.reload();
  };
  const isLoadingAny = loadingTrending || loadingHistory || loadingSubscriptions;
  const shouldShowLoadingIssue = isLoadingAny && showLoadingIssue;

  const navigateToChannel = (channel: PodcastChannel) => {
    navigate(buildPodcastChannelPath(channel, currentPath), { state: { channel } });
  };

  const navigateToEpisode = (item: HistoryItem) => {
    navigate(`/podcasts/player?returnTo=${encodeURIComponent(currentPath)}`, {
      state: {
        episode: {
          guid: item.episodeGuid,
          title: item.episodeTitle,
          audioUrl: item.episodeUrl,
          channel: {
            title: item.channelName,
            artworkUrl: item.channelImage,
          },
        },
      },
    });
  };

  const handleSearchSubmit = () => {
    const target = buildPodcastSearchPath(searchQuery, currentPath);
    if (!target) return;
    navigate(target);
  };

  return (
    <div className="min-h-screen bg-muted pb-[130px]">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-xl px-6 pt-[calc(env(safe-area-inset-top)+12px)] pb-6 border-b border-border/40 sticky top-0 z-30 rounded-b-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate(backPath)}
            className="w-10 h-10 rounded-2xl bg-muted/50 flex items-center justify-center active:scale-95 transition-all border border-border/20"
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={3} />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground italic tracking-tighter leading-none">
              {t('podcast.title', { defaultValue: 'Podcast' })}
            </h1>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder={t('podcast.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={event => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              handleSearchSubmit();
            }}
            className="w-full !h-12 !bg-muted/50 !rounded-2xl !py-3 !pl-11 !pr-4 text-sm font-bold focus-visible:!ring-2 focus-visible:!ring-primary/30 transition-all !border-border/20 !shadow-none"
          />
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={handleSearchSubmit}
            disabled={!searchQuery.trim()}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-7 w-7 rounded-md p-0 text-muted-foreground disabled:opacity-50"
            aria-label={t('search', { defaultValue: 'Search' })}
          >
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Filter Chips */}
      <div
        className="px-5 py-3 flex gap-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {FILTER_OPTIONS.map(opt => (
          <Button
            variant="ghost"
            size="auto"
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              filter === opt.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {t(opt.labelKey, { defaultValue: opt.key })}
          </Button>
        ))}
      </div>

      {shouldShowLoadingIssue && (
        <div className="px-5 py-2">
          <div className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-sm font-bold text-muted-foreground mb-3">
              {t('podcast.loadError', {
                defaultValue: 'Unable to load podcast data right now.',
              })}
            </p>
            <Button
              variant="ghost"
              size="auto"
              onClick={retryLoading}
              className="h-11 px-4 rounded-xl border border-border bg-background font-bold"
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          </div>
        </div>
      )}

      {/* Continue Listening (2.0 Hero) */}
      {latestHistory && (
        <div className="px-6 py-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigateToEpisode(latestHistory)}
            className="w-full bg-indigo-600 rounded-[2rem] p-6 !flex items-center gap-4 text-white text-left active:scale-[0.98] transition-all shadow-xl shadow-indigo-600/20 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[40px] rounded-full -mr-16 -mt-16" />

            <div
              className="w-16 h-16 bg-black/20 rounded-2xl shrink-0 bg-cover bg-center border border-white/20 shadow-lg relative z-10"
              style={{ backgroundImage: `url(${latestHistory.channelImage || '/logo.png'})` }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                <PlayCircle className="w-8 h-8 text-white fill-current" />
              </div>
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">
                  {t('podcast.nowPlaying', { defaultValue: 'Resuming' })}
                </span>
              </div>
              <h3 className="font-black text-lg italic tracking-tight leading-tight line-clamp-1 mb-2">
                {latestHistory.episodeTitle}
              </h3>
              <div className="h-1.5 bg-black/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '45%' }} // Simulated progress
                  className="h-full bg-green-400 rounded-full"
                />
              </div>
            </div>
          </Button>
        </div>
      )}

      {/* Subscriptions Row */}
      {user && loadingSubscriptions && (
        <section className="pt-2 pb-2">
          <div className="px-5 mb-3 h-4 w-36 bg-muted rounded animate-pulse" />
          <div className="flex gap-3 overflow-x-auto px-5" style={{ scrollbarWidth: 'none' }}>
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[100px] animate-pulse">
                <div className="w-16 h-16 mx-auto bg-muted rounded-xl mb-2" />
                <div className="h-3 bg-muted rounded w-20 mx-auto" />
              </div>
            ))}
          </div>
        </section>
      )}

      {user && !loadingSubscriptions && subscriptions.length > 0 && (
        <section className="pt-2 pb-2">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-bold text-foreground text-sm">{t('podcast.mySubscriptions')}</h2>
          </div>
          <div
            className="flex gap-3 overflow-x-auto px-5"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {subscriptions.map(sub => (
              <Button
                variant="ghost"
                size="auto"
                key={sub.id || sub._id}
                onClick={() => navigateToChannel(sub)}
                className="min-w-[100px] text-center snap-start !flex !flex-col !items-center !whitespace-normal"
              >
                <div
                  className="w-16 h-16 mx-auto bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-400/16 dark:to-indigo-500/20 rounded-xl mb-2 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${sub.artworkUrl || sub.artwork || '/logo.png'})`,
                  }}
                />
                <span className="text-xs font-bold text-foreground line-clamp-1">{sub.title}</span>
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Trending Row */}
      <section className="pt-4 pb-2">
        <div className="flex items-center justify-between px-5 mb-3">
          <h2 className="font-bold text-foreground text-sm">{t('podcast.trendingThisWeek')}</h2>
          <div className="flex bg-muted p-0.5 rounded-md">
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setTrendingTab('all')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                trendingTab === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {t('podcast.filterOptions.all', { defaultValue: 'All' })}
            </Button>
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setTrendingTab('picks')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                trendingTab === 'picks'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {t('podcast.filterOptions.picks', { defaultValue: 'Picks' })}
            </Button>
          </div>
        </div>
        {loadingTrending ? (
          <div
            className="flex gap-3 overflow-x-auto px-5"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[120px] animate-pulse">
                <div className="w-full aspect-square bg-muted rounded-lg mb-2" />
                <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div className="px-5">
            <div className="rounded-xl border border-border bg-card p-4 text-center text-sm font-bold text-muted-foreground">
              {t('podcast.emptyTrending', {
                defaultValue: 'No trending podcasts available right now.',
              })}
            </div>
          </div>
        ) : (
          <div
            className="flex gap-3 overflow-x-auto px-5"
            style={{
              scrollSnapType: 'x mandatory',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {trending.map((pod, idx) => (
              <Button
                variant="ghost"
                size="auto"
                key={pod.id || pod._id}
                onClick={() => navigateToChannel(pod)}
                className="min-w-[120px] bg-card rounded-xl border border-border p-2.5 text-left snap-start relative active:scale-[0.98] transition-transform !block !whitespace-normal"
              >
                <span className="absolute top-1.5 left-1.5 bg-indigo-600 dark:bg-indigo-400/75 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
                <div
                  className="w-full aspect-square bg-gradient-to-br from-rose-100 to-rose-200 dark:from-rose-400/16 dark:to-rose-500/20 rounded-lg mb-2 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${pod.artworkUrl || pod.artwork || '/logo.png'})`,
                  }}
                />
                <h4 className="font-bold text-xs text-foreground truncate">{pod.title}</h4>
                <p className="text-[10px] text-muted-foreground font-medium truncate">
                  {pod.author}
                </p>
              </Button>
            ))}
          </div>
        )}
      </section>

      {/* History Section */}
      {history.length > 1 && (
        <section className="pt-4 pb-6">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-bold text-foreground text-sm">{t('podcast.history')}</h2>
          </div>
          <div className="px-5 space-y-2">
            {history.slice(1, 4).map(item => (
              <Button
                variant="ghost"
                size="auto"
                key={item.id}
                onClick={() => navigateToEpisode(item)}
                className="w-full bg-card rounded-xl border border-border p-3 !flex items-center gap-3 text-left active:bg-muted transition-colors"
              >
                <div
                  className="w-10 h-10 bg-muted rounded-lg shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${item.channelImage || '/logo.png'})` }}
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-foreground text-sm truncate">
                    {item.episodeTitle}
                  </h4>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {item.channelName} ·{' '}
                    {formatSafeDateLabel(
                      item.playedAt,
                      undefined,
                      t('common.recently', { defaultValue: 'Recently' })
                    )}
                  </p>
                </div>
                <PlayCircle className="w-6 h-6 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default MobilePodcastDashboard;
