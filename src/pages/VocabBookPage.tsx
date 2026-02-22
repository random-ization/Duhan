import React, { useState, useMemo, useEffect } from 'react';
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
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { getLabels } from '../utils/i18n';
import { VOCAB, VOCAB_PDF } from '../utils/convexRefs';
import { notify } from '../utils/notify';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileVocabDashboard } from '../components/mobile/MobileVocabDashboard';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
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
  const [masteryPendingId, setMasteryPendingId] = useState<string | null>(null);
  const [optimisticMastery, setOptimisticMastery] = useState<Record<string, boolean>>({});
  // Use state for 'now' to ensure purity during render
  const [now] = useState(() => Date.now());

  const setMastery = useMutation(VOCAB.setMastery);
  const exportPdf = useAction(VOCAB_PDF.exportVocabBookPdf);

  const trimmedSearch = searchQuery.trim();
  const vocabBookResult = useQuery(VOCAB.getVocabBook, {
    includeMastered: true,
    search: trimmedSearch || undefined,
    savedByUserOnly: true,
  });
  const loading = vocabBookResult === undefined;
  const items = useMemo(() => vocabBookResult ?? [], [vocabBookResult]);

  useEffect(() => {
    setOptimisticMastery(current => {
      if (Object.keys(current).length === 0) return current;
      let changed = false;
      const next = { ...current };
      const serverMasteryMap = new Map(
        items.map(item => [String(item.id), item.progress.status === 'MASTERED'])
      );

      Object.entries(current).forEach(([id, value]) => {
        const serverValue = serverMasteryMap.get(id);
        if (serverValue === value) {
          delete next[id];
          changed = true;
        }
      });

      return changed ? next : current;
    });
  }, [items]);

  const categorized = useMemo(() => {
    return items.map(item => {
      const progress = item.progress;
      const optimisticValue = optimisticMastery[String(item.id)];
      const isMastered =
        typeof optimisticValue === 'boolean' ? optimisticValue : progress.status === 'MASTERED';
      const isUnlearned = progress.state === 0 || progress.status === 'NEW';

      let category: VocabBookCategory = 'DUE';
      if (isMastered) {
        category = 'MASTERED';
      } else if (isUnlearned) {
        category = 'UNLEARNED';
      }

      const dueNow = !!progress.nextReviewAt && progress.nextReviewAt <= now && !isMastered;
      return { item, category, dueNow, isMastered };
    });
  }, [items, now, optimisticMastery]);

  const visibleItems = useMemo(() => {
    return categorized.filter(x => x.category === activeCategory);
  }, [categorized, activeCategory]);

  // Stats
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
    <div className="sticky top-0 z-20 bg-card/70 backdrop-blur-xl border-b-[3px] border-indigo-100 dark:border-indigo-300/20">
      <div className="max-w-6xl mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                if (isMobile) {
                  navigate('/practice');
                } else {
                  navigate('/dashboard?view=practice');
                }
              }}
              className="p-2.5 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 hover:-translate-y-0.5 transition-all duration-200 shadow-[0_4px_12px_rgba(0,0,0,0.05),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_12px_rgba(148,163,184,0.18)]"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 dark:from-indigo-300/70 dark:to-purple-300/70 rounded-[20px] flex items-center justify-center shadow-[0_8px_20px_rgba(99,102,241,0.3)] dark:shadow-[0_8px_20px_rgba(165,180,252,0.2)] border-[3px] border-indigo-300 dark:border-indigo-300/35">
                <BookOpen className="w-7 h-7 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">
                  {labels.dashboard?.vocab?.title || 'Vocab Book'}
                </h1>
                <p className="text-muted-foreground font-bold text-sm">
                  {labels.dashboard?.vocab?.subtitle || 'SRS Smart Review'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats.dueNow > 0 && (
              <div className="hidden sm:flex items-center gap-3 px-5 py-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-400/12 dark:to-orange-400/12 rounded-2xl border-[3px] border-red-200 dark:border-red-300/25 shadow-[0_4px_15px_rgba(239,68,68,0.15),inset_0_2px_4px_rgba(255,255,255,0.9)] dark:shadow-[0_4px_15px_rgba(252,165,165,0.12)]">
                <div className="p-2 bg-red-500 dark:bg-red-400/75 rounded-xl">
                  <Zap className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-black text-red-600 dark:text-red-200">
                    {stats.dueNow}
                  </p>
                  <p className="text-xs font-bold text-red-400 dark:text-red-300">
                    {labels.vocab?.dueNow || labels.dashboard?.vocab?.dueNow || 'Due now'}
                  </p>
                </div>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setExportOpen(true)}
              disabled={visibleItems.length === 0 || loading}
              loading={loading}
              loadingText={labels.vocabBook?.exportPdf || 'Export PDF'}
              loadingIconClassName="w-5 h-5"
              className="px-4 py-3 rounded-2xl bg-card border-[3px] border-border hover:border-indigo-300 dark:hover:border-indigo-300/35 font-black text-muted-foreground shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_4px_12px_rgba(148,163,184,0.16)] disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <FileDown className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
              {labels.vocabBook?.exportPdf || 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder={labels.vocab?.search || 'Search words...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-auto w-full pl-12 pr-4 py-3 bg-card border-[3px] border-border rounded-2xl text-sm font-medium focus:ring-0 focus:border-primary focus:shadow-[0_0_0_4px_rgba(99,102,241,0.1)] dark:focus:shadow-[0_0_0_4px_rgba(165,180,252,0.18)] transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.03)]"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {filterButtons.map(btn => {
              const isActive = activeCategory === btn.key;
              let activeClasses = '';
              if (isActive) {
                if (btn.color === 'blue') {
                  activeClasses =
                    'bg-blue-500 text-primary-foreground border-blue-400 shadow-[0_4px_12px_rgba(59,130,246,0.3)] dark:bg-blue-400/80 dark:border-blue-300/35 dark:shadow-[0_4px_12px_rgba(147,197,253,0.2)]';
                } else if (btn.color === 'amber') {
                  activeClasses =
                    'bg-amber-500 text-primary-foreground border-amber-400 shadow-[0_4px_12px_rgba(245,158,11,0.3)] dark:bg-amber-400/80 dark:border-amber-300/35 dark:shadow-[0_4px_12px_rgba(253,230,138,0.2)]';
                } else {
                  activeClasses =
                    'bg-emerald-600 text-primary-foreground border-emerald-500 shadow-[0_4px_12px_rgba(16,185,129,0.3)] dark:bg-emerald-400/80 dark:border-emerald-300/35 dark:shadow-[0_4px_12px_rgba(110,231,183,0.2)]';
                }
              } else {
                activeClasses =
                  'bg-card text-muted-foreground border-border hover:border-border shadow-[0_2px_8px_rgba(0,0,0,0.04)]';
              }

              return (
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  key={btn.key}
                  onClick={() => setActiveCategory(btn.key)}
                  className={`px-4 py-2.5 rounded-xl font-bold text-sm border-[3px] transition-all duration-200 ${activeClasses}`}
                >
                  {btn.label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-lg text-xs ${isActive ? 'bg-card/20' : 'bg-muted'
                      }`}
                  >
                    {btn.count}
                  </span>
                </Button>
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

  const openImmersiveForWord = (wordId: string) => {
    const params = new URLSearchParams();
    params.set('category', activeCategory);
    params.set('focus', wordId);
    if (trimmedSearch) params.set('q', trimmedSearch);
    navigate(`/vocab-book/immerse?${params.toString()}`);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-400/14 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
            <Loader2 className="w-8 h-8 text-indigo-500 dark:text-indigo-300 animate-spin" />
          </div>
          <p className="text-muted-foreground font-bold">
            {labels.common?.loading || 'Loading...'}
          </p>
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
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-400/12 dark:to-purple-400/12 rounded-[28px] flex items-center justify-center mb-6 border-[3px] border-indigo-200 dark:border-indigo-300/25 shadow-[0_8px_30px_rgba(99,102,241,0.15)] dark:shadow-[0_8px_30px_rgba(165,180,252,0.15)]">
            <BookOpen className="w-12 h-12 text-indigo-400 dark:text-indigo-200" />
          </div>
          <p className="text-xl font-black text-muted-foreground mb-2">
            {(() => {
              if (trimmedSearch) {
                return labels.dashboard?.vocab?.noMatch || 'No results found';
              }
              return labels.vocab?.noDueNow || labels.dashboard?.vocab?.noDueNow || 'No words yet';
            })()}
          </p>
          <p className="text-muted-foreground font-medium text-center max-w-md">
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
        {visibleItems.map(({ item: word, isMastered }) => {
          const id = String(word.id);
          const isExpanded = expandedId === id;
          const isMasteryPending = masteryPendingId === id;

          return (
            <motion.div
              key={id}
              layoutId={`vocab-word-card-${id}`}
              className="bg-card rounded-2xl border-[3px] border-border shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 px-5 py-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => openImmersiveForWord(id)}
                  className="flex-1 min-w-0 justify-start text-left"
                >
                  <div className="text-xl font-black text-foreground truncate">{word.word}</div>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => toggleExpand(id)}
                  className="p-2 rounded-xl bg-card border-2 border-border hover:border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] shrink-0"
                  aria-label={isExpanded ? 'Collapse meaning' : 'Expand meaning'}
                >
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={async e => {
                    if (masteryPendingId !== null) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const previousOverride = optimisticMastery[id];
                    const nextMastered = !isMastered;
                    try {
                      setMasteryPendingId(id);
                      setOptimisticMastery(current => ({ ...current, [id]: nextMastered }));
                      await setMastery({ wordId: word.id, mastered: nextMastered });
                    } catch {
                      setOptimisticMastery(current => {
                        const next = { ...current };
                        if (typeof previousOverride === 'boolean') {
                          next[id] = previousOverride;
                        } else {
                          delete next[id];
                        }
                        return next;
                      });
                      notify.error(
                        labels.vocabBook?.saveFailed || 'Failed to save word status. Please retry.'
                      );
                    } finally {
                      setMasteryPendingId(current => (current === id ? null : current));
                    }
                  }}
                  disabled={masteryPendingId !== null}
                  loading={isMasteryPending}
                  loadingText={
                    <span className="sr-only">
                      {labels.vocabBook?.saving || labels.common?.loading || 'Saving'}
                    </span>
                  }
                  loadingIconClassName="w-5 h-5"
                  className="p-2 rounded-xl bg-card border-2 border-border hover:border-border shadow-[0_2px_8px_rgba(0,0,0,0.08)] shrink-0"
                  aria-label={
                    isMastered
                      ? labels.vocabBook?.unmarkMastered || 'Unmark mastered'
                      : labels.vocabBook?.markMastered || 'Mark as mastered'
                  }
                >
                  {isMastered ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-300" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground" />
                  )}
                </Button>
              </div>

              {isExpanded && (
                <div className="px-5 pb-5">
                  <div className="pt-3 border-t-2 border-dashed border-border">
                    <div className="text-muted-foreground font-bold leading-relaxed">
                      {word.meaning}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
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
      <Dialog
        open={exportOpen}
        onOpenChange={open => {
          if (!open && !exporting) {
            setExportOpen(false);
          }
        }}
      >
        <DialogPortal>
          <DialogOverlay
            unstyled
            forceMount
            closeOnClick={!exporting}
            className="fixed inset-0 z-[80] bg-black/50 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <DialogContent
            unstyled
            forceMount
            closeOnEscape={!exporting}
            lockBodyScroll={false}
            className="fixed inset-0 z-[81] flex items-end sm:items-center justify-center p-4 pointer-events-none data-[state=closed]:pointer-events-none"
          >
            <motion.div
              initial={false}
              animate={exportOpen ? { y: 0, opacity: 1 } : { y: 40, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="pointer-events-auto w-full max-w-xl bg-card rounded-[28px] border-[3px] border-border shadow-2xl p-6"
            >
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-black text-muted-foreground tracking-wider uppercase">
                    {labels.vocabBook?.exportPdfTitle || 'Export PDF'}
                  </p>
                  <h2 className="text-2xl font-black text-foreground">
                    {labels.vocabBook?.wordSheetTitle || 'Word Sheet'}
                  </h2>
                  <p className="text-sm font-bold text-muted-foreground mt-1">{exportSubtitle}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    if (!exporting) {
                      setExportOpen(false);
                    }
                  }}
                  className="p-2 rounded-xl hover:bg-muted disabled:opacity-40"
                  aria-label={labels.common?.close || 'Close'}
                  disabled={exporting}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setExportMode('A4_DICTATION')}
                  className={`!flex !w-full !flex-col !items-start !justify-start p-4 rounded-2xl border-[3px] text-left transition-all ${exportMode === 'A4_DICTATION'
                    ? 'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)] dark:border-orange-300/35 dark:bg-orange-400/12 dark:shadow-[0_10px_30px_rgba(253,186,116,0.15)]'
                    : 'border-border bg-card hover:border-border'
                    }`}
                >
                  <p className="font-black text-foreground">
                    {labels.vocabBook?.exportModes?.a4Title || 'A4 Dictation'}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground mt-1">
                    {labels.vocabBook?.exportModes?.a4Desc || 'Two-way test'}
                  </p>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setExportMode('LANG_LIST')}
                  className={`!flex !w-full !flex-col !items-start !justify-start p-4 rounded-2xl border-[3px] text-left transition-all ${exportMode === 'LANG_LIST'
                    ? 'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)] dark:border-orange-300/35 dark:bg-orange-400/12 dark:shadow-[0_10px_30px_rgba(253,186,116,0.15)]'
                    : 'border-border bg-card hover:border-border'
                    }`}
                >
                  <p className="font-black text-foreground">{langListLabel}</p>
                  <p className="text-xs font-bold text-muted-foreground mt-1">{langListDesc}</p>
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setExportMode('KO_LIST')}
                  className={`!flex !w-full !flex-col !items-start !justify-start p-4 rounded-2xl border-[3px] text-left transition-all ${exportMode === 'KO_LIST'
                    ? 'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)] dark:border-orange-300/35 dark:bg-orange-400/12 dark:shadow-[0_10px_30px_rgba(253,186,116,0.15)]'
                    : 'border-border bg-card hover:border-border'
                    }`}
                >
                  <p className="font-black text-foreground">
                    {labels.vocabBook?.exportModes?.koListTitle || 'Korean List'}
                  </p>
                  <p className="text-xs font-bold text-muted-foreground mt-1">
                    {labels.vocabBook?.exportModes?.koListDesc || 'Write the meaning'}
                  </p>
                </Button>
              </div>

              <div className="mt-5 rounded-2xl border-2 border-border bg-muted p-4 flex items-center justify-between">
                <span className="font-black text-muted-foreground">
                  {labels.vocabBook?.exportModes?.shuffleLabel || 'Shuffle'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setExportShuffle(v => !v)}
                  className={`w-12 h-7 rounded-full transition-all relative ${exportShuffle ? 'bg-orange-500 dark:bg-orange-400/80' : 'bg-muted'
                    }`}
                  aria-label="shuffle"
                >
                  <span
                    className={`absolute top-1 w-5 h-5 bg-card rounded-full transition-all ${exportShuffle ? 'left-6' : 'left-1'
                      }`}
                  />
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={onExport}
                disabled={exporting || visibleItems.length === 0}
                loading={exporting}
                loadingText={currentButtonText}
                loadingIconClassName="w-5 h-5"
                className="mt-6 w-full py-4 rounded-2xl bg-orange-500 dark:bg-orange-400/80 text-primary-foreground font-black border-[3px] border-orange-400 dark:border-orange-300/35 shadow-[0_12px_35px_rgba(249,115,22,0.25)] dark:shadow-[0_12px_35px_rgba(253,186,116,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {currentButtonText}
              </Button>
            </motion.div>
          </DialogContent>
        </DialogPortal>
      </Dialog>
    );
  };

  const renderFloatingActions = () => (
    <div className="fixed inset-x-0 bottom-4 z-[70] px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-card/90 backdrop-blur-xl border-[3px] border-border rounded-[24px] shadow-[0_18px_50px_rgba(0,0,0,0.18)] p-3">
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startLearning('immerse')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-300/35 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                <span className="text-xs font-black text-muted-foreground">
                  {labels.vocab?.modeImmersive || 'Immersive'}
                </span>
              </div>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startLearning('listen')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-300/35 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <Headphones className="w-5 h-5 text-amber-700 dark:text-amber-300" />
                <span className="text-xs font-black text-muted-foreground">
                  {labels.vocab?.modeListen || 'Listen'}
                </span>
              </div>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startLearning('dictation')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-300/35 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <PencilLine className="w-5 h-5 text-rose-600 dark:text-rose-300" />
                <span className="text-xs font-black text-muted-foreground">
                  {labels.vocab?.modeDictation || 'Dictation'}
                </span>
              </div>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startLearning('spelling')}
              disabled={stats.total === 0}
              className="py-3 rounded-2xl border-2 border-border bg-card hover:border-indigo-300 dark:hover:border-indigo-300/35 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <SpellCheck className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                <span className="text-xs font-black text-muted-foreground">
                  {labels.vocab?.modeSpelling || 'Spelling'}
                </span>
              </div>
            </Button>
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
        onManageList={() => { }} // Placeholder or navigate to list view if exists
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-indigo-400/8 dark:via-background dark:to-purple-400/8">
      {renderHeader()}
      <div className="max-w-6xl mx-auto px-4 py-8 pb-28">{renderContent()}</div>
      {renderExportModal()}
      {renderFloatingActions()}
    </div>
  );
};

export default VocabBookPage;
