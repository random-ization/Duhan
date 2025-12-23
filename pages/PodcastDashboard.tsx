import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Mic, Library, Search, Disc, History as HistoryIcon } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { clsx } from 'clsx';

export default function PodcastDashboard() {
    const navigate = useNavigate();
    const { user } = useAuth();

    // State
    const [trending, setTrending] = useState<any[]>([]);
    const [subscriptions, setSubscriptions] = useState<any[]>([]);
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const loadData = async () => {
            try {
                // Parallel fetch for better performance
                const [trendingRes, historyRes] = await Promise.all([
                    api.getPodcastTrending().catch(() => ({ external: [] })),
                    user ? api.getPodcastHistory().catch(() => []) : Promise.resolve([])
                ]);

                setTrending(trendingRes.external || []);
                setHistory(historyRes || []);

                if (user) {
                    const subs = await api.getPodcastSubscriptions().catch(() => []);
                    setSubscriptions(subs || []);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [user]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/podcasts/search?q=${encodeURIComponent(searchTerm)}`);
        }
    };

    // Determine featured content: Last played episode OR Top Trending
    const lastPlayed = history.length > 0 ? history[0] : null;
    const featuredPodcast = !lastPlayed && trending.length > 0 ? trending[0] : null;

    return (
        <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32" style={{ backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}>
            <div className="max-w-7xl mx-auto space-y-12">

                {/* 1. Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-6">
                    <div className="flex items-center gap-4">
                        <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Headphone.png" className="w-14 h-14 animate-bounce-slow" alt="headphone" />
                        <div>
                            <h2 className="text-4xl font-black font-display text-slate-900 tracking-tight">播客中心</h2>
                            <p className="text-slate-500 font-bold">听力磨耳朵</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/podcasts/subscriptions')}
                        className="flex items-center gap-2 bg-white border-2 border-slate-900 px-4 py-2 rounded-xl font-bold hover:bg-slate-50 shadow-pop active:shadow-none active:translate-y-1 transition text-slate-900"
                    >
                        <Library size={18} /> 我的订阅
                    </button>
                </div>

                {/* 2. Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <form onSubmit={handleSearch} className="relative flex-1 group">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="搜索播客频道、单集..."
                            className="w-full bg-white border-2 border-slate-900 rounded-xl py-3 px-12 shadow-pop focus:outline-none focus:translate-y-1 focus:shadow-none transition font-bold placeholder:text-slate-400 text-slate-900"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition" size={20} />
                    </form>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                        <button className="px-4 py-3 bg-slate-900 text-white rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap shadow-pop hover:translate-y-1 hover:shadow-none transition">全部</button>
                        <button className="px-4 py-3 bg-white text-slate-600 rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap hover:bg-slate-50 transition">初级</button>
                        <button className="px-4 py-3 bg-white text-slate-600 rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap hover:bg-slate-50 transition">日常对话</button>
                    </div>
                </div>

                {/* 3. Main Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column (Featured + History) */}
                    <div className="lg:col-span-8 space-y-8">

                        {/* Featured Hero Card */}
                        {lastPlayed ? (
                            <div
                                onClick={() => navigate('/podcasts/player', {
                                    state: {
                                        episode: {
                                            guid: lastPlayed.episodeGuid,
                                            title: lastPlayed.episodeTitle,
                                            audioUrl: lastPlayed.episodeUrl,
                                            channel: { title: lastPlayed.channelName, artworkUrl: lastPlayed.channelImage }
                                        }
                                    }
                                })}
                                className="bg-slate-900 rounded-[2rem] p-6 text-white border-2 border-slate-900 shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6"
                            >
                                <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
                                    <Disc size={200} />
                                </div>
                                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-l from-indigo-900/50 to-transparent pointer-events-none"></div>

                                <div className="w-28 h-28 rounded-2xl bg-indigo-500 border-2 border-white shadow-lg overflow-hidden shrink-0 z-10">
                                    <img src={lastPlayed.channelImage || "https://placehold.co/400x400/indigo/white?text=Pod"} className="w-full h-full object-cover" alt="album art" />
                                </div>
                                <div className="z-10 flex-1 text-center md:text-left">
                                    <div className="text-xs font-bold text-green-400 mb-1 flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider">
                                        <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span> Continue Listening
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
                            </div>
                        ) : featuredPodcast ? (
                            <div
                                onClick={() => navigate(`/podcasts/channel?id=${featuredPodcast.itunesId || featuredPodcast.id}`)}
                                className="bg-slate-900 rounded-[2rem] p-6 text-white border-2 border-slate-900 shadow-pop relative overflow-hidden group cursor-pointer bouncy flex flex-col md:flex-row items-center gap-6"
                            >
                                <div className="absolute right-[-20px] bottom-[-40px] opacity-20 group-hover:rotate-12 transition duration-500">
                                    <Disc size={200} />
                                </div>
                                <div className="w-28 h-28 rounded-2xl bg-indigo-500 border-2 border-white shadow-lg overflow-hidden shrink-0 z-10">
                                    <img src={featuredPodcast.artworkUrl || featuredPodcast.artwork || "https://placehold.co/400x400/indigo/white?text=Pod"} className="w-full h-full object-cover" alt="album art" />
                                </div>
                                <div className="z-10 flex-1 text-center md:text-left">
                                    <div className="text-xs font-bold text-yellow-400 mb-1 flex items-center justify-center md:justify-start gap-2 uppercase tracking-wider">
                                        <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span> Featured Podcast
                                    </div>
                                    <h3 className="text-2xl font-black mb-1 line-clamp-1">{featuredPodcast.title}</h3>
                                    <p className="text-slate-400 text-sm">{featuredPodcast.author}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-800 rounded-[2rem] p-8 text-center text-slate-400">
                                <p>开始探索播客吧！您的收听历史和推荐将显示在这里。</p>
                            </div>
                        )}

                        {/* Recent History (Horizontal Scroll) */}
                        {history.length > 0 && (
                            <div>
                                <h3 className="font-black text-xl mb-4 flex items-center gap-2 text-slate-900"><HistoryIcon size={20} /> 收听历史</h3>
                                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
                                    {history.map((record) => (
                                        <div
                                            key={record.id}
                                            onClick={() => navigate('/podcasts/player', {
                                                state: {
                                                    episode: {
                                                        guid: record.episodeGuid,
                                                        title: record.episodeTitle,
                                                        audioUrl: record.episodeUrl,
                                                        channel: { title: record.channelName, artworkUrl: record.channelImage }
                                                    }
                                                }
                                            })}
                                            className="min-w-[220px] max-w-[220px] bg-white p-3 rounded-[1.5rem] border-2 border-slate-900 shadow-sm hover:shadow-pop transition cursor-pointer"
                                        >
                                            <div className="flex items-center gap-3 mb-3">
                                                <img src={record.channelImage || "https://placehold.co/100x100"} className="w-10 h-10 rounded-lg border border-slate-200 object-cover" alt="cover" />
                                                <div className="overflow-hidden flex-1">
                                                    <div className="text-xs font-bold text-slate-900 truncate">{record.episodeTitle}</div>
                                                    <div className="text-xs font-bold text-slate-400 truncate">{record.channelName}</div>
                                                </div>
                                            </div>
                                            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                                {/* Mock progress for now, could be real if backend supported it */}
                                                <div className="bg-indigo-500 h-full w-[70%]"></div>
                                            </div>
                                            <div className="text-[10px] text-slate-400 font-bold mt-1 text-right">
                                                {new Date(record.playedAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column (Community Charts) */}
                    <div className="lg:col-span-4 bg-white rounded-[2rem] border-2 border-slate-900 p-6 shadow-pop h-fit">
                        <div className="flex gap-4 mb-6 border-b-2 border-slate-100 pb-2">
                            <button className="text-lg font-black text-slate-900 border-b-4 border-indigo-500 pb-2 -mb-3.5">社区热播</button>
                            <button className="text-lg font-black text-slate-400 hover:text-slate-600 transition">本周推荐</button>
                        </div>

                        <div className="space-y-4">
                            {trending.slice(0, 5).map((pod, idx) => (
                                <div key={idx} onClick={() => navigate(`/podcasts/channel?id=${pod.id || pod.itunesId}&feedUrl=${encodeURIComponent(pod.feedUrl)}`)} className="flex items-center gap-4 group cursor-pointer hover:bg-slate-50 p-2 rounded-xl transition">
                                    <div className="font-black text-slate-300 text-xl w-6 text-center">{idx + 1}</div>
                                    <img src={pod.artwork || pod.artworkUrl} className="w-12 h-12 rounded-lg border border-slate-200" alt={pod.title} />
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm text-slate-900 truncate group-hover:text-indigo-600 transition">{pod.title}</h4>
                                        <p className="text-xs text-slate-500 truncate">{pod.author}</p>
                                    </div>
                                </div>
                            ))}

                            {/* Show skeleton if loading */}
                            {loading && !trending.length && [1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-4 p-2 rounded-xl animate-pulse">
                                    <div className="w-6 h-6 bg-slate-200 rounded-full"></div>
                                    <div className="w-12 h-12 bg-slate-200 rounded-lg" />
                                    <div className="flex-1 min-w-0 space-y-2">
                                        <div className="h-4 w-24 bg-slate-200 rounded"></div>
                                        <div className="h-3 w-16 bg-slate-100 rounded"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="w-full mt-6 py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-500 hover:border-slate-900 hover:text-slate-900 transition">
                            查看完整榜单
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
