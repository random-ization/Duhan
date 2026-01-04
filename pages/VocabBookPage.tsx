import React, { useState, useMemo } from 'react';
import { Search, BookOpen, Loader2, ArrowLeft, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api as convexApi } from '../convex/_generated/api';

interface VocabWord {
    id: string;
    word: string;
    meaning: string;
    partOfSpeech?: string;
    hanja?: string;
    pronunciation?: string;
    progress: {
        status: string;
        interval: number;
        streak: number;
        nextReviewAt: number | null;
        lastReviewedAt: number | null;
    };
}

const VocabBookPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');

    // 从SRS系统获取待复习词汇（不包含MASTERED）
    const srsWordsResult = useQuery(convexApi.vocab.getDueForReview, {});
    const loading = srsWordsResult === undefined;
    const words: VocabWord[] = useMemo(() => {
        if (!srsWordsResult) return [];
        return srsWordsResult.map((w: any) => ({
            id: String(w.id),
            word: w.word,
            meaning: w.meaning,
            partOfSpeech: w.partOfSpeech,
            hanja: w.hanja,
            pronunciation: w.pronunciation,
            progress: w.progress,
        }));
    }, [srsWordsResult]);

    // 按搜索过滤
    const filteredWords = useMemo(() => {
        if (!searchQuery.trim()) return words;
        const q = searchQuery.toLowerCase();
        return words.filter(
            w => w.word.toLowerCase().includes(q) ||
                w.meaning.toLowerCase().includes(q)
        );
    }, [words, searchQuery]);

    // 统计
    const stats = useMemo(() => {
        const now = Date.now();
        const dueNow = words.filter(w => w.progress.nextReviewAt && w.progress.nextReviewAt <= now).length;
        const newWords = words.filter(w => w.progress.status === 'NEW').length;
        const learning = words.filter(w => w.progress.status === 'LEARNING').length;
        const review = words.filter(w => w.progress.status === 'REVIEW').length;
        return { dueNow, newWords, learning, review, total: words.length };
    }, [words]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'NEW':
                return <span className="px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full">新</span>;
            case 'LEARNING':
                return <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-xs font-bold rounded-full">学习中</span>;
            case 'REVIEW':
                return <span className="px-2 py-0.5 bg-purple-100 text-purple-600 text-xs font-bold rounded-full">复习</span>;
            default:
                return null;
        }
    };

    const formatRelativeTime = (timestamp: number | null) => {
        if (!timestamp) return '';
        const now = Date.now();
        const diff = timestamp - now;
        if (diff <= 0) return '现在';
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}天后`;
        if (hours > 0) return `${hours}小时后`;
        return '即将';
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-lg border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-slate-600" />
                            </button>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-slate-800">生词本</h1>
                                    <p className="text-sm text-slate-500">SRS智能复习系统</p>
                                </div>
                            </div>
                        </div>
                        {/* Stats */}
                        <div className="hidden sm:flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-lg">
                                <Zap className="w-4 h-4 text-red-500" />
                                <span className="text-sm font-bold text-red-600">{stats.dueNow} 待复习</span>
                            </div>
                            <div className="text-sm text-slate-500">
                                共 {stats.total} 个生词
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="max-w-md">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="搜索生词..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 focus:bg-white transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    </div>
                ) : filteredWords.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                        <BookOpen className="w-16 h-16 mb-4 opacity-50" />
                        <p className="text-lg font-medium">
                            {searchQuery ? '没有找到匹配的生词' : '🎉 没有待复习的生词'}
                        </p>
                        <p className="text-sm mt-2">
                            {searchQuery ? '' : '在单词学习中选择"不认识"的词会自动加入这里'}
                        </p>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-3"
                    >
                        <AnimatePresence mode="popLayout">
                            {filteredWords.map((word) => (
                                <motion.div
                                    key={word.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-2xl font-bold text-slate-900">{word.word}</span>
                                                {getStatusBadge(word.progress.status)}
                                                {word.partOfSpeech && (
                                                    <span className="text-xs text-slate-400">{word.partOfSpeech}</span>
                                                )}
                                            </div>
                                            <p className="text-slate-600">{word.meaning}</p>
                                            {word.hanja && (
                                                <p className="text-sm text-slate-400 mt-1">漢字: {word.hanja}</p>
                                            )}
                                        </div>
                                        <div className="text-right text-sm text-slate-400">
                                            <div className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                <span>{formatRelativeTime(word.progress.nextReviewAt)}</span>
                                            </div>
                                            <div className="text-xs mt-1">
                                                连续 {word.progress.streak} 次
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default VocabBookPage;
