import React, { useMemo } from 'react';
import { useQuery } from 'convex/react';
import { Play, Disc, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

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

const SubHeader: React.FC<{
  title: string;
  icon?: React.ElementType;
  onMore?: () => void;
}> = ({ title, icon: Icon, onMore }) => (
  <div className="flex items-center justify-between px-6 mb-3 mt-8">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="w-5 h-5 text-indigo-500" />}
      <h3 className="text-xl font-black text-slate-900">{title}</h3>
    </div>
    {onMore && (
      <Button
        variant="ghost"
        size="sm"
        onClick={onMore}
        className="text-slate-400 font-bold hover:text-slate-600"
      >
        More
      </Button>
    )}
  </div>
);

const HorizontalScroll: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex overflow-x-auto px-6 gap-4 pb-4 scrollbar-hide snap-x snap-mandatory">
    {children}
  </div>
);

const PodcastCard: React.FC<{
  channel: PodcastChannel;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  onClick?: () => void;
}> = ({ channel, size = 'md', label, onClick }) => {
  const navigate = useLocalizedNavigate();
  const isLg = size === 'lg';
  const isSm = size === 'sm';
  const widthClass = isLg
    ? 'min-w-[280px] w-[280px]'
    : isSm
      ? 'min-w-[140px] w-[140px]'
      : 'min-w-[160px] w-[160px]';

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    const params = new URLSearchParams();
    const channelId = channel.itunesId || channel.id || channel._id;
    if (channelId) params.set('id', String(channelId));
    if (channel.feedUrl) params.set('feedUrl', channel.feedUrl);
    const query = params.toString();
    navigate(`/podcasts/channel${query ? `?${query}` : ''}`, {
      state: { channel },
    });
  };

  return (
    <button
      onClick={handleClick}
      className={`text-left snap-start group flex flex-col gap-2 ${widthClass}`}
    >
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 shadow-sm group-active:scale-95 transition-transform">
        <img
          src={channel.artworkUrl || channel.artwork || '/logo.png'}
          alt={channel.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        {label && (
          <div className="absolute top-2 left-2">
            <span className="px-2 py-0.5 rounded-full bg-white/90 backdrop-blur text-[10px] font-bold text-slate-900 shadow-sm">
              {label}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/10 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 ml-1 text-slate-900" />
          </div>
        </div>
      </div>
      <div>
        <h4 className={`font-bold text-slate-900 line-clamp-2 ${isSm ? 'text-xs' : 'text-sm'}`}>
          {channel.title}
        </h4>
        <p className="text-xs text-slate-500 line-clamp-1">{channel.author}</p>
      </div>
    </button>
  );
};

export const MobilePodcastDashboard: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { user, language } = useAuth();
  const labels = getLabels(language);

  // Data Fetching (Mirrors PodcastDashboard)
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

  // Using simplified trending logic for mobile (internal only or combined)
  const trending = useMemo(() => {
    if (!trendingData) return [];
    // Combine internal and external, prioritization logic can be added
    return [...trendingData.internal, ...trendingData.external].slice(0, 10);
  }, [trendingData]);

  return (
    <div className="min-h-screen bg-white pb-32">
      {/* Header */}
      <div className="px-6 pt-12 pb-2 bg-gradient-to-b from-indigo-50/50 to-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-black text-slate-900">Podcasts</h2>
            <p className="text-slate-500 font-bold text-sm">Listen & Learn</p>
          </div>
          <img src="/emojis/Headphone.png" className="w-12 h-12" alt="Headphones" />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={labels.search || 'Search podcasts...'}
            className="pl-11 h-12 rounded-2xl bg-slate-50 border-slate-100 text-base font-medium"
          />
        </div>
      </div>

      {/* 1. Continue Listening / History */}
      {history.length > 0 && (
        <section>
          <SubHeader title="Jump Back In" icon={Disc} />
          <HorizontalScroll>
            {history.map(item => (
              <button
                key={item.id}
                className="min-w-[280px] snap-start text-left bg-slate-900 rounded-2xl p-4 text-white relative overflow-hidden group active:scale-[0.98] transition-transform"
                onClick={() =>
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
                  })
                }
              >
                {/* BG Disc Effect */}
                <Disc className="absolute -right-6 -bottom-6 w-32 h-32 text-indigo-500/20 group-active:rotate-12 transition-transform" />

                <div className="relative z-10 flex gap-4 items-center">
                  <img
                    src={item.channelImage || '/logo.png'}
                    className="w-16 h-16 rounded-xl bg-slate-800 object-cover border border-white/10"
                    alt="Cover"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                      <span className="text-[10px] uppercase font-bold text-green-400 tracking-wider">
                        Resuming
                      </span>
                    </div>
                    <h4 className="font-bold text-base truncate leading-snug">
                      {item.episodeTitle}
                    </h4>
                    <p className="text-xs text-slate-400 truncate">{item.channelName}</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 w-1/2" />
                </div>
              </button>
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* 2. Subscriptions */}
      {user && subscriptions.length > 0 && (
        <section>
          <SubHeader title="Your Shows" />
          <HorizontalScroll>
            {subscriptions.map(sub => (
              <PodcastCard key={sub.id || sub._id} channel={sub} size="sm" />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* 3. Trending */}
      <section>
        <SubHeader title="Trending Now" icon={Play} />
        <HorizontalScroll>
          {trending.map((pod, idx) => (
            <PodcastCard key={pod.id || pod._id} channel={pod} size="md" label={`#${idx + 1}`} />
          ))}
          {trending.length === 0 &&
            !trendingData &&
            [1, 2, 3].map(i => (
              <div key={i} className="min-w-[160px] space-y-2">
                <Skeleton className="w-[160px] h-[160px] rounded-2xl" />
                <Skeleton className="w-3/4 h-4" />
                <Skeleton className="w-1/2 h-3" />
              </div>
            ))}
        </HorizontalScroll>
      </section>

      {/* Bottom Spacer for Mini Player */}
      <div className="h-16" />
    </div>
  );
};
