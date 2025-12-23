import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, ArrowLeft, Podcast, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { PodcastChannel } from '../types';

export default function PodcastSearchPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const query = searchParams.get('q') || '';
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState(query);
    const [results, setResults] = useState<PodcastChannel[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (query) {
            handleSearchRequest(query);
        }
    }, [query]);

    const handleSearchRequest = async (term: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.searchPodcasts(term);
            setResults(data);
        } catch (err: any) {
            console.error('Search failed:', err);
            setError('搜索失败，请稍后重试');
        } finally {
            setLoading(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            setSearchParams({ q: searchTerm });
        }
    };

    return (
        <div className="min-h-screen bg-[#F0F4F8] p-6 md:p-12 font-sans pb-32" style={{ backgroundImage: "radial-gradient(#cbd5e1 1.5px, transparent 1.5px)", backgroundSize: "24px 24px" }}>
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header & Search */}
                <div className="space-y-6">
                    <button
                        onClick={() => navigate('/podcasts')}
                        className="flex items-center gap-2 text-slate-500 hover:text-slate-900 font-bold transition"
                    >
                        <ArrowLeft size={20} /> 返回播客中心
                    </button>

                    <h1 className="text-3xl font-black text-slate-900">搜索播客</h1>

                    <form onSubmit={handleSearchSubmit} className="relative group">
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="输入关键词搜索..."
                            autoFocus
                            className="w-full bg-white border-2 border-slate-900 rounded-xl py-4 px-12 shadow-pop focus:outline-none focus:translate-y-1 focus:shadow-none transition font-bold placeholder:text-slate-400 text-slate-900 text-lg"
                        />
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition" size={24} />
                        <button
                            type="submit"
                            disabled={loading || !searchTerm.trim()}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-slate-700 transition disabled:opacity-50"
                        >
                            搜索
                        </button>
                    </form>
                </div>

                {/* Results Area */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
                            <p className="font-bold">正在搜索精彩内容...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20 text-red-500 font-bold bg-white rounded-2xl border-2 border-red-100 p-8">
                            <p>{error}</p>
                        </div>
                    ) : results.length > 0 ? (
                        <>
                            <p className="font-bold text-slate-500 mb-4">找到 {results.length} 个相关结果</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {results.map((channel) => (
                                    <div
                                        key={channel.itunesId || channel.id}
                                        onClick={() => navigate(`/podcasts/channel?id=${channel.itunesId || channel.id}&feedUrl=${encodeURIComponent(channel.feedUrl)}`)}
                                        className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-sm hover:shadow-pop hover:-translate-y-1 transition cursor-pointer flex gap-4 group"
                                    >
                                        <img
                                            src={channel.artworkUrl || channel.artwork}
                                            alt={channel.title}
                                            className="w-24 h-24 rounded-xl border-2 border-slate-100 object-cover group-hover:border-indigo-200 transition"
                                        />
                                        <div className="flex-1 min-w-0 flex flex-col justify-center">
                                            <h3 className="font-black text-lg text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition">{channel.title}</h3>
                                            <p className="text-sm font-bold text-slate-500 line-clamp-1 mb-2">{channel.author}</p>
                                            <div className="flex gap-2">
                                                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md font-bold">Podcast</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : query && !loading ? (
                        <div className="text-center py-20 bg-white rounded-[2rem] border-dashed border-2 border-slate-300">
                            <Podcast className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                            <h3 className="text-xl font-bold text-slate-900 mb-2">未找到相关播客</h3>
                            <p className="text-slate-500">换个关键词试试看？比如 "Korean", "Talk To Me In Korean"</p>
                        </div>
                    ) : (
                        <div className="text-center py-20">
                            <p className="text-slate-400 font-bold">输入关键词开始搜索</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
