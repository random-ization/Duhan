import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, TrendingUp, Users, Search, History, ChevronRight, Headphones, Heart, X, Clock } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

// LocalStorage keys for search history
const SEARCH_HISTORY_KEY = 'podcast_search_history';
const CLICKED_PODCASTS_KEY = 'podcast_clicked_history';

// 🚨 前端保底数据
const FALLBACK_PODCASTS = [
    {
        id: "1482869150",
        title: "TTMIK: Iyagi",
        author: "Talk To Me In Korean",
        artwork: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts113/v4/85/3e/16/853e164f-c760-466d-0e42-1262d8544078/mza_6371583091937920700.jpg/600x600bb.jpg",
        feedUrl: ""
    },
    {
        id: "1553018379",
        title: "Spongemind Podcast",
        author: "Jonson Lee",
        artwork: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts115/v4/64/46/7c/64467c9c-2924-4f04-807d-075253896504/mza_14652230787383926665.jpg/600x600bb.jpg",
        feedUrl: ""
    },
    {
        id: "1254294029",
        title: "Core Korean Grammar",
        author: "TTMIK",
        artwork: "https://is1-ssl.mzstatic.com/image/thumb/Podcasts116/v4/49/23/79/49237937-5c52-2a9c-072d-11d2db4d9243/mza_10860356614450239632.jpg/600x600bb.jpg",
        feedUrl: ""
    }
];

interface SearchHistoryItem {
    type: 'term' | 'podcast';
    value: string;
    title?: string;
    artwork?: string;
    feedUrl?: string;
    timestamp: number;
}

// Helper functions for localStorage
const getSearchHistory = (): SearchHistoryItem[] => {
    try {
        const data = localStorage.getItem(SEARCH_HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch { return []; }
};

const saveSearchHistory = (history: SearchHistoryItem[]) => {
    try {
        localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history.slice(0, 20))); // Max 20 items
    } catch { }
};

const addToSearchHistory = (item: SearchHistoryItem) => {
    const history = getSearchHistory();
    // Remove duplicate
    const filtered = history.filter(h =>
        !(h.type === item.type && h.value === item.value)
    );
    saveSearchHistory([item, ...filtered]);
};

const removeFromSearchHistory = (item: SearchHistoryItem) => {
    const history = getSearchHistory();
    const filtered = history.filter(h =>
        !(h.type === item.type && h.value === item.value)
    );
    saveSearchHistory(filtered);
};

export default function PodcastDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [trending, setTrending] = useState<any[]>([]);
    const [community, setCommunity] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]); // 🔥 Search results
    const [isSearching, setIsSearching] = useState(false); // 🔥 Search loading

    // Load search history on mount
    useEffect(() => {
        setSearchHistory(getSearchHistory());
    }, []);

    useEffect(() => {
        const loadData = async () => {
            try {
                const res = await api.getPodcastTrending().catch(() => ({ external: [], internal: [] }));
                const safeExternal = (res.external && res.external.length > 0) ? res.external : FALLBACK_PODCASTS;
                setTrending(safeExternal);
                setCommunity((res.internal && res.internal.length > 0) ? res.internal : safeExternal.slice(0, 3));

                if (user) {
                    const subs = await api.getPodcastSubscriptions().catch(() => []);
                    setSubscriptions(subs || []);
                }
            } catch (e) {
                setTrending(FALLBACK_PODCASTS);
                setCommunity(FALLBACK_PODCASTS);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    // 🔥 Fixed: Inline search instead of navigating to non-existent route
    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        // Save to history
        addToSearchHistory({
            type: 'term',
            value: searchTerm.trim(),
            timestamp: Date.now()
        });
        setSearchHistory(getSearchHistory());

        // 🔥 Perform inline search
        setIsSearching(true);
        try {
            const results = await api.searchPodcasts(searchTerm.trim());
            setSearchResults(results || []);
        } catch (err) {
            console.error('Search failed:', err);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClickPodcast = (podcast: any) => {
        // Save to history
        addToSearchHistory({
            type: 'podcast',
            value: podcast.id || podcast.itunesId,
            title: podcast.title,
            artwork: podcast.artwork || podcast.artworkUrl,
            feedUrl: podcast.feedUrl || '',
            timestamp: Date.now()
        });
        setSearchHistory(getSearchHistory());
        navigate(`/podcasts/channel?id=${podcast.id || podcast.itunesId}&feedUrl=${encodeURIComponent(podcast.feedUrl || '')}`);
    };

    const handleDeleteHistoryItem = (item: SearchHistoryItem, e: React.MouseEvent) => {
        e.stopPropagation();
        removeFromSearchHistory(item);
        setSearchHistory(getSearchHistory());
    };

    const clearAllHistory = () => {
        saveSearchHistory([]);
        setSearchHistory([]);
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white p-6 sticky top-0 z-10 shadow-sm">
                {!isSearchMode ? (
                    <>
                        <div className="flex justify-between items-center mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                                    <Headphones className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-xl font-bold text-slate-900">播客学韩语</h1>
                            </div>
                            <button
                                onClick={() => navigate('/podcasts/history')}
                                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition"
                                title="播放历史"
                            >
                                <History size={20} />
                            </button>
                        </div>

                        {/* Search Bar (Click to enter search mode) */}
                        <div
                            onClick={() => setIsSearchMode(true)}
                            className="flex items-center gap-3 bg-slate-100 px-4 py-3 rounded-xl cursor-text"
                        >
                            <Search className="text-gray-400" size={20} />
                            <span className="text-gray-400">搜索韩语播客...</span>
                        </div>
                    </>
                ) : (
                    /* Search Mode */
                    <div className="flex items-center gap-3">
                        <form onSubmit={handleSearch} className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="搜索韩语播客..."
                                autoFocus
                                className="w-full bg-slate-100 pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </form>
                        <button
                            onClick={() => { setIsSearchMode(false); setSearchTerm(''); }}
                            className="text-indigo-600 font-medium"
                        >
                            取消
                        </button>
                    </div>
                )}
            </div>

            {/* Search History & Results (only show in search mode) */}
            {isSearchMode && (
                <div className="bg-white border-t min-h-[60vh]">
                    {/* Show Search Results if we have any */}
                    {searchResults.length > 0 ? (
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-slate-600">
                                    搜索结果 ({searchResults.length})
                                </span>
                                <button
                                    onClick={() => { setSearchResults([]); setSearchTerm(''); }}
                                    className="text-xs text-indigo-500"
                                >
                                    清除结果
                                </button>
                            </div>
                            <div className="space-y-3">
                                {searchResults.map((podcast: any) => (
                                    <div
                                        key={podcast.id || podcast.collectionId}
                                        onClick={() => handleClickPodcast(podcast)}
                                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 cursor-pointer"
                                    >
                                        <img
                                            src={podcast.artwork || podcast.artworkUrl}
                                            className="w-14 h-14 rounded-lg object-cover bg-gray-200"
                                            alt=""
                                        />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-slate-800 line-clamp-1">{podcast.title}</h3>
                                            <p className="text-sm text-slate-500 line-clamp-1">{podcast.author}</p>
                                        </div>
                                        <ChevronRight className="text-gray-300" size={20} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : isSearching ? (
                        /* Loading state */
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : searchHistory.length > 0 ? (
                        /* Search History */
                        <div className="p-4">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-slate-600">搜索历史</span>
                                <button
                                    onClick={clearAllHistory}
                                    className="text-xs text-slate-400 hover:text-red-500"
                                >
                                    清空
                                </button>
                            </div>
                            <div className="space-y-2">
                                {searchHistory.map((item, idx) => (
                                    <div
                                        key={`${item.type}-${item.value}-${idx}`}
                                        onClick={async () => {
                                            if (item.type === 'term') {
                                                // 🔥 Fixed: Use inline search instead of navigation
                                                setSearchTerm(item.value);
                                                setIsSearching(true);
                                                try {
                                                    const results = await api.searchPodcasts(item.value);
                                                    setSearchResults(results || []);
                                                } catch { setSearchResults([]); }
                                                finally { setIsSearching(false); }
                                            } else {
                                                navigate(`/podcasts/channel?id=${item.value}&feedUrl=${encodeURIComponent(item.feedUrl || '')}`);
                                            }
                                        }}
                                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer group"
                                    >
                                        {item.type === 'term' ? (
                                            <Clock className="text-slate-400" size={18} />
                                        ) : (
                                            <img
                                                src={item.artwork}
                                                className="w-10 h-10 rounded-lg object-cover bg-gray-200"
                                                alt=""
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-slate-700 line-clamp-1">
                                                {item.type === 'term' ? item.value : item.title}
                                            </p>
                                            {item.type === 'podcast' && (
                                                <p className="text-xs text-slate-400">播客频道</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={(e) => handleDeleteHistoryItem(item, e)}
                                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-200 rounded-full transition"
                                        >
                                            <X size={16} className="text-slate-400" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-slate-400">
                            <Search className="w-12 h-12 mx-auto mb-3 text-slate-200" />
                            <p>输入关键词搜索韩语播客</p>
                        </div>
                    )}
                </div>
            )}

            {/* Main Content (hide when in search mode) */}
            {!isSearchMode && (
                <div className="p-6 space-y-8">
                    {/* 0. 我的订阅 */}
                    {subscriptions.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4">
                                <Heart className="text-red-500" size={20} />
                                <h2 className="text-xl font-bold">我的订阅</h2>
                                <span className="text-sm text-slate-400">({subscriptions.length})</span>
                            </div>

                            <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2">
                                {subscriptions.map((channel) => (
                                    <div
                                        key={channel.id || channel.itunesId}
                                        onClick={() => handleClickPodcast(channel)}
                                        className="flex-shrink-0 w-24 cursor-pointer group"
                                    >
                                        <img
                                            src={channel.artworkUrl || channel.artwork}
                                            className="w-24 h-24 rounded-xl object-cover bg-gray-200 shadow-sm group-hover:shadow-md transition"
                                            alt={channel.title}
                                        />
                                        <p className="text-xs text-slate-700 mt-2 line-clamp-2 text-center font-medium">{channel.title}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 没有订阅时显示提示 */}
                    {!loading && subscriptions.length === 0 && user && (
                        <section className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 text-center">
                            <Heart className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-700 mb-1">还没有订阅频道</h3>
                            <p className="text-sm text-slate-500 mb-4">探索下方热门播客，订阅喜欢的频道</p>
                        </section>
                    )}

                    {/* 1. 热门推荐 */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <TrendingUp className="text-pink-500" />
                            <h2 className="text-xl font-bold">热门推荐</h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {loading ? (
                                <div className="col-span-2 flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                                </div>
                            ) : trending.map((pod) => (
                                <div
                                    key={pod.id}
                                    onClick={() => handleClickPodcast(pod)}
                                    className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition"
                                >
                                    <img src={pod.artwork || pod.artworkUrl} className="w-20 h-20 rounded-lg object-cover bg-gray-200" alt={pod.title} />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 line-clamp-1">{pod.title}</h3>
                                        <p className="text-sm text-slate-500 line-clamp-1">{pod.author}</p>
                                    </div>
                                    <ChevronRight className="text-gray-300" />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 2. 社区热播 */}
                    <section>
                        <div className="flex items-center gap-2 mb-4">
                            <Users className="text-indigo-500" />
                            <h2 className="text-xl font-bold">社区热听</h2>
                        </div>

                        <div className="space-y-3">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                                </div>
                            ) : community.map((item, idx) => (
                                <div
                                    key={item.id || idx}
                                    onClick={() => item.audioUrl && navigate('/podcasts/player', { state: { episode: item } })}
                                    className="flex items-center gap-4 p-3 bg-white rounded-xl shadow-sm cursor-pointer hover:shadow-md transition"
                                >
                                    <div className="text-lg font-bold text-indigo-300 w-6 text-center">{idx + 1}</div>
                                    <img
                                        src={item.channel?.artwork || item.artwork || item.artworkUrl}
                                        className="w-12 h-12 rounded-lg object-cover bg-gray-200"
                                        alt=""
                                    />
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-slate-800 line-clamp-1">{item.title}</h3>
                                        <p className="text-xs text-slate-500">
                                            {item.channel?.title || item.author || 'Unknown'} • {item.views || 0} 次播放
                                        </p>
                                    </div>
                                    <Play className="text-indigo-400" size={20} />
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
