import React, { useCallback, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { qRef, NoArgs } from '../../utils/convexRefs';
import {
  Video as VideoIcon,
  Play,
  Eye,
  Clock,
  Search,
  Disc,
  Library,
  History as HistoryIcon,
  Headphones,
  MonitorPlay,
  BookOpen,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui';
import { buildVideoPlayerPath } from '../../utils/videoRoutes';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { MobileReadingDiscoveryView } from './MobileReadingDiscoveryView';
import { MobileSectionHeader } from './MobileSectionHeader';
import { MobileStateCard } from './MobileStateCard';
import { motion } from 'framer-motion';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';

// --- TYPES ---
type ActiveTab = 'video' | 'podcast' | 'reading';

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

const getTrendingList = (
  activeTab: 'community' | 'weekly',
  trending: { external: PodcastChannel[]; internal: PodcastChannel[] }
): PodcastChannel[] => {
  if (activeTab === 'community') return trending.external;
  return trending.internal;
};

function getArtworkUrl(...candidates: Array<string | undefined | null>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return null;
}

// --- SUB-COMPONENTS ---

// 1. VIDEO TAB
const VideoTab: React.FC<{
  active: boolean;
  language: string;
}> = ({ active, language }) => {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [activeLevel, setActiveLevel] = React.useState('');
  const currentPath = `${location.pathname}${location.search}`;

  const convexVideos = useQuery(
    qRef<{ level?: string }, ConvexVideoItem[]>('videos:list'),
    activeLevel ? { level: activeLevel } : {}
  );

  const videos = useMemo(() => {
    if (!convexVideos) return [];
    return convexVideos.map(v => ({
      ...v,
      id: v._id,
      thumbnailUrl: normalizePublicAssetUrl(v.thumbnailUrl) || undefined,
    }));
  }, [convexVideos]);

  const loading = convexVideos === undefined;
  const hasVideoError = !loading && activeLevel !== '' && videos.length === 0;

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-6 pb-mobile-nav pt-4 animate-in fade-in slide-in-from-right-4 duration-300">
      <section className="mb-6 rounded-[2.5rem] border border-border bg-card/50 p-6 shadow-sm backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 shadow-sm dark:border-indigo-400/20 dark:bg-slate-900/70 dark:text-indigo-200">
              <MonitorPlay className="h-3.5 w-3.5" />
              {t('nav.videos', { defaultValue: 'Videos' })}
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-black leading-[1.15] text-foreground tracking-tight italic text-balance">
              {t('media.videoLeadTitle', {
                defaultValue: 'Watch short lessons that fit your level',
              })}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-muted-foreground opacity-80">
              {t('media.videoLeadSubtitle', {
                defaultValue:
                  'Filter by difficulty, keep your place, and jump straight into the next useful clip.',
              })}
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            <VideoIcon className="h-3.5 w-3.5" />
            {loading
              ? t('loading', { defaultValue: '...' })
              : t('media.videoCountLabel', {
                  defaultValue: '{{count}} Lessons',
                  count: videos.length,
                })}
          </div>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setActiveLevel('')}
            className="flex h-9 items-center gap-1 rounded-xl border border-border bg-background px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm active:scale-95 transition-all"
          >
            <Sparkles className="h-3 w-3" />
            {t('common.reset', { defaultValue: 'All' })}
          </Button>
        </div>

        <div
          className="mt-6 flex gap-2 overflow-x-auto no-scrollbar pb-1"
          style={{ touchAction: 'pan-x' }}
        >
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
              className={cn(
                'rounded-2xl border px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] whitespace-nowrap transition-all italic',
                activeLevel === level.key
                  ? 'border-indigo-600 bg-indigo-600 text-white shadow-sm dark:border-indigo-400 dark:bg-indigo-500'
                  : 'border-border bg-card/60 text-muted-foreground'
              )}
            >
              {level.label}
            </Button>
          ))}
        </div>
      </section>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm animate-pulse dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="aspect-video bg-muted" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-20 rounded-full bg-muted" />
                <div className="h-5 w-3/4 rounded-full bg-muted" />
                <div className="h-3 w-1/2 rounded-full bg-muted" />
                <div className="flex gap-2 pt-2">
                  <div className="h-9 w-24 rounded-2xl bg-muted" />
                  <div className="h-9 w-24 rounded-2xl bg-muted" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <MobileStateCard
          icon={<VideoIcon className="h-7 w-7" />}
          title={
            hasVideoError
              ? t('dashboard.video.noVideosForLevel', {
                  defaultValue: 'No videos found for this level. Try another filter.',
                })
              : t('dashboard.video.noVideos', { defaultValue: 'No videos found' })
          }
          description={t('media.videoEmptyHint', {
            defaultValue: 'Try another level or reset filters to browse the full lesson library.',
          })}
          action={
            hasVideoError ? (
              <Button
                variant="ghost"
                size="auto"
                onClick={() => setActiveLevel('')}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-[0.15em] text-foreground shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                {t('common.viewAll', { defaultValue: 'View All' })}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {videos.map(video => (
            <button
              key={video.id}
              onClick={() => navigate(buildVideoPlayerPath(video.id, currentPath))}
              className="group relative w-full overflow-hidden rounded-[2.5rem] border border-border bg-card p-0 text-left shadow-sm active:scale-[0.98] transition-all"
            >
              <div className="relative aspect-video w-full overflow-hidden">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-slate-900">
                    <VideoIcon className="h-12 w-12 text-muted-foreground/30" />
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 transition-opacity group-hover:opacity-80" />

                <div className="absolute left-4 top-4">
                  <div
                    className={cn(
                      'rounded-full border border-white/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white backdrop-blur-md',
                      'bg-black/20'
                    )}
                  >
                    {getLevelLabel(video.level)}
                  </div>
                </div>

                <div className="absolute bottom-4 right-4 rounded-full bg-black/60 px-3 py-1 text-[10px] font-mono text-white backdrop-blur-md">
                  {formatDuration(video.duration)}
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-xl border border-white/30 scale-90 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    <Play className="h-6 w-6 fill-current" />
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-black leading-tight text-foreground tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="mt-2 text-sm font-semibold leading-relaxed text-muted-foreground line-clamp-2">
                    {video.description}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-4">
                  <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-3.5 w-3.5" />
                      {video.views}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {formatSafeDateLabel(
                        video.createdAt,
                        getLocale(language),
                        t('common.recently', { defaultValue: 'Recently' }),
                        { month: 'short', day: 'numeric' }
                      )}
                    </span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-muted-foreground group-active:translate-x-1 transition-transform">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </button>
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
  const location = useLocation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<'community' | 'weekly'>('community');
  const currentPath = `${location.pathname}${location.search}`;

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
    if (!trendingData || typeof trendingData !== 'object') {
      return { external: [], internal: [] };
    }
    const internal = Array.isArray(trendingData.internal) ? trendingData.internal : [];
    const external = Array.isArray(trendingData.external) ? trendingData.external : [];
    return {
      internal: internal.map(c => ({ ...c, id: c._id })),
      external: external.map(c => ({ ...c, id: c._id })),
    };
  }, [trendingData]);

  const subscriptions = useMemo(() => subscriptionsData ?? [], [subscriptionsData]);
  const history = useMemo(() => historyData ?? [], [historyData]);

  // Determine Featured (Last played or Top Trending)
  const lastPlayed = history.at(0) ?? null;
  let featuredChannel: PodcastChannel | null = null;
  if (!lastPlayed) {
    if (trending.internal.length > 0) featuredChannel = trending.internal[0];
    else if (trending.external.length > 0) featuredChannel = trending.external[0];
  }

  const listToShow = getTrendingList(activeTab, trending);
  const loadingTrending = trendingData === undefined;

  const getLocale = (lang: string) => {
    if (lang === 'zh') return 'zh-CN';
    if (lang === 'en') return 'en-US';
    if (lang === 'vi') return 'vi-VN';
    return 'mn-MN';
  };

  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar px-6 pb-mobile-nav pt-4 animate-in fade-in slide-in-from-left-4 duration-300">
      <section className="mb-6 rounded-[2.5rem] border border-border bg-card/50 p-6 shadow-sm backdrop-blur-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 shadow-sm dark:border-indigo-400/20 dark:bg-slate-900/70 dark:text-indigo-200">
              <Headphones className="h-3.5 w-3.5" />
              {t('nav.podcasts', { defaultValue: 'Podcasts' })}
            </div>
            <h2 className="mt-4 text-xl sm:text-2xl font-black leading-[1.15] text-foreground tracking-tight italic text-balance">
              {t('media.podcastLeadTitle', {
                defaultValue: 'Keep your listening streak moving',
              })}
            </h2>
            <p className="mt-3 text-sm font-semibold leading-relaxed text-muted-foreground opacity-80">
              {t('media.podcastLeadSubtitle', {
                defaultValue:
                  'Resume what you started, scan subscriptions, and discover the next useful channel.',
              })}
            </p>
          </div>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => navigate(`/podcasts/search?returnTo=${encodeURIComponent(currentPath)}`)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-sm transition-transform active:scale-95 transition-all"
            aria-label={t('common.search', { defaultValue: 'Search' })}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <span className="inline-flex whitespace-nowrap rounded-2xl border border-border bg-indigo-50/50 dark:bg-indigo-900/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
            {t('podcast.filterOptions.all', { defaultValue: 'All' })}
          </span>
          <span className="inline-flex whitespace-nowrap rounded-2xl border border-border bg-card/60 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground italic">
            {t('podcast.filterOptions.beginner', { defaultValue: 'Easy' })}
          </span>
        </div>
      </section>

      {/* 1. HERO SECTION */}
      <div className="mb-10">
        <MobileSectionHeader
          className="mb-3"
          title={
            lastPlayed
              ? t('podcast.nowPlaying', { defaultValue: 'Now Playing' })
              : t('dashboard.podcast.editorPicks', { defaultValue: 'Featured Podcast' })
          }
          badge={
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
              <Disc className="h-5 w-5 animate-spin-slow" />
            </div>
          }
        />

        {lastPlayed ? (
          <Button
            variant="outline"
            size="auto"
            onClick={() =>
              navigate(`/podcasts/player?returnTo=${encodeURIComponent(currentPath)}`, {
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
            className="group relative flex w-full flex-col overflow-hidden rounded-[2.5rem] border border-border bg-indigo-600 p-8 text-left shadow-lg active:scale-[0.98] transition-all"
          >
            <div className="absolute right-[-40px] top-[-40px] opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-1000">
              <Disc size={240} />
            </div>

            <div className="relative z-10 flex w-full items-start justify-between">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-black/20 shadow-xl">
                {getArtworkUrl(lastPlayed.channelImage) ? (
                  <img
                    src={getArtworkUrl(lastPlayed.channelImage) || undefined}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Headphones className="h-10 w-10 text-white/40" />
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20">
                <Play className="h-6 w-6 fill-current" />
              </div>
            </div>

            <div className="relative z-10 mt-8 w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">
                  {t('common.continue', { defaultValue: 'Resuming' })}
                </span>
              </div>
              <h3 className="line-clamp-2 text-xl sm:text-2xl font-black italic tracking-tight text-white mb-1 leading-tight">
                {lastPlayed.episodeTitle}
              </h3>
              <p className="text-sm font-semibold text-indigo-100/70 truncate">
                {lastPlayed.channelName}
              </p>
            </div>
          </Button>
        ) : featuredChannel ? (
          <Button
            variant="outline"
            size="auto"
            onClick={() => {
              const params = new URLSearchParams();
              const cid = featuredChannel?.itunesId || featuredChannel?.id;
              if (cid) params.set('id', String(cid));
              if (featuredChannel?.feedUrl) params.set('feedUrl', featuredChannel.feedUrl);
              params.set('returnTo', currentPath);
              navigate(`/podcasts/channel?${params.toString()}`, {
                state: { channel: featuredChannel },
              });
            }}
            className="group relative flex w-full flex-col overflow-hidden rounded-[2.5rem] border border-border bg-slate-900 p-8 text-left shadow-lg active:scale-[0.98] transition-all"
          >
            <div className="relative z-10 flex w-full items-start justify-between">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/5 shadow-xl">
                {getArtworkUrl(featuredChannel.artworkUrl, featuredChannel.artwork) ? (
                  <img
                    src={
                      getArtworkUrl(featuredChannel.artworkUrl, featuredChannel.artwork) ||
                      undefined
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Headphones className="h-10 w-10 text-white/40" />
                )}
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md border border-white/20">
                <Play className="h-6 w-6 fill-current ml-1" />
              </div>
            </div>

            <div className="relative z-10 mt-8 w-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {t('dashboard.podcast.editorPicks', { defaultValue: 'Top Pick' })}
                </span>
              </div>
              <h3 className="line-clamp-2 text-xl sm:text-2xl font-black italic tracking-tight text-white mb-1 leading-tight">
                {featuredChannel.title}
              </h3>
              <p className="text-sm font-semibold text-slate-400 truncate">
                {featuredChannel.author}
              </p>
            </div>
          </Button>
        ) : (
          <MobileStateCard
            className="px-6 py-6"
            title={t('loading', { defaultValue: 'Loading...' })}
          />
        )}
      </div>

      {/* 2. SUBSCRIPTIONS */}
      {subscriptions.length > 0 && (
        <div className="mb-10">
          <MobileSectionHeader
            className="mb-3"
            title={t('podcast.mySubscriptions', { defaultValue: 'My Subscriptions' })}
            badge={
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
                <Library className="h-5 w-5" />
              </div>
            }
          />
          <div
            className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6"
            style={{ touchAction: 'pan-x' }}
          >
            {subscriptions.map(sub => (
              <Button
                variant="outline"
                size="auto"
                key={sub.id || sub._id}
                onClick={() => {
                  const params = new URLSearchParams();
                  const cid = sub.itunesId || sub.id || sub._id;
                  if (cid) params.set('id', String(cid));
                  if (sub.feedUrl) params.set('feedUrl', sub.feedUrl);
                  params.set('returnTo', currentPath);
                  navigate(`/podcasts/channel?${params.toString()}`, { state: { channel: sub } });
                }}
                className="flex min-w-[140px] max-w-[140px] flex-col gap-3 rounded-[2rem] border border-border bg-card p-3 text-left shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-900 border border-border overflow-hidden">
                  {getArtworkUrl(sub.artworkUrl, sub.artwork) ? (
                    <img
                      src={getArtworkUrl(sub.artworkUrl, sub.artwork) || undefined}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                    />
                  ) : null}
                </div>
                <div className="px-1">
                  <h4 className="font-black text-xs text-foreground truncate leading-tight tracking-tight">
                    {sub.title}
                  </h4>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* 3. TRENDING */}
      <div className="mb-10">
        <div className="mb-4 flex flex-col gap-3">
          <MobileSectionHeader
            title={t('podcast.trendingThisWeek', { defaultValue: 'Trending' })}
            badge={
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
                <Headphones className="h-5 w-5" />
              </div>
            }
          />
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="auto"
              onClick={() => setActiveTab('community')}
              className={cn(
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
              className={cn(
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

        {loadingTrending ? (
          <div
            className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6"
            style={{ touchAction: 'pan-x' }}
          >
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-[224px] min-w-[172px] max-w-[172px] rounded-[1.75rem] border border-slate-200 bg-white animate-pulse dark:border-slate-800 dark:bg-slate-950"
              />
            ))}
          </div>
        ) : listToShow.length === 0 ? (
          <MobileStateCard
            className="px-6 py-10"
            title={t('podcast.emptyTrending', {
              defaultValue: 'No trending podcasts available right now.',
            })}
          />
        ) : (
          <div
            className="flex gap-4 overflow-x-auto pb-6 no-scrollbar -mx-6 px-6 snap-x snap-mandatory"
            style={{ touchAction: 'pan-x' }}
          >
            {listToShow.slice(0, 10).map((pod, idx) => (
              <Button
                variant="outline"
                size="auto"
                key={pod.id || pod.title}
                onClick={() => {
                  const params = new URLSearchParams();
                  const cid = pod.itunesId || pod.id;
                  if (cid) params.set('id', String(cid));
                  if (pod.feedUrl) params.set('feedUrl', pod.feedUrl);
                  params.set('returnTo', currentPath);
                  navigate(`/podcasts/channel?${params.toString()}`, { state: { channel: pod } });
                }}
                className="relative flex min-w-[170px] max-w-[170px] snap-start flex-col gap-3 rounded-[2rem] border border-border bg-card p-3 text-left shadow-sm active:scale-[0.98] transition-all"
              >
                <span
                  className={cn(
                    'absolute top-4 left-4 text-[9px] font-black px-2 py-0.5 rounded-full shadow-md z-10 border border-white/20 backdrop-blur-md',
                    idx < 3 ? 'bg-indigo-600 text-white' : 'bg-card text-muted-foreground'
                  )}
                >
                  #{idx + 1}
                </span>
                <div className="aspect-square rounded-2xl bg-slate-100 dark:bg-slate-900 border border-border overflow-hidden">
                  {getArtworkUrl(pod.artworkUrl, pod.artwork) ? (
                    <img
                      src={getArtworkUrl(pod.artworkUrl, pod.artwork) || undefined}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="px-1 mb-1">
                  <h4 className="font-black text-xs text-foreground truncate leading-tight tracking-tight">
                    {pod.title}
                  </h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground truncate mt-1">
                    {pod.author}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* 4. HISTORY (Recently Played) */}
      {history.length > 1 && (
        <div className="mb-4">
          <MobileSectionHeader
            className="mb-3"
            title={t('podcast.history', { defaultValue: 'History' })}
            badge={
              <div className="grid h-10 w-10 place-items-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
                <HistoryIcon className="h-5 w-5" />
              </div>
            }
          />
          <div className="space-y-3">
            {history.slice(1, 6).map(record => (
              <Button
                variant="outline"
                size="auto"
                key={record.id || record._id || record.episodeGuid || record.episodeTitle}
                onClick={() =>
                  navigate(`/podcasts/player?returnTo=${encodeURIComponent(currentPath)}`, {
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
                className="flex w-full items-center gap-4 rounded-[1.75rem] border border-border bg-card p-4 text-left shadow-sm active:scale-[0.98] transition-all"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl border border-border bg-slate-100 dark:bg-slate-900">
                  {getArtworkUrl(record.channelImage) ? (
                    <img
                      src={getArtworkUrl(record.channelImage) || undefined}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Headphones className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="truncate text-sm font-black tracking-tight text-foreground">
                    {record.episodeTitle}
                  </h4>
                  <div className="mt-1 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                    <span className="truncate max-w-[100px]">{record.channelName}</span>
                    <span className="h-1 w-1 rounded-full bg-border" />
                    <span>
                      {formatSafeDateLabel(
                        record.playedAt,
                        getLocale(language),
                        t('common.recently', { defaultValue: 'Recently' }),
                        { month: 'short', day: 'numeric' }
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 group-active:translate-x-1 transition-transform">
                  <Play className="h-4 w-4 fill-current ml-0.5" />
                </div>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user, language } = useAuth();
  const { t } = useTranslation();

  // Determine active tab from URL or query params
  const activeTab = useMemo<ActiveTab>(() => {
    const qTab = searchParams.get('tab');
    if (qTab === 'podcast') return 'podcast';
    if (qTab === 'reading' || location.pathname.includes('/reading')) return 'reading';
    return 'video';
  }, [searchParams, location.pathname]);

  const updateActiveTab = useCallback(
    (nextTab: ActiveTab) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextTab === 'video') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', nextTab);
      }
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden relative">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.42] bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] bg-[length:20px_20px]" />

      {/* Header */}
      <header className="sticky top-0 z-20 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-4">
        <div className="relative mx-auto flex h-14 w-full max-w-md items-center justify-between rounded-full border border-border/50 bg-card/60 p-1.5 shadow-lg backdrop-blur-xl">
          <motion.div
            className="absolute h-[calc(100%-12px)] rounded-full bg-slate-900 shadow-sm dark:bg-indigo-600"
            initial={false}
            animate={{
              width: '33.3333%',
              x: activeTab === 'video' ? '0%' : activeTab === 'podcast' ? '100%' : '200%',
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />

          <Button
            variant="ghost"
            size="auto"
            onClick={() => updateActiveTab('video')}
            aria-label={t('nav.videos', { defaultValue: 'Videos' })}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center gap-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
              activeTab === 'video' ? 'text-white' : 'text-muted-foreground'
            )}
          >
            <VideoIcon className="h-3.5 w-3.5" />
            <span>{t('nav.videos', { defaultValue: 'Videos' })}</span>
          </Button>

          <Button
            variant="ghost"
            size="auto"
            onClick={() => updateActiveTab('podcast')}
            aria-label={t('nav.podcasts', { defaultValue: 'Podcasts' })}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center gap-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
              activeTab === 'podcast' ? 'text-white' : 'text-muted-foreground'
            )}
          >
            <Headphones className="h-3.5 w-3.5" />
            <span>{t('nav.podcasts', { defaultValue: 'Podcasts' })}</span>
          </Button>

          <Button
            variant="ghost"
            size="auto"
            onClick={() => updateActiveTab('reading')}
            aria-label={t('nav.reading', { defaultValue: 'Reading' })}
            className={cn(
              'relative z-10 flex h-full flex-1 items-center justify-center gap-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors',
              activeTab === 'reading' ? 'text-white' : 'text-muted-foreground'
            )}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>{t('nav.reading', { defaultValue: 'Reading' })}</span>
          </Button>
        </div>
      </header>

      {/* Content Container */}
      <main className="flex-1 overflow-hidden relative z-0 w-full">
        <VideoTab active={activeTab === 'video'} language={language} />

        <PodcastTab active={activeTab === 'podcast'} user={user} language={language} />

        {activeTab === 'reading' ? <MobileReadingDiscoveryView active /> : null}
      </main>
    </div>
  );
};
