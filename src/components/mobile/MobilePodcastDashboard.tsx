import React, { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import { Disc, Search, ArrowLeft, Pause, PlayCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { Button, Input } from '../ui';

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
  { key: 'all', label: 'All' },
  { key: 'beginner', label: 'Beginner' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'daily', label: 'Daily' },
  { key: 'news', label: 'News' },
];

export const MobilePodcastDashboard: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTab, setTrendingTab] = useState<'all' | 'picks'>('all');

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

  const navigateToChannel = (channel: PodcastChannel) => {
    const params = new URLSearchParams();
    const channelId = channel.itunesId || channel.id || channel._id;
    if (channelId) params.set('id', String(channelId));
    if (channel.feedUrl) params.set('feedUrl', channel.feedUrl);
    const queryString = params.toString();
    const path = queryString ? `/podcasts/channel?${queryString}` : '/podcasts/channel';
    navigate(path, { state: { channel } });
  };

  const navigateToEpisode = (item: HistoryItem) => {
    navigate('/podcasts/player', {
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

  return (
    <div className="min-h-screen bg-muted pb-28">
      {/* Header */}
      <header className="bg-card px-5 pt-5 pb-4 border-b border-border sticky top-0 z-20">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate('/dashboard')}
            className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-extrabold text-foreground">{t('podcast.title')}</h1>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <Input
            type="text"
            placeholder={t('podcast.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full !h-auto !bg-muted !rounded-lg !py-2.5 !pl-9 !pr-4 text-sm font-medium focus-visible:!ring-2 focus-visible:!ring-primary/30 transition-all !border-0 !shadow-none"
          />
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
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
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Continue Listening (Compact Hero) */}
      {latestHistory && (
        <div className="px-5 py-3">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigateToEpisode(latestHistory)}
            className="w-full bg-primary rounded-xl p-3 !flex items-center gap-3 text-primary-foreground text-left active:scale-[0.99] transition-transform"
          >
            <div
              className="w-12 h-12 bg-indigo-500 dark:bg-indigo-400/70 rounded-lg shrink-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${latestHistory.channelImage || '/logo.png'})` }}
            />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-green-400 dark:text-green-300 mb-0.5">
                {t('podcast.nowPlaying')}
              </div>
              <h3 className="font-bold text-sm truncate">{latestHistory.episodeTitle}</h3>
              <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                <div className="h-full bg-green-400 dark:bg-green-300 w-1/2" />
              </div>
            </div>
            <div className="w-9 h-9 bg-card rounded-full flex items-center justify-center text-foreground">
              <Pause className="w-4 h-4 fill-current" />
            </div>
          </Button>
        </div>
      )}

      {/* Subscriptions Row */}
      {user && subscriptions.length > 0 && (
        <section className="pt-2 pb-2">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-bold text-foreground text-sm">{t('podcast.mySubscriptions')}</h2>
            <Button
              variant="ghost"
              size="auto"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-300"
            >
              {t('podcast.viewAll')}
            </Button>
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
              All
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
              Picks
            </Button>
          </div>
        </div>
        <div
          className="flex gap-3 overflow-x-auto px-5"
          style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
                style={{ backgroundImage: `url(${pod.artworkUrl || pod.artwork || '/logo.png'})` }}
              />
              <h4 className="font-bold text-xs text-foreground truncate">{pod.title}</h4>
              <p className="text-[10px] text-muted-foreground font-medium truncate">{pod.author}</p>
            </Button>
          ))}
          {trending.length === 0 && !trendingData && (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="min-w-[120px] animate-pulse">
                  <div className="w-full aspect-square bg-muted rounded-lg mb-2" />
                  <div className="h-3 bg-muted rounded w-3/4 mb-1" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {/* History Section */}
      {history.length > 1 && (
        <section className="pt-4 pb-6">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-bold text-foreground text-sm">{t('podcast.history')}</h2>
            <Button
              variant="ghost"
              size="auto"
              className="text-xs font-bold text-indigo-600 dark:text-indigo-300"
            >
              {t('podcast.clear')}
            </Button>
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
                    {item.channelName} · {new Date(item.playedAt).toLocaleDateString()}
                  </p>
                </div>
                <PlayCircle className="w-6 h-6 text-muted-foreground" />
              </Button>
            ))}
          </div>
        </section>
      )}

      {/* Floating Mini Player (Placeholder) */}
      {latestHistory && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigateToEpisode(latestHistory)}
            className="w-full bg-primary rounded-xl p-2.5 !flex items-center gap-2 shadow-xl active:scale-[0.99] transition-transform"
          >
            <div
              className="w-9 h-9 bg-indigo-500 dark:bg-indigo-400/70 rounded-lg flex items-center justify-center bg-cover bg-center"
              style={{ backgroundImage: `url(${latestHistory.channelImage || '/logo.png'})` }}
            >
              <Disc
                className="w-4 h-4 text-white animate-spin"
                style={{ animationDuration: '3s' }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-primary-foreground text-xs truncate">
                {latestHistory.episodeTitle}
              </h4>
              <div className="h-1 bg-muted rounded-full mt-1 overflow-hidden">
                <div className="h-full bg-green-400 dark:bg-green-300 w-1/2" />
              </div>
            </div>
            <span className="w-8 h-8 bg-card rounded-full flex items-center justify-center text-foreground">
              <Pause className="w-3 h-3 fill-current" />
            </span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default MobilePodcastDashboard;
