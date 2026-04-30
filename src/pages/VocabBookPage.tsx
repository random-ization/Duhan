import React, { Suspense, lazy, useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  Search,
} from 'lucide-react';

import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { appendReturnToPath, resolveSafeReturnTo } from '../utils/navigation';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { getLabels } from '../utils/i18n';
import { getLocalizedContent } from '../utils/languageUtils';
import { VOCAB, VOCAB_PDF } from '../utils/convexRefs';
import { notify } from '../utils/notify';
import { useIsMobile } from '../hooks/useIsMobile';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../components/ui';


import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import { getEntitlementErrorData } from '../utils/entitlements';
import { buildVocabBookModePath } from '../utils/vocabBookRoutes';
import { normalizePublicAssetUrl } from '../utils/imageSrc';
import type { VocabBookItemDto } from '../../convex/vocab';
import type { Id } from '../../convex/_generated/dataModel';
import { ContentSkeleton } from '../components/common';
export type ExportMode = 'A4_DICTATION' | 'LANG_LIST' | 'KO_LIST';

export type VocabBookCategory = 'UNLEARNED' | 'DUE' | 'MASTERED';
export type LabelsBundle = ReturnType<typeof getLabels>;
const VOCAB_PAGE_SIZE = 80;
const VIRTUAL_OVERSCAN_ROWS = 8;
const VIRTUAL_ROW_GAP = 12;
const DEFAULT_ROW_HEIGHT = 96;

const withFallback = (value: string | undefined, fallback: string): string => value || fallback;
const getLocalizedMeaning = (word: VocabBookItemDto, language: string): string =>
  getLocalizedContent(word, 'meaning', language) ||
  word.meaning ||
  word.meaningEn ||
  word.meaningVi ||
  word.meaningMn ||
  '';

const LazyMobileVocabDashboard = lazy(() =>
  import('../components/mobile/MobileVocabDashboard').then(module => ({
    default: module.MobileVocabDashboard,
  }))
);

const DesktopVocabBookPage = lazy(() =>
  import('./desktop/DesktopVocabBookPage').then(module => ({
    default: module.DesktopVocabBookPage,
  }))
);



const VocabBookPage: React.FC = () => {
  const navigate = useLocalizedNavigate();
  const { language, user, viewerAccess } = useAuth();
  const { startUpgradeFlow } = useUpgradeFlow();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const returnToPath = resolveSafeReturnTo(searchParams.get('returnTo'), '/courses');
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

  const openDownloadFallback = (url: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

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
      openDownloadFallback(url);
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
    } catch (error) {
      const entitlementError = getEntitlementErrorData(error);
      if (entitlementError?.upgradeSource) {
        startUpgradeFlow({
          plan: 'ANNUAL',
          source: entitlementError.upgradeSource,
        });
      } else {
        notify.error(labels.vocabBook?.exportFailed || 'Export failed. Please try again.');
      }
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
    params.set('category', currentCategoryHasItems ? activeCategory : 'ALL');
    if (trimmedSearch) params.set('q', trimmedSearch);
    if (selectedCount > 0) {
      params.set('selected', Array.from(selectedWordIds).join(','));
    }
    navigate(buildVocabBookModePath(mode, params));
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



  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  const openImmersiveForWord = (wordId: string) => {
    const params = new URLSearchParams();
    params.set('category', activeCategory);
    params.set('focus', wordId);
    if (trimmedSearch) params.set('q', trimmedSearch);
    navigate(buildVocabBookModePath('immerse', params));
  };

  const pronounceWord = useCallback((word: VocabBookItemDto) => {
    if (typeof window === 'undefined') return;

    const normalizedAudioUrl = normalizePublicAssetUrl(word.audioUrl) || word.audioUrl;
    if (normalizedAudioUrl) {
      try {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        audioRef.current.pause();
        audioRef.current.src = normalizedAudioUrl;
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





  if (isMobile && !isMobileListMode) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileVocabDashboard
          savedWordsCount={stats.total}
          onOpenSavedWords={() => navigate('/vocab-book?mobileView=list')}
          onOpenMistakes={() => navigate('/dashboard/vocabulary?list=mistakes')}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopVocabBookPage
        navigate={navigate}
        labels={labels}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        stats={stats}
        visibleItems={visibleItems}
        visibleWordIds={visibleWordIds}
        selectedWordIds={selectedWordIds}
        allVisibleSelected={allVisibleSelected}
        selectedCount={selectedCount}
        toggleSelectAllVisible={toggleSelectAllVisible}
        toggleSelectWord={toggleSelectWord}
        pronounceWord={pronounceWord}
        openImmersiveForWord={openImmersiveForWord}
        expandedId={expandedId}
        toggleExpand={toggleExpand}
        masteryPendingId={masteryPendingId}
        setMastery={setMastery}
        setOptimisticMastery={setOptimisticMastery}
        optimisticMastery={optimisticMastery}
        notify={notify}
        startLearning={startLearning}
        loading={loading}
        loadingMore={loadingMore}
        hasMore={hasMore}
        setPageCursor={setPageCursor}
        nextCursor={nextCursor}
        viewerAccess={viewerAccess}
        startUpgradeFlow={startUpgradeFlow}
        setExportOpen={setExportOpen}
        exportOpen={exportOpen}
        exporting={exporting}
        exportMode={exportMode}
        setExportMode={setExportMode}
        exportShuffle={exportShuffle}
        setExportShuffle={setExportShuffle}
        exportSubtitle={exportSubtitle}
        langListLabel={langListLabel}
        langListDesc={langListDesc}
        onExport={onExport}
        runBulkSetMastery={runBulkSetMastery}
        runBulkRemove={runBulkRemove}
        bulkPending={bulkPending}
        isMobileListMode={isMobileListMode}
        returnToPath={returnToPath}
        searchParams={searchParams}
        language={language}
        getLocalizedMeaning={getLocalizedMeaning}
        updateEstimatedRowHeight={updateEstimatedRowHeight}
        windowedItems={windowedItems}
        filterButtons={filterButtons}
        Dialog={Dialog}
        DialogPortal={DialogPortal}
        DialogOverlay={DialogOverlay}
        DialogContent={DialogContent}
        expandMeaningLabel={expandMeaningLabel}
        collapseMeaningLabel={collapseMeaningLabel}
      />
    </Suspense>
  );
}

export default VocabBookPage;
