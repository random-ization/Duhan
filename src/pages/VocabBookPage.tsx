import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Loader2,
  ArrowLeft,
  Zap,
  FileDown,
  CheckCircle2,
  Circle,
  Layers,
  Headphones,
  PencilLine,
  SpellCheck,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB, VOCAB_PDF } from '../utils/convexRefs';
import { notify } from '../utils/notify';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileVocabDashboard } from '../components/mobile/MobileVocabDashboard';
type ExportMode = 'A4_DICTATION' | 'LANG_LIST' | 'KO_LIST';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';

const VocabBookPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language, user } = useAuth();
  const labels = getLabels(language);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<VocabBookCategory>('DUE');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<ExportMode>('A4_DICTATION');
  const [exportShuffle, setExportShuffle] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Use state for 'now' to ensure purity during render
  const [now] = useState(() => Date.now());

  const setMastery = useMutation(VOCAB.setMastery);
  const exportPdf = useAction(VOCAB_PDF.exportVocabBookPdf);

  const trimmedSearch = searchQuery.trim();
  const vocabBookResult = useQuery(VOCAB.getVocabBook, {
    includeMastered: true,
    search: trimmedSearch || undefined,
  });
  const loading = vocabBookResult === undefined;
  const items = useMemo(() => vocabBookResult ?? [], [vocabBookResult]);

  const categorized = useMemo(() => {
    return items.map(item => {
      const progress = item.progress;
      const isMastered = progress.status === 'MASTERED';
      const isUnlearned = progress.state === 0 || progress.status === 'NEW';

      let category: VocabBookCategory = 'DUE';
      if (isMastered) {
        category = 'MASTERED';
      } else if (isUnlearned) {
        category = 'UNLEARNED';
      }

      const dueNow = !!progress.nextReviewAt && progress.nextReviewAt <= now && !isMastered;
      return { item, category, dueNow };
    });
  }, [items, now]);

  const visibleItems = useMemo(() => {
    return categorized.filter(x => x.category === activeCategory);
  }, [categorized, activeCategory]);

  // 统计
  const stats = useMemo(() => {
    const dueNow = categorized.filter(x => x.category === 'DUE' && x.dueNow).length;
    const unlearned = categorized.filter(x => x.category === 'UNLEARNED').length;
    const due = categorized.filter(x => x.category === 'DUE').length;
    const mastered = categorized.filter(x => x.category === 'MASTERED').length;
    const total = categorized.length;
    return { dueNow, unlearned, due, mastered, total };
  }, [categorized]);

  const filterButtons: Array<{
    key: VocabBookCategory;
    label: string;
    count: number;
    color: 'blue' | 'amber' | 'emerald';
  }> = useMemo(
    () => [
      {
        key: 'UNLEARNED',
        label: labels.vocab?.unlearned || 'Unlearned',
        count: stats.unlearned,
        color: 'blue',
      },
      {
        key: 'DUE',
        label: labels.vocab?.due || 'Due',
        count: stats.due,
        color: 'amber',
      },
      {
        key: 'MASTERED',
        label: labels.vocab?.mastered || 'Mastered',
        count: stats.mastered,
        color: 'emerald',
      },
    ],
    [
      labels.vocab?.due,
      labels.vocab?.mastered,
      labels.vocab?.unlearned,
      stats.due,
      stats.mastered,
      stats.unlearned,
    ]
  );

  const exportSubtitle = useMemo(() => {
    const catLabel = filterButtons.find(b => b.key === activeCategory)?.label || activeCategory;
    const baseLabel = labels.vocabBook?.title || 'Vocab Book';
    let subtitle = `${baseLabel} · ${catLabel}`;
    if (trimmedSearch) {
      subtitle = `${baseLabel} · ${catLabel} · ${trimmedSearch}`;
    }
    return subtitle;
  }, [activeCategory, filterButtons, labels.vocabBook?.title, trimmedSearch]);

  const langListLabel = useMemo(() => {
    return labels.vocabBook?.exportModes?.langListTitle || 'English List';
  }, [labels.vocabBook?.exportModes?.langListTitle]);

  const langListDesc = useMemo(() => {
    return labels.vocabBook?.exportModes?.langListDesc || 'Write the word';
  }, [labels.vocabBook?.exportModes?.langListDesc]);

  const downloadFile = async (url: string, filename: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('download_failed');
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      globalThis.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const onExport = async () => {
    if (exporting) return;
    try {
      setExporting(true);
      if (!user) {
        notify.error(labels.vocabBook?.signInToExport || 'Please sign in to export');
        return;
      }
      const { url } = await exportPdf({
        origin: globalThis.location.origin,
        language,
        mode: exportMode,
        shuffle: exportShuffle,
        category: activeCategory,
        q: trimmedSearch || undefined,
      });

      const categoryLabel = activeCategory.toLowerCase();
      let modeLabel = 'lang';
      if (exportMode === 'A4_DICTATION') {
        modeLabel = 'dictation';
      } else if (exportMode === 'KO_LIST') {
        modeLabel = 'ko';
      }

      const filename = `vocab-book-${categoryLabel}-${modeLabel}.pdf`;
      await downloadFile(url, filename);
      setExportOpen(false);
    } catch {
      notify.error(labels.vocabBook?.exportFailed || 'Export failed. Please try again.');
    } finally {
      globalThis.setTimeout(() => setExporting(false), 250);
    }
  };

  const startLearning = (mode: 'immerse' | 'listen' | 'dictation' | 'spelling') => {
    const params = new URLSearchParams();
    // If the current category has no items but others do, we should probably
    // default to a category that has items or allow learning from all.
    // Here we prioritize the active category if it has items, otherwise we use 'all'.
    const currentCategoryHasItems = visibleItems.length > 0;
    params.set('category', currentCategoryHasItems ? activeCategory : 'all');
    if (trimmedSearch) params.set('q', trimmedSearch);
    navigate(`/vocab-book/${mode}?${params.toString()}`);
  };

  const renderHeader = () => (
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

          <div className="flex items-center gap-3">
            {stats.dueNow > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-50 to-orange-50 rounded-2xl border-[3px] border-red-200 shadow-[0_4px_15px_rgba(239,68,68,0.15),inset_0_2px_4px_rgba(255,255,255,0.9)]">
                <div className="p-2 bg-red-500 rounded-xl">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-black text-red-600">{stats.dueNow}</p>
                  <p className="text-xs font-bold text-red-400">
                    {labels.vocab?.dueNow || labels.dashboard?.vocab?.dueNow || 'Due now'}
                  </p>
                </div>
              </div>
            )}
            <button
              onClick={() => setExportOpen(true)}
              disabled={visibleItems.length === 0 || loading}
              className="px-4 py-3 rounded-2xl bg-white border-[3px] border-slate-200 hover:border-indigo-300 font-black text-slate-800 shadow-[0_4px_12px_rgba(0,0,0,0.05)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <FileDown className="w-5 h-5 text-indigo-600" />
              {labels.vocabBook?.exportPdf || 'Export PDF'}
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={labels.vocab?.search || 'Search words...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border-[3px] border-slate-200 rounded-2xl text-sm font-medium focus:ring-0 focus:border-indigo-300 focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {filterButtons.map(btn => {
              const isActive = activeCategory === btn.key;
              let activeClasses = '';
              if (isActive) {
                if (btn.color === 'blue') {
                  activeClasses =
                    'bg-blue-500 text-white border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.3)]';
                } else if (btn.color === 'amber') {
                  activeClasses =
                    'bg-amber-500 text-white border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.3)]';
                } else {
                  activeClasses =
                    'bg-emerald-600 text-white border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)]';
                }
              } else {
                activeClasses =
                  'bg-white text-slate-600 border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.04)]';
              }

              return (
                <button
                  key={btn.key}
                  onClick={() => setActiveCategory(btn.key)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm border-[3px] transition-all duration-200 ${activeClasses}`}
                >
                  {btn.label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-lg text-xs ${
                      isActive ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    {btn.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-bold">{labels.common?.loading || 'Loading...'}</p>
        </div>
      );
    }

    if (visibleItems.length === 0) {
      return (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20"
        >
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-[28px] flex items-center justify-center mb-6 border-[3px] border-indigo-200 shadow-[0_8px_30px_rgba(99,102,241,0.15)]">
            <BookOpen className="w-12 h-12 text-indigo-400" />
          </div>
          <p className="text-xl font-black text-slate-700 mb-2">
            {(() => {
              if (trimmedSearch) {
                return labels.dashboard?.vocab?.noMatch || 'No results found';
              }
              return labels.vocab?.noDueNow || labels.dashboard?.vocab?.noDueNow || 'No words yet';
            })()}
          </p>
          <p className="text-slate-400 font-medium text-center max-w-md">
            {(() => {
              if (trimmedSearch) {
                return '';
              }
              return (
                labels.vocab?.srsDesc ||
                labels.dashboard?.vocab?.srsDesc ||
                "Words you mark as 'Don't know' will appear here for spaced repetition learning"
              );
            })()}
          </p>
        </motion.div>
      );
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
        {visibleItems.map(({ item: word }) => {
          const id = String(word.id);
          const isExpanded = expandedId === id;
          const isMastered = word.progress.status === 'MASTERED';

          return (
            <div
              key={id}
              className="bg-white rounded-2xl border-[3px] border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <button
                  type="button"
                  onClick={() => toggleExpand(id)}
                  className="flex-1 text-left min-w-0"
                >
                  <div className="text-xl font-black text-slate-900 truncate">{word.word}</div>
                </button>

                <button
                  onClick={async e => {
                    e.preventDefault();
                    e.stopPropagation();
                    await setMastery({ wordId: word.id, mastered: !isMastered });
                  }}
                  className="p-2 rounded-xl bg-white border-2 border-slate-200 hover:border-slate-300 shadow-[0_2px_8px_rgba(0,0,0,0.08)] shrink-0"
                  aria-label={
                    isMastered
                      ? labels.vocabBook?.unmarkMastered || 'Unmark mastered'
                      : labels.vocabBook?.markMastered || 'Mark as mastered'
                  }
                >
                  {isMastered ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5">
                  <div className="pt-3 border-t-2 border-dashed border-slate-100">
                    <div className="text-slate-700 font-bold leading-relaxed">{word.meaning}</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    );
  };

  const renderExportModal = () => {
    const buttonText = labels.vocabBook?.exportPdf || 'Export PDF';
    const exportingText = labels.vocabBook?.exporting || 'Exporting...';

    const currentButtonText = exporting ? exportingText : buttonText;

    return (
      <AnimatePresence>
        {exportOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => {
              if (!exporting) {
                setExportOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="w-full max-w-xl bg-white rounded-[28px] border-[3px] border-slate-200 shadow-2xl p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-black text-slate-400 tracking-wider uppercase">
                    {labels.vocabBook?.exportPdfTitle || 'Export PDF'}
                  </p>
                  <h2 className="text-2xl font-black text-slate-900">
                    {labels.vocabBook?.wordSheetTitle || 'Word Sheet'}
                  </h2>
                  <p className="text-sm font-bold text-slate-500 mt-1">{exportSubtitle}</p>
                </div>
                <button
                  onClick={() => {
                    if (!exporting) {
                      setExportOpen(false);
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-40"
                  aria-label={labels.common?.close || 'Close'}
                  disabled={exporting}
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={() => setExportMode('A4_DICTATION')}
                  className={`p-4 rounded-2xl border-[3px] text-left transition-all ${
                    exportMode === 'A4_DICTATION'
                      ? 'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-black text-slate-900">
                    {labels.vocabBook?.exportModes?.a4Title || 'A4 Dictation'}
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {labels.vocabBook?.exportModes?.a4Desc || 'Two-way test'}
                  </p>
                </button>

                <button
                  onClick={() => setExportMode('LANG_LIST')}
                  className={`p-4 rounded-2xl border-[3px] text-left transition-all ${
                    exportMode === 'LANG_LIST'
                      ? 'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-black text-slate-900">{langListLabel}</p>
                  <p className="text-xs font-bold text-slate-500 mt-1">{langListDesc}</p>
                </button>

                <button
                  onClick={() => setExportMode('KO_LIST')}
                  className={`p-4 rounded-2xl border-[3px] text-left transition-all ${
                    exportMode === 'KO_LIST'
                      ? 'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="font-black text-slate-900">
                    {labels.vocabBook?.exportModes?.koListTitle || 'Korean List'}
                  </p>
                  <p className="text-xs font-bold text-slate-500 mt-1">
                    {labels.vocabBook?.exportModes?.koListDesc || 'Write the meaning'}
                  </p>
                </button>
              </div>

              <div className="mt-5 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 flex items-center justify-between">
                <span className="font-black text-slate-800">
                  {labels.vocabBook?.exportModes?.shuffleLabel || 'Shuffle'}
                </span>
                <button
                  type="button"
                  onClick={() => setExportShuffle(v => !v)}
                  className={`w-12 h-7 rounded-full transition-all relative ${
                    exportShuffle ? 'bg-orange-500' : 'bg-slate-300'
                  }`}
                  aria-label="shuffle"
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all ${
                      exportShuffle ? 'left-6' : 'left-1'
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={onExport}
                disabled={exporting || visibleItems.length === 0}
                className="mt-6 w-full py-4 rounded-2xl bg-orange-500 text-white font-black border-[3px] border-orange-400 shadow-[0_12px_35px_rgba(249,115,22,0.25)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentButtonText}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  const renderFloatingActions = () => (
    <div className="fixed inset-x-0 bottom-4 z-[70] px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white/90 backdrop-blur-xl border-[3px] border-slate-200 rounded-[24px] shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-3">
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => startLearning('immerse')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <Layers className="w-5 h-5 text-indigo-600" />
                <span className="text-xs font-black text-slate-800">
                  {labels.vocab?.modeImmersive || 'Immersive'}
                </span>
              </div>
            </button>

            <button
              onClick={() => startLearning('listen')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <Headphones className="w-5 h-5 text-amber-700" />
                <span className="text-xs font-black text-slate-800">
                  {labels.vocab?.modeListen || 'Listen'}
                </span>
              </div>
            </button>

            <button
              onClick={() => startLearning('dictation')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <PencilLine className="w-5 h-5 text-rose-600" />
                <span className="text-xs font-black text-slate-800">
                  {labels.vocab?.modeDictation || 'Dictation'}
                </span>
              </div>
            </button>

            <button
              onClick={() => startLearning('spelling')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-slate-200 bg-white hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <SpellCheck className="w-5 h-5 text-emerald-700" />
                <span className="text-xs font-black text-slate-800">
                  {labels.vocab?.modeSpelling || 'Spelling'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const isMobile = useIsMobile();
  if (isMobile) {
    return (
      <MobileVocabDashboard
        unitId="ALL"
        instituteName={labels.dashboard?.vocab?.title || 'Vocab Book'}
        words={items}
        masteredCount={stats.mastered}
        language={language}
        onStartLearn={() => startLearning('immerse')}
        onStartTest={() => startLearning('dictation')}
        onManageList={() => {}} // Placeholder or navigate to list view if exists
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {renderHeader()}
      <div className="max-w-6xl mx-auto px-4 py-8 pb-28">{renderContent()}</div>
      {renderExportModal()}
      {renderFloatingActions()}
    </div>
  );
};

export default VocabBookPage;
