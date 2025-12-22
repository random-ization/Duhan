import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Headphones,
    Search,
    Heart,
    Play,
    TrendingUp,
    Sparkles,
    ChevronRight,
    Clock,
    Users,
    ExternalLink,
    X
} from 'lucide-react';
import { api } from '../services/api';

// Types
interface PodcastChannel {
    id: string;
    itunesId?: string;
    title: string;
    author: string;
    feedUrl: string;
    artworkUrl?: string;
    artwork?: string;
    description?: string;
}

interface PodcastEpisode {
    guid?: string;
    title: string;
    audioUrl?: string;
    pubDate?: string | Date;
    duration?: string;
    description?: string;
    channelId?: string;
    channelTitle?: string;
    channelArtwork?: string;
    channel?: {
        id?: string;
        title?: string;
        artworkUrl?: string;
    };
}

interface TrendingData {
    external: PodcastChannel[];
    internal: {
        id: string;
        title: string;
        audioUrl: string;
        views: number;
        channel: { title: string; artwork?: string };
    }[];
}

const PodcastDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // UI States
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchLoading, setSearchLoading] = useState(false);

    // Data States
    const [searchResults, setSearchResults] = useState<PodcastChannel[]>([]);
    const [subscriptions, setSubscriptions] = useState<PodcastChannel[]>([]);
    const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
    const [feedEpisodes, setFeedEpisodes] = useState<PodcastEpisode[]>([]);
    const [trending, setTrending] = useState<TrendingData | null>(null);
    const [activeTab, setActiveTab] = useState<'apple' | 'community'>('apple');

    // Use isDataLoaded instead of loading to prevent flash
    const [isDataLoaded, setIsDataLoaded] = useState(false);

    // Fetch dashboard data on mount
    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) {
                setIsDataLoaded(true);
                return;
            }

            try {
                const [feedData, trendingData] = await Promise.all([
                    api.getMyPodcastFeed(),
                    api.getPodcastTrending()
                ]);

                setSubscriptions(feedData.channels || []);
                setSubscribedIds(new Set((feedData.channels || []).map((c: PodcastChannel) => c.itunesId || c.id)));
                setFeedEpisodes(feedData.episodes || []);
                setTrending(trendingData);
            } catch (error) {
                console.error('Failed to fetch podcast data:', error);
            } finally {
                setIsDataLoaded(true);
            }
        };

        fetchDashboardData();
    }, [user]);

    // Handle search
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;

        setSearchLoading(true);
        try {
            const results = await api.searchPodcasts(searchQuery.trim());
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setSearchLoading(false);
        }
    };

    // Toggle subscription with optimistic update
    const toggleSubscribe = useCallback(async (channel: PodcastChannel) => {
        const channelKey = channel.itunesId || channel.id;
        const isCurrentlySubscribed = subscribedIds.has(channelKey);

        // Optimistic update
        setSubscribedIds(prev => {
            const newSet = new Set(prev);
            if (isCurrentlySubscribed) {
                newSet.delete(channelKey);
            } else {
                newSet.add(channelKey);
            }
            return newSet;
        });

        if (!isCurrentlySubscribed) {
            setSubscriptions(prev => [...prev, channel]);
        } else {
            setSubscriptions(prev => prev.filter(c => (c.itunesId || c.id) !== channelKey));
        }

        try {
            await api.togglePodcastSubscription({
                itunesId: channel.itunesId || channel.id,
                title: channel.title,
                author: channel.author,
                feedUrl: channel.feedUrl,
                artworkUrl: channel.artworkUrl || channel.artwork
            });
        } catch (error) {
            // Rollback on error
            console.error('Failed to toggle subscription:', error);
            setSubscribedIds(prev => {
                const newSet = new Set(prev);
                if (isCurrentlySubscribed) {
                    newSet.add(channelKey);
                } else {
                    newSet.delete(channelKey);
                }
                return newSet;
            });
        }
    }, [subscribedIds]);

    // Exit search mode
    const exitSearchMode = () => {
        setIsSearchMode(false);
        setSearchQuery('');
        setSearchResults([]);
    };

    // Format date
    const formatDate = (date: string | Date | undefined) => {
        if (!date) return '';
        const d = new Date(date);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    };

    // Navigate to channel detail
    const goToChannel = (channel: PodcastChannel) => {
        navigate(`/podcasts/channel`, { state: { channel } });
    };

    // Navigate to player
    const goToPlayer = (episode: PodcastEpisode) => {
        navigate('/podcasts/player', { state: { episode } });
    };

    return (
        <div className="pb-24 bg-white min-h-screen">
            {/* Header & Search Bar */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-4 h-14 flex items-center shadow-sm">
                {!isSearchMode ? (
                    <>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                                <Headphones className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <h1 className="text-lg font-bold text-slate-900">播客学韩语</h1>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setIsSearchMode(true);
                                setTimeout(() => document.getElementById('podcastSearchInput')?.focus(), 100);
                            }}
                            className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                        >
                            <Search className="w-5 h-5 text-slate-600" />
                        </button>
                    </>
                ) : (
                    <form onSubmit={handleSearch} className="flex-1 flex items-center gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                            <input
                                id="podcastSearchInput"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="搜索韩语播客..."
                                className="w-full bg-slate-100 pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={exitSearchMode}
                            className="text-sm font-medium text-slate-500 hover:text-slate-700 whitespace-nowrap"
                        >
                            取消
                        </button>
                    </form>
                )}
            </div>

            {/* Main Content */}
            <div className="p-4 space-y-8">
                {/* Search Results View */}
                {isSearchMode && (
                    <div>
                        {searchLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-3 border-indigo-500 border-t-transparent" />
                            </div>
                        ) : searchResults.length > 0 ? (
                            <>
                                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                                    搜索结果 ({searchResults.length})
                                </h2>
                                <div className="space-y-3">
                                    {searchResults.map((channel) => {
                                        const isSubscribed = subscribedIds.has(channel.itunesId || channel.id);
                                        return (
                                            <div
                                                key={channel.id}
                                                className="flex items-center gap-4 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                                            >
                                                <img
                                                    src={channel.artwork || channel.artworkUrl}
                                                    alt={channel.title}
                                                    className="w-16 h-16 rounded-xl object-cover border border-slate-200 cursor-pointer"
                                                    onClick={() => goToChannel(channel)}
                                                />
                                                <div
                                                    className="flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => goToChannel(channel)}
                                                >
                                                    <h3 className="font-bold text-slate-800 truncate">{channel.title}</h3>
                                                    <p className="text-xs text-slate-500 truncate">{channel.author}</p>
                                                </div>
                                                <button
                                                    onClick={() => toggleSubscribe(channel)}
                                                    className={`p-2.5 rounded-full transition-colors ${isSubscribed
                                                        ? 'bg-pink-100 text-pink-600'
                                                        : 'bg-slate-200 text-slate-500 hover:bg-slate-300'
                                                        }`}
                                                >
                                                    <Heart className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`} />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : searchQuery ? (
                            <div className="text-center py-12 text-slate-400">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>未找到 "{searchQuery}" 相关播客</p>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-slate-400">
                                <Search className="w-12 h-12 mx-auto mb-4 opacity-30" />
                                <p>输入关键词搜索韩语播客</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Dashboard View (hidden when searching) */}
                {!isSearchMode && (
                    <>
                        {/* Section 1: New Episodes */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-amber-500" />
                                    最新更新
                                </h2>
                                {feedEpisodes.length > 0 && (
                                    <button className="text-sm text-indigo-600 hover:underline flex items-center">
                                        查看全部 <ChevronRight className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {subscriptions.length === 0 ? (
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-8 text-center border border-slate-200">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <Heart className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-600 font-medium mb-2">还没有订阅任何频道</p>
                                    <p className="text-slate-400 text-sm mb-4">点击上方搜索，发现优质韩语播客</p>
                                    <button
                                        onClick={() => setIsSearchMode(true)}
                                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                                    >
                                        探索频道
                                    </button>
                                </div>
                            ) : (
                                <div className="overflow-x-auto pb-2 -mx-4 px-4">
                                    <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
                                        {feedEpisodes.slice(0, 10).map((episode, idx) => (
                                            <div
                                                key={episode.guid || idx}
                                                className="w-64 flex-shrink-0 bg-slate-50 p-3 rounded-xl border border-slate-200 hover:shadow-md transition-shadow"
                                            >
                                                <div className="flex gap-3 mb-2">
                                                    <img
                                                        src={episode.channelArtwork || episode.channel?.artworkUrl}
                                                        alt=""
                                                        className="w-10 h-10 rounded-lg object-cover"
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-slate-700 truncate">
                                                            {episode.channelTitle || episode.channel?.title}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {formatDate(episode.pubDate)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <h3 className="text-sm font-semibold text-slate-800 line-clamp-2 h-10 mb-3">
                                                    {episode.title}
                                                </h3>
                                                <button
                                                    onClick={() => goToPlayer(episode)}
                                                    className="w-full bg-indigo-100 text-indigo-700 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-200 transition-colors"
                                                >
                                                    <Play className="w-3 h-3" fill="currentColor" /> 播放
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Section 2: Editor's Picks */}
                        <section>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                                <Sparkles className="w-5 h-5 text-pink-500" />
                                编辑推荐
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {subscriptions.slice(0, 4).map((channel, idx) => {
                                    const isSubscribed = subscribedIds.has(channel.itunesId || channel.id);
                                    return (
                                        <div
                                            key={channel.id || idx}
                                            className="flex items-center gap-4 p-4 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all cursor-pointer group"
                                        >
                                            <img
                                                src={channel.artworkUrl || channel.artwork}
                                                alt={channel.title}
                                                className="w-20 h-20 rounded-xl object-cover"
                                                onClick={() => goToChannel(channel)}
                                            />
                                            <div className="flex-1 min-w-0" onClick={() => goToChannel(channel)}>
                                                <h3 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                    {channel.title}
                                                </h3>
                                                <p className="text-sm text-slate-500 truncate">{channel.author}</p>
                                            </div>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleSubscribe(channel);
                                                }}
                                                className={`p-2.5 rounded-full transition-colors ${isSubscribed
                                                    ? 'text-pink-500 hover:bg-pink-50'
                                                    : 'text-slate-400 hover:bg-slate-100'
                                                    }`}
                                            >
                                                <Heart className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                                {subscriptions.length === 0 && (
                                    <div className="col-span-2 text-center py-8 text-slate-400">
                                        暂无推荐，开始搜索并订阅吧！
                                    </div>
                                )}
                            </div>
                        </section>

                        {/* Section 3: Trending */}
                        <section>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-orange-500" />
                                    热门榜单
                                </h2>
                            </div>

                            {/* Tabs */}
                            <div className="flex gap-2 mb-4">
                                <button
                                    onClick={() => setActiveTab('apple')}
                                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${activeTab === 'apple'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <span className="flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" />
                                        Apple Top 10
                                    </span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('community')}
                                    className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors ${activeTab === 'community'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        社区热播
                                    </span>
                                </button>
                            </div>

                            {/* Trending List */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-100">
                                {activeTab === 'apple' ? (
                                    trending?.external?.length ? (
                                        trending.external.slice(0, 10).map((channel, idx) => (
                                            <div
                                                key={channel.id || idx}
                                                onClick={() => goToChannel(channel)}
                                                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center font-bold text-slate-400">
                                                    {idx + 1}
                                                </div>
                                                <img
                                                    src={channel.artwork}
                                                    alt=""
                                                    className="w-12 h-12 rounded-lg object-cover"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-800 truncate">{channel.title}</h3>
                                                    <p className="text-sm text-slate-500 truncate">{channel.author}</p>
                                                </div>
                                                <ChevronRight className="w-5 h-5 text-slate-300" />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-400">暂无数据</div>
                                    )
                                ) : (
                                    trending?.internal?.length ? (
                                        trending.internal.slice(0, 10).map((episode, idx) => (
                                            <div
                                                key={episode.id || idx}
                                                onClick={() => navigate('/podcasts/player', { state: { episode } })}
                                                className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                                            >
                                                <div className="w-8 h-8 flex items-center justify-center font-bold text-slate-400">
                                                    {idx + 1}
                                                </div>
                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex-shrink-0 overflow-hidden">
                                                    {episode.channel?.artwork && (
                                                        <img src={episode.channel.artwork} alt="" className="w-full h-full object-cover" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-slate-800 truncate">{episode.title}</h3>
                                                    <p className="text-sm text-slate-500 truncate">{episode.channel?.title}</p>
                                                </div>
                                                <div className="text-sm text-slate-400 flex items-center gap-1">
                                                    <Play className="w-4 h-4" />
                                                    {episode.views}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-8 text-center text-slate-400">暂无热播内容</div>
                                    )
                                )}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default PodcastDashboard;
