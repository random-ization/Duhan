import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useParams, useSearchParams } from 'react-router-dom';
import { READING_LIBRARY } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, Settings, X, BookOpen } from 'lucide-react';
import { logError, logInfo } from '../../utils/logger';
import ePub from 'epubjs';

type ReaderTheme = 'light' | 'dark' | 'sepia';
type ReaderFontSize = 'small' | 'medium' | 'large' | 'extra-large';
type ReaderLineHeight = 'compact' | 'normal' | 'relaxed';

export const EpubReader: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const { user } = useAuth();
  const saveProgress = useMutation(READING_LIBRARY.saveProgress);
  const shareToken = searchParams.get('token') || undefined;

  // epub.js refs
  const viewerRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<any>(null);
  const renditionRef = useRef<any>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [readerSettings, setReaderSettings] = useState<{
    fontSize: ReaderFontSize;
    theme: ReaderTheme;
    lineHeight: ReaderLineHeight;
  }>({
    fontSize: 'medium',
    theme: 'light',
    lineHeight: 'normal',
  });

  const [isBooting, setIsBooting] = useState(true);
  const [completionPercent, setCompletionPercent] = useState(0);

  const bookDetail = useQuery(READING_LIBRARY.getBookDetail, slug ? { slug, shareToken } : 'skip');
  const bookId = bookDetail?.book?._id;
  const currentChapter = bookDetail?.userProgress?.chapterIndex ?? 0;

  const epubUrl = bookDetail?.epubUrl;

  // Debug logging
  useEffect(() => {
    logInfo('EPUB direct URL status', {
      bookId,
      hasEpubUrl: !!epubUrl,
    });
  }, [bookId, epubUrl]);

  const handleProgressSave = useCallback(
    (cfi: string, percent: number) => {
      if (!user?.id || !bookId || !cfi) return;
      saveProgress({
        bookId,
        chapterIndex: currentChapter,
        shareToken,
        blockId: cfi, // Use blockId to store CFI for epub.js
        completionPercent: percent * 100,
      }).catch(error => logError('Failed to save EPUB progress', error));
    },
    [user?.id, bookId, currentChapter, shareToken, saveProgress]
  );

  // Initialize Book and Rendition
  useEffect(() => {
    if (!epubUrl || !viewerRef.current || bookRef.current) return;

    logInfo('Initializing epub.js reader', { url: epubUrl });

    let isMounted = true;

    const book = ePub(epubUrl);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current!, {
      width: '100%',
      height: '100%',
      spread: 'none',
      manager: 'default',
      flow: 'paginated',
      allowScriptedContent: false,
    });
    renditionRef.current = rendition;

    rendition.hooks.content.register((contents: any) => {
      const doc = contents?.document as Document | undefined;
      if (!doc) return;

      const styleTag = doc.createElement('style');
      styleTag.textContent = `
        html, body {
          background: ${readerSettings.theme === 'dark' ? '#09090b' : readerSettings.theme === 'sepia' ? '#f8f1df' : '#f8fafc'} !important;
          overflow: hidden !important;
        }
        body {
          margin: 0 !important;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        img, svg, canvas {
          max-width: 100% !important;
          height: auto !important;
          page-break-inside: avoid !important;
          break-inside: avoid !important;
          background: transparent !important;
        }
        * {
          animation: none !important;
          transition: none !important;
        }
      `;
      doc.head.appendChild(styleTag);
    });

    const lastCfi = bookDetail?.userProgress?.blockId;
    const displayPromise = lastCfi ? rendition.display(lastCfi) : rendition.display();
    displayPromise.catch(err => {
      logError('Failed to display EPUB location', err);
      rendition.display().catch(innerErr => logError('Failed to display EPUB start', innerErr));
    });

    book.ready
      .then(() => {
        if (!isMounted) return;
        setIsBooting(false);

        setTimeout(() => {
          book.locations
            .generate(1600)
            .then(() => {
              if (!isMounted) return;
              logInfo('EPUB locations generated', { length: book.locations.length() });
            })
            .catch((err: any) => {
              logError('EPUB locations generation error', err);
            });
        }, 0);
      })
      .catch((err: any) => {
        logError('Failed to initialize EPUB reader', err);
        if (isMounted) {
          setIsBooting(false);
        }
      });

    rendition.on('relocated', (location: any) => {
      if (!isMounted) return;
      if (book.locations.length() > 0) {
        const percent = book.locations.percentageFromCfi(location.start.cfi);
        setCompletionPercent(percent);
        handleProgressSave(location.start.cfi, percent);
      }
    });

    rendition.on('rendered', () => {
      if (!isMounted) return;
      setIsBooting(false);
    });

    return () => {
      isMounted = false;
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
      }
      renditionRef.current = null;
    };
  }, [epubUrl, bookDetail?.userProgress?.blockId, handleProgressSave, readerSettings.theme]);

  // Apply Theme Settings
  useEffect(() => {
    const rendition = renditionRef.current;
    if (!rendition) return;

    rendition.themes.register('light', {
      body: { background: '#f8fafc', color: '#18181b' },
      a: { color: '#1d4ed8' },
    });
    rendition.themes.register('dark', {
      body: { background: '#09090b', color: '#f4f4f5' },
      a: { color: '#93c5fd' },
    });
    rendition.themes.register('sepia', {
      body: { background: '#f8f1df', color: '#4b3521' },
      a: { color: '#92400e' },
    });
    rendition.themes.select(readerSettings.theme);

    let fontSizePx = '18px';
    if (readerSettings.fontSize === 'small') fontSizePx = '14px';
    if (readerSettings.fontSize === 'large') fontSizePx = '22px';
    if (readerSettings.fontSize === 'extra-large') fontSizePx = '26px';
    rendition.themes.fontSize(fontSizePx);

    let lineH = '1.6';
    if (readerSettings.lineHeight === 'compact') lineH = '1.3';
    if (readerSettings.lineHeight === 'relaxed') lineH = '2.0';
    rendition.themes.override('line-height', lineH);
  }, [readerSettings]);

  const handleNextPage = useCallback(() => {
    renditionRef.current?.next();
  }, []);

  const handlePrevPage = useCallback(() => {
    renditionRef.current?.prev();
  }, []);

  const getThemeClasses = () => {
    if (readerSettings.theme === 'dark') {
      return {
        page: 'bg-zinc-950 text-zinc-100',
        panel: 'border-zinc-800 bg-zinc-900/95',
        panelMuted: 'text-zinc-400',
      };
    }
    if (readerSettings.theme === 'sepia') {
      return {
        page: 'bg-[#f8f1df] text-[#4b3521]',
        panel: 'border-amber-200 bg-[#f4ead1]/95',
        panelMuted: 'text-amber-700/80',
      };
    }
    return {
      page: 'bg-[#f6f7fb] text-zinc-900',
      panel: 'border-border bg-background/95',
      panelMuted: 'text-muted-foreground',
    };
  };

  const theme = getThemeClasses();
  const isBookLoading = slug ? bookDetail === undefined : false;

  if (isBookLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb]">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground mt-4">Loading book data...</p>
        </div>
      </div>
    );
  }

  if (!bookDetail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6">
        <div className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h1 className="text-xl font-black text-foreground">
            {t('readingDiscovery.reader.notFoundTitle', { defaultValue: 'Book not found' })}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('readingDiscovery.reader.notFoundBody', {
              defaultValue: 'This EPUB is unavailable or you do not have access to it.',
            })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="mt-6 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {t('readingDiscovery.reader.backToReading', { defaultValue: 'Back to Reading' })}
          </button>
        </div>
      </div>
    );
  }

  if (!epubUrl) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f7fb] px-6">
        <div className="max-w-md rounded-3xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
          <X className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="text-xl font-black text-foreground">Failed to Load EPUB File</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The book was found, but the EPUB file could not be downloaded. It might exceed the
            allowed size limits or have an invalid format.
          </p>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="mt-6 rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
          >
            {t('readingDiscovery.reader.backToReading', { defaultValue: 'Back to Reading' })}
          </button>
        </div>
      </div>
    );
  }

  const { book } = bookDetail;

  return (
    <div className={`min-h-screen flex flex-col transition-colors ${theme.page}`}>
      <header className={`sticky top-0 z-40 shrink-0 border-b backdrop-blur ${theme.panel}`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/reading')}
              className="rounded-full p-2 transition hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-base font-black">{book.title}</h1>
              <p className={`truncate text-sm ${theme.panelMuted}`}>{book.author}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSettings(current => !current)}
              className="rounded-full p-2 transition hover:bg-muted"
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <div className={`mb-1 flex items-center justify-between text-xs ${theme.panelMuted}`}>
            <span>EPUB Reader</span>
            <span>
              {t('readingDiscovery.reader.completion', {
                defaultValue: '{{percent}}% complete',
                percent: Math.round(completionPercent * 100),
              })}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-black/10">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.round(completionPercent * 100)}%` }}
            />
          </div>
        </div>
      </header>

      <main className="relative flex-1 min-h-0 mx-auto w-full max-w-4xl px-4 py-6 flex flex-col">
        {showSettings ? (
          <section
            className={`absolute top-4 right-4 z-50 w-72 rounded-3xl border shadow-2xl p-5 ${theme.panel}`}
          >
            <h2 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-primary">
              {t('readingDiscovery.reader.settings.title', { defaultValue: 'Reader Settings' })}
            </h2>
            <div className="space-y-4">
              <div>
                <p className="mb-2 text-sm font-semibold">
                  {t('readingDiscovery.reader.settings.fontSize', { defaultValue: 'Font size' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['small', 'medium', 'large', 'extra-large'] as ReaderFontSize[]).map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setReaderSettings(prev => ({ ...prev, fontSize: size }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                        readerSettings.fontSize === size
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border'
                      }`}
                    >
                      {t(`readingDiscovery.reader.settings.fontSizes.${size}`, {
                        defaultValue: size,
                      })}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold">
                  {t('readingDiscovery.reader.settings.theme', { defaultValue: 'Theme' })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(['light', 'sepia', 'dark'] as ReaderTheme[]).map(themeValue => (
                    <button
                      key={themeValue}
                      type="button"
                      onClick={() => setReaderSettings(prev => ({ ...prev, theme: themeValue }))}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                        readerSettings.theme === themeValue
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border'
                      }`}
                    >
                      {t(`readingDiscovery.reader.settings.themes.${themeValue}`, {
                        defaultValue: themeValue,
                      })}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              className="mt-4 w-full text-xs text-center p-2 rounded-full bg-muted text-muted-foreground"
              onClick={() => setShowSettings(false)}
            >
              Close
            </button>
          </section>
        ) : null}

        {isBooting && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">Loading EPUB...</p>
            </div>
          </div>
        )}

        <div className="flex-1 w-full h-full relative border border-border/50 shadow-sm rounded-xl overflow-hidden bg-card">
          <div ref={viewerRef} className="absolute inset-0 bg-card" />

          {/* Overlay click areas for page flipping */}
          <div
            onClick={handlePrevPage}
            className="absolute left-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer [webkit-tap-highlight-color:transparent] hover:bg-black/5 transition-colors"
            title="Previous Page"
          />
          <div
            onClick={handleNextPage}
            className="absolute right-0 top-0 bottom-0 w-1/4 z-20 cursor-pointer [webkit-tap-highlight-color:transparent] hover:bg-black/5 transition-colors"
            title="Next Page"
          />
        </div>
      </main>
    </div>
  );
};
