import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  Languages,
  Loader2,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import { READING_BOOKS, AI } from '../utils/convexRefs';
import type { PictureBook, PictureBookPage } from '../types';
import { cn } from '../lib/utils';
import { buildMediaPath } from '../utils/mediaRoutes';
import { resolveSafeReturnTo } from '../utils/navigation';
import { getSafeImageSrc, normalizePublicAssetUrl } from '../utils/imageSrc';
import {
  buildPictureBookReaderSessionStorageKey,
  loadPictureBookReaderSessionState,
  persistPictureBookReaderSessionState,
} from '../utils/readingSession';
import { KT } from '../components/mobile/ksoft/ksoft';
import { DesignChip } from '../components/desktop/ui/DesignChip';

type BookPageQuery = {
  book: PictureBook;
  page: PictureBookPage | null;
  pageCount: number;
  pageIndex: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
} | null;

const PLAYBACK_RATES = [0.8, 1, 1.2, 1.5] as const;
type ReaderLayout = 'stacked' | 'split';

function isPictureBookTranslationDailyLimitCode(errorCode: string | undefined) {
  return errorCode === 'DAILY_LIMIT_REACHED';
}

function isPictureBookTranslationDailyLimitError(error: unknown) {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.includes('DAILY_LIMIT_REACHED') || raw.includes('ai_credits_daily');
}

function toPictureBookTranslationError(error: unknown, t: ReturnType<typeof useTranslation>['t']) {
  const raw = error instanceof Error ? error.message : String(error);
  if (isPictureBookTranslationDailyLimitError(error)) {
    return t('pictureBookReader.translationDailyLimit', {
      defaultValue: "You've reached today's AI translation limit. Try again tomorrow.",
    });
  }
  if (raw.includes('UNAUTHORIZED')) {
    return t('pictureBookReader.translationAuthRequired', {
      defaultValue: 'Please sign in to use translations.',
    });
  }
  return t('pictureBookReader.translationFailed', {
    defaultValue: 'Translation failed. Check your connection and try again.',
  });
}

function toPictureBookTranslationErrorFromCode(
  errorCode: string | undefined,
  t: ReturnType<typeof useTranslation>['t']
) {
  if (isPictureBookTranslationDailyLimitCode(errorCode)) {
    return t('pictureBookReader.translationDailyLimit', {
      defaultValue: "You've reached today's AI translation limit. Try again tomorrow.",
    });
  }
  if (errorCode === 'UNAUTHORIZED' || errorCode === 'FORBIDDEN') {
    return t('pictureBookReader.translationAuthRequired', {
      defaultValue: 'Please sign in to use translations.',
    });
  }
  return t('pictureBookReader.translationFailed', {
    defaultValue: 'Translation service is temporarily unavailable. Please try again later.',
  });
}

function getLevelNumber(levelLabel?: string) {
  const match = levelLabel?.match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function getReaderLayout(levelNumber: number | null) {
  if (levelNumber && levelNumber <= 3) return 'stacked';
  return 'split';
}

function getReaderLayoutForPage(
  levelNumber: number | null,
  pageOrientation?: ReaderLayout,
  layoutClass?: string
): ReaderLayout {
  if (pageOrientation) return pageOrientation;
  if (layoutClass === 'leftbox' || layoutClass === 'rightbox' || layoutClass === 'centerbox') {
    return 'split';
  }
  return getReaderLayout(levelNumber);
}

function getPageImageRegionClass(
  layout: 'stacked' | 'split',
  layoutClass: string | undefined,
  isMobile: boolean,
  hasPageImage: boolean
) {
  if (isMobile) {
    return hasPageImage
      ? 'absolute left-4 right-4 top-4 flex h-[32%] items-center justify-center overflow-hidden rounded-[1.5rem] bg-k-bg2/70'
      : 'hidden';
  }
  if (layout === 'stacked') {
    return 'absolute left-0 top-0 flex h-[62%] w-full items-center justify-center overflow-hidden';
  }
  if (layoutClass === 'leftbox') {
    return 'absolute left-0 top-0 flex h-full w-1/2 items-center justify-center overflow-hidden';
  }
  return 'absolute left-0 top-0 flex h-full w-1/2 items-center justify-center overflow-hidden';
}

const PAGE_IMAGE_PRELOAD_TIMEOUT_MS = 1600;

function getPageTextRegionClass(
  layout: 'stacked' | 'split',
  layoutClass: string | undefined,
  isMobile: boolean,
  hasPageImage: boolean
) {
  if (isMobile) {
    return hasPageImage
      ? 'absolute left-5 right-5 top-[39%] bottom-14 w-auto'
      : 'absolute left-5 right-5 top-6 bottom-14 w-auto';
  }
  if (layout === 'stacked') {
    return 'absolute left-[8%] top-[64%] h-[31%] w-[84%]';
  }
  if (layoutClass === 'leftbox') {
    return 'absolute left-[7%] top-0 h-full w-[30%]';
  }
  if (layoutClass === 'centerbox') {
    return 'absolute left-[15%] top-0 h-full w-[70%]';
  }
  if (layoutClass === 'left') {
    return 'absolute left-[57%] top-0 h-full w-[36%]';
  }
  return 'absolute left-[57%] top-0 h-full w-[36%]';
}

function getTextBlockClass(
  layout: 'stacked' | 'split',
  layoutClass: string | undefined,
  isMobile: boolean
) {
  if (isMobile) {
    return 'h-full w-full overflow-y-auto pr-1 text-left text-[clamp(18px,5vw,24px)] leading-[1.85] text-slate-900';
  }
  return cn(
    'h-full w-full overflow-y-auto text-slate-900',
    layout === 'stacked'
      ? 'text-center text-[clamp(20px,2.15vw,38px)] leading-[1.7]'
      : 'pr-2 text-left text-[clamp(16px,1.15vw,22px)] leading-[1.65]',
    layoutClass === 'centerbox' && 'text-center',
    (layoutClass === 'right' || layoutClass === 'leftbox' || layoutClass === 'rightbox') &&
      'text-left'
  );
}

export default function PictureBookReaderPage() {
  const { slug } = useParams<{ slug: string }>();
  return <PictureBookReaderPageContent key={slug ?? 'missing-picture-book'} slug={slug} />;
}

function PictureBookReaderPageContent({ slug }: { slug?: string }) {
  const { t } = useTranslation('public');
  const [searchParams] = useSearchParams();
  const navigate = useLocalizedNavigate();
  const { startUpgradeFlow } = useUpgradeFlow();
  const isMobile = useIsMobile();
  const backPath = useMemo(
    () =>
      resolveSafeReturnTo(
        searchParams.get('returnTo'),
        isMobile ? buildMediaPath('reading') : '/reading'
      ),
    [isMobile, searchParams]
  );
  const sessionStorageKey = useMemo(() => buildPictureBookReaderSessionStorageKey(slug), [slug]);
  const persistedState = useMemo(
    () => loadPictureBookReaderSessionState(sessionStorageKey),
    [sessionStorageKey]
  );
  const [pageIndex, setPageIndex] = useState(() => persistedState?.pageIndex ?? 0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(
    () => persistedState?.activeSentenceIndex ?? 0
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(
    () => persistedState?.playbackRate ?? 1
  );
  const [autoFlip, setAutoFlip] = useState(() => persistedState?.autoFlip ?? true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [visiblePageData, setVisiblePageData] = useState<BookPageQuery>(null);
  const [overlayPageData, setOverlayPageData] = useState<BookPageQuery>(null);
  const [showOverlayPage, setShowOverlayPage] = useState(false);
  const [pageOrientations, setPageOrientations] = useState<Record<string, ReaderLayout>>({});
  const [showTranslations, setShowTranslations] = useState(false);
  const [translatedPages, setTranslatedPages] = useState<Record<number, string[]>>({});
  const [translationFailedPages, setTranslationFailedPages] = useState<Record<number, boolean>>({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showTranslationUpgradeCta, setShowTranslationUpgradeCta] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeSentenceBtnRef = useRef<HTMLButtonElement | null>(null);
  const activeSentenceIndexRef = useRef(0);
  const autoFlipRef = useRef(true);
  const pageSnapshotRef = useRef<BookPageQuery>(null);
  const pendingAutoplayRef = useRef(false);
  const pendingSentenceResetRef = useRef(false);
  const subtitleScrollRef = useRef<HTMLDivElement>(null);
  const playSentenceRef = useRef<(index: number, restart?: boolean) => Promise<void>>(
    async () => {}
  );

  const book = useQuery(READING_BOOKS.getBookBySlug, slug ? { slug } : 'skip') as
    | PictureBook
    | null
    | undefined;
  const effectivePageIndex =
    book && book.pageCount > 0 ? Math.min(Math.max(pageIndex, 0), book.pageCount - 1) : pageIndex;
  const pageData = useQuery(
    READING_BOOKS.getBookPageData,
    slug ? { slug, pageIndex: effectivePageIndex } : 'skip'
  ) as BookPageQuery | undefined;
  const displayBook = book ?? null;
  const incomingPageData = pageData ?? null;
  const renderedPageData = visiblePageData;

  const translateReadingParagraphs = useAction(AI.translateReadingParagraphs);

  const requestPageTranslation = useCallback(
    async (targetPageIndex: number, targetPageData: BookPageQuery | null) => {
      if (!targetPageData) return;

      const sortedSentences = [...(targetPageData.page?.sentences ?? [])].sort(
        (a, b) => (a.sentenceIndex ?? 0) - (b.sentenceIndex ?? 0)
      );
      const sentences = sortedSentences.map(s => s.text).filter(Boolean);
      if (sentences.length === 0) return;

      setTranslationError(null);
      setShowTranslationUpgradeCta(false);
      setIsTranslating(true);
      const timeoutId = setTimeout(() => {
        setIsTranslating(prev => {
          if (!prev) return prev;
          setTranslationError(
            t('pictureBookReader.translationTimeout', {
              defaultValue: 'Translation timed out. Please try again.',
            })
          );
          setShowTranslationUpgradeCta(false);
          return false;
        });
      }, 30000);

      try {
        const result = await translateReadingParagraphs({
          title: displayBook?.title ?? 'Picture Book',
          paragraphs: sentences,
          language: 'zh',
        });

        if (result?.translations) {
          const hasAny = result.translations.some(item => item.trim().length > 0);
          if (!hasAny) {
            setTranslationFailedPages(prev => ({ ...prev, [targetPageIndex]: true }));
            setShowTranslationUpgradeCta(isPictureBookTranslationDailyLimitCode(result.errorCode));
            setTranslationError(toPictureBookTranslationErrorFromCode(result.errorCode, t));
            return;
          }
          setTranslatedPages(prev => ({
            ...prev,
            [targetPageIndex]: result.translations,
          }));
          setTranslationFailedPages(prev => {
            if (!prev[targetPageIndex]) return prev;
            const next = { ...prev };
            delete next[targetPageIndex];
            return next;
          });
          return;
        }

        setTranslationFailedPages(prev => ({ ...prev, [targetPageIndex]: true }));
        setShowTranslationUpgradeCta(isPictureBookTranslationDailyLimitCode(result?.errorCode));
        setTranslationError(toPictureBookTranslationErrorFromCode(result?.errorCode, t));
      } catch (err) {
        console.error('Translation failed:', err);
        setTranslationFailedPages(prev => ({ ...prev, [targetPageIndex]: true }));
        setShowTranslationUpgradeCta(isPictureBookTranslationDailyLimitError(err));
        setTranslationError(toPictureBookTranslationError(err, t));
      } finally {
        clearTimeout(timeoutId);
        setIsTranslating(false);
      }
    },
    [displayBook?.title, t, translateReadingParagraphs]
  );

  const handleToggleTranslation = useCallback(async () => {
    if (showTranslations) {
      setShowTranslations(false);
      return;
    }

    setShowTranslations(true);
    setTranslationError(null);
    setShowTranslationUpgradeCta(false);
    setTranslationFailedPages(prev => {
      if (!prev[effectivePageIndex]) return prev;
      const next = { ...prev };
      delete next[effectivePageIndex];
      return next;
    });
  }, [showTranslations, effectivePageIndex]);

  // Auto-translate on page change if active
  useEffect(() => {
    if (
      showTranslations &&
      incomingPageData &&
      !translatedPages[effectivePageIndex] &&
      !translationFailedPages[effectivePageIndex] &&
      !isTranslating
    ) {
      void requestPageTranslation(effectivePageIndex, incomingPageData);
    }
  }, [
    showTranslations,
    effectivePageIndex,
    incomingPageData,
    translatedPages,
    translationFailedPages,
    isTranslating,
    requestPageTranslation,
  ]);
  const currentVisiblePageId = visiblePageData?.page?._id ?? null;

  const currentPage = renderedPageData?.page ?? null;
  const currentSentences = useMemo(
    () =>
      (currentPage?.sentences ?? []).map(sentence => ({
        ...sentence,
        audioUrl: normalizePublicAssetUrl(sentence.audioUrl) || sentence.audioUrl,
      })),
    [currentPage]
  );
  const safeActiveSentenceIndex = currentSentences.length
    ? Math.min(activeSentenceIndex, currentSentences.length - 1)
    : 0;
  const activeSentence = currentSentences[safeActiveSentenceIndex] ?? null;

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleEnded = () => {
      const snapshot = pageSnapshotRef.current;
      const currentPageState = snapshot?.page;
      if (!currentPageState) {
        setIsPlaying(false);
        return;
      }

      const nextSentenceIndex = activeSentenceIndexRef.current + 1;
      if (nextSentenceIndex < currentPageState.sentences.length) {
        void playSentenceRef.current(nextSentenceIndex, true);
        return;
      }

      if (autoFlipRef.current && snapshot?.hasNextPage) {
        pendingAutoplayRef.current = true;
        startTransition(() => {
          setPageIndex(currentPageState.pageIndex + 1);
        });
        return;
      }

      setIsPlaying(false);
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);
    const handleError = () => {
      setIsPlaying(false);
      setAudioError(
        t('pictureBookReader.audioErrorPlaybackFailed', {
          defaultValue: 'Audio playback failed for this sentence.',
        })
      );
    };

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.src = '';
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [t]);

  useEffect(() => {
    activeSentenceIndexRef.current = safeActiveSentenceIndex;
  }, [safeActiveSentenceIndex]);

  useEffect(() => {
    autoFlipRef.current = autoFlip;
  }, [autoFlip]);

  useEffect(() => {
    pageSnapshotRef.current = visiblePageData ?? null;
  }, [visiblePageData]);

  useEffect(() => {
    if (!incomingPageData) return;

    const nextPageId = incomingPageData.page?._id ?? null;
    if (nextPageId && nextPageId === currentVisiblePageId) {
      return;
    }

    let cancelled = false;
    let overlayAnimationFrame = 0;
    let commitAnimationFrame = 0;
    let swapTimeout = 0;

    const commitVisiblePage = () => {
      if (cancelled) return;
      if (pendingSentenceResetRef.current) {
        pendingSentenceResetRef.current = false;
        setActiveSentenceIndex(0);
      }
      setVisiblePageData(incomingPageData);
      setOverlayPageData(null);
      setShowOverlayPage(false);
    };

    const startOverlaySwap = () => {
      if (cancelled) return;

      if (!visiblePageData) {
        commitAnimationFrame = requestAnimationFrame(commitVisiblePage);
        return;
      }

      setOverlayPageData(incomingPageData);
      setShowOverlayPage(false);
      overlayAnimationFrame = requestAnimationFrame(() => {
        if (cancelled) return;
        setShowOverlayPage(true);
        swapTimeout = window.setTimeout(() => {
          commitVisiblePage();
        }, 120);
      });
    };

    const nextImageUrl = getSafeImageSrc(incomingPageData.page?.imageUrl);
    if (!nextImageUrl) {
      commitAnimationFrame = requestAnimationFrame(startOverlaySwap);
      return;
    }

    if (!visiblePageData) {
      commitAnimationFrame = requestAnimationFrame(commitVisiblePage);
    }

    const preloadedImage = new Image();
    let preloadTimeout = 0;
    const commitWhenReady = async () => {
      if (cancelled) return;
      const nextOrientation: ReaderLayout =
        preloadedImage.naturalWidth >= preloadedImage.naturalHeight ? 'stacked' : 'split';
      setPageOrientations(current => {
        if (!nextImageUrl || current[nextImageUrl] === nextOrientation) return current;
        return {
          ...current,
          [nextImageUrl]: nextOrientation,
        };
      });
      try {
        if (typeof preloadedImage.decode === 'function') {
          await preloadedImage.decode();
        }
      } catch {
        // Fall back to onload/error completion.
      }
      if (!visiblePageData) {
        return;
      }
      startOverlaySwap();
    };

    preloadedImage.onload = () => {
      void commitWhenReady();
    };
    preloadedImage.onerror = startOverlaySwap;
    preloadTimeout = window.setTimeout(() => {
      if (!cancelled) {
        startOverlaySwap();
      }
    }, PAGE_IMAGE_PRELOAD_TIMEOUT_MS);
    preloadedImage.src = nextImageUrl;

    return () => {
      cancelled = true;
      if (overlayAnimationFrame) cancelAnimationFrame(overlayAnimationFrame);
      if (commitAnimationFrame) cancelAnimationFrame(commitAnimationFrame);
      if (swapTimeout) window.clearTimeout(swapTimeout);
      if (preloadTimeout) window.clearTimeout(preloadTimeout);
    };
  }, [currentVisiblePageId, incomingPageData, visiblePageData]);

  const pauseAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setIsPlaying(false);
  }, []);

  const playSentence = useCallback(
    async (index: number, restart: boolean = true) => {
      const audio = audioRef.current;
      if (!audio || currentSentences.length === 0) {
        setIsPlaying(false);
        return;
      }

      const nextSentenceIndex = Math.min(Math.max(index, 0), currentSentences.length - 1);
      const sentence = currentSentences[nextSentenceIndex];
      setActiveSentenceIndex(nextSentenceIndex);
      setAudioError(null);

      const sentenceAudioUrl = normalizePublicAssetUrl(sentence?.audioUrl) || sentence?.audioUrl;
      if (!sentenceAudioUrl) {
        setIsPlaying(false);
        return;
      }

      const shouldReplaceSource = audio.src !== sentenceAudioUrl;
      if (shouldReplaceSource) {
        audio.src = sentenceAudioUrl;
      }
      if (restart || shouldReplaceSource) {
        audio.currentTime = 0;
      }
      audio.playbackRate = playbackRate;

      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
        setAudioError(
          t('pictureBookReader.audioErrorBlocked', {
            defaultValue: 'Audio playback is blocked or unavailable.',
          })
        );
      }
    },
    [currentSentences, playbackRate, t]
  );

  useEffect(() => {
    playSentenceRef.current = playSentence;
  }, [playSentence]);

  useEffect(() => {
    if (currentSentences.length === 0) {
      pendingAutoplayRef.current = false;
      audioRef.current?.pause();
      return;
    }

    if (pendingAutoplayRef.current) {
      pendingAutoplayRef.current = false;
      void playSentenceRef.current(0, true);
      return;
    }

    audioRef.current?.pause();
  }, [currentSentences]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    persistPictureBookReaderSessionState(sessionStorageKey, {
      pageIndex: effectivePageIndex,
      activeSentenceIndex: safeActiveSentenceIndex,
      playbackRate,
      autoFlip,
      timestamp: Date.now(),
    });
  }, [autoFlip, effectivePageIndex, playbackRate, safeActiveSentenceIndex, sessionStorageKey]);

  // Auto-scroll active subtitle to center on mobile
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const btn = activeSentenceBtnRef.current;
      const container = subtitleScrollRef.current;
      if (!btn || !container) return;
      const btnRect = btn.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const targetScrollTop =
        container.scrollTop +
        (btnRect.top - containerRect.top) -
        (container.clientHeight - btn.clientHeight) / 2;
      container.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(raf);
  }, [safeActiveSentenceIndex, showTranslations, translatedPages, effectivePageIndex]);

  const handlePageChange = useCallback(
    (nextPageIndex: number) => {
      if (!renderedPageData) return;
      const bounded = Math.min(
        Math.max(nextPageIndex, 0),
        Math.max(renderedPageData.pageCount - 1, 0)
      );
      pendingAutoplayRef.current = false;
      pendingSentenceResetRef.current = true;
      setAudioError(null);
      pauseAudio();
      startTransition(() => {
        setPageIndex(bounded);
      });
    },
    [pauseAudio, renderedPageData]
  );

  const handleTogglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio || currentSentences.length === 0) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    const activeAudioUrl =
      normalizePublicAssetUrl(currentSentences[safeActiveSentenceIndex]?.audioUrl) ||
      currentSentences[safeActiveSentenceIndex]?.audioUrl;
    if (audio.src && activeAudioUrl && audio.src === activeAudioUrl && audio.currentTime > 0) {
      try {
        audio.playbackRate = playbackRate;
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    await playSentence(safeActiveSentenceIndex, true);
  }, [currentSentences, isPlaying, playbackRate, playSentence, safeActiveSentenceIndex]);

  const playbackRateLabel = useMemo(() => `${playbackRate.toFixed(1)}x`, [playbackRate]);
  const levelNumber = useMemo(
    () => getLevelNumber(displayBook?.levelLabel),
    [displayBook?.levelLabel]
  );
  const isInitialLoading =
    (book === undefined || pageData === undefined) && !displayBook && !visiblePageData;
  const isMissingBook = book === null;
  const hasInvalidPageIndex =
    displayBook?.pageCount !== undefined &&
    (effectivePageIndex < 0 || effectivePageIndex >= Math.max(displayBook.pageCount, 1));
  const isMissingPage =
    !hasInvalidPageIndex && book !== undefined && pageData === null && !visiblePageData;

  if (isInitialLoading) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 pb-16 pt-6">
        <div className="h-12 w-60 animate-pulse rounded-2xl bg-muted" />
        <div className="aspect-[4/3] animate-pulse rounded-[2rem] bg-muted" />
        <div className="h-40 animate-pulse rounded-[2rem] bg-muted" />
      </div>
    );
  }

  if (isMissingBook || isMissingPage) {
    return (
      <div className="mx-auto flex w-full max-w-[960px] flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div className="text-2xl font-black text-foreground">
          {t('pictureBookReader.notFoundTitle', { defaultValue: 'Picture book not found' })}
        </div>
        <div className="max-w-xl text-sm font-medium text-muted-foreground">
          {t('pictureBookReader.notFoundBody', {
            defaultValue: 'The requested story is missing or not published yet.',
          })}
        </div>
        <Button onClick={() => navigate(backPath)} className="px-5 py-3">
          {t('pictureBookReader.backToReading', { defaultValue: 'Return to Reading' })}
        </Button>
      </div>
    );
  }

  if (!displayBook || !renderedPageData) {
    return null;
  }

  const currentPageImageSrc = getSafeImageSrc(currentPage?.imageUrl);
  const currentLayout = getReaderLayoutForPage(
    levelNumber,
    currentPageImageSrc ? pageOrientations[currentPageImageSrc] : undefined,
    currentPage?.layoutClass
  );

  const renderPageLayer = (
    layerPageData: NonNullable<BookPageQuery>,
    sentenceIndex: number,
    isInteractive: boolean,
    extraClassName?: string
  ) => {
    const layerPage = layerPageData.page;
    if (!layerPage) return null;
    const pageImageSrc = getSafeImageSrc(layerPage.imageUrl);

    const layerLayout = getReaderLayoutForPage(
      levelNumber,
      pageImageSrc ? pageOrientations[pageImageSrc] : undefined,
      layerPage.layoutClass
    );
    const layerSentences = layerPage.sentences ?? [];
    const safeSentenceIndex = layerSentences.length
      ? Math.min(sentenceIndex, layerSentences.length - 1)
      : 0;

    return (
      <div className={cn('absolute inset-0', extraClassName)}>
        <div
          className={getPageImageRegionClass(
            layerLayout,
            layerPage.layoutClass,
            isMobile,
            Boolean(pageImageSrc)
          )}
        >
          {pageImageSrc ? (
            <img
              src={pageImageSrc}
              alt={t('pictureBookReader.pageImageAlt', {
                defaultValue: '{{title}} page {{page}}',
                title: displayBook.title,
                page: layerPageData.pageIndex + 1,
              })}
              className={cn(
                isMobile
                  ? 'h-full w-full object-contain'
                  : layerLayout === 'stacked'
                    ? 'h-[90%] w-auto max-w-[92%] scale-[1.08] object-contain'
                    : 'h-full w-auto max-w-full scale-[1.03] object-contain'
              )}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-k-bg2 text-k-sub-light">
              <BookOpen className="h-12 w-12" />
            </div>
          )}
        </div>

        <div
          className={getPageTextRegionClass(
            layerLayout,
            layerPage.layoutClass,
            isMobile,
            Boolean(pageImageSrc)
          )}
        >
          {layerSentences.length > 0 ? (
            <div className={getTextBlockClass(layerLayout, layerPage.layoutClass, isMobile)}>
              {layerSentences.map((sentence, idx) => {
                const isActive = sentence.sentenceIndex === safeSentenceIndex;
                return (
                  <div
                    key={sentence._id ?? `${sentence.sentenceIndex}-${sentence.text}`}
                    className={cn(
                      'transition',
                      isMobile
                        ? 'mb-3 last:mb-0'
                        : layerLayout === 'stacked'
                          ? 'mb-[0.32em] flex justify-center last:mb-0'
                          : 'mb-4 last:mb-0'
                    )}
                  >
                    <button
                      type="button"
                      onClick={
                        isInteractive
                          ? () => void playSentence(sentence.sentenceIndex, true)
                          : undefined
                      }
                      disabled={!isInteractive}
                      className={cn(
                        'transition-all duration-300 font-k-serif',
                        isMobile
                          ? 'block w-full rounded-xl px-2 py-1.5 text-left whitespace-normal break-keep'
                          : layerLayout === 'stacked'
                            ? 'inline rounded-[0.35em] px-[0.16em] py-[0.02em] align-baseline'
                            : 'block w-full rounded-2xl px-4 py-3 text-left whitespace-normal break-keep',
                        isMobile && isActive
                          ? 'bg-k-butter/55 text-k-ink shadow-none'
                          : isActive
                            ? 'bg-k-butter text-k-ink shadow-k-sh-sm transform scale-[1.02]'
                            : isMobile
                              ? 'text-k-ink hover:bg-k-bg2/70'
                              : layerLayout === 'stacked'
                                ? 'text-k-ink hover:bg-k-line'
                                : 'text-k-ink hover:bg-k-bg2/80',
                        !isInteractive && 'pointer-events-none'
                      )}
                    >
                      <span className="flex flex-col">
                        <span className="font-medium leading-relaxed">{sentence.text}</span>
                        {showTranslations && translatedPages[layerPageData.pageIndex]?.[idx] && (
                          <span
                            className={cn(
                              'mt-1 font-k-sans font-bold leading-tight opacity-60 italic',
                              isMobile
                                ? 'text-[0.78em]'
                                : layerLayout === 'stacked'
                                  ? 'text-[0.6em]'
                                  : 'text-sm'
                            )}
                          >
                            {translatedPages[layerPageData.pageIndex][idx]}
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-bold text-k-sub-light italic">
              {t('pictureBookReader.currentSentenceEmpty', {
                defaultValue: 'Tap a sentence to start playback.',
              })}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-5 rounded-full border border-k-line bg-k-card/85 px-3 py-1 text-[11px] font-black text-k-sub shadow-k-sh-sm backdrop-blur-md sm:bottom-6 sm:right-8 sm:px-5 sm:py-1.5 sm:text-xs">
          {layerPageData.pageIndex + 1} <span className="mx-1.5 opacity-30">/</span>{' '}
          {layerPageData.pageCount}
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-k-bg transition-colors duration-700"
      style={{ fontFamily: KT.font }}
    >
      {/* ─── SHARED HEADER ─── */}
      <header className="shrink-0 z-[100] flex items-center justify-between gap-4 px-6 h-20 border-b border-k-line backdrop-blur-xl bg-k-bg/80">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(backPath)}
            className="h-11 w-11 rounded-2xl hover:bg-k-line active:scale-95 transition-all"
          >
            <ArrowLeft className="h-5 w-5 text-k-ink" />
          </Button>
          <div className="hidden sm:block">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-k-crimson font-k-serif">
                讀 · READING
              </span>
              <DesignChip tone="butter" size="sm">
                Level {levelNumber || '?'}
              </DesignChip>
            </div>
            <h1 className="text-[16px] font-black text-k-ink tracking-tight truncate max-w-[300px]">
              {displayBook.title}
            </h1>
          </div>
        </div>

        {/* Global Desktop Controls */}
        <div className="hidden lg:flex items-center gap-2 bg-k-bg2/50 p-1.5 rounded-2xl border border-k-line">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              setPlaybackRate(
                current =>
                  PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current) + 1) % PLAYBACK_RATES.length]
              )
            }
            className="h-9 rounded-xl px-4 text-[11px] font-black text-k-ink hover:bg-k-card"
          >
            速度: {playbackRateLabel}
          </Button>
          <div className="w-px h-4 bg-k-line" />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAutoFlip(current => !current)}
            className={cn(
              'h-9 rounded-xl px-4 text-[11px] font-black transition-all',
              autoFlip ? 'bg-k-card text-k-crimson shadow-k-sh-sm' : 'text-k-sub hover:bg-k-card'
            )}
          >
            自动翻页: {autoFlip ? '开启' : '关闭'}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleToggleTranslation}
            className={cn(
              'h-11 w-11 rounded-2xl transition-all border',
              showTranslations
                ? 'bg-k-ink border-k-ink text-k-bg shadow-k-sh-sm'
                : 'border-k-line text-k-sub hover:border-k-ink hover:text-k-ink'
            )}
          >
            {isTranslating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Languages className="h-5 w-5" />
            )}
          </Button>
        </div>
      </header>

      <main className="flex-1 flex min-h-0 relative">
        {/* ─── LEFT: READER CANVAS ─── */}
        <div className="flex-1 flex flex-col min-w-0 bg-k-bg2/30">
          <div className="flex-1 relative flex items-center justify-center overflow-hidden p-4 sm:p-6 lg:p-12">
            <div
              className={cn(
                'relative max-h-full max-w-full overflow-hidden bg-k-card shadow-k-sh-lg transition-all duration-500',
                isMobile
                  ? 'h-[min(calc(100svh-12rem),calc((100vw-2rem)*1.32))] w-[min(calc(100vw-2rem),calc((100svh-12rem)/1.32))] rounded-[2rem] border border-k-line'
                  : currentLayout === 'stacked'
                    ? 'aspect-[1.56/1] h-[min(82vh,calc((100vw-400px)/1.56))] w-auto rounded-[2rem] border border-k-line'
                    : 'aspect-[1.34/1] h-[min(82vh,calc((100vw-400px)/1.34))] w-auto rounded-[2.5rem] border border-k-line'
              )}
            >
              {renderPageLayer(renderedPageData, safeActiveSentenceIndex, true)}
              {overlayPageData
                ? renderPageLayer(
                    overlayPageData,
                    0,
                    false,
                    cn(
                      'z-10 transition-opacity duration-300 bg-k-card',
                      showOverlayPage ? 'opacity-100' : 'opacity-0'
                    )
                  )
                : null}
            </div>

            {/* Navigation Overlays */}
            <button
              onClick={() => handlePageChange(renderedPageData.pageIndex - 1)}
              disabled={!renderedPageData.hasPreviousPage}
              className="absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full flex items-center justify-center bg-k-card/60 backdrop-blur-md border border-k-line text-k-ink opacity-0 hover:opacity-100 hover:bg-k-card transition-all disabled:hidden group"
            >
              <ChevronLeft size={32} className="group-active:scale-90 transition-transform" />
            </button>
            <button
              onClick={() => handlePageChange(renderedPageData.pageIndex + 1)}
              disabled={!renderedPageData.hasNextPage}
              className="absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 h-16 w-16 rounded-full flex items-center justify-center bg-k-card/60 backdrop-blur-md border border-k-line text-k-ink opacity-0 hover:opacity-100 hover:bg-k-card transition-all disabled:hidden group"
            >
              <ChevronRight size={32} className="group-active:scale-90 transition-transform" />
            </button>
          </div>

          {/* Player Bar */}
          <div className="flex h-24 shrink-0 items-center border-t border-k-line bg-k-card/50 px-4 backdrop-blur-md sm:px-10">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-6">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(renderedPageData.pageIndex - 1)}
                disabled={!renderedPageData.hasPreviousPage}
                className="h-11 w-11 shrink-0 rounded-xl text-k-sub hover:text-k-ink disabled:opacity-30 sm:h-12 sm:w-12"
              >
                <ChevronLeft size={24} />
              </Button>
              <Button
                type="button"
                onClick={() => void handleTogglePlay()}
                disabled={currentSentences.length === 0}
                className={cn(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-k-sh transition-all active:scale-95',
                  isPlaying ? 'bg-k-crimson text-k-bg' : 'bg-k-ink text-k-bg hover:bg-k-crimson'
                )}
              >
                {isPlaying ? <Pause size={28} /> : <Play size={28} fill="currentColor" />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => handlePageChange(renderedPageData.pageIndex + 1)}
                disabled={!renderedPageData.hasNextPage}
                className="h-11 w-11 shrink-0 rounded-xl text-k-sub hover:text-k-ink disabled:opacity-30 sm:h-12 sm:w-12"
              >
                <ChevronRight size={24} />
              </Button>

              <div className="mx-2 hidden h-6 w-px bg-k-line sm:block" />

              <div className="flex min-w-0 flex-1 items-center justify-center rounded-2xl border border-k-line/5 bg-k-bg2/40 px-3 py-2 sm:max-w-2xl sm:px-4">
                <span className="truncate px-1 text-center font-k-serif text-[16px] font-medium text-k-ink sm:px-4 sm:text-[18px]">
                  {activeSentence?.text || '...'}
                </span>
              </div>

              <div className="hidden items-center gap-4 text-[12px] font-black text-k-sub sm:flex">
                <span className="text-k-ink">{renderedPageData.pageIndex + 1}</span>
                <div className="w-32 h-1 bg-k-line rounded-full overflow-hidden">
                  <div
                    className="h-full bg-k-ink transition-all duration-300"
                    style={{
                      width: `${((renderedPageData.pageIndex + 1) / renderedPageData.pageCount) * 100}%`,
                    }}
                  />
                </div>
                <span>{renderedPageData.pageCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── RIGHT: SIDEBAR (Desktop Only) ─── */}
        <aside className="hidden lg:flex flex-col w-[400px] border-l border-k-line bg-k-card">
          <div className="p-6 border-b border-k-line">
            <div className="flex items-baseline gap-2 mb-1">
              <span className="font-k-serif text-k-crimson text-lg font-medium">文</span>
              <span className="text-[13px] font-black text-k-ink tracking-widest uppercase">
                Subtitles
              </span>
            </div>
            <p className="text-[11px] font-bold text-k-sub">逐句跟读与翻译对照</p>
          </div>

          <div
            ref={subtitleScrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-fine"
          >
            {currentSentences.map((sentence, idx) => {
              const isActive = sentence.sentenceIndex === safeActiveSentenceIndex;
              return (
                <button
                  key={sentence._id ?? idx}
                  onClick={() => void playSentence(sentence.sentenceIndex, true)}
                  className={cn(
                    'w-full text-left p-4 rounded-2xl transition-all group',
                    isActive
                      ? 'bg-k-butter/40 border border-k-butter shadow-k-sh-sm'
                      : 'hover:bg-k-bg2/50 border border-transparent'
                  )}
                >
                  <div
                    className={cn(
                      'text-[16px] font-medium leading-relaxed font-k-serif mb-1',
                      isActive ? 'text-k-ink' : 'text-k-ink2'
                    )}
                  >
                    {sentence.text}
                  </div>
                  {showTranslations && translatedPages[renderedPageData.pageIndex]?.[idx] && (
                    <div className="text-[13px] font-bold text-k-sub italic animate-in fade-in slide-in-from-top-1 duration-300">
                      {translatedPages[renderedPageData.pageIndex][idx]}
                    </div>
                  )}
                  {isActive && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-k-crimson animate-pulse" />
                      <span className="text-[10px] font-black text-k-crimson uppercase tracking-widest">
                        Listening
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </aside>
      </main>

      {/* Overlays */}
      {audioError && (
        <div className="absolute inset-x-0 top-24 z-[110] flex justify-center pointer-events-none">
          <div className="rounded-2xl bg-k-ink text-k-bg px-6 py-3 text-sm font-black shadow-k-sh-lg animate-in zoom-in-95">
            {audioError}
          </div>
        </div>
      )}

      {translationError && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[110] w-[400px] animate-in slide-in-from-bottom-4">
          <div className="bg-k-ink text-k-bg p-4 rounded-2xl shadow-k-sh-lg border border-white/10 flex gap-3">
            <AlertCircle className="shrink-0 text-k-butter" size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold leading-tight mb-2">{translationError}</p>
              {showTranslationUpgradeCta && (
                <Button
                  onClick={() => startUpgradeFlow({ source: 'picture_book_translation' })}
                  className="w-full bg-k-crimson hover:bg-k-crimson/90 text-[11px] font-black h-8 rounded-xl"
                >
                  升级以获取翻译
                </Button>
              )}
            </div>
            <button
              onClick={() => setTranslationError(null)}
              className="shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
