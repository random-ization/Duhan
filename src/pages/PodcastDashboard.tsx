import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Library, Search, Disc, History as HistoryIcon } from 'lucide-react';
import { useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import BackButton from '../components/ui/BackButton';
import { getLabel, getLabels, Labels } from '../utils/i18n';
import { NoArgs, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

interface PodcastChannel {
  _id?: string;
  id?: string;
  title: string;
  author?: string;
  artwork?: string;
  artworkUrl?: string;
  feedUrl?: string;
  itunesId?: string;
}

interface PodcastItem {
  _id?: string;
  id?: string;
  guid?: string;
  title: string;
  audioUrl?: string;
  artwork?: string;
  artworkUrl?: string;
  author?: string;
  views?: number;
  channel?: PodcastChannel;
  itunesId?: string;
  feedUrl?: string;
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

const toPodcastItemList = (value: unknown): PodcastItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is Record<string, unknown> => typeof v === 'object' && v !== null)
    .map(v => ({
      _id: typeof v._id === 'string' ? v._id : undefined,
      id: typeof v.id === 'string' ? v.id : undefined,
      guid: typeof v.guid === 'string' ? v.guid : undefined,
      title: typeof v.title === 'string' ? v.title : '',
      audioUrl: typeof v.audioUrl === 'string' ? v.audioUrl : undefined,
      artwork: typeof v.artwork === 'string' ? v.artwork : undefined,
      artworkUrl: typeof v.artworkUrl === 'string' ? v.artworkUrl : undefined,
      author: typeof v.author === 'string' ? v.author : undefined,
      views: typeof v.views === 'number' ? v.views : undefined,
      channel:
        typeof v.channel === 'object' && v.channel !== null
          ? (v.channel as PodcastChannel)
          : undefined,
      itunesId: typeof v.itunesId === 'string' ? v.itunesId : undefined,
      feedUrl: typeof v.feedUrl === 'string' ? v.feedUrl : undefined,
    }))
    .filter(p => p.title !== '');
};

export default function PodcastDashboard() {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { user, language } = useAuth();
  const labels = getLabels(language);
  const podcastMsgs = getPodcastMessages(labels);

  // State
  const [activeTab, setActiveTab] = useState<'community' | 'weekly'>('community');
  const [searchTerm, setSearchTerm] = useState('');

  // Convex Integration
  type TrendingResult = {
    internal: (PodcastItem & { _id: string; channel?: PodcastChannel & { _id: string } })[];
    external: unknown[];
  };
  const trendingData = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));
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
      internal: trendingData.internal.map(ep => ({
        ...ep,
        id: ep._id,
        channel: ep.channel ? { ...ep.channel, id: ep.channel._id } : undefined,
      })),
      external: toPodcastItemList(trendingData.external),
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
  const isSubscriptionsView = location.pathname.includes('/podcasts/subscriptions');

  if (isSubscriptionsView) {
    return (
      <div
        className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      >
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <BackButton onClick={() => navigate('/podcasts')} />
            <h1 className="text-3xl font-black text-slate-900">
              {labels.dashboard?.podcast?.mySubs || 'My Subscriptions'}
            </h1>
          </div>

          {!user && (
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 text-center space-y-4">
              <p className="font-bold text-slate-600">
                {labels.dashboard?.podcast?.loginRequired || 'Please login first'}
              </p>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold shadow-pop hover:shadow-pop-hover hover:-translate-y-0.5 transition-all"
              >
                {labels.login || 'Login'}
              </button>
            </div>
          )}

          {user && subscriptionsLoading && (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
            </div>
          )}

          {user && !subscriptionsLoading && subscriptions.length === 0 && (
            <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-slate-900 text-slate-400 font-bold">
              {labels.dashboard?.podcast?.msg?.EMPTY_SUBSCRIPTIONS || 'No subscriptions yet'}
            </div>
          )}

          {user && !subscriptionsLoading && subscriptions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {subscriptions.map(channel => {
                const channelId = channel.itunesId || channel.id || channel._id;
                const params = new URLSearchParams();
                if (channelId) params.set('id', String(channelId));
                if (channel.feedUrl) params.set('feedUrl', channel.feedUrl);
                const query = params.toString();
                return (
                  <button
                    key={channelId || channel.title}
                    type="button"
                    onClick={() => {
                      const finalQuery = query ? `?${query}` : '';
                      navigate(`/podcasts/channel${finalQuery}`, {
                        state: { channel },
                      });
                    }}
                    className="text-left bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-1 transition flex gap-4 items-center"
                  >
                    <img
                      src={channel.artworkUrl || channel.artwork || 'https://placehold.co/100x100'}
                      alt={channel.title}
                      className="w-16 h-16 rounded-xl border-2 border-slate-100 object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-black text-lg text-slate-900 line-clamp-1">
                        {channel.title}
                      </h3>
                      <p className="text-sm font-bold text-slate-500 line-clamp-1">
                        {channel.author}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/podcasts/search?q=${encodeURIComponent(searchTerm)}`);
    }
  };

  // Determine featured content: Last played episode OR Top Trending (Internal)
  const lastPlayed = history.length > 0 ? history[0] : null;

  let featuredPodcast: PodcastItem | null = null;
  if (!lastPlayed) {
    if (trending.internal.length > 0) {
      featuredPodcast = trending.internal[0];
    } else if (trending.external.length > 0) {
      featuredPodcast = trending.external[0];
    }
  }

  const renderFeaturedHero = () => {
    if (lastPlayed) {
      return (
        <button
          type="button"
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
          className="w-full text-left bg-slate-900 rounded-[2rem] p-6 text-white border-2 border-slate-900 shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6"
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
        </button>
      );
    }

    if (featuredPodcast) {
      return (
        <button
          type="button"
          onClick={() =>
            navigate(`/podcasts/channel?id=${featuredPodcast.itunesId || featuredPodcast.id}`)
          }
          className="w-full text-left bg-slate-900 rounded-[2rem] p-6 text-white border-2 border-slate-900 shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6"
        >
          <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
            <Disc size={200} />
          </div>
          <div className="w-28 h-28 rounded-2xl bg-indigo-500 border-2 border-white shadow-lg overflow-hidden shrink-0 z-10">
            <img
              src={
                featuredPodcast.artworkUrl ||
                featuredPodcast.artwork ||
                featuredPodcast.channel?.artworkUrl ||
                featuredPodcast.channel?.artwork ||
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
            <h3 className="text-2xl font-black mb-1 line-clamp-1">{featuredPodcast.title}</h3>
            <p className="text-slate-400 text-sm">{featuredPodcast.author}</p>
          </div>
        </button>
      );
    }

    return (
      <div className="bg-slate-800 rounded-[2rem] p-8 text-center text-slate-400">
        <p>{podcastMsgs.DASHBOARD_NO_RECOMMENDATIONS}</p>
      </div>
    );
  };

  const activeTrending = activeTab === 'community' ? trending.internal : trending.external;

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
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-6">
          <div className="flex items-center gap-4">
            <BackButton onClick={() => navigate('/dashboard')} />
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
          <button
            type="button"
            onClick={() => navigate('/podcasts/subscriptions')}
            className="flex items-center gap-2 bg-white border-2 border-slate-900 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 shadow-pop active:shadow-none active:translate-y-1 transition text-slate-900"
          >
            <Library size={18} /> {labels.dashboard?.podcast?.mySubs || 'My Subscriptions'}
          </button>
        </div>

        {/* 2. Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <form onSubmit={handleSearch} className="relative flex-1 group">
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={podcastMsgs.ACTION_SEARCH}
              className="w-full bg-white border-2 border-slate-900 rounded-xl py-3 px-12 shadow-pop focus:outline-none focus:translate-y-1 focus:shadow-none transition font-bold placeholder:text-slate-400 text-slate-900"
            />
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition"
              size={20}
            />
          </form>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
            <button
              type="button"
              className="px-4 py-3 bg-slate-900 text-white rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap shadow-pop hover:translate-y-1 hover:shadow-none transition"
            >
              {labels.dashboard?.podcast?.filters?.all || labels.common?.all || 'All'}
            </button>
            <button
              type="button"
              className="px-4 py-3 bg-white text-slate-600 rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap hover:bg-slate-50 transition"
            >
              {labels.dashboard?.podcast?.filters?.beginner ||
                labels.dashboard?.level?.beginner ||
                'Beginner'}
            </button>
            <button
              type="button"
              className="px-4 py-3 bg-white text-slate-600 rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap hover:bg-slate-50 transition"
            >
              {labels.dashboard?.podcast?.dailyConv || 'Daily Conv'}
            </button>
          </div>
        </div>

        {/* 3. Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column (Featured + History) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Featured Hero Card */}
            {renderFeaturedHero()}

            {/* Listening History (Vertical Grid) */}
            {history.length > 0 && (
              <div>
                <h3 className="font-black text-xl mb-4 flex items-center gap-2 text-slate-900">
                  <HistoryIcon size={20} /> {podcastMsgs.HISTORY_TITLE}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  {history.map(record => (
                    <button
                      key={record.id}
                      type="button"
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
                      className="text-left bg-white p-3 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop transition cursor-pointer flex gap-3 items-center group"
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
                            language === 'zh' ? 'zh-CN' : 'en-US'
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column (Community Charts & Recommended) */}
          <div className="lg:col-span-4 bg-white rounded-[2rem] border-2 border-slate-900 p-6 shadow-pop h-fit sticky top-6">
            <div className="flex gap-4 mb-6 border-b-2 border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('community')}
                className={`text-lg font-black transition pb-2 -mb-3.5 ${activeTab === 'community' ? 'text-slate-900 border-b-4 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {podcastMsgs.DASHBOARD_COMMUNITY}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('weekly')}
                className={`text-lg font-black transition pb-2 -mb-3.5 ${activeTab === 'weekly' ? 'text-slate-900 border-b-4 border-indigo-500' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {podcastMsgs.DASHBOARD_EDITOR_PICKS}
              </button>
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {activeTrending.slice(0, 10).map((pod, idx) => (
                <button
                  key={pod.id || pod.guid || pod.title || idx}
                  type="button"
                  onClick={() => {
                    if (activeTab === 'weekly') {
                      // External (Channel) -> Go to Channel Page
                      navigate(
                        `/podcasts/channel?id=${pod.id}&feedUrl=${encodeURIComponent(pod.feedUrl ?? '')}`
                      );
                    } else {
                      // Internal (Episode) -> Go to Player directly
                      navigate('/podcasts/player', {
                        state: {
                          episode: {
                            guid: pod.guid,
                            title: pod.title,
                            audioUrl: pod.audioUrl,
                            channel: pod.channel,
                          },
                        },
                      });
                    }
                  }}
                  className="w-full text-left flex items-center gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition"
                >
                  <div
                    className={`font-black text-xl w-6 text-center ${idx < 3 ? 'text-indigo-500' : 'text-slate-300'}`}
                  >
                    {idx + 1}
                  </div>
                  <img
                    src={
                      pod.artwork ||
                      pod.artworkUrl ||
                      pod.channel?.artworkUrl ||
                      pod.channel?.artwork ||
                      'https://placehold.co/100x100'
                    }
                    className="w-12 h-12 rounded-lg border border-slate-200 object-cover"
                    alt={pod.title}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition">
                      {pod.title}
                    </h4>
                    <p className="text-xs text-slate-500 truncate">
                      {pod.author ||
                        pod.channel?.title ||
                        labels.dashboard?.podcast?.unknown ||
                        'Unknown'}
                    </p>
                    {activeTab === 'community' && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">
                          {pod.views || 0} {labels.dashboard?.podcast?.plays || 'plays'}
                        </span>
                      </div>
                    )}
                  </div>
                  {activeTab === 'community' && (
                    <Play
                      size={16}
                      className="text-slate-300 group-hover:text-indigo-500 transition"
                    />
                  )}
                </button>
              ))}

              {/* Show skeleton if loading */}
              {loading &&
                !trending.external.length &&
                [1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-4 p-2 rounded-xl animate-pulse">
                    <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                    <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="h-4 w-24 bg-slate-200 rounded"></div>
                      <div className="h-3 w-16 bg-slate-100 rounded"></div>
                    </div>
                  </div>
                ))}

              {!loading && activeTrending.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-bold text-sm">
                  {podcastMsgs.EMPTY_TRENDING}
                </div>
              )}
            </div>
            <button
              type="button"
              className="w-full mt-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-500 hover:border-slate-900 hover:text-slate-900 transition"
            >
              {podcastMsgs.DASHBOARD_VIEW_ALL}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
