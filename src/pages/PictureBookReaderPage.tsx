import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'convex/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Button } from '../components/ui';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { READING_BOOKS } from '../utils/convexRefs';
import type { PictureBook, PictureBookPage } from '../types';
import { cn } from '../lib/utils';

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

function getPageImageRegionClass(layout: 'stacked' | 'split', layoutClass?: string) {
  if (layout === 'stacked') {
    return 'absolute left-0 top-0 flex h-[62%] w-full items-center justify-center overflow-hidden';
  }
  if (layoutClass === 'leftbox') {
    return 'absolute left-0 top-0 flex h-full w-1/2 items-center justify-center overflow-hidden';
  }
  return 'absolute left-0 top-0 flex h-full w-1/2 items-center justify-center overflow-hidden';
}

function getPageTextRegionClass(layout: 'stacked' | 'split', layoutClass?: string) {
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

function getTextBlockClass(layout: 'stacked' | 'split', layoutClass?: string) {
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
  const navigate = useLocalizedNavigate();
  const [pageIndex, setPageIndex] = useState(0);
  const [activeSentenceIndex, setActiveSentenceIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<(typeof PLAYBACK_RATES)[number]>(1);
  const [autoFlip, setAutoFlip] = useState(true);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [visiblePageData, setVisiblePageData] = useState<BookPageQuery>(null);
  const [overlayPageData, setOverlayPageData] = useState<BookPageQuery>(null);
  const [showOverlayPage, setShowOverlayPage] = useState(false);
  const [pageOrientations, setPageOrientations] = useState<Record<string, ReaderLayout>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const activeSentenceIndexRef = useRef(0);
  const autoFlipRef = useRef(true);
  const pageSnapshotRef = useRef<BookPageQuery>(null);
  const pendingAutoplayRef = useRef(false);
  const pendingSentenceResetRef = useRef(false);
  const playSentenceRef = useRef<(index: number, restart?: boolean) => Promise<void>>(
    async () => {}
  );

  const book = useQuery(READING_BOOKS.getBookBySlug, slug ? { slug } : 'skip') as
    | PictureBook
    | null
    | undefined;
  const pageData = useQuery(READING_BOOKS.getBookPageData, slug ? { slug, pageIndex } : 'skip') as
    | BookPageQuery
    | undefined;
  const displayBook = book ?? null;
  const incomingPageData = pageData ?? null;
  const renderedPageData = visiblePageData;
  const currentVisiblePageId = visiblePageData?.page?._id ?? null;

  const currentPage = renderedPageData?.page ?? null;
  const currentSentences = useMemo(() => currentPage?.sentences ?? [], [currentPage]);
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

    const nextImageUrl = incomingPageData.page?.imageUrl;
    if (!nextImageUrl) {
      commitAnimationFrame = requestAnimationFrame(startOverlaySwap);
      return;
    }

    const preloadedImage = new Image();
    const commitWhenReady = async () => {
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
      startOverlaySwap();
    };

    preloadedImage.onload = () => {
      void commitWhenReady();
    };
    preloadedImage.onerror = startOverlaySwap;
    preloadedImage.src = nextImageUrl;

    return () => {
      cancelled = true;
      if (overlayAnimationFrame) cancelAnimationFrame(overlayAnimationFrame);
      if (commitAnimationFrame) cancelAnimationFrame(commitAnimationFrame);
      if (swapTimeout) window.clearTimeout(swapTimeout);
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

      if (!sentence?.audioUrl) {
        setIsPlaying(false);
        return;
      }

      const shouldReplaceSource = audio.src !== sentence.audioUrl;
      if (shouldReplaceSource) {
        audio.src = sentence.audioUrl;
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

    const activeAudioUrl = currentSentences[safeActiveSentenceIndex]?.audioUrl;
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
  const isMissingPage = book !== undefined && pageData === null && !visiblePageData;

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
        <Button onClick={() => navigate('/reading')} className="px-5 py-3">
          {t('pictureBookReader.backToReading', { defaultValue: 'Return to Reading' })}
        </Button>
      </div>
    );
  }

  if (!displayBook || !renderedPageData) {
    return null;
  }

  const currentLayout = getReaderLayoutForPage(
    levelNumber,
    currentPage ? pageOrientations[currentPage.imageUrl] : undefined,
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

    const layerLayout = getReaderLayoutForPage(
      levelNumber,
      pageOrientations[layerPage.imageUrl],
      layerPage.layoutClass
    );
    const layerSentences = layerPage.sentences ?? [];
    const safeSentenceIndex = layerSentences.length
      ? Math.min(sentenceIndex, layerSentences.length - 1)
      : 0;

    return (
      <div className={cn('absolute inset-0', extraClassName)}>
        <div className={getPageImageRegionClass(layerLayout, layerPage.layoutClass)}>
          <img
            src={layerPage.imageUrl}
            alt={t('pictureBookReader.pageImageAlt', {
              defaultValue: '{{title}} page {{page}}',
              title: displayBook.title,
              page: layerPageData.pageIndex + 1,
            })}
            className={cn(
              layerLayout === 'stacked'
                ? 'h-[90%] w-auto max-w-[92%] scale-[1.08] object-contain'
                : 'h-full w-auto max-w-full scale-[1.03] object-contain'
            )}
          />
        </div>

        <div className={getPageTextRegionClass(layerLayout, layerPage.layoutClass)}>
          {layerSentences.length > 0 ? (
            <div className={getTextBlockClass(layerLayout, layerPage.layoutClass)}>
              {layerSentences.map(sentence => {
                const isActive = sentence.sentenceIndex === safeSentenceIndex;
                return (
                  <div
                    key={sentence._id ?? `${sentence.sentenceIndex}-${sentence.text}`}
                    className={cn(
                      'transition',
                      layerLayout === 'stacked'
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
                        'transition',
                        layerLayout === 'stacked'
                          ? 'inline rounded-[0.35em] px-[0.16em] py-[0.02em] align-baseline'
                          : 'block w-full rounded-2xl px-4 py-3 text-left whitespace-normal break-keep',
                        isActive
                          ? 'bg-[#f6e78b] text-slate-950 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)]'
                          : layerLayout === 'stacked'
                            ? 'text-slate-800 hover:bg-slate-100'
                            : 'text-slate-800 hover:bg-slate-100/80',
                        !isInteractive && 'pointer-events-none'
                      )}
                    >
                      <span className={cn(layerLayout === 'split' && 'block')}>
                        {sentence.text}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-sm font-semibold text-muted-foreground">
              {t('pictureBookReader.currentSentenceEmpty', {
                defaultValue: 'Tap a sentence to start playback.',
              })}
            </div>
          )}
        </div>

        <div className="absolute bottom-4 right-4 rounded-full border border-black/10 bg-white/92 px-4 py-2 text-sm font-black text-slate-700 shadow-sm">
          {layerPageData.pageIndex + 1} / {layerPageData.pageCount}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex h-full min-h-0 w-full max-w-[1820px] flex-col overflow-hidden px-1 py-1 sm:px-3 lg:px-4">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-[2.25rem] border border-[#dbe5f2] bg-gradient-to-br from-[#eaf2ff] via-[#f7faff] to-[#eef5ff] p-1 shadow-sm sm:p-1.5">
        <div className="absolute left-4 top-4 z-20 flex items-start gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => navigate('/reading')}
            className="h-14 w-14 rounded-full border-white/70 bg-white/90 text-foreground shadow-lg backdrop-blur"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(renderedPageData.pageIndex - 1)}
          disabled={!renderedPageData.hasPreviousPage}
          className="absolute left-2 top-1/2 z-20 hidden h-16 w-16 -translate-y-1/2 rounded-full border-white/70 bg-white/90 text-foreground shadow-lg backdrop-blur md:flex"
        >
          <ChevronLeft className="h-7 w-7" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => handlePageChange(renderedPageData.pageIndex + 1)}
          disabled={!renderedPageData.hasNextPage}
          className="absolute right-2 top-1/2 z-20 hidden h-16 w-16 -translate-y-1/2 rounded-full border-white/70 bg-white/90 text-foreground shadow-lg backdrop-blur md:flex"
        >
          <ChevronRight className="h-7 w-7" />
        </Button>

        <div className="absolute right-4 top-4 z-20 hidden w-[88px] flex-col gap-3 lg:flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void handleTogglePlay()}
            disabled={currentSentences.length === 0}
            className={cn(
              'h-16 w-16 rounded-full border-white/70 shadow-lg backdrop-blur',
              isPlaying
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white/92 text-slate-900 hover:bg-white',
              'disabled:border-white/70 disabled:bg-white/80 disabled:text-slate-300'
            )}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void playSentence(safeActiveSentenceIndex, true)}
            disabled={!activeSentence?.audioUrl}
            className="h-16 w-16 rounded-full border-white/70 bg-white/92 text-slate-900 shadow-lg backdrop-blur hover:bg-white disabled:border-white/70 disabled:bg-white/80 disabled:text-slate-300"
          >
            <RotateCcw className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPlaybackRate(
                current =>
                  PLAYBACK_RATES[(PLAYBACK_RATES.indexOf(current) + 1) % PLAYBACK_RATES.length]
              )
            }
            className="rounded-full border-white/70 bg-white/92 px-3 py-2 text-xs font-black text-slate-900 shadow-lg backdrop-blur hover:bg-white"
          >
            {playbackRateLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAutoFlip(current => !current)}
            className={cn(
              'rounded-full border-white/70 px-3 py-2 text-[11px] font-black shadow-lg backdrop-blur',
              autoFlip
                ? 'bg-slate-900 text-white hover:bg-slate-800'
                : 'bg-white/92 text-slate-900 hover:bg-white'
            )}
          >
            {autoFlip
              ? t('pictureBookReader.autoFlipOn', { defaultValue: 'Auto Flip On' })
              : t('pictureBookReader.autoFlipOff', { defaultValue: 'Auto Flip Off' })}
          </Button>
        </div>

        <div className="flex h-full min-h-0 w-full items-center justify-center">
          <div
            className={cn(
              'relative max-h-full max-w-full overflow-hidden bg-white shadow-[0_32px_80px_-44px_rgba(15,23,42,0.45)]',
              currentLayout === 'stacked'
                ? 'aspect-[1.56/1] h-[min(92svh,calc((100vw-1rem)/1.56))] w-auto rounded-[1.4rem] border border-[#dde4ee]'
                : 'aspect-[1.34/1] h-[min(90svh,calc((100vw-1rem)/1.34))] w-auto rounded-[2rem] border border-[#dce6f3]'
            )}
          >
            {renderPageLayer(renderedPageData, safeActiveSentenceIndex, true)}
            {overlayPageData
              ? renderPageLayer(
                  overlayPageData,
                  0,
                  false,
                  cn(
                    'z-10 transition-opacity duration-150',
                    showOverlayPage ? 'opacity-100' : 'opacity-0'
                  )
                )
              : null}
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 z-20 hidden -translate-x-1/2 rounded-full border border-white/70 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-lg backdrop-blur lg:flex">
          {activeSentence?.text ||
            t('pictureBookReader.currentSentenceEmpty', {
              defaultValue: 'Tap a sentence to start playback.',
            })}
        </div>

        <div className="absolute inset-x-4 bottom-4 z-20 flex flex-wrap items-center justify-center gap-2 lg:hidden">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(renderedPageData.pageIndex - 1)}
            disabled={!renderedPageData.hasPreviousPage}
            className="rounded-full border-white/70 bg-white/92 px-4 shadow-lg backdrop-blur"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('pictureBookReader.prev', { defaultValue: 'Prev' })}
          </Button>
          <Button
            type="button"
            variant={isPlaying ? 'default' : 'outline'}
            size="sm"
            onClick={() => void handleTogglePlay()}
            disabled={currentSentences.length === 0}
            className="rounded-full px-4 shadow-lg"
          >
            {isPlaying ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
            {isPlaying
              ? t('pictureBookReader.pause', { defaultValue: 'Pause' })
              : t('pictureBookReader.play', { defaultValue: 'Play' })}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(renderedPageData.pageIndex + 1)}
            disabled={!renderedPageData.hasNextPage}
            className="rounded-full border-white/70 bg-white/92 px-4 shadow-lg backdrop-blur"
          >
            {t('pictureBookReader.next', { defaultValue: 'Next' })}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>

        {audioError ? (
          <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full border border-red-200 bg-red-50/95 px-4 py-2 text-sm font-semibold text-red-700 shadow-lg backdrop-blur">
            {audioError}
          </div>
        ) : null}
      </div>
    </div>
  );
}
