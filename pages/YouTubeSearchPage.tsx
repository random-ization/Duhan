import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, PlayCircle, Users, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const YouTubeSearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isImporting, setIsImporting] = useState<string | null>(null); // youtubeId being imported
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
            // Trigger import (backend fetches transcript + AI analysis)
            // This might take a few seconds
            await api.importVideo(video.id);
            navigate(`/youtube/learn/${video.id}`);
        } catch (err: any) {
            setError('导入失败：' + (err.message || '未知错误'));
            setIsImporting(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-block p-3 rounded-2xl bg-gradient-to-br from-red-500 to-rose-600 shadow-lg mb-4"
                    >
                        <PlayCircle className="w-10 h-10 text-white" />
                    </motion.div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 tracking-tight">
                        YouTube 沉浸式学习
                    </h1>
                    <p className="text-slate-500 text-lg max-w-2xl mx-auto">
                        搜索任意 YouTube 视频，AI 老师将为您自动生成双语字幕、提炼重点词汇，并进行语法解析。
                    </p>
                </div>

                {/* Search Bar */}
                <motion.form
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onSubmit={handleSearch}
                    className="relative max-w-2xl mx-auto"
                >
                    <div className="relative group">
                        <div className="absolute inset-0 bg-indigo-500 rounded-full blur opacity-20 group-hover:opacity-30 transition-opacity" />
                        <div className="relative flex items-center bg-white rounded-full shadow-xl border border-slate-200 overflow-hidden">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="粘贴 YouTube 链接或搜索关键词..."
                                className="flex-1 px-6 py-4 text-lg bg-transparent border-none outline-none text-slate-700 placeholder:text-slate-400"
                            />
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                                搜索
                            </button>
                        </div>
                    </div>
                </motion.form>

                {/* Error */}
                {error && (
                    <div className="text-center p-4 bg-red-50 text-red-600 rounded-xl border border-red-100 max-w-2xl mx-auto">
                        {error}
                    </div>
                )}

                {/* Results Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {results.map((video, idx) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all border border-slate-100 overflow-hidden group cursor-pointer"
                            onClick={() => handleImport(video)}
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video bg-slate-100 overflow-hidden">
                                <img
                                    src={video.thumbnail}
                                    alt={video.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur rounded-full p-3 shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                                        <PlayCircle className="w-8 h-8 text-indigo-600" />
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-2">
                                <h3 className="font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
                                    {video.title}
                                </h3>
                                <div className="flex items-center justify-between text-xs text-slate-500 font-medium pt-2 border-t border-slate-50 mt-2">
                                    <span className="flex items-center gap-1.5 truncat max-w-[70%]">
                                        <Users className="w-3.5 h-3.5" />
                                        {video.channelTitle}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3.5 h-3.5" />
                                        {new Date(video.publishedAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Loading Overlay */}
                            {isImporting === video.id && (
                                <div className="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center space-y-3">
                                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                                    <p className="text-sm font-bold text-indigo-800 animate-pulse">
                                        正在生成 AI 解析...
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default YouTubeSearchPage;
