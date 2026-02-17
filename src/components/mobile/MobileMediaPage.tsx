import React, { useState, useMemo } from 'react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { qRef, NoArgs } from '../../utils/convexRefs';
import {
  Video,
  Play,
  Eye,
  Clock,
  Search,
  Disc,
  Library,
  History as HistoryIcon,
  Headphones,
  MonitorPlay,
} from 'lucide-react';
import { clsx } from 'clsx';
import { Button } from '../ui';

// --- TYPES ---

// Video
type ConvexVideoItem = {
  _id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  level: string;
  duration?: number | null;
  views: number;
  createdAt: number;
};

// Podcast
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

// --- SUB-COMPONENTS ---

// 1. VIDEO TAB
const VideoTab: React.FC<{
  active: boolean;
  language: string;
}> = ({ active, language }) => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [activeLevel, setActiveLevel] = useState('');

  const convexVideos = useQuery(
    qRef<{ level?: string }, ConvexVideoItem[]>('videos:list'),
    activeLevel ? { level: activeLevel } : {}
  );

  const videos = useMemo(() => {
    if (!convexVideos) return [];
    return convexVideos.map(v => ({
      ...v,
      id: v._id,
    }));
  }, [convexVideos]);

  const loading = convexVideos === undefined;

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getLevelStyle = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-700 border-green-200 dark:bg-green-400/12 dark:text-green-200 dark:border-green-300/25';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-400/12 dark:text-yellow-200 dark:border-yellow-300/25';
      case 'Advanced':
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-400/12 dark:text-red-200 dark:border-red-300/25';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'Beginner':
        return t('dashboard.video.beginner', { defaultValue: 'Beginner' });
      case 'Intermediate':
        return t('dashboard.video.intermediate', { defaultValue: 'Intermediate' });
      case 'Advanced':
        return t('dashboard.video.advanced', { defaultValue: 'Advanced' });
      default:
        return level;
    }
  };

  const getLocale = (lang: string) => {
    if (lang === 'zh') return 'zh-CN';
    if (lang === 'en') return 'en-US';
    if (lang === 'vi') return 'vi-VN';
    return 'mn-MN';
  };

  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-32 px-6 pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-2">
        {[
          { key: '', label: t('notes.tabs.all', { defaultValue: 'All' }) },
          { key: 'Beginner', label: t('dashboard.video.beginner', { defaultValue: 'Beginner' }) },
          {
            key: 'Intermediate',
            label: t('dashboard.video.intermediate', { defaultValue: 'Intermediate' }),
          },
          { key: 'Advanced', label: t('dashboard.video.advanced', { defaultValue: 'Advanced' }) },
        ].map(level => (
          <Button
            variant="ghost"
            size="auto"
            key={level.key}
            onClick={() => setActiveLevel(level.key)}
            className={clsx(
              'px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap border-2 transition-all',
              activeLevel === level.key
                ? 'bg-indigo-600 text-primary-foreground border-indigo-600 shadow-md transform scale-105 dark:bg-indigo-400/80 dark:border-indigo-300/35'
                : 'bg-card text-muted-foreground border-border'
            )}
          >
            {level.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="bg-card rounded-2xl border-2 border-border overflow-hidden shadow-sm animate-pulse"
            >
              <div className="aspect-video bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Video className="w-16 h-16 mx-auto mb-4 opacity-50" />
          <p className="font-bold">
            {t('dashboard.video.noVideos', { defaultValue: 'No videos found' })}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {videos.map(video => (
            <Button
              variant="ghost"
              size="auto"
              key={video.id}
              onClick={() => navigate(`/video/${video.id}`)}
              className="bg-card rounded-2xl border-2 border-foreground dark:border-border overflow-hidden shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] dark:shadow-[4px_4px_0px_0px_rgba(148,163,184,0.26)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all text-left w-full group block"
            >
              <div className="aspect-video bg-muted relative">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-400/15">
                    <Video className="w-12 h-12 text-indigo-200 dark:text-indigo-200/80" />
                  </div>
                )}

                <div
                  className={clsx(
                    'absolute top-3 left-3 px-2 py-1 text-[10px] font-bold rounded-md border',
                    getLevelStyle(video.level)
                  )}
                >
                  {getLevelLabel(video.level)}
                </div>
                <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-[10px] font-mono rounded-md backdrop-blur-sm">
                  {formatDuration(video.duration)}
                </div>

                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                  <div className="w-12 h-12 bg-card rounded-full flex items-center justify-center shadow-lg border-2 border-foreground transform scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    <Play className="w-5 h-5 text-indigo-600 dark:text-indigo-300 ml-1 fill-indigo-600 dark:fill-indigo-300" />
                  </div>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-black text-foreground text-lg leading-tight mb-2 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-4 font-medium">
                    {video.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    {video.views}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(video.createdAt).toLocaleDateString(getLocale(language), {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

// 2. PODCAST TAB
const PodcastTab: React.FC<{
  active: boolean;
  user: any;
  language: string;
}> = ({ active, user, language }) => {
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'community' | 'weekly'>('community');

  // -- DATA FETCHING --

  // 1. Trending
  type TrendingResult = {
    internal: (PodcastChannel & { _id: string })[];
    external: (PodcastChannel & { _id: string })[];
  };
  const trendingData = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));

  // 2. Subscriptions
  const subscriptionsData = useQuery(
    qRef<NoArgs, PodcastChannel[]>('podcasts:getSubscriptions'),
    user ? {} : 'skip'
  );

  // 3. History
  const historyData = useQuery(
    qRef<NoArgs, (HistoryItem & { _id: string })[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );

  // Derived State
  const trending = useMemo(() => {
    if (!trendingData) return { external: [], internal: [] };
    return {
      internal: trendingData.internal.map(c => ({ ...c, id: c._id })),
      external: trendingData.external.map(c => ({ ...c, id: c._id })),
    };
  }, [trendingData]);

  const subscriptions = useMemo(() => subscriptionsData ?? [], [subscriptionsData]);
  const history = useMemo(() => historyData ?? [], [historyData]);

  // Determine Featured (Last played or Top Trending)
  const lastPlayed = history.length > 0 ? history[0] : null;
  let featuredChannel: PodcastChannel | null = null;
  if (!lastPlayed) {
    if (trending.internal.length > 0) featuredChannel = trending.internal[0];
    else if (trending.external.length > 0) featuredChannel = trending.external[0];
  }

  const listToShow = activeTab === 'community' ? trending.external : trending.internal;

  const getLocale = (lang: string) => {
    if (lang === 'zh') return 'zh-CN';
    if (lang === 'en') return 'en-US';
    if (lang === 'vi') return 'vi-VN';
    return 'mn-MN';
  };

  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-32 px-6 pt-4 animate-in fade-in slide-in-from-left-4 duration-300">
      {/* Quick Filters (Mock for visual parity) */}
      <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar pb-1">
        <Button
          variant="ghost"
          size="auto"
          className="px-4 py-2 bg-primary text-primary-foreground border-2 border-foreground dark:border-border rounded-xl text-xs font-bold whitespace-nowrap"
        >
          All
        </Button>
        <Button
          variant="ghost"
          size="auto"
          className="px-4 py-2 bg-card text-muted-foreground border-2 border-border rounded-xl text-xs font-bold whitespace-nowrap"
        >
          Beginner
        </Button>
        <Button
          variant="ghost"
          size="auto"
          onClick={() => navigate('/podcasts/search')}
          className="ml-auto w-9 h-9 flex items-center justify-center bg-card border-2 border-border rounded-xl text-muted-foreground active:scale-95 transition-transform"
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {/* 1. HERO SECTION */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Disc className="w-5 h-5 text-indigo-500 dark:text-indigo-300 animate-spin-slow" />
          <h3 className="font-black text-xl text-foreground">
            {lastPlayed
              ? t('podcast.nowPlaying', { defaultValue: 'Now Playing' })
              : t('dashboard.podcast.editorPicks', { defaultValue: 'Featured Podcast' })}
          </h3>
        </div>

        {lastPlayed ? (
          <Button
            variant="ghost"
            size="auto"
            onClick={() =>
              navigate('/podcasts/player', {
                state: {
                  episode: {
                    guid: lastPlayed.episodeGuid,
                    title: lastPlayed.episodeTitle,
                    audioUrl: lastPlayed.episodeUrl,
                    channel: { title: lastPlayed.channelName, artworkUrl: lastPlayed.channelImage },
                  },
                },
              })
            }
            className="w-full text-left bg-primary rounded-[2rem] p-6 text-primary-foreground border-2 border-foreground dark:border-border shadow-pop relative overflow-hidden group active:scale-[0.98] transition-all flex items-center gap-5"
          >
            {/* Abstract BG */}
            <div className="absolute right-[-20px] bottom-[-40px] opacity-10 rotate-12 group-active:rotate-45 transition-transform duration-500">
              <Disc size={180} />
            </div>

            <div className="w-20 h-20 rounded-2xl bg-indigo-500 dark:bg-indigo-400/70 border-2 border-white dark:border-indigo-200/35 shadow-lg overflow-hidden shrink-0 relative z-10">
              <img src={lastPlayed.channelImage || ''} className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Play className="w-8 h-8 text-primary-foreground fill-primary-foreground opacity-90" />
              </div>
            </div>

            <div className="flex-1 min-w-0 relative z-10">
              <div className="text-[10px] font-bold text-green-400 dark:text-green-300 mb-1 flex items-center gap-1 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-green-400 dark:bg-green-300 rounded-full animate-pulse"></span>
                {t('common.continue', { defaultValue: 'Continue' })}
              </div>
              <h3 className="text-lg font-black leading-tight mb-1 truncate text-primary-foreground">
                {lastPlayed.episodeTitle}
              </h3>
              <p className="text-primary-foreground/75 text-xs truncate">
                {lastPlayed.channelName}
              </p>
            </div>
          </Button>
        ) : featuredChannel ? (
          <Button
            variant="ghost"
            size="auto"
            onClick={() => {
              const params = new URLSearchParams();
              const cid = featuredChannel?.itunesId || featuredChannel?.id;
              if (cid) params.set('id', String(cid));
              if (featuredChannel?.feedUrl) params.set('feedUrl', featuredChannel.feedUrl);
              navigate(`/podcasts/channel?${params.toString()}`, {
                state: { channel: featuredChannel },
              });
            }}
            className="w-full text-left bg-primary rounded-[2rem] p-6 text-primary-foreground border-2 border-foreground dark:border-border shadow-pop relative overflow-hidden group active:scale-[0.98] transition-all flex items-center gap-5"
          >
            <div className="w-20 h-20 rounded-2xl bg-indigo-500 dark:bg-indigo-400/70 border-2 border-white dark:border-indigo-200/35 shadow-lg overflow-hidden shrink-0 relative z-10">
              <img
                src={featuredChannel.artworkUrl || featuredChannel.artwork || ''}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <div className="text-[10px] font-bold text-yellow-400 dark:text-yellow-300 mb-1 flex items-center gap-1 uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-yellow-400 dark:bg-yellow-300 rounded-full animate-pulse"></span>
                {t('dashboard.podcast.editorPicks', { defaultValue: 'Top Pick' })}
              </div>
              <h3 className="text-lg font-black leading-tight mb-1 truncate text-primary-foreground">
                {featuredChannel.title}
              </h3>
              <p className="text-primary-foreground/75 text-xs truncate">
                {featuredChannel.author}
              </p>
            </div>
          </Button>
        ) : (
          <div className="bg-muted rounded-[2rem] p-6 text-center text-muted-foreground font-bold text-sm">
            {t('loading', { defaultValue: 'Loading...' })}
          </div>
        )}
      </div>

      {/* 2. SUBSCRIPTIONS */}
      {user && subscriptions.length > 0 && (
        <div className="mb-10">
          <div className="flex items-center gap-2 mb-3">
            <Library className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            <h3 className="font-black text-xl text-foreground">
              {t('podcast.mySubscriptions', { defaultValue: 'My Subscriptions' })}
            </h3>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6">
            {subscriptions.map(sub => (
              <Button
                variant="ghost"
                size="auto"
                key={sub.id || sub._id}
                onClick={() => {
                  const params = new URLSearchParams();
                  const cid = sub.itunesId || sub.id || sub._id;
                  if (cid) params.set('id', String(cid));
                  if (sub.feedUrl) params.set('feedUrl', sub.feedUrl);
                  navigate(`/podcasts/channel?${params.toString()}`, { state: { channel: sub } });
                }}
                className="min-w-[140px] max-w-[140px] bg-card p-3 rounded-2xl border-2 border-foreground shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] flex flex-col gap-3 text-left active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all"
              >
                <div className="aspect-square rounded-xl bg-muted border border-border overflow-hidden">
                  <img
                    src={sub.artworkUrl || sub.artwork || ''}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-foreground truncate leading-tight">
                    {sub.title}
                  </h4>
                  {/* <p className="text-[10px] font-bold text-muted-foreground truncate mt-0.5">{sub.author}</p> */}
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 3. TRENDING */}
      <div className="mb-10">
        <div className="flex flex-col mb-4 gap-3">
          <div className="flex items-center gap-2">
            <Headphones className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            <h3 className="font-black text-xl text-foreground">
              {t('podcast.trendingThisWeek', { defaultValue: 'Trending' })}
            </h3>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setActiveTab('community')}
              className={clsx(
                'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors border',
                activeTab === 'community'
                  ? 'bg-primary text-primary-foreground border-foreground dark:border-border'
                  : 'bg-card text-muted-foreground border-border'
              )}
            >
              {t('dashboard.podcast.community', { defaultValue: 'Top Charts' })}
            </Button>
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setActiveTab('weekly')}
              className={clsx(
                'px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide transition-colors border',
                activeTab === 'weekly'
                  ? 'bg-primary text-primary-foreground border-foreground dark:border-border'
                  : 'bg-card text-muted-foreground border-border'
              )}
            >
              {t('dashboard.podcast.editorPicks', { defaultValue: 'Editor Picks' })}
            </Button>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6 snap-x snap-mandatory">
          {listToShow.slice(0, 10).map((pod, idx) => (
            <Button
              variant="ghost"
              size="auto"
              key={pod.id || pod.title}
              onClick={() => {
                const params = new URLSearchParams();
                const cid = pod.itunesId || pod.id;
                if (cid) params.set('id', String(cid));
                if (pod.feedUrl) params.set('feedUrl', pod.feedUrl);
                navigate(`/podcasts/channel?${params.toString()}`, { state: { channel: pod } });
              }}
              className="min-w-[160px] max-w-[160px] snap-start bg-card p-3 rounded-2xl border-2 border-foreground shadow-sm flex flex-col gap-3 text-left relative active:scale-95 transition-transform"
            >
              <span
                className={clsx(
                  'absolute top-2 left-2 text-[10px] font-black px-1.5 py-0.5 rounded shadow-sm z-10',
                  idx < 3
                    ? 'bg-indigo-600 text-primary-foreground dark:bg-indigo-400/80'
                    : 'bg-card text-muted-foreground'
                )}
              >
                #{idx + 1}
              </span>
              <div className="aspect-square rounded-xl bg-muted border border-border overflow-hidden">
                <img
                  src={pod.artworkUrl || pod.artwork || ''}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-foreground truncate leading-tight">
                  {pod.title}
                </h4>
                <p className="text-[10px] font-bold text-muted-foreground truncate mt-0.5">
                  {pod.author}
                </p>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* 4. HISTORY (Recently Played) */}
      {user && history.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <HistoryIcon className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
            <h3 className="font-black text-xl text-foreground">
              {t('podcast.history', { defaultValue: 'History' })}
            </h3>
          </div>
          <div className="space-y-3">
            {history.slice(0, 5).map(record => (
              <Button
                variant="ghost"
                size="auto"
                key={record.id}
                onClick={() =>
                  navigate('/podcasts/player', {
                    state: {
                      episode: {
                        guid: record.episodeGuid,
                        title: record.episodeTitle,
                        audioUrl: record.episodeUrl,
                        channel: { title: record.channelName, artworkUrl: record.channelImage },
                      },
                    },
                  })
                }
                className="w-full bg-card p-3 rounded-2xl border-2 border-border shadow-sm flex items-center gap-3 text-left active:bg-muted transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden shrink-0 border border-border">
                  <img src={record.channelImage || ''} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs text-foreground truncate">
                    {record.episodeTitle}
                  </h4>
                  <p className="text-[10px] font-bold text-muted-foreground truncate mt-0.5">
                    {record.channelName} •{' '}
                    {new Date(record.playedAt).toLocaleDateString(getLocale(language), {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <Play className="w-4 h-4 text-indigo-500 dark:text-indigo-300 fill-indigo-500 dark:fill-indigo-300" />
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---
export const MobileMediaPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'video' | 'podcast'>('video');
  const { user, language } = useAuth();
  const { t } = useTranslation();

  // Auto-update tab based on query param if needed, or simple local state
  // For now simple local state

  return (
    <div className="flex flex-col h-[100dvh] bg-[#F0F4F8] dark:bg-background text-foreground overflow-hidden relative font-sans">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-[0.6] bg-[radial-gradient(#cbd5e1_1.5px,transparent_1.5px)] bg-[length:24px_24px] dark:bg-[radial-gradient(hsl(var(--border))_1.5px,transparent_1.5px)] dark:bg-[length:24px_24px]"></div>

      {/* Header */}
      <header className="px-6 pt-10 pb-4 relative z-10 bg-[#F0F4F8]/95 dark:bg-background/95 backdrop-blur-sm sticky top-0 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-foreground tracking-tight">
            {t('nav.media', { defaultValue: 'Media' })}
          </h1>
          {/* Placeholder for future context button */}
        </div>

        {/* Toggle Switch */}
        <div className="p-1 bg-card rounded-xl border-2 border-foreground shadow-sm flex relative w-full h-12">
          <div
            className="absolute top-1 bottom-1 w-[49%] bg-primary rounded-lg transition-all duration-300 shadow-sm"
            style={{ left: activeTab === 'video' ? '4px' : 'calc(50% + 2px)' }}
          />

          <Button
            variant="ghost"
            size="auto"
            onClick={() => setActiveTab('video')}
            className={clsx(
              'flex-1 relative z-10 flex items-center justify-center gap-2 text-sm font-bold transition-colors',
              activeTab === 'video' ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            <MonitorPlay className="w-4 h-4" />
            {activeTab === 'video' && t('nav.videos', { defaultValue: 'Videos' })}
          </Button>

          <Button
            variant="ghost"
            size="auto"
            onClick={() => setActiveTab('podcast')}
            className={clsx(
              'flex-1 relative z-10 flex items-center justify-center gap-2 text-sm font-bold transition-colors',
              activeTab === 'podcast' ? 'text-primary-foreground' : 'text-muted-foreground'
            )}
          >
            <Headphones className="w-4 h-4" />
            {activeTab === 'podcast' && t('nav.podcasts', { defaultValue: 'Podcasts' })}
          </Button>
        </div>
      </header>

      {/* Content Container */}
      <main className="flex-1 overflow-hidden relative z-0 w-full">
        <VideoTab active={activeTab === 'video'} language={language} />

        <PodcastTab active={activeTab === 'podcast'} user={user} language={language} />
      </main>
    </div>
  );
};
