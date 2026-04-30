import React from 'react';
import { m as motion } from 'framer-motion';
import {
  ArrowLeft,
  Zap,
  FileDown,
  Search,
  BookOpen,
  Loader2,
  CheckSquare,
  Square,
  Volume2,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Circle,
  Layers,
  Headphones,
  PencilLine,
  SpellCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Button, Input } from '../../components/ui';
import type { LabelsBundle, VocabBookCategory, ExportMode } from '../VocabBookPage';
import type { VocabBookItemDto } from '../../../convex/vocab';

interface ExportModeOption {
  mode: ExportMode;
  title: string;
  description: string;
}

const ACTIVE_EXPORT_MODE_BUTTON_CLASS =
  'border-orange-400 bg-orange-50 shadow-[0_10px_30px_rgba(249,115,22,0.12)] dark:border-orange-300/35 dark:bg-orange-400/12 dark:shadow-[0_10px_30px_rgba(253,186,116,0.15)]';
const INACTIVE_EXPORT_MODE_BUTTON_CLASS = 'border-border bg-card hover:border-border';

const getExportModeButtonClass = (active: boolean): string =>
  `!flex !w-full !flex-col !items-start !justify-start p-4 rounded-2xl border-[3px] text-left transition-all ${
    active ? ACTIVE_EXPORT_MODE_BUTTON_CLASS : INACTIVE_EXPORT_MODE_BUTTON_CLASS
  }`;

const getShuffleTrackClass = (enabled: boolean): string =>
  `w-12 h-7 rounded-full transition-all relative ${
    enabled ? 'bg-orange-500 dark:bg-orange-400/80' : 'bg-muted'
  }`;

const getShuffleThumbClass = (enabled: boolean): string =>
  `absolute top-1 w-5 h-5 bg-card rounded-full transition-all ${enabled ? 'left-6' : 'left-1'}`;

interface DesktopVocabBookPageProps {
  navigate: (path: string) => void;
  labels: LabelsBundle;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: VocabBookCategory;
  setActiveCategory: (category: VocabBookCategory) => void;
  stats: {
    dueNow: number;
    unlearned: number;
    due: number;
    mastered: number;
    total: number;
    recommendedToday: number;
  };
  visibleItems: Array<{ item: VocabBookItemDto; isMastered: boolean }>;
  visibleWordIds: string[];
  selectedWordIds: Set<string>;
  allVisibleSelected: boolean;
  selectedCount: number;
  toggleSelectAllVisible: () => void;
  toggleSelectWord: (id: string) => void;
  pronounceWord: (word: VocabBookItemDto) => void;
  openImmersiveForWord: (id: string) => void;
  expandedId: string | null;
  toggleExpand: (id: string) => void;
  masteryPendingId: string | null;
  setMastery: (opts: { wordId: any; mastered: boolean }) => Promise<any>;
  setOptimisticMastery: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  optimisticMastery: Record<string, boolean>;
  notify: any;
  startLearning: (mode: 'immerse' | 'listen' | 'dictation' | 'spelling') => void;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  setPageCursor: (cursor: string | null) => void;
  nextCursor: string | null;
  viewerAccess: any;
  startUpgradeFlow: (opts: any) => void;
  setExportOpen: (open: boolean) => void;
  exportOpen: boolean;
  exporting: boolean;
  exportMode: ExportMode;
  setExportMode: (mode: ExportMode) => void;
  exportShuffle: boolean;
  setExportShuffle: React.Dispatch<React.SetStateAction<boolean>>;
  exportSubtitle: string;
  langListLabel: string;
  langListDesc: string;
  onExport: () => Promise<void>;
  runBulkSetMastery: (mastered: boolean) => Promise<void>;
  runBulkRemove: () => Promise<void>;
  bulkPending: boolean;
  isMobileListMode: boolean;
  returnToPath: string;
  searchParams: URLSearchParams;
  language: string;
  getLocalizedMeaning: (word: VocabBookItemDto, lang: string) => string;
  updateEstimatedRowHeight: (node: HTMLDivElement | null) => void;
  windowedItems: {
    enabled: boolean;
    items: Array<{ item: VocabBookItemDto; isMastered: boolean }>;
    topSpacerHeight: number;
    bottomSpacerHeight: number;
  };
  filterButtons: Array<{
    key: VocabBookCategory;
    label: string;
    count: number;
    color: 'blue' | 'amber' | 'emerald';
  }>;
  Dialog: any;
  DialogPortal: any;
  DialogOverlay: any;
  DialogContent: any;
  expandMeaningLabel: string;
  collapseMeaningLabel: string;
}

export const DesktopVocabBookPage: React.FC<DesktopVocabBookPageProps> = ({
  navigate,
  labels,
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  stats,
  visibleItems,
  visibleWordIds,
  selectedWordIds,
  allVisibleSelected,
  selectedCount,
  toggleSelectAllVisible,
  toggleSelectWord,
  pronounceWord,
  openImmersiveForWord,
  expandedId,
  toggleExpand,
  masteryPendingId,
  setMastery,
  setOptimisticMastery,
  optimisticMastery,
  notify,
  startLearning,
  loading,
  loadingMore,
  hasMore,
  setPageCursor,
  nextCursor,
  viewerAccess,
  startUpgradeFlow,
  setExportOpen,
  exportOpen,
  exporting,
  exportMode,
  setExportMode,
  exportShuffle,
  setExportShuffle,
  exportSubtitle,
  langListLabel,
  langListDesc,
  onExport,
  runBulkSetMastery,
  runBulkRemove,
  bulkPending,
  isMobileListMode,
  returnToPath,
  searchParams,
  language,
  getLocalizedMeaning,
  updateEstimatedRowHeight,
  windowedItems,
  filterButtons,
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  expandMeaningLabel,
  collapseMeaningLabel,
}) => {
  const trimmedSearch = searchQuery.trim();
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
                  navigate(`/vocab-book${searchParams.get('returnTo') ? `?returnTo=${encodeURIComponent(searchParams.get('returnTo')!)}` : ''}`);
                  return;
                }
                navigate(returnToPath);
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
              onClick={() => {
                if (!viewerAccess?.flags.pdfExport) {
                  startUpgradeFlow({
                    plan: 'ANNUAL',
                    source: 'pdf_locked',
                  });
                  return;
                }
                setExportOpen(true);
              }}
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
        <div>
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
                        const nextMastered = !isMastered;
                        await setMastery({ wordId: word.id, mastered: nextMastered });
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

    const copy = {
      exportPdfButton: labels.vocabBook?.exportPdf || 'Export PDF',
      exportingButton: labels.vocabBook?.exporting || 'Exporting...',
      exportPdfTitle: labels.vocabBook?.exportPdfTitle || 'Export PDF',
      wordSheetTitle: labels.vocabBook?.wordSheetTitle || 'Word Sheet',
      closeLabel: labels.common?.close || 'Close',
      shuffleLabel: labels.vocabBook?.exportModes?.shuffleLabel || 'Shuffle',
      a4Title: labels.vocabBook?.exportModes?.a4Title || 'A4 Dictation',
      a4Description: labels.vocabBook?.exportModes?.a4Desc || 'Two-way test',
      koListTitle: labels.vocabBook?.exportModes?.koListTitle || 'Korean List',
      koListDescription: labels.vocabBook?.exportModes?.koListDesc || 'Write the meaning',
    };

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
      <Dialog open={exportOpen} onOpenChange={handleDialogOpenChange}>
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
                  onClick={() => {
                    if (exporting) return;
                    setExportOpen(false);
                  }}
                  className="p-2 rounded-xl hover:bg-muted disabled:opacity-40"
                  aria-label={copy.closeLabel}
                  disabled={exporting}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {modeOptions.map(option => (
                  <Button
                    key={option.mode}
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => setExportMode(option.mode)}
                    className={getExportModeButtonClass(exportMode === option.mode)}
                  >
                    <p className="font-black text-foreground">{option.title}</p>
                    <p className="text-xs font-bold text-muted-foreground mt-1">
                      {option.description}
                    </p>
                  </Button>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border-2 border-border bg-muted p-4 flex items-center justify-between">
                <span className="font-black text-muted-foreground">{copy.shuffleLabel}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setExportShuffle(v => !v)}
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

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      {renderHeader()}
      <div className="w-full px-6 py-6 pb-28">{renderContent()}</div>
      {renderExportModal()}
      {renderFloatingActions()}
    </div>
  );
};
