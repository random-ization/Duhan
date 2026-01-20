import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Loader2,
  ArrowLeft,
  Clock,
  Zap,
  Flame,
  Star,
  TrendingUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { getLabel, getLabels } from '../utils/i18n';
import { VOCAB } from '../utils/convexRefs';

// ... (VocabWord interface can be kept or replaced by inferred type, but let's keep it simple for now or usage might break if DTO is different)
// Actually DTO is compatible. Let's use the query.

const VocabBookPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language } = useAuth();
  const labels = getLabels(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  // Use state for 'now' to ensure purity during render
  const [now] = useState(() => Date.now());

  // 从SRS系统获取待复习词汇（不包含MASTERED）
  const srsWordsResult = useQuery(VOCAB.getDueForReview);
  const loading = srsWordsResult === undefined;
  const words = useMemo(() => srsWordsResult ?? [], [srsWordsResult]);

  // 按搜索和状态过滤
  const filteredWords = useMemo(() => {
    let result = words;

    // Filter by status
    if (activeFilter !== 'all') {
      result = result.filter(w => w.progress.status === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        w => w.word.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q)
      );
    }

    return result;
  }, [words, searchQuery, activeFilter]);

  // 统计
  const stats = useMemo(() => {
    const dueNow = words.filter(
      w => w.progress.nextReviewAt && w.progress.nextReviewAt <= now
    ).length;
    const newWords = words.filter(w => w.progress.status === 'NEW').length;
    const learning = words.filter(w => w.progress.status === 'LEARNING').length;
    const review = words.filter(w => w.progress.status === 'REVIEW').length;
    return { dueNow, newWords, learning, review, total: words.length };
  }, [words, now]);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'NEW':
        return {
          bgClass: 'bg-blue-100',
          textClass: 'text-blue-600',
          borderClass: 'border-blue-200',
          label: labels.vocab?.newBadge || 'NEW',
          icon: Star,
        };
      case 'LEARNING':
        return {
          bgClass: 'bg-amber-100',
          textClass: 'text-amber-600',
          borderClass: 'border-amber-200',
          label: labels.vocab?.learningBadge || 'Learning',
          icon: Flame,
        };
      case 'REVIEW':
        return {
          bgClass: 'bg-purple-100',
          textClass: 'text-purple-600',
          borderClass: 'border-purple-200',
          label: labels.vocab?.reviewBadge || 'Review',
          icon: TrendingUp,
        };
      default:
        return null;
    }
  };

  const formatRelativeTime = (timestamp: number | null) => {
    if (!timestamp) return '';
    const diff = timestamp - now;
    if (diff <= 0) return labels.dashboard?.topik?.startNow || 'Now';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return (labels.vocab?.daysLater || '{count}d').replace('{count}', String(days));
    if (hours > 0)
      return (labels.vocab?.hoursLater || '{count}h').replace('{count}', String(hours));
    return labels.vocab?.soon || 'Soon';
  };

  const filterButtons = [
    { key: 'all', label: labels.vocab?.filterAll || 'All', count: stats.total, color: 'slate' },
    { key: 'NEW', label: labels.vocab?.filterNew || 'New', count: stats.newWords, color: 'blue' },
    {
      key: 'LEARNING',
      label: labels.vocab?.filterLearning || 'Learning',
      count: stats.learning,
      color: 'amber',
    },
    {
      key: 'REVIEW',
      label: labels.vocab?.filterReview || 'Review',
      count: stats.review,
      color: 'purple',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header - Claymorphism Style */}
      <div className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b-[3px] border-indigo-100">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2.5 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-indigo-300 hover:-translate-y-0.5 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_2px_4px_rgba(255,255,255,0.9)]"
              >
                <ArrowLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-[20px] flex items-center justify-center shadow-[0_8px_20px_rgba(99,102,241,0.3)] border-[3px] border-indigo-300">
                  <BookOpen className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {labels.dashboard?.vocab?.title || 'Vocab Book'}
                  </h1>
                  <p className="text-slate-500 font-bold text-sm">
                    {labels.dashboard?.vocab?.subtitle || 'SRS Smart Review'}
                  </p>
                </div>
              </div>
            </div>

            {/* Due Now Badge - Claymorphism */}
            {stats.dueNow > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-[3px] border-red-200 shadow-[0_4px_15px_rgba(239,68,68,0.15),inset_0_2px_4px_rgba(255,255,255,0.9)]">
                <div className="p-2 bg-red-500 rounded-xl">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-red-600">{stats.dueNow}</p>
                  <p className="text-xs font-bold text-red-400">
                    {labels.dashboard?.vocab?.dueNow || 'Due Now'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search - Claymorphism */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder={
                  getLabel(labels, ['dashboard', 'vocab', 'search']) || 'Search words...'
                }
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border-[3px] border-slate-200 rounded-2xl text-sm font-medium focus:ring-0 focus:border-indigo-300 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
              />
            </div>

            {/* Filter Buttons - Claymorphism */}
            <div className="flex gap-2 flex-wrap">
              {filterButtons.map(btn => (
                <button
                  key={btn.key}
                  onClick={() => setActiveFilter(btn.key)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm border-[3px] transition-all duration-200 ${
                    activeFilter === btn.key
                      ? btn.color === 'blue'
                        ? 'bg-blue-500 text-white border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                        : btn.color === 'amber'
                          ? 'bg-amber-500 text-white border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.3)]'
                          : btn.color === 'purple'
                            ? 'bg-purple-500 text-white border-purple-400 shadow-[0_4px_12px_rgba(139,92,246,0.3)]'
                            : 'bg-slate-700 text-white border-slate-600 shadow-[0_4px_12px_rgba(51,65,85,0.3)]'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)]'
                  }`}
                >
                  {btn.label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-lg text-xs ${
                      activeFilter === btn.key ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    {btn.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            </div>
            <p className="text-slate-400 font-bold">{labels.common?.loading || 'Loading...'}</p>
          </div>
        ) : filteredWords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-[28px] flex items-center justify-center mb-6 border-[3px] border-indigo-200 shadow-[0_8px_30px_rgba(99,102,241,0.15)]">
              <BookOpen className="w-12 h-12 text-indigo-400" />
            </div>
            <p className="text-xl font-black text-slate-700 mb-2">
              {searchQuery
                ? labels.dashboard?.vocab?.noMatch || 'No results found'
                : labels.dashboard?.vocab?.noDueNow || 'No words due for review'}
            </p>
            <p className="text-slate-400 font-medium text-center max-w-md">
              {searchQuery
                ? ''
                : labels.dashboard?.vocab?.srsDesc ||
                  "Words you mark as 'Don't know' will appear here for spaced repetition learning"}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            <AnimatePresence mode="popLayout">
              {filteredWords.map((word, index) => {
                const statusConfig = getStatusConfig(word.progress.status);
                const StatusIcon = statusConfig?.icon || Star;

                return (
                  <motion.div
                    key={word.id}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: index * 0.03 }}
                    className={`relative overflow-hidden rounded-[24px] p-5 border-[3px] ${statusConfig?.borderClass || 'border-slate-200'} bg-white cursor-pointer group transition-all duration-200 hover:-translate-y-1 shadow-[0_8px_30px_rgba(0,0,0,0.06),inset_0_-4px_10px_rgba(255,255,255,0.6),inset_0_4px_10px_rgba(255,255,255,0.9)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1),inset_0_-4px_10px_rgba(255,255,255,0.6),inset_0_4px_10px_rgba(255,255,255,0.9)]`}
                  >
                    {/* Status Badge */}
                    {statusConfig && (
                      <div
                        className={`absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-xl ${statusConfig.bgClass} border-2 ${statusConfig.borderClass}`}
                      >
                        <StatusIcon className={`w-3.5 h-3.5 ${statusConfig.textClass}`} />
                        <span className={`text-xs font-black ${statusConfig.textClass}`}>
                          {statusConfig.label}
                        </span>
                      </div>
                    )}

                    {/* Word & Meaning */}
                    <div className="pr-24">
                      <h3 className="text-2xl font-black text-slate-900 mb-1 group-hover:text-indigo-600 transition-colors">
                        {word.word}
                      </h3>
                      {word.pronunciation && (
                        <p className="text-sm text-slate-400 font-medium mb-2">
                          {word.pronunciation}
                        </p>
                      )}
                      <p className="text-slate-600 font-medium leading-relaxed">{word.meaning}</p>
                    </div>

                    {/* Meta Info */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t-2 border-dashed border-slate-100">
                      <div className="flex items-center gap-3">
                        {word.partOfSpeech && (
                          <span className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-500">
                            {word.partOfSpeech}
                          </span>
                        )}
                        {word.hanja && (
                          <span className="text-sm text-slate-400 font-medium">{word.hanja}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-1 text-slate-400">
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-bold">
                            {formatRelativeTime(word.progress.nextReviewAt)}
                          </span>
                        </div>
                        {word.progress.streak > 0 && (
                          <div className="flex items-center gap-1 text-orange-500">
                            <Flame className="w-3.5 h-3.5" />
                            <span className="font-bold">{word.progress.streak}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default VocabBookPage;
