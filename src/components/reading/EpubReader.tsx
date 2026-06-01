import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { useParams, useSearchParams } from 'react-router-dom';
import { READING_LIBRARY } from '../../utils/convexRefs';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Loader2, ChevronLeft, Settings, X, BookOpen, ChevronRight } from 'lucide-react';
import { logError, logInfo } from '../../utils/logger';
import { cn } from '../../lib/utils';

type ReaderTheme = 'light' | 'dark' | 'sepia';
type ReaderFontSize = 'small' | 'medium' | 'large' | 'extra-large';
type ReaderLineHeight = 'compact' | 'normal' | 'relaxed';
type EpubRendition = {
  display: (target?: string) => Promise<unknown>;
  next: () => void;
  prev: () => void;
  on: (event: 'relocated' | 'rendered', callback: (payload: EpubLocation) => void) => void;
  themes: {
    register: (name: string, rules: Record<string, Record<string, string>>) => void;
    select: (name: string) => void;
    fontSize: (value: string) => void;
    override: (property: string, value: string) => void;
  };
  hooks: {
    content: {
      register: (callback: (contents: EpubContents) => void) => void;
    };
  };
};
type EpubBook = {
  ready: Promise<unknown>;
  renderTo: (element: HTMLElement, options: Record<string, string | boolean>) => EpubRendition;
  locations: {
    generate: (chars: number) => Promise<unknown>;
    length: () => number;
    percentageFromCfi: (cfi: string) => number;
  };
  destroy: () => void;
};
type EpubLocation = {
  start: {
    cfi: string;
  };
};
type EpubContents = {
  document?: Document;
};

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
  const bookRef = useRef<EpubBook | null>(null);
  const generatedLocationsRef = useRef<string | null>(null);
  const saveProgressTimeoutRef = useRef<number | null>(null);
  const pendingProgressRef = useRef<{ cfi: string; percent: number } | null>(null);
  const lastSavedProgressRef = useRef<{ cfi: string; percent: number } | null>(null);
  const [rendition, setRendition] = useState<EpubRendition | null>(null);

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

  const epubUrl = bookDetail?.epubUrl
    ? (() => {
        // Extract object key from various URL formats
        const originalUrl = bookDetail.epubUrl;
        logInfo('EPUB URL transformation', { originalUrl });

        const url = new URL(originalUrl);
        // Get the pathname and remove leading slash
        const objectKey = url.pathname.startsWith('/') ? url.pathname.slice(1) : url.pathname;
        const proxyUrl = `/epub?key=${encodeURIComponent(objectKey)}`;

        logInfo('EPUB proxy URL constructed', {
          objectKey,
          proxyUrl,
        });

        return proxyUrl;
      })()
    : undefined;

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
      const normalizedPercent = Math.max(0, Math.min(1, percent));
      const lastSaved = lastSavedProgressRef.current;
      if (
        lastSaved &&
        lastSaved.cfi === cfi &&
        Math.abs(lastSaved.percent - normalizedPercent) < 0.002
      ) {
        return;
      }

      pendingProgressRef.current = { cfi, percent: normalizedPercent };

      if (saveProgressTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(saveProgressTimeoutRef.current);
      }

      saveProgressTimeoutRef.current = globalThis.window.setTimeout(() => {
        const pending = pendingProgressRef.current;
        if (!pending) return;

        saveProgress({
          bookId,
          chapterIndex: currentChapter,
          shareToken,
          blockId: pending.cfi, // Use blockId to store CFI for epub.js
          completionPercent: pending.percent * 100,
        })
          .then(() => {
            lastSavedProgressRef.current = pending;
          })
          .catch(error => logError('Failed to save EPUB progress', error));
      }, 700);
    },
    [user?.id, bookId, currentChapter, shareToken, saveProgress]
  );

  // Initialize Book and Rendition
  useEffect(() => {
    if (!epubUrl || !viewerRef.current || bookRef.current) return;

    let isMounted = true;
    logInfo('Initializing epub.js reader', { url: epubUrl });

    void import('epubjs')
      .then(module => {
        if (!isMounted || !viewerRef.current || bookRef.current) return;

        const createEpub = module.default as (url: string) => EpubBook;
        const book = createEpub(epubUrl);
        bookRef.current = book;

        const rendition = book.renderTo(viewerRef.current, {
          width: '100%',
          height: '100%',
          spread: 'none',
          manager: 'default',
          flow: 'paginated',
          allowScriptedContent: false,
        });
        setRendition(rendition);

        const lastCfi = bookDetail?.userProgress?.blockId;
        const displayPromise = lastCfi ? rendition.display(lastCfi) : rendition.display();
        displayPromise.catch(_err => {
          logError('Failed to display EPUB location', _err);
          rendition.display().catch(innerErr => logError('Failed to display EPUB start', innerErr));
        });

        book.ready
          .then(() => {
            if (!isMounted) return;
            setIsBooting(false);

            const scheduleGenerateLocations = () => {
              if (!isMounted || generatedLocationsRef.current === epubUrl) return;
              generatedLocationsRef.current = epubUrl;
              book.locations
                .generate(1600)
                .then(() => {
                  if (!isMounted) return;
                  logInfo('EPUB locations generated', { length: book.locations.length() });
                })
                .catch((_err: unknown) => {
                  generatedLocationsRef.current = null;
                  logError('EPUB locations generation error', _err);
                });
            };

            const idleWindow = globalThis.window as Window & {
              requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
            };

            if (idleWindow.requestIdleCallback) {
              idleWindow.requestIdleCallback(scheduleGenerateLocations, { timeout: 1500 });
            } else {
              globalThis.window.setTimeout(scheduleGenerateLocations, 300);
            }
          })
          .catch((_err: unknown) => {
            logError('Failed to initialize EPUB reader', _err);
            if (isMounted) {
              setIsBooting(false);
            }
          });

        rendition.on('relocated', location => {
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
      })
      .catch(_err => {
        logError('Failed to load epub.js dynamically', _err);
        if (isMounted) {
          setIsBooting(false);
        }
      });
    return () => {
      isMounted = false;
      if (saveProgressTimeoutRef.current !== null) {
        globalThis.window.clearTimeout(saveProgressTimeoutRef.current);
        saveProgressTimeoutRef.current = null;
      }
      if (bookRef.current) {
        bookRef.current.destroy();
        bookRef.current = null;
      }
      setRendition(null);
    };
  }, [epubUrl, bookDetail?.userProgress?.blockId, handleProgressSave]);

  // Apply Theme & Style Settings
  useEffect(() => {
    if (!rendition) return;

    logInfo('Applying EPUB styles', {
      theme: readerSettings.theme,
      fontSize: readerSettings.fontSize,
    });

    // Register themes if not already
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

    // Update injected styles in hooks if any
    rendition.hooks.content.register(contents => {
      const doc = contents?.document as Document | undefined;
      if (!doc) return;
      const styleTag = doc.getElementById('epub-reader-custom-style') || doc.createElement('style');
      styleTag.id = 'epub-reader-custom-style';
      styleTag.textContent = `
        html, body {
          background: ${readerSettings.theme === 'dark' ? '#09090b' : readerSettings.theme === 'sepia' ? '#f8f1df' : '#f8fafc'} !important;
          overflow: hidden !important;
        }
      `;
      if (!styleTag.parentElement) doc.head.appendChild(styleTag);
    });
  }, [rendition, readerSettings]);

  const handleNextPage = useCallback(() => {
    rendition?.next();
  }, [rendition]);

  const handlePrevPage = useCallback(() => {
    rendition?.prev();
  }, [rendition]);

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
      <div className="flex min-h-screen items-center justify-center bg-k-bg">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-k-crimson" />
          <p className="text-[14px] font-black text-k-sub uppercase tracking-widest">
            同步书籍数据...
          </p>
        </div>
      </div>
    );
  }

  if (!bookDetail) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-k-bg px-6">
        <div className="max-w-md rounded-[40px] border border-k-line/10 bg-k-card p-10 text-center shadow-k-sh-lg">
          <div className="w-16 h-16 rounded-full bg-k-bg2 flex items-center justify-center mx-auto mb-6">
            <BookOpen className="h-8 w-8 text-k-sub/40" />
          </div>
          <h1 className="text-[20px] font-black text-k-ink mb-3">
            {t('readingDiscovery.reader.notFoundTitle', { defaultValue: '书籍未找到' })}
          </h1>
          <p className="text-[14px] font-medium text-k-sub leading-relaxed mb-8">
            {t('readingDiscovery.reader.notFoundBody', {
              defaultValue: '该电子书可能已被移除，或者您没有访问权限。',
            })}
          </p>
          <button
            type="button"
            onClick={() => navigate('/reading')}
            className="w-full py-3 rounded-2xl bg-k-ink text-k-bg text-[13px] font-black hover:bg-k-crimson transition-all"
          >
            返回发现页
          </button>
        </div>
      </div>
    );
  }

  const { book } = bookDetail;

  return (
    <div className={cn('min-h-screen flex flex-col transition-all duration-500', theme.page)}>
      {/* Editorial Header */}
      <header
        className={cn(
          'sticky top-0 z-40 shrink-0 border-b backdrop-blur-xl transition-colors duration-500',
          theme.panel
        )}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-8 py-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/reading')}
              className="group flex items-center gap-2 text-[12px] font-black text-k-sub hover:text-k-ink transition-colors"
            >
              <div className="w-8 h-8 rounded-full border border-k-line/10 flex items-center justify-center group-hover:bg-k-ink group-hover:text-k-bg transition-all">
                <ChevronLeft size={16} />
              </div>
              <span className="hidden sm:inline">退出</span>
            </button>

            <div className="h-4 w-px bg-k-line/10" />

            <div className="min-w-0">
              <h1 className="truncate text-[15px] font-black text-k-ink tracking-tight mb-0.5">
                {book.title}
              </h1>
              <div className="flex items-center gap-2 opacity-60">
                <span className="text-[10px] font-black uppercase tracking-widest text-k-crimson font-k-serif">
                  EPUB
                </span>
                <span className="text-[12px] font-bold text-k-sub truncate">{book.author}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-4 px-4 py-1.5 rounded-full bg-k-ink/5 border border-k-line/5">
              <span className="text-[11px] font-black text-k-sub uppercase tracking-wider">
                进度 {Math.round(completionPercent * 100)}%
              </span>
              <div className="w-24 h-1 rounded-full bg-k-ink/10 overflow-hidden">
                <div
                  className="h-full bg-k-crimson transition-all duration-500"
                  style={{ width: `${Math.round(completionPercent * 100)}%` }}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSettings(current => !current)}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                showSettings ? 'bg-k-ink text-k-bg' : 'hover:bg-k-line/10 text-k-ink'
              )}
            >
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 min-h-0 mx-auto w-full max-w-[1200px] px-8 py-8 flex flex-col gap-8">
        {showSettings && (
          <div
            className="fixed inset-0 z-[60] bg-k-ink/5 backdrop-blur-sm"
            onClick={() => setShowSettings(false)}
          >
            <div
              className={cn(
                'absolute top-24 right-8 w-80 rounded-[32px] border shadow-k-sh-lg p-6 animate-in slide-in-from-top-4 duration-300',
                theme.panel
              )}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-k-crimson">
                  {t('readingDiscovery.reader.settings.title', { defaultValue: 'Reader Settings' })}
                </h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-k-line/10 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="mb-3 text-[12px] font-black uppercase tracking-wider text-k-sub opacity-60">
                    {t('readingDiscovery.reader.settings.fontSize', { defaultValue: 'Font size' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(['small', 'medium', 'large', 'extra-large'] as ReaderFontSize[]).map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setReaderSettings(prev => ({ ...prev, fontSize: size }))}
                        className={cn(
                          'flex-1 rounded-xl border py-2.5 text-[11px] font-black transition-all',
                          readerSettings.fontSize === size
                            ? 'border-k-ink bg-k-ink text-k-bg'
                            : 'border-k-line/10 hover:border-k-ink/40'
                        )}
                      >
                        {size === 'small'
                          ? 'A-'
                          : size === 'medium'
                            ? '标准'
                            : size === 'large'
                              ? 'A+'
                              : 'A++'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[12px] font-black uppercase tracking-wider text-k-sub opacity-60">
                    {t('readingDiscovery.reader.settings.theme', { defaultValue: 'Theme' })}
                  </p>
                  <div className="grid grid-cols-3 gap-3">
                    {(['light', 'sepia', 'dark'] as ReaderTheme[]).map(themeValue => (
                      <button
                        key={themeValue}
                        type="button"
                        onClick={() => setReaderSettings(prev => ({ ...prev, theme: themeValue }))}
                        className={cn(
                          'aspect-square rounded-2xl border-2 transition-all flex flex-col items-center justify-center gap-1.5',
                          themeValue === 'light'
                            ? 'bg-white text-zinc-900 border-zinc-100'
                            : themeValue === 'sepia'
                              ? 'bg-[#f8f1df] text-[#4b3521] border-[#e8dfc8]'
                              : 'bg-zinc-950 text-zinc-100 border-zinc-800',
                          readerSettings.theme === themeValue && 'border-k-crimson scale-105'
                        )}
                      >
                        <div className="w-4 h-4 rounded-full border border-current flex items-center justify-center">
                          {readerSettings.theme === themeValue && (
                            <div className="w-2 h-2 rounded-full bg-current" />
                          )}
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {themeValue}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isBooting && (
          <div className="absolute inset-0 flex items-center justify-center bg-k-bg/40 backdrop-blur-md z-10 rounded-[40px]">
            <div className="text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-k-crimson" />
              <p className="text-[13px] font-black text-k-sub uppercase tracking-[0.2em]">
                正在排版书籍...
              </p>
            </div>
          </div>
        )}

        <div className="flex-1 w-full h-full relative group">
          {/* Main Viewer */}
          <div className="absolute inset-0 rounded-[40px] overflow-hidden shadow-k-sh-lg border border-k-line/5 bg-k-card">
            <div
              ref={viewerRef}
              className="absolute inset-0 transition-opacity duration-700"
              style={{ opacity: isBooting ? 0 : 1 }}
            />

            {/* Navigation overlays */}
            <div
              onClick={handlePrevPage}
              className="absolute left-0 top-0 bottom-0 w-[15%] z-20 cursor-pointer flex items-center justify-center group/nav"
            >
              <div className="w-12 h-12 rounded-full bg-k-ink/5 flex items-center justify-center opacity-0 group-hover/nav:opacity-100 transition-all -translate-x-4 group-hover/nav:translate-x-0">
                <ChevronLeft size={24} />
              </div>
            </div>
            <div
              onClick={handleNextPage}
              className="absolute right-0 top-0 bottom-0 w-[15%] z-20 cursor-pointer flex items-center justify-center group/nav"
            >
              <div className="w-12 h-12 rounded-full bg-k-ink/5 flex items-center justify-center opacity-0 group-hover/nav:opacity-100 transition-all translate-x-4 group-hover/nav:translate-x-0">
                <ChevronRight size={24} />
              </div>
            </div>
          </div>

          {/* Mobile indicator */}
          <div className="absolute -bottom-10 inset-x-0 flex justify-center lg:hidden">
            <span className="text-[10px] font-bold text-k-sub/40 uppercase tracking-widest">
              点击屏幕左右两侧翻页
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
