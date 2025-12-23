import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, PlayCircle, Clock, Users, Play } from 'lucide-react';
import { api } from '../services/api';
import { clsx } from 'clsx';

const YouTubeSearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isImporting, setIsImporting] = useState<string | null>(null);
    const [results, setResults] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!query.trim()) return;

        setIsSearching(true);
        setError(null);
        try {
            const res = await api.searchVideo(query);
            if (res.success) {
                setResults(res.data);
            }
        } catch (err: any) {
            setError(err.message || '搜索失败');
        } finally {
            setIsSearching(false);
        }
    };

    const handleImport = async (video: any) => {
        setIsImporting(video.id);
        try {
            await api.importVideo(video.id);
            navigate(`/youtube/learn/${video.id}`);
        } catch (err: any) {
            setError('导入失败：' + (err.message || '未知错误'));
            setIsImporting(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32" style={{ backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}>
            <div className="max-w-7xl mx-auto space-y-12">

                {/* 1. Header */}
                <div className="flex items-center gap-4 mb-4">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Television.png" className="w-14 h-14 animate-bounce-slow" alt="TV" />
                    <div>
                        <h2 className="text-4xl font-black font-display text-slate-900 tracking-tight">视频中心</h2>
                        <p className="text-slate-500 font-bold">精选 YouTube 内容</p>
                    </div>
                </div>

                {/* 2. Search & Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <form onSubmit={handleSearch} className="relative flex-1 group">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="搜索 K-Pop, 韩剧, 综艺..."
                            className="w-full bg-white border-2 border-slate-900 rounded-xl py-3 px-12 shadow-pop focus:outline-none focus:translate-y-1 focus:shadow-none transition font-bold placeholder:text-slate-400 text-slate-900"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition" size={20} />
                    </form>
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 md:pb-0">
                        <button className="px-4 py-3 bg-slate-900 text-white rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap shadow-pop hover:translate-y-1 hover:shadow-none transition">全部</button>
                        <button className="px-4 py-3 bg-white text-slate-600 rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap hover:bg-slate-50 transition">K-Pop</button>
                        <button className="px-4 py-3 bg-white text-slate-600 rounded-xl border-2 border-slate-900 font-bold text-sm whitespace-nowrap hover:bg-slate-50 transition">Vlog</button>
                    </div>
                </div>

                {/* 3. Error Message */}
                {error && (
                    <div className="bg-red-50 border-2 border-red-200 text-red-600 p-4 rounded-xl font-bold text-center">
                        {error}
                    </div>
                )}

                {/* 4. Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Skeleton / Initial State */}
                    {!isSearching && results.length === 0 && (
                        <>
                            <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-sm p-4 flex gap-4 hover:shadow-pop transition cursor-pointer group">
                                <div className="w-32 h-24 bg-slate-200 rounded-lg shrink-0 border border-slate-200 overflow-hidden relative">
                                    <img src="https://picsum.photos/400/200?random=4" className="w-full h-full object-cover" alt="thumb" />
                                    <div className="absolute top-1 left-1 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">AI</div>
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="font-bold text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition">韩语中级听力训练 Vol.4</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                        <span>Billy Korean</span>
                                        <span>•</span>
                                        <span>14:02</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-2xl border-2 border-slate-900 shadow-sm p-4 flex gap-4 hover:shadow-pop transition cursor-pointer group">
                                <div className="w-32 h-24 bg-slate-200 rounded-lg shrink-0 border border-slate-200 overflow-hidden relative">
                                    <img src="https://picsum.photos/400/200?random=5" className="w-full h-full object-cover" alt="thumb" />
                                </div>
                                <div className="flex flex-col justify-center">
                                    <h4 className="font-bold text-slate-900 leading-tight mb-2 group-hover:text-indigo-600 transition">首尔街头美食之旅 Vlog</h4>
                                    <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                        <span>Seoul Walker</span>
                                        <span>•</span>
                                        <span>24:10</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* Actual Results */}
                    {results.map((video) => (
                        <div
                            key={video.id}
                            onClick={() => handleImport(video)}
                            className="bg-white rounded-2xl border-2 border-slate-900 shadow-sm p-4 flex gap-4 hover:shadow-pop transition cursor-pointer group relative overflow-hidden"
                        >
                            {/* Loading Overlay */}
                            {isImporting === video.id && (
                                <div className="absolute inset-0 bg-white/80 z-20 flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                                </div>
                            )}

                            <div className="w-32 h-24 bg-slate-200 rounded-lg shrink-0 border border-slate-200 overflow-hidden relative">
                                <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" alt={video.title} />
                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition"></div>
                            </div>
                            <div className="flex flex-col justify-center min-w-0">
                                <h4 className="font-bold text-slate-900 leading-tight mb-2 line-clamp-2 group-hover:text-indigo-600 transition">{video.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
                                    <span className="truncate max-w-[80px]">{video.channelTitle}</span>
                                    <span>•</span>
                                    <span>{new Date(video.publishedAt).toLocaleDateString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Searching State */}
                    {isSearching && (
                        <div className="col-span-1 md:col-span-2 lg:col-span-3 flex justify-center py-12">
                            <Loader2 className="w-10 h-10 text-slate-900 animate-spin" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default YouTubeSearchPage;
