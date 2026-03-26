import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  BookOpen,
  Volume2,
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
  Square,
  CheckSquare,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VOCAB, VOCAB_PDF } from '../utils/convexRefs';
import { notify } from '../utils/notify';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileVocabDashboard } from '../components/mobile/MobileVocabDashboard';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';
import { Button } from '../components/ui';
import { Input } from '../components/ui';
import type { VocabBookItemDto } from '../../convex/vocab';
import type { Id } from '../../convex/_generated/dataModel';
type ExportMode = 'A4_DICTATION' | 'LANG_LIST' | 'KO_LIST';

type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
type LabelsBundle = ReturnType<typeof getLabels>;
const VOCAB_PAGE_SIZE = 80;
const VIRTUAL_OVERSCAN_ROWS = 8;
const VIRTUAL_ROW_GAP = 12;
const DEFAULT_ROW_HEIGHT = 96;

const ACTIVE_EXPORT_MODE_BUTTON_CLASS =
  'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)] dark:border-orange-300/35 dark:bg-orange-400/12 dark:shadow-[0_10px_30px_rgba(253,186,116,0.15)]';
const INACTIVE_EXPORT_MODE_BUTTON_CLASS = 'border-border bg-card hover:border-border';

const getExportModeButtonClass = (active: boolean): string =>
  `!flex !w-full !flex-col !items-start !justify-start p-4 rounded-2xl border-[3px] text-left transition-all ${active ? ACTIVE_EXPORT_MODE_BUTTON_CLASS : INACTIVE_EXPORT_MODE_BUTTON_CLASS}`;

const getShuffleTrackClass = (enabled: boolean): string =>
  `w-12 h-7 rounded-full transition-all relative ${enabled ? 'bg-orange-500 dark:bg-orange-400/80' : 'bg-muted'}`;

const getShuffleThumbClass = (enabled: boolean): string =>
  `absolute top-1 w-5 h-5 bg-card rounded-full transition-all ${enabled ? 'left-6' : 'left-1'}`;

const withFallback = (value: string | undefined, fallback: string): string => value || fallback;
const getLocalizedMeaning = (word: VocabBookItemDto, language: string): string =>
  getLocalizedContent(word, 'meaning', language) ||
  word.meaning ||
  word.meaningEn ||
  word.meaningVi ||
  word.meaningMn ||
  '';

type ExportModalCopy = {
  exportPdfButton: string;
  exportingButton: string;
  exportPdfTitle: string;
  wordSheetTitle: string;
  closeLabel: string;
  shuffleLabel: string;
  a4Title: string;
  a4Description: string;
  koListTitle: string;
  koListDescription: string;
};

const getExportModalCopy = (labels: LabelsBundle): ExportModalCopy => ({
  exportPdfButton: withFallback(labels.vocabBook?.exportPdf, 'Export PDF'),
  exportingButton: withFallback(labels.vocabBook?.exporting, 'Exporting...'),
  exportPdfTitle: withFallback(labels.vocabBook?.exportPdfTitle, 'Export PDF'),
  wordSheetTitle: withFallback(labels.vocabBook?.wordSheetTitle, 'Word Sheet'),
  closeLabel: withFallback(labels.common?.close, 'Close'),
  shuffleLabel: withFallback(labels.vocabBook?.exportModes?.shuffleLabel, 'Shuffle'),
  a4Title: withFallback(labels.vocabBook?.exportModes?.a4Title, 'A4 Dictation'),
  a4Description: withFallback(labels.vocabBook?.exportModes?.a4Desc, 'Two-way test'),
  koListTitle: withFallback(labels.vocabBook?.exportModes?.koListTitle, 'Korean List'),
  koListDescription: withFallback(labels.vocabBook?.exportModes?.koListDesc, 'Write the meaning'),
});

type ExportModeOption = {
  mode: ExportMode;
  title: string;
  description: string;
};

const ExportModeButtons: React.FC<{
  options: ExportModeOption[];
  selectedMode: ExportMode;
  onSelect: (mode: ExportMode) => void;
}> = ({ options, selectedMode, onSelect }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
    {options.map(option => (
      <Button
        key={option.mode}
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => onSelect(option.mode)}
        className={getExportModeButtonClass(selectedMode === option.mode)}
      >
        <p className="font-black text-foreground">{option.title}</p>
        <p className="text-xs font-bold text-muted-foreground mt-1">{option.description}</p>
      </Button>
    ))}
  </div>
);

const VocabExportModal: React.FC<{
  labels: LabelsBundle;
  exportOpen: boolean;
  exporting: boolean;
  exportMode: ExportMode;
  exportShuffle: boolean;
  exportSubtitle: string;
  langListLabel: string;
  langListDesc: string;
  visibleItemsCount: number;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onSelectMode: (mode: ExportMode) => void;
  onToggleShuffle: () => void;
  onExport: () => void;
}> = ({
  labels,
  exportOpen,
  exporting,
  exportMode,
  exportShuffle,
  exportSubtitle,
  langListLabel,
  langListDesc,
  visibleItemsCount,
  onOpenChange,
  onClose,
  onSelectMode,
  onToggleShuffle,
  onExport,
}) => {
  const copy = getExportModalCopy(labels);
  const currentButtonText = exporting ? copy.exportingButton : copy.exportPdfButton;
  const modeOptions: ExportModeOption[] = [
    {
      mode: 'A4_DICTATION',
      title: copy.a4Title,
      description: copy.a4Description,
    },
    {
      mode: 'LANG_LIST',
      title: langListLabel,
      description: langListDesc,
    },
    {
      mode: 'KO_LIST',
      title: copy.koListTitle,
      description: copy.koListDescription,
    },
  ];

  return (
    <Dialog open={exportOpen} onOpenChange={onOpenChange}>
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
                  {copy.exportPdfTitle}
                </p>
                <h2 className="text-2xl font-black text-foreground">{copy.wordSheetTitle}</h2>
                <p className="text-sm font-bold text-muted-foreground mt-1">{exportSubtitle}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-muted disabled:opacity-40"
                aria-label={copy.closeLabel}
                disabled={exporting}
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </Button>
            </div>

            <ExportModeButtons
              options={modeOptions}
              selectedMode={exportMode}
              onSelect={onSelectMode}
            />

            <div className="mt-5 rounded-2xl border-2 border-border bg-muted p-4 flex items-center justify-between">
              <span className="font-black text-muted-foreground">{copy.shuffleLabel}</span>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={onToggleShuffle}
                className={getShuffleTrackClass(exportShuffle)}
                aria-label={copy.shuffleLabel}
              >
                <span className={getShuffleThumbClass(exportShuffle)} />
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={onExport}
              disabled={exporting || visibleItemsCount === 0}
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

const VocabBookPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language, user } = useAuth();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
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
  const [pageCursor, setPageCursor] = useState<string | null>(null);
  const [loadedItems, setLoadedItems] = useState<VocabBookItemDto[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window === 'undefined' ? 900 : window.innerHeight
  );
  const [estimatedRowHeight, setEstimatedRowHeight] = useState(DEFAULT_ROW_HEIGHT);
  const listContainerRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set());
  const [bulkPending, setBulkPending] = useState(false);

  const setMastery = useMutation(VOCAB.setMastery);
  const setMasteryBulk = useMutation(VOCAB.setMasteryBulk);
  const removeFromVocabBookBulk = useMutation(VOCAB.removeFromVocabBookBulk);
  const exportPdf = useAction(VOCAB_PDF.exportVocabBookPdf);

  const trimmedSearch = searchQuery.trim();
  const reviewSummary = useQuery(VOCAB.getReviewSummary, { savedByUserOnly: true });
  const vocabBookPage = useQuery(VOCAB.getVocabBookPage, {
    includeMastered: true,
    search: trimmedSearch || undefined,
    savedByUserOnly: true,
    category: activeCategory,
    cursor: pageCursor || undefined,
    limit: VOCAB_PAGE_SIZE,
  });

  useEffect(() => {
    setPageCursor(null);
    setLoadedItems([]);
    setNextCursor(null);
    setExpandedId(null);
    setSelectedWordIds(new Set());
  }, [activeCategory, trimmedSearch]);

  useEffect(() => {
    if (!vocabBookPage) return;
    setNextCursor(vocabBookPage.nextCursor);
    setLoadedItems(prev => {
      if (pageCursor === null) {
        return vocabBookPage.items;
      }
      const existing = new Set(prev.map(item => String(item.id)));
      const appended = vocabBookPage.items.filter(item => !existing.has(String(item.id)));
      return [...prev, ...appended];
    });
  }, [vocabBookPage, pageCursor]);

  const loading = vocabBookPage === undefined && loadedItems.length === 0;
  const loadingMore = vocabBookPage === undefined && loadedItems.length > 0;
  const hasMore = Boolean(nextCursor);
  const items = useMemo(() => loadedItems, [loadedItems]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let frame = 0;

    const updateViewport = () => {
      frame = 0;
      setScrollY(window.scrollY || window.pageYOffset || 0);
      setViewportHeight(window.innerHeight || 900);
    };

    const scheduleViewportUpdate = () => {
      if (frame !== 0) return;
      frame = window.requestAnimationFrame(updateViewport);
    };

    updateViewport();
    window.addEventListener('scroll', scheduleViewportUpdate, { passive: true });
    window.addEventListener('resize', scheduleViewportUpdate);

    return () => {
      if (frame !== 0) {
        window.cancelAnimationFrame(frame);
      }
      window.removeEventListener('scroll', scheduleViewportUpdate);
      window.removeEventListener('resize', scheduleViewportUpdate);
    };
  }, []);

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

  const visibleItems = useMemo(
    () =>
      items.map(item => {
        const optimisticValue = optimisticMastery[String(item.id)];
        const isMastered =
          typeof optimisticValue === 'boolean'
            ? optimisticValue
            : item.progress.status === 'MASTERED';
        return { item, isMastered };
      }),
    [items, optimisticMastery]
  );
  const visibleWordIds = useMemo(
    () => visibleItems.map(({ item }) => String(item.id)),
    [visibleItems]
  );
  const selectedCount = selectedWordIds.size;
  const allVisibleSelected =
    visibleWordIds.length > 0 && visibleWordIds.every(id => selectedWordIds.has(id));

  useEffect(() => {
    if (selectedWordIds.size === 0) return;
    const visibleSet = new Set(visibleWordIds);
    setSelectedWordIds(current => {
      let changed = false;
      const next = new Set<string>();
      current.forEach(id => {
        if (visibleSet.has(id)) {
          next.add(id);
        } else {
          changed = true;
        }
      });
      return changed ? next : current;
    });
  }, [visibleWordIds, selectedWordIds.size]);

  const windowedItems = useMemo(() => {
    const total = visibleItems.length;
    const shouldVirtualize = false;

    if (!shouldVirtualize) {
      return {
        enabled: false,
        startIndex: 0,
        items: visibleItems,
        topSpacerHeight: 0,
        bottomSpacerHeight: 0,
      };
    }

    const listRectTop = listContainerRef.current
      ? listContainerRef.current.getBoundingClientRect().top + scrollY
      : 0;

    const viewportStart = Math.max(0, scrollY - listRectTop);
    const viewportEnd = Math.max(0, scrollY + viewportHeight - listRectTop);
    const startIndex = Math.max(
      0,
      Math.floor(viewportStart / estimatedRowHeight) - VIRTUAL_OVERSCAN_ROWS
    );
    const endIndex = Math.min(
      total - 1,
      Math.ceil(viewportEnd / estimatedRowHeight) + VIRTUAL_OVERSCAN_ROWS
    );
    const topSpacerHeight = startIndex * estimatedRowHeight;
    const bottomSpacerHeight = Math.max(0, (total - endIndex - 1) * estimatedRowHeight);

    return {
      enabled: true,
      startIndex,
      items: visibleItems.slice(startIndex, endIndex + 1),
      topSpacerHeight,
      bottomSpacerHeight,
    };
  }, [visibleItems, scrollY, viewportHeight, estimatedRowHeight]);

  const updateEstimatedRowHeight = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const measured = Math.round(node.getBoundingClientRect().height + VIRTUAL_ROW_GAP);
    if (!Number.isFinite(measured) || measured <= 0) return;

    setEstimatedRowHeight(current => {
      if (Math.abs(current - measured) < 2) return current;
      return Math.round(current * 0.7 + measured * 0.3);
    });
  }, []);

  // Stats
  const stats = useMemo(() => {
    return {
      dueNow: reviewSummary?.dueNow ?? 0,
      unlearned: reviewSummary?.unlearned ?? 0,
      due: reviewSummary?.dueTotal ?? 0,
      mastered: reviewSummary?.mastered ?? 0,
      total: reviewSummary?.total ?? 0,
      recommendedToday: reviewSummary?.recommendedToday ?? 0,
    };
  }, [reviewSummary]);

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
  const isMobileListMode = isMobile && searchParams.get('mobileView') === 'list';

  const expandMeaningLabel = labels.vocabBook?.expandMeaning || 'Expand meaning';
  const collapseMeaningLabel = labels.vocabBook?.collapseMeaning || 'Collapse meaning';

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
        selectedWordIds: selectedCount > 0 ? Array.from(selectedWordIds) : undefined,
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
    if (selectedCount > 0) {
      params.set('selected', Array.from(selectedWordIds).join(','));
    }
    navigate(`/vocab-book/${mode}?${params.toString()}`);
  };

  const toggleSelectWord = (wordId: string) => {
    setSelectedWordIds(current => {
      const next = new Set(current);
      if (next.has(wordId)) {
        next.delete(wordId);
      } else {
        next.add(wordId);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    if (visibleWordIds.length === 0) return;
    setSelectedWordIds(current => {
      const next = new Set(current);
      if (allVisibleSelected) {
        visibleWordIds.forEach(id => next.delete(id));
      } else {
        visibleWordIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const runBulkSetMastery = async (mastered: boolean) => {
    if (selectedCount === 0 || bulkPending) return;
    const ids = Array.from(selectedWordIds);
    try {
      setBulkPending(true);
      await setMasteryBulk({ wordIds: ids as unknown as Id<'words'>[], mastered });
      setOptimisticMastery(current => {
        const next = { ...current };
        ids.forEach(id => {
          next[id] = mastered;
        });
        return next;
      });
      setSelectedWordIds(new Set());
      notify.success(
        mastered
          ? labels.vocabBook?.markedMastered || 'Marked as mastered'
          : labels.vocabBook?.movedBackToLearning || 'Moved back to learning'
      );
    } catch {
      notify.error(labels.vocabBook?.saveFailed || 'Failed to save word status. Please retry.');
    } finally {
      setBulkPending(false);
    }
  };

  const runBulkRemove = async () => {
    if (selectedCount === 0 || bulkPending) return;
    const ids = Array.from(selectedWordIds);
    try {
      setBulkPending(true);
      await removeFromVocabBookBulk({ wordIds: ids as unknown as Id<'words'>[] });
      setLoadedItems(current => current.filter(item => !selectedWordIds.has(String(item.id))));
      setOptimisticMastery(current => {
        const next = { ...current };
        ids.forEach(id => {
          delete next[id];
        });
        return next;
      });
      setSelectedWordIds(new Set());
      notify.success(labels.vocabBook?.removedFromBook || 'Removed from vocab book');
    } catch {
      notify.error(labels.vocabBook?.removeFailed || 'Failed to remove selected words');
    } finally {
      setBulkPending(false);
    }
  };

  const renderHeader = () => (
    <div className="sticky top-0 z-20 bg-[#FAFAFA]/90 backdrop-blur-xl border-b border-slate-200/70">
      <div className="w-full px-6 pt-6 pb-4">
        <div className="flex items-end justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                if (isMobileListMode) {
                  navigate('/vocab-book');
                  return;
                }
                navigate('/practice');
              }}
              className="p-2 rounded-xl bg-white border border-slate-200 hover:border-teal-400 transition-all shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Button>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900">
                {labels.dashboard?.vocab?.title || 'Vocab Book'}
              </h1>
              <p className="text-sm font-medium text-slate-500">
                {(labels.vocabBook?.subtitlePrefix || 'Total') + ' '}
                <span className="font-black text-teal-600">{stats.total}</span>
                {(labels.vocabBook?.subtitleSuffix || ' words') + ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats.dueNow > 0 && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-xl border border-amber-200">
                <div className="p-1.5 bg-amber-500 rounded-lg">
                  <Zap className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-amber-700">{stats.dueNow}</p>
                  <p className="text-[11px] font-bold text-amber-600">
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
              className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-teal-400 font-bold text-slate-700 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-slate-600" />
              {labels.vocabBook?.exportPdf || 'Export PDF'}
            </Button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder={labels.vocab?.search || 'Search words...'}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="h-auto w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-teal-100 focus:border-teal-500 transition-all shadow-sm"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {filterButtons.map(btn => {
              const isActive = activeCategory === btn.key;
              let activeClasses = '';
              if (isActive) {
                if (btn.color === 'blue') {
                  activeClasses = 'bg-sky-500 text-white border-sky-500 shadow-sm';
                } else if (btn.color === 'amber') {
                  activeClasses = 'bg-amber-500 text-white border-amber-500 shadow-sm';
                } else {
                  activeClasses = 'bg-emerald-500 text-white border-emerald-500 shadow-sm';
                }
              } else {
                activeClasses =
                  'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 shadow-sm';
              }

              return (
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  key={btn.key}
                  onClick={() => setActiveCategory(btn.key)}
                  className={`px-4 py-2 rounded-xl font-bold text-sm border transition-all duration-200 ${activeClasses}`}
                >
                  {btn.label}
                  <span
                    className={`ml-2 px-2 py-0.5 rounded-lg text-xs ${
                      isActive ? 'bg-white/20' : 'bg-slate-100'
                    }`}
                  >
                    {btn.count}
                  </span>
                </Button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={toggleSelectAllVisible}
            disabled={visibleWordIds.length === 0}
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-xs"
          >
            {allVisibleSelected ? (
              <CheckSquare className="w-4 h-4 mr-1.5" />
            ) : (
              <Square className="w-4 h-4 mr-1.5" />
            )}
            {allVisibleSelected
              ? labels.vocabBook?.deselectAllVisible || 'Deselect all in view'
              : labels.vocabBook?.selectAllVisible || 'Select all in view'}
          </Button>
          <span className="text-xs font-semibold text-slate-500">
            {(labels.vocabBook?.selectedCount || 'Selected {{count}} words').replace(
              '{{count}}',
              String(selectedCount)
            )}
          </span>
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

  const pronounceWord = useCallback((word: VocabBookItemDto) => {
    if (typeof window === 'undefined') return;

    if (word.audioUrl) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.pause();
        audioRef.current.src = word.audioUrl;
        void audioRef.current.play();
        return;
      } catch {
        // Fall through to speech synthesis.
      }
    }

    if (!('speechSynthesis' in window)) return;
    const text = word.word?.trim();
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }, []);

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
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div ref={listContainerRef}>
          {windowedItems.enabled && windowedItems.topSpacerHeight > 0 && (
            <div aria-hidden style={{ height: windowedItems.topSpacerHeight }} />
          )}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {windowedItems.items.map(({ item: word, isMastered }, index) => {
              const id = String(word.id);
              const isExpanded = expandedId === id;
              const isMasteryPending = masteryPendingId === id;
              const isSelected = selectedWordIds.has(id);

              return (
                <motion.div
                  key={id}
                  layoutId={`vocab-word-card-${id}`}
                  ref={index === 0 ? updateEstimatedRowHeight : undefined}
                  className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all overflow-hidden"
                >
                  <div className="flex items-center justify-between gap-3 px-4 py-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleSelectWord(id);
                      }}
                      className={`p-2 rounded-xl border shadow-sm shrink-0 ${
                        isSelected
                          ? 'bg-teal-50 border-teal-300 text-teal-600'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                      aria-label={
                        isSelected
                          ? labels.vocabBook?.deselectWord || 'Deselect word'
                          : labels.vocabBook?.selectWord || 'Select word'
                      }
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        pronounceWord(word);
                      }}
                      className="w-10 h-10 rounded-full bg-slate-50 text-slate-400 group-hover:text-teal-600 group-hover:bg-teal-50 flex items-center justify-center transition-colors shrink-0"
                      aria-label={`${labels.vocabBook?.playWord || 'Play'} ${word.word}`}
                    >
                      <Volume2 className="w-4 h-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => openImmersiveForWord(id)}
                      className="flex-1 min-w-0 justify-start text-left !p-0"
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline gap-2 min-w-0">
                          <div className="text-xl font-black text-slate-800 truncate">
                            {word.word}
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase shrink-0">
                            {word.partOfSpeech || labels.vocabBook?.wordPosFallback || 'Word'}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-slate-600 truncate mt-0.5">
                          {getLocalizedMeaning(word, language)}
                        </div>
                      </div>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      size="auto"
                      onClick={() => toggleExpand(id)}
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm shrink-0"
                      aria-label={isExpanded ? collapseMeaningLabel : expandMeaningLabel}
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
                            labels.vocabBook?.saveFailed ||
                              'Failed to save word status. Please retry.'
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
                      className="p-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 shadow-sm shrink-0"
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
                    <div className="px-4 pb-4">
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        {word.exampleSentence ? (
                          <p className="text-sm text-slate-700">{word.exampleSentence}</p>
                        ) : null}
                        {word.exampleMeaning ? (
                          <p className="text-sm text-slate-500">{word.exampleMeaning}</p>
                        ) : null}
                        {word.pronunciation ? (
                          <p className="text-xs text-slate-400">[{word.pronunciation}]</p>
                        ) : null}
                        {!word.exampleSentence && !word.exampleMeaning && !word.pronunciation ? (
                          <div className="text-slate-500 font-medium">
                            {getLocalizedMeaning(word, language)}
                          </div>
                        ) : null}
                        <div className="pt-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="auto"
                            onClick={() => openImmersiveForWord(id)}
                            className="text-xs font-bold text-teal-600 hover:text-teal-700"
                          >
                            {labels.vocabBook?.openDetail || 'Open detail'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {windowedItems.enabled && windowedItems.bottomSpacerHeight > 0 && (
            <div aria-hidden style={{ height: windowedItems.bottomSpacerHeight }} />
          )}
        </div>
        {(hasMore || loadingMore) && (
          <div className="flex justify-center pt-4">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                if (!nextCursor || loadingMore) return;
                setPageCursor(nextCursor);
              }}
              disabled={!nextCursor || loadingMore}
              loading={loadingMore}
              loadingText={labels.common?.loading || 'Loading...'}
              className="px-5 py-2.5 rounded-xl border-2 border-border bg-card text-sm font-bold text-muted-foreground disabled:opacity-50"
            >
              {labels.common?.loadMore || 'Load more'}
            </Button>
          </div>
        )}
      </motion.div>
    );
  };

  const renderExportModal = () => {
    const handleDialogOpenChange = (open: boolean) => {
      if (!open && exporting) return;
      setExportOpen(open);
    };

    return (
      <VocabExportModal
        labels={labels}
        exportOpen={exportOpen}
        exporting={exporting}
        exportMode={exportMode}
        exportShuffle={exportShuffle}
        exportSubtitle={exportSubtitle}
        langListLabel={langListLabel}
        langListDesc={langListDesc}
        visibleItemsCount={visibleItems.length}
        onOpenChange={handleDialogOpenChange}
        onClose={() => {
          if (exporting) return;
          setExportOpen(false);
        }}
        onSelectMode={setExportMode}
        onToggleShuffle={() => setExportShuffle(v => !v)}
        onExport={() => {
          void onExport();
        }}
      />
    );
  };

  const renderFloatingActions = () => (
    <div className="fixed inset-x-0 bottom-5 z-[70] px-4">
      <div className="max-w-md mx-auto">
        {selectedCount > 0 && (
          <div className="mb-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                void runBulkSetMastery(true);
              }}
              disabled={bulkPending}
              className="py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold"
            >
              {labels.vocabBook?.bulkMarkMastered || 'Mark selected as mastered'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                void runBulkRemove();
              }}
              disabled={bulkPending}
              className="py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold inline-flex items-center justify-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              {labels.vocabBook?.bulkRemoveWords || 'Remove selected words'}
            </Button>
          </div>
        )}
        <div className="bg-white/85 backdrop-blur-xl border border-slate-200/70 rounded-[2rem] shadow-2xl p-2">
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => startLearning('immerse')}
              disabled={stats.total === 0}
              className="py-3 rounded-[1.4rem] bg-transparent hover:bg-violet-50 text-slate-500 hover:text-violet-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <Layers className="w-5 h-5" />
                <span className="text-[11px] font-black tracking-wide">
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
              className="py-3 rounded-[1.4rem] bg-transparent hover:bg-amber-50 text-slate-500 hover:text-amber-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <Headphones className="w-5 h-5" />
                <span className="text-[11px] font-black tracking-wide">
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
              className="py-3 rounded-[1.4rem] bg-transparent hover:bg-rose-50 text-slate-500 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <PencilLine className="w-5 h-5" />
                <span className="text-[11px] font-black tracking-wide">
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
              className="py-3 rounded-[1.4rem] bg-transparent hover:bg-teal-50 text-slate-500 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-1">
                <SpellCheck className="w-5 h-5" />
                <span className="text-[11px] font-black tracking-wide">
                  {labels.vocab?.modeSpelling || 'Spelling'}
                </span>
              </div>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  if (isMobile && !isMobileListMode) {
    return (
      <MobileVocabDashboard
        unitId="ALL"
        instituteName={labels.dashboard?.vocab?.title || 'Vocab Book'}
        words={items}
        totalWords={stats.total}
        masteredCount={stats.mastered}
        language={language}
        onStartLearn={() => startLearning('immerse')}
        onStartTest={() => startLearning('dictation')}
        onManageList={() => navigate('/vocab-book?mobileView=list')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {renderHeader()}
      <div className="w-full px-6 py-6 pb-28">{renderContent()}</div>
      {renderExportModal()}
      {renderFloatingActions()}
    </div>
  );
};

export default VocabBookPage;
