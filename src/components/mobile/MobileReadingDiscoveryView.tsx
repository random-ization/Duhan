import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import {
  BookMarked,
  Newspaper,
  Sparkles,
  ChevronRight,
  X,
  Library,
  Upload,
  Share2,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { READING_BOOKS, NEWS, READING_LIBRARY } from '../../utils/convexRefs';
import { MobilePictureBookCard } from './MobilePictureBookCard';
import { MobileNewsCard } from './MobileNewsCard';
import { EpubUpload } from '../reading/EpubUpload';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import {
  buildEpubLibraryPath,
  buildEpubSharedPath,
  buildPictureBookPath,
  buildReadingArticlePath,
} from '../../utils/readingRoutes';
import { formatReadingRelativeTime } from '../../utils/readingMetadata';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui';
import { notify } from '../../utils/notify';
import { getLocalizedPath } from '../../hooks/useLocalizedNavigate';

interface MobileReadingDiscoveryViewProps {
  readonly active: boolean;
}

type MobilePictureBook = {
  _id: string;
  slug: string;
  title: string;
  author?: string;
  coverImageUrl?: string;
  coverUrl?: string;
  levelLabel?: string;
};

type FeedNewsItem = {
  _id: string;
  sourceKey: string;
  title: string;
  summary?: string;
  bodyText: string;
  publishedAt: number;
  difficultyLevel: 'L1' | 'L2' | 'L3';
};

type FeedData = {
  news: FeedNewsItem[];
};

const MOBILE_NEWS_LIMIT = 3;

function getLocaleForReading(language: string) {
  if (language === 'zh') return 'zh-CN';
  if (language === 'vi') return 'vi-VN';
  if (language === 'mn') return 'mn-MN';
  return 'en-US';
}

export const MobileReadingDiscoveryView: React.FC<MobileReadingDiscoveryViewProps> = ({
  active,
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const language = i18n.language || 'zh';
  const [feedReadyUserId, setFeedReadyUserId] = useState<string | null>(null);
  const [feedInitError, setFeedInitError] = useState(false);
  const [feedInitVersion, setFeedInitVersion] = useState(0);
  const [showAllBooks, setShowAllBooks] = useState(false);
  const [showEpubUploader, setShowEpubUploader] = useState(false);
  const [bookLevelFilter, setBookLevelFilter] = useState<string>('ALL');
  const ensureUserFeed = useMutation(NEWS.ensureUserFeed);

  // --- DATA FETCHING ---
  const pictureBooks = useQuery(READING_BOOKS.listPublishedBooks, {}) as
    | MobilePictureBook[]
    | undefined;
  const myUploads = useQuery(READING_LIBRARY.getMyUploads, user?.id ? {} : 'skip') as
    | Array<any>
    | undefined;
  const newsFeed = useQuery(
    NEWS.getUserFeed,
    !user?.id || feedReadyUserId === user.id
      ? { newsLimit: MOBILE_NEWS_LIMIT, articleLimit: 8 }
      : 'skip'
  ) as FeedData | undefined;

  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    void ensureUserFeed({ newsLimit: MOBILE_NEWS_LIMIT, articleLimit: 8 })
      .then(() => {
        if (!cancelled) setFeedInitError(false);
      })
      .catch(() => {
        if (!cancelled) setFeedInitError(true);
      })
      .finally(() => {
        if (!cancelled) setFeedReadyUserId(user.id);
      });
    return () => {
      cancelled = true;
    };
  }, [ensureUserFeed, user?.id, feedInitVersion]);

  const books = useMemo(() => pictureBooks || [], [pictureBooks]);
  const news = useMemo(() => newsFeed?.news || [], [newsFeed]);
  const booksLoading = pictureBooks === undefined;
  const epubLoading = Boolean(user?.id) && myUploads === undefined;
  const newsLoading =
    !feedInitError && (!user?.id || feedReadyUserId === user.id) && newsFeed === undefined;
  const showNewsError = Boolean(user?.id) && feedInitError;
  const currentPath = `${location.pathname}${location.search}`;
  const privateEpubBooks = useMemo(() => (myUploads || []).slice(0, 6), [myUploads]);

  // Available levels for filter chips
  const availableLevels = useMemo(() => {
    const levels = new Set<string>();
    books.forEach(b => {
      if (b.levelLabel) levels.add(b.levelLabel);
    });
    return Array.from(levels).sort((a, b) => {
      const na = parseInt(a.match(/(\d+)/)?.[1] || '0');
      const nb = parseInt(b.match(/(\d+)/)?.[1] || '0');
      return na - nb;
    });
  }, [books]);

  const filteredBooks = useMemo(
    () => (bookLevelFilter === 'ALL' ? books : books.filter(b => b.levelLabel === bookLevelFilter)),
    [books, bookLevelFilter]
  );

  const retryNewsFeed = () => {
    setFeedReadyUserId(null);
    setFeedInitVersion(prev => prev + 1);
  };

  const ensureShareLink = useMutation(READING_LIBRARY.ensureShareLink);
  const disableShareLink = useMutation(READING_LIBRARY.disableShareLink);

  const buildShareUrl = (slug: string, shareToken: string) => {
    const path = getLocalizedPath(buildEpubSharedPath(slug, shareToken), language);
    return new URL(path, window.location.origin).toString();
  };

  const handleShareBook = async (book: any) => {
    try {
      const result = await ensureShareLink({ bookId: book._id });
      const shareUrl = buildShareUrl(book.slug, result.shareToken);
      if (globalThis.navigator.share) {
        await globalThis.navigator.share({
          title: book.title,
          url: shareUrl,
        });
        return;
      }
      if (globalThis.navigator.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(shareUrl);
        notify.success(
          t('readingDiscovery.library.shareCopied', { defaultValue: 'Share link copied' })
        );
        return;
      }
      notify.info(shareUrl);
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : t('readingDiscovery.library.shareFailed', {
              defaultValue: 'Unable to share this book right now.',
            })
      );
    }
  };

  const handleDisableShare = async (bookId: string) => {
    try {
      await disableShareLink({ bookId });
      notify.success(
        t('readingDiscovery.library.shareDisabled', {
          defaultValue: 'Share link disabled',
        })
      );
    } catch (error) {
      notify.error(
        error instanceof Error
          ? error.message
          : t('readingDiscovery.library.shareDisableFailed', {
              defaultValue: 'Unable to disable sharing right now.',
            })
      );
    }
  };

  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-y-auto no-scrollbar pb-mobile-nav px-6 pt-6 animate-in fade-in slide-in-from-right-4 duration-300">
      {/* 1. Storybooks Section */}
      <section className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-white/10 bg-indigo-500/10 text-indigo-200 shadow-xl rim-light">
              <BookMarked className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-foreground tracking-tighter italic leading-none mb-1">
                {t('readingDiscovery.pictureBooks.title', { defaultValue: 'Storybooks' })}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                {t('readingDiscovery.mobile.swipeHint', { defaultValue: 'Swipe to browse' })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => setShowAllBooks(true)}
            className="flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm active:scale-95 transition-all"
            aria-label={t('readingDiscovery.pictureBooks.viewAll', {
              defaultValue: 'View all storybooks',
            })}
          >
            {t('common.viewAll', { defaultValue: 'All' })}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {booksLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="min-w-[150px] aspect-[10/13] bg-muted animate-pulse rounded-[2rem] border border-border"
              />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="py-12 text-center bg-card rounded-[2.5rem] border border-dashed border-border">
            <p className="text-muted-foreground font-semibold text-sm">
              {t('readingDiscovery.noContent', { defaultValue: 'No stories available yet' })}
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-4">
            {books.map(book => (
              <div key={book._id} className="shrink-0">
                <MobilePictureBookCard
                  title={book.title}
                  author={book.author}
                  coverUrl={book.coverImageUrl || book.coverUrl}
                  level={book.levelLabel || 'Level 1'}
                  ariaLabel={t('readingDiscovery.pictureBooks.openCard', {
                    defaultValue: 'Open storybook {{title}}',
                    title: book.title,
                  })}
                  onClick={() => navigate(buildPictureBookPath(book.slug, currentPath))}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* All Books Full-Screen Sheet – rendered via portal to escape stacking context */}
      {showAllBooks &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-in slide-in-from-bottom-8 duration-300">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="shrink-0 px-5 pt-3 pb-3 border-b border-border bg-background">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tighter italic leading-none">
                    {t('readingDiscovery.pictureBooks.title', { defaultValue: 'Storybooks' })}
                  </h2>
                  <p className="text-xs text-muted-foreground font-semibold mt-1">
                    {filteredBooks.length} / {books.length}{' '}
                    {t('readingDiscovery.pictureBooks.total', { defaultValue: 'books' })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => setShowAllBooks(false)}
                  className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-all"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Level filter chips */}
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {['ALL', ...availableLevels].map(level => {
                  const active = bookLevelFilter === level;
                  const label =
                    level === 'ALL'
                      ? t('common.all', { defaultValue: 'All' })
                      : level.replace('단계', '단계');
                  return (
                    <button
                      key={level}
                      onClick={() => setBookLevelFilter(level)}
                      className={`shrink-0 h-8 px-4 rounded-full text-xs font-black tracking-tight transition-all active:scale-95 ${
                        active
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Book Grid */}
            <div className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
              {filteredBooks.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm font-semibold">
                  {t('readingDiscovery.noContent', { defaultValue: 'No stories available yet' })}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-x-3 gap-y-6">
                  {filteredBooks.map(book => {
                    const coverUrl = (book.coverImageUrl || book.coverUrl || '').trim();
                    const levelNum = book.levelLabel?.match(/(\d+)/)?.[1] ?? '';
                    return (
                      <button
                        key={book._id}
                        onClick={() => {
                          setShowAllBooks(false);
                          navigate(buildPictureBookPath(book.slug, currentPath));
                        }}
                        className="flex flex-col gap-2 text-left group active:scale-95 transition-transform"
                      >
                        {/* Cover */}
                        <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden border border-border bg-muted shadow-sm">
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center">
                              <BookMarked className="w-10 h-10 text-indigo-300" />
                            </div>
                          )}
                          {/* Level badge */}
                          {levelNum && (
                            <div className="absolute top-2 left-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg px-2 py-0.5 shadow-sm border border-border/50">
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400">
                                Lv.{levelNum}
                              </span>
                            </div>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors" />
                        </div>
                        {/* Title & Author */}
                        <div className="px-0.5">
                          <p className="text-sm font-black text-foreground leading-snug line-clamp-2 group-active:text-indigo-600 transition-colors">
                            {book.title}
                          </p>
                          {book.author && (
                            <p className="text-[10px] font-semibold text-muted-foreground mt-0.5 truncate">
                              {book.author}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}

      {/* 2. Global Insights Bento Block */}
      <section className="mb-10">
        <div className="group relative overflow-hidden rounded-[3rem] border border-white/10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-indigo-900 p-8 text-white shadow-2xl rim-light grain-overlay transition-all hover:scale-[1.01]">
          <motion.div
            animate={{
              rotate: [0, 360],
              scale: [1, 1.2, 1],
              x: [0, 10, 0],
            }}
            transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
            className="absolute -right-20 -top-20 h-80 w-80 bg-white/10 rounded-full blur-[100px]"
          />
          <motion.div
            animate={{
              rotate: [-360, 0],
              scale: [1, 1.1, 1],
              y: [0, -20, 0],
            }}
            transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
            className="absolute -left-20 -bottom-20 h-80 w-80 bg-indigo-400/20 rounded-full blur-[100px]"
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-indigo-100 backdrop-blur-md mb-6">
              <Sparkles className="w-3.5 h-3.5 fill-current animate-pulse" />
              {t('readingDiscovery.mobile.globalInsights', { defaultValue: 'Global Insights' })}
            </div>

            <h2 className="text-3xl sm:text-4xl font-black leading-[1.05] italic tracking-tighter mb-4 text-balance drop-shadow-md">
              {t('readingDiscovery.featured.newsTitle', { defaultValue: 'Daily Korean News Feed' })}
            </h2>

            <p className="text-[13px] font-semibold text-indigo-100/70 leading-relaxed max-w-[90%] mb-8">
              {t('readingDiscovery.featured.newsDesc', {
                defaultValue:
                  'AI-curated news from trusted sources. Read, learn, and expand your vocabulary.',
              })}
            </p>

            <div className="flex items-center gap-4">
              <div className="flex -space-x-3">
                {[1, 2, 3].map(i => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-indigo-700 bg-indigo-400 shadow-xl overflow-hidden ring-1 ring-white/10"
                  />
                ))}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-100/90 leading-none mb-1">
                  {t('readingDiscovery.mobile.articlesToday', {
                    defaultValue: '{{count}} Articles Today',
                    count: news.length,
                  })}
                </span>
                <div className="h-1 w-12 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-2/3 rounded-full shadow-[0_0_8px_white]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1.25rem] border border-white/10 bg-sky-500/10 text-sky-200 shadow-xl rim-light">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-black text-xl text-foreground tracking-tighter italic leading-none mb-1">
                {t('readingDiscovery.library.privateLabel', {
                  defaultValue: 'Private EPUB Library',
                })}
              </h3>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60">
                {t('readingDiscovery.mobile.privateUploads', {
                  defaultValue: 'Only visible to you',
                })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="auto"
            onClick={() => {
              if (!user?.id) {
                navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
                return;
              }
              setShowEpubUploader(true);
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground shadow-sm active:scale-95 transition-all"
          >
            <Upload className="h-3.5 w-3.5" />
            {t('readingDiscovery.library.uploadCta', { defaultValue: 'Upload EPUB' })}
          </Button>
        </div>

        {epubLoading ? (
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="min-w-[180px] h-[220px] bg-muted animate-pulse rounded-[2rem] border border-border"
              />
            ))}
          </div>
        ) : !user?.id ? (
          <div className="py-12 text-center bg-card rounded-[2.5rem] border border-dashed border-border">
            <p className="text-muted-foreground font-semibold text-sm">
              {t('readingDiscovery.library.privateLogin', {
                defaultValue: 'Sign in to see your private EPUB library and create share links.',
              })}
            </p>
          </div>
        ) : privateEpubBooks.length === 0 ? (
          <div className="py-12 text-center bg-card rounded-[2.5rem] border border-dashed border-border">
            <p className="text-muted-foreground font-semibold text-sm">
              {t('readingDiscovery.library.privateEmpty', {
                defaultValue: 'No private EPUBs yet. Upload your first book from the button above.',
              })}
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6 pb-4">
            {privateEpubBooks.map(book => (
              <div
                key={book._id}
                className="shrink-0 w-[180px] overflow-hidden rounded-[2rem] border border-border bg-card text-left shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => navigate(buildEpubLibraryPath(book.slug, currentPath))}
                  className="block w-full text-left"
                >
                  {book.coverSignedUrlCache ? (
                    <img
                      src={book.coverSignedUrlCache}
                      alt={book.title}
                      className="h-[180px] w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[180px] items-end bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.22),_transparent_55%),linear-gradient(180deg,_rgba(14,165,233,0.08),_rgba(15,23,42,0.02))] p-4">
                      <h4 className="line-clamp-3 text-lg font-black text-foreground">
                        {book.title}
                      </h4>
                    </div>
                  )}
                  <div className="space-y-1 p-4">
                    <p className="line-clamp-2 text-sm font-black text-foreground">{book.title}</p>
                    <p className="line-clamp-1 text-xs font-semibold text-muted-foreground">
                      {book.author}
                    </p>
                    <p className="text-[11px] font-semibold text-muted-foreground">
                      {t('readingDiscovery.library.chapterCount', {
                        defaultValue: '{{count}} chapters',
                        count: book.chapterCount,
                      })}
                    </p>
                  </div>
                </button>
                <div className="flex gap-2 border-t border-border/70 px-3 py-3">
                  <button
                    type="button"
                    onClick={() => void handleShareBook(book)}
                    disabled={!book.canShare}
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-border px-2 py-2 text-[11px] font-black uppercase tracking-wide text-muted-foreground disabled:opacity-50"
                  >
                    <Share2 className="mr-1.5 h-3.5 w-3.5" />
                    {book.shareEnabled
                      ? t('readingDiscovery.library.copyShareLink', {
                          defaultValue: 'Copy Link',
                        })
                      : t('readingDiscovery.library.shareShort', {
                          defaultValue: 'Share',
                        })}
                  </button>
                  {book.shareEnabled ? (
                    <button
                      type="button"
                      onClick={() => void handleDisableShare(book._id)}
                      className="inline-flex items-center justify-center rounded-xl border border-amber-200 px-2 py-2 text-[11px] font-black uppercase tracking-wide text-amber-700"
                    >
                      {t('readingDiscovery.library.stopShareShort', {
                        defaultValue: 'Stop',
                      })}
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {showEpubUploader &&
        ReactDOM.createPortal(
          <div className="fixed inset-0 z-[70] flex flex-col bg-background animate-in slide-in-from-bottom-8 duration-300">
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="shrink-0 px-5 pt-3 pb-3 border-b border-border bg-background">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-black text-foreground tracking-tighter italic leading-none">
                    {t('readingDiscovery.upload.title', { defaultValue: 'Upload EPUB' })}
                  </h2>
                  <p className="mt-1 text-xs font-semibold text-muted-foreground">
                    {t('readingDiscovery.upload.supportedFormat', {
                      defaultValue:
                        'Supported format: EPUB. The file will be parsed after upload and saved as a draft.',
                    })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => setShowEpubUploader(false)}
                  className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground active:scale-95 transition-all"
                  aria-label={t('common.close', { defaultValue: 'Close' })}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <EpubUpload
                onSuccess={(_bookId, slug) => {
                  setShowEpubUploader(false);
                  navigate(buildEpubLibraryPath(slug, currentPath));
                }}
                onError={() => {
                  // The uploader already renders inline errors.
                }}
              />
            </div>
          </div>,
          document.body
        )}

      {/* 3. News Feed Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-500 shadow-sm dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
            <Newspaper className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-lg text-foreground tracking-tight italic">
              {t('readingDiscovery.news.title', { defaultValue: 'Live News' })}
            </h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {t('readingDiscovery.news.updated', { defaultValue: 'Updated every hour' })}
            </p>
          </div>
        </div>

        {newsLoading ? (
          <div className="space-y-5">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-44 bg-muted animate-pulse rounded-[2.5rem] border border-border"
              />
            ))}
          </div>
        ) : showNewsError ? (
          <div className="py-12 px-8 text-center bg-card rounded-[2.5rem] border border-border">
            <p className="text-sm font-semibold text-muted-foreground mb-4">
              {t('readingDiscovery.news.loadError', {
                defaultValue: 'Unable to load news right now.',
              })}
            </p>
            <Button
              type="button"
              variant="outline"
              size="auto"
              onClick={retryNewsFeed}
              className="h-10 px-6 rounded-xl border-border bg-background text-foreground font-black uppercase tracking-widest text-[10px] shadow-sm"
            >
              {t('common.retry', { defaultValue: 'Try Again' })}
            </Button>
          </div>
        ) : news.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground font-semibold">
            {t('readingDiscovery.news.empty', {
              defaultValue: 'Check back soon for new articles.',
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {news.map((item, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={index === 0 ? 'col-span-1' : ''}
              >
                <MobileReadingItem item={item} language={language} navigate={navigate} t={t} />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

// Helper component for News Card logic
const MobileReadingItem = ({
  item,
  language,
  navigate,
  t,
}: {
  item: FeedNewsItem;
  language: string;
  navigate: (path: string) => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}) => {
  const dateLabel = formatReadingRelativeTime(
    item.publishedAt,
    getLocaleForReading(language),
    t('relativeTime.justNow', { defaultValue: 'Just now' })
  );

  return (
    <MobileNewsCard
      title={item.title}
      source={item.sourceKey || 'News'}
      summary={item.summary}
      difficulty={item.difficultyLevel || 'L2'}
      wordCount={Math.max(5, Math.round((item.bodyText?.length || 0) / 95))}
      dateLabel={dateLabel}
      ariaLabel={'Open news article: ' + item.title}
      onClick={() => navigate(buildReadingArticlePath(item._id, '/reading?tab=reading'))}
    />
  );
};
