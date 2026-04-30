import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { BookOpen, BookMarked, Newspaper, ChevronRight, X, Share2 } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { READING_BOOKS, NEWS, READING_LIBRARY } from '../../utils/convexRefs';
import { MobilePictureBookCard } from './MobilePictureBookCard';
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
import { Card, Chip, HanjaSeal, KT, SectionHead } from './ksoft/ksoft';
import type { EpubLibraryBook } from '../../types/readingLibrary';

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

type TranslationFn = (key: string, options?: Record<string, unknown>) => string;

function getLocaleForReading(language: string) {
  if (language === 'zh') return 'zh-CN';
  if (language === 'vi') return 'vi-VN';
  if (language === 'mn') return 'mn-MN';
  return 'en-US';
}

const clampStyle = (lines: number): React.CSSProperties => ({
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
});

const KsoftEmpty: React.FC<{
  readonly kanji: string;
  readonly title: string;
  readonly description?: string;
  readonly actionLabel?: string;
  readonly onAction?: () => void;
}> = ({ kanji, title, description, actionLabel, onAction }) => (
  <Card pad={18}>
    <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
      <HanjaSeal c={kanji} size={46} bg={KT.bg2} color={KT.sub} round={16} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ color: KT.ink, fontSize: 16, fontWeight: 900 }}>{title}</div>
        {description ? (
          <div style={{ marginTop: 4, color: KT.sub, fontSize: 12, lineHeight: 1.55 }}>
            {description}
          </div>
        ) : null}
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            style={{
              marginTop: 12,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.crimson,
              borderRadius: 999,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 900,
              fontFamily: KT.font,
            }}
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  </Card>
);

const SkeletonCard: React.FC<{ readonly height?: number }> = ({ height = 156 }) => (
  <div
    style={{
      height,
      borderRadius: 28,
      background: `linear-gradient(90deg, ${KT.card} 0%, ${KT.bg2} 52%, ${KT.card} 100%)`,
      border: `1px solid ${KT.line}`,
      boxShadow: KT.shSm,
    }}
  />
);

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
  const myUploads = useQuery(READING_LIBRARY.getMyUploads, user?.id ? {} : 'skip');
  const newsFeed = useQuery(NEWS.getUserFeed, {
    newsLimit: MOBILE_NEWS_LIMIT,
    articleLimit: 8,
  }) as FeedData | undefined;

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
    newsFeed === undefined || (typeof user?.id === 'string' && feedReadyUserId !== user.id);
  const showNewsError = Boolean(user?.id) && feedInitError && newsFeed === undefined;
  const currentPath = `${location.pathname}${location.search}`;
  const privateEpubBooks = useMemo(
    () => (Array.isArray(myUploads) ? myUploads.slice(0, 6) : []),
    [myUploads]
  );

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

  const handleShareBook = async (book: EpubLibraryBook) => {
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
    <div
      className="h-full overflow-y-auto no-scrollbar pb-mobile-nav px-5 pt-5 animate-in fade-in slide-in-from-right-4 duration-300"
      style={{
        background: `radial-gradient(ellipse at 50% 0%, ${KT.bg2} 0%, ${KT.bg} 48%)`,
        color: KT.ink,
        fontFamily: KT.font,
        maxWidth: '100%',
        overflowX: 'hidden',
      }}
    >
      <section className="mb-8">
        <SectionHead
          kanji="冊"
          title={t('readingDiscovery.pictureBooks.title', { defaultValue: 'Storybooks' })}
          action={books.length > 0 ? t('common.viewAll', { defaultValue: 'All' }) : undefined}
          onAction={books.length > 0 ? () => setShowAllBooks(true) : undefined}
        />

        {booksLoading ? (
          <SkeletonCard height={176} />
        ) : books.length === 0 ? (
          <KsoftEmpty
            kanji="空"
            title={t('readingDiscovery.noContent', { defaultValue: 'No stories available yet' })}
            description={t('readingDiscovery.mobile.swipeHint', {
              defaultValue: 'Swipe to browse',
            })}
          />
        ) : (
          <FeaturedReadingBook
            book={books[0]}
            currentPath={currentPath}
            navigate={navigate}
            t={t}
          />
        )}

        {!booksLoading && books.length > 1 ? (
          <div className="-mx-5 mt-4 flex gap-3 overflow-x-auto no-scrollbar px-5 pb-3">
            {books.slice(1, 8).map(book => (
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
        ) : null}
      </section>

      {/* All Books Full-Screen Sheet – rendered via portal to escape stacking context */}
      {showAllBooks &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[70] flex flex-col animate-in slide-in-from-bottom-8 duration-300"
            style={{ background: KT.bg, color: KT.ink, fontFamily: KT.font }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: KT.line2 }} />
            </div>

            {/* Header */}
            <div
              className="shrink-0 px-5 pt-3 pb-3"
              style={{ borderBottom: `1px solid ${KT.line}`, background: KT.bg }}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div
                    className="mb-1 text-[11px] font-bold tracking-[0.24em]"
                    style={{ color: KT.crimson, fontFamily: KT.serif }}
                  >
                    冊 · LIBRARY
                  </div>
                  <h2
                    className="text-2xl font-black tracking-tighter leading-none"
                    style={{ color: KT.ink }}
                  >
                    {t('readingDiscovery.pictureBooks.title', { defaultValue: 'Storybooks' })}
                  </h2>
                  <p className="text-xs font-semibold mt-1" style={{ color: KT.sub }}>
                    {filteredBooks.length} / {books.length}{' '}
                    {t('readingDiscovery.pictureBooks.total', { defaultValue: 'books' })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => setShowAllBooks(false)}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                  style={{ background: KT.card, border: `1px solid ${KT.line}`, color: KT.ink }}
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
                      className="shrink-0 h-8 px-4 rounded-full text-xs font-black tracking-tight transition-all active:scale-95"
                      style={{
                        background: active ? KT.ink : KT.card,
                        color: active ? KT.card : KT.sub,
                        border: `1px solid ${active ? KT.ink : KT.line}`,
                      }}
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
                <div className="py-16 text-center text-sm font-semibold" style={{ color: KT.sub }}>
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
                        style={{ fontFamily: KT.font }}
                      >
                        {/* Cover */}
                        <div
                          className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-sm"
                          style={{ border: `1px solid ${KT.line}`, background: KT.bg2 }}
                        >
                          {coverUrl ? (
                            <img
                              src={coverUrl}
                              alt={book.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div
                              className="w-full h-full flex items-center justify-center"
                              style={{
                                background: `linear-gradient(135deg, ${KT.sky} 0%, ${KT.lilac} 100%)`,
                              }}
                            >
                              <BookMarked className="w-10 h-10" style={{ color: KT.indigo }} />
                            </div>
                          )}
                          {/* Level badge */}
                          {levelNum && (
                            <div
                              className="absolute top-2 left-2 backdrop-blur-sm rounded-lg px-2 py-0.5 shadow-sm"
                              style={{
                                background: `${KT.card}F2`,
                                border: `1px solid ${KT.line}`,
                              }}
                            >
                              <span className="text-[10px] font-black" style={{ color: KT.indigo }}>
                                Lv.{levelNum}
                              </span>
                            </div>
                          )}
                          {/* Hover overlay */}
                          <div className="absolute inset-0 bg-black/0 group-active:bg-black/10 transition-colors" />
                        </div>
                        {/* Title & Author */}
                        <div className="px-0.5">
                          <p
                            className="text-sm font-black leading-snug line-clamp-2 transition-colors"
                            style={{ color: KT.ink }}
                          >
                            {book.title}
                          </p>
                          {book.author && (
                            <p
                              className="text-[10px] font-semibold mt-0.5 truncate"
                              style={{ color: KT.sub }}
                            >
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

      <section className="mb-8">
        <SectionHead
          kanji="庫"
          title={t('readingDiscovery.library.privateLabel', {
            defaultValue: 'Private EPUB Library',
          })}
          action={t('readingDiscovery.library.uploadCta', { defaultValue: 'Upload EPUB' })}
          onAction={() => {
            if (!user?.id) {
              navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`);
              return;
            }
            setShowEpubUploader(true);
          }}
        />

        {epubLoading ? (
          <SkeletonCard height={168} />
        ) : !user?.id ? (
          <KsoftEmpty
            kanji="入"
            title={t('readingDiscovery.library.privateLogin', {
              defaultValue: 'Sign in to see your private EPUB library and create share links.',
            })}
            actionLabel={t('auth.signIn', { defaultValue: 'Sign in' })}
            onAction={() => navigate(`/auth?redirect=${encodeURIComponent(currentPath)}`)}
          />
        ) : privateEpubBooks.length === 0 ? (
          <KsoftEmpty
            kanji="本"
            title={t('readingDiscovery.library.privateEmpty', {
              defaultValue: 'No private EPUBs yet. Upload your first book from the button above.',
            })}
            description={t('readingDiscovery.mobile.privateUploads', {
              defaultValue: 'Only visible to you',
            })}
            actionLabel={t('readingDiscovery.library.uploadCta', { defaultValue: 'Upload EPUB' })}
            onAction={() => setShowEpubUploader(true)}
          />
        ) : (
          <Card pad={0} style={{ overflow: 'hidden' }}>
            {privateEpubBooks.map((book, index) => (
              <EpubShelfRow
                key={book._id}
                book={book}
                isLast={index === privateEpubBooks.length - 1}
                t={t}
                onOpen={() => navigate(buildEpubLibraryPath(book.slug, currentPath))}
                onShare={() => void handleShareBook(book)}
                onDisableShare={() => void handleDisableShare(book._id)}
              />
            ))}
          </Card>
        )}
      </section>

      {showEpubUploader &&
        ReactDOM.createPortal(
          <div
            className="fixed inset-0 z-[70] flex flex-col animate-in slide-in-from-bottom-8 duration-300"
            style={{ background: KT.bg, color: KT.ink, fontFamily: KT.font }}
          >
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full" style={{ background: KT.line2 }} />
            </div>
            <div
              className="shrink-0 px-5 pt-3 pb-3"
              style={{ borderBottom: `1px solid ${KT.line}`, background: KT.bg }}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div
                    className="mb-1 text-[11px] font-bold tracking-[0.24em]"
                    style={{ color: KT.crimson, fontFamily: KT.serif }}
                  >
                    庫 · EPUB
                  </div>
                  <h2
                    className="text-2xl font-black tracking-tighter leading-none"
                    style={{ color: KT.ink }}
                  >
                    {t('readingDiscovery.upload.title', { defaultValue: 'Upload EPUB' })}
                  </h2>
                  <p className="mt-1 text-xs font-semibold" style={{ color: KT.sub }}>
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
                  className="w-10 h-10 rounded-2xl flex items-center justify-center active:scale-95 transition-all"
                  style={{ background: KT.card, border: `1px solid ${KT.line}`, color: KT.ink }}
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

      <section className="space-y-4">
        <SectionHead
          kanji="聞"
          title={t('readingDiscovery.news.title', { defaultValue: 'Live News' })}
        />

        {newsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <SkeletonCard key={i} height={132} />
            ))}
          </div>
        ) : showNewsError ? (
          <KsoftEmpty
            kanji="新"
            title={t('readingDiscovery.news.loadError', {
              defaultValue: 'Unable to load news right now.',
            })}
            actionLabel={t('common.retry', { defaultValue: 'Try Again' })}
            onAction={retryNewsFeed}
          />
        ) : news.length === 0 ? (
          <KsoftEmpty
            kanji="待"
            title={t('readingDiscovery.news.empty', {
              defaultValue: 'Check back soon for new articles.',
            })}
            description={t('readingDiscovery.news.updated', { defaultValue: 'Updated every hour' })}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {news.map((item, index) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={index === 0 ? 'col-span-1' : ''}
              >
                <MobileArticleCard
                  item={item}
                  currentPath={currentPath}
                  language={language}
                  navigate={navigate}
                  t={t}
                />
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const FeaturedReadingBook: React.FC<{
  readonly book: MobilePictureBook;
  readonly currentPath: string;
  readonly navigate: (path: string) => void;
  readonly t: TranslationFn;
}> = ({ book, currentPath, navigate, t }) => {
  const coverUrl = (book.coverImageUrl || book.coverUrl || '').trim();
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(buildPictureBookPath(book.slug, currentPath))}
      aria-label={t('readingDiscovery.pictureBooks.openCard', {
        defaultValue: 'Open storybook {{title}}',
        title: book.title,
      })}
      style={{
        width: '100%',
        textAlign: 'left',
        border: 'none',
        padding: 0,
        background: 'transparent',
        fontFamily: KT.font,
      }}
    >
      <Card pad={16} style={{ overflow: 'hidden', position: 'relative' }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            right: -8,
            top: -14,
            fontFamily: KT.serif,
            fontSize: 86,
            lineHeight: 1,
            color: `${KT.crimson}10`,
            pointerEvents: 'none',
          }}
        >
          讀
        </div>
        <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', position: 'relative' }}>
          <div
            style={{
              width: 104,
              minHeight: 138,
              borderRadius: 22,
              overflow: 'hidden',
              border: `1px solid ${KT.line}`,
              background: `linear-gradient(135deg, ${KT.sky}66, ${KT.lilac}66)`,
              boxShadow: KT.shSm,
              flexShrink: 0,
            }}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={book.title}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div
                style={{ display: 'grid', placeItems: 'center', height: '100%', color: KT.skyDeep }}
              >
                <BookOpen size={36} />
              </div>
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Chip tone="sky">{book.levelLabel || 'Level 1'}</Chip>
              <span
                style={{ color: KT.subLight, fontSize: 10, fontWeight: 800, letterSpacing: 1.4 }}
              >
                READING
              </span>
            </div>
            <h3
              style={{
                color: KT.ink,
                fontSize: 20,
                fontWeight: 950,
                letterSpacing: -0.8,
                lineHeight: 1.15,
                ...clampStyle(3),
              }}
            >
              {book.title}
            </h3>
            {book.author ? (
              <p
                style={{
                  marginTop: 8,
                  color: KT.sub,
                  fontSize: 12,
                  fontWeight: 700,
                  ...clampStyle(1),
                }}
              >
                {book.author}
              </p>
            ) : null}
            <div
              style={{
                marginTop: 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                color: KT.crimson,
                fontSize: 12,
                fontWeight: 950,
              }}
            >
              {t('readingDiscovery.pictureBooks.startReading', { defaultValue: 'Start reading' })}
              <ChevronRight size={15} />
            </div>
          </div>
        </div>
      </Card>
    </motion.button>
  );
};

const EpubShelfRow: React.FC<{
  readonly book: EpubLibraryBook;
  readonly isLast: boolean;
  readonly t: TranslationFn;
  readonly onOpen: () => void;
  readonly onShare: () => void;
  readonly onDisableShare: () => void;
}> = ({ book, isLast, t, onOpen, onShare, onDisableShare }) => {
  const chapterLabel = t('readingDiscovery.library.chapterCount', {
    defaultValue: '{{count}} chapters',
    count: book.chapterCount,
  });

  return (
    <article
      style={{
        display: 'grid',
        gridTemplateColumns: '58px minmax(0, 1fr)',
        gap: 12,
        padding: '14px 14px',
        borderBottom: isLast ? 'none' : `1px solid ${KT.line}`,
        alignItems: 'center',
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={book.title}
        style={{
          width: 58,
          height: 76,
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${KT.line}`,
          background: `linear-gradient(135deg, ${KT.sky}66, ${KT.bg2})`,
          boxShadow: KT.shSm,
          padding: 0,
          display: 'grid',
          placeItems: 'center',
          flexShrink: 0,
        }}
      >
        {book.coverSignedUrlCache ? (
          <img
            src={book.coverSignedUrlCache}
            alt={book.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ fontFamily: KT.serif, color: KT.skyDeep, fontSize: 25 }}>書</span>
        )}
      </button>

      <div style={{ minWidth: 0 }}>
        <button
          type="button"
          onClick={onOpen}
          style={{
            display: 'block',
            width: '100%',
            padding: 0,
            border: 'none',
            background: 'transparent',
            textAlign: 'left',
            fontFamily: KT.font,
          }}
        >
          <div
            style={{
              color: KT.ink,
              fontSize: 15,
              fontWeight: 950,
              letterSpacing: -0.35,
              lineHeight: 1.25,
              ...clampStyle(2),
            }}
          >
            {book.title}
          </div>
          <div
            style={{
              marginTop: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: KT.sub,
              fontSize: 11,
              fontWeight: 750,
              minWidth: 0,
            }}
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {book.author || 'EPUB'}
            </span>
            <span aria-hidden="true">·</span>
            <span style={{ whiteSpace: 'nowrap' }}>{chapterLabel}</span>
          </div>
        </button>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
          <button
            type="button"
            onClick={onShare}
            disabled={!book.canShare}
            style={{
              border: `1px solid ${KT.line}`,
              background: KT.bg,
              color: book.canShare ? KT.crimson : KT.subLight,
              borderRadius: 999,
              padding: '7px 11px',
              fontSize: 11,
              fontWeight: 900,
              fontFamily: KT.font,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              opacity: book.canShare ? 1 : 0.55,
            }}
          >
            <Share2 size={13} />
            {book.shareEnabled
              ? t('readingDiscovery.library.copyShareLink', { defaultValue: 'Copy Link' })
              : t('readingDiscovery.library.shareShort', { defaultValue: 'Share' })}
          </button>
          {book.shareEnabled ? (
            <button
              type="button"
              onClick={onDisableShare}
              style={{
                border: `1px solid ${KT.butter}`,
                background: KT.card,
                color: KT.butterDeep,
                borderRadius: 999,
                padding: '7px 11px',
                fontSize: 11,
                fontWeight: 900,
                fontFamily: KT.font,
              }}
            >
              {t('readingDiscovery.library.stopShareShort', { defaultValue: 'Stop' })}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
};

const MobileArticleCard = ({
  item,
  currentPath,
  language,
  navigate,
  t,
}: {
  item: FeedNewsItem;
  currentPath: string;
  language: string;
  navigate: (path: string) => void;
  t: TranslationFn;
}) => {
  const dateLabel = formatReadingRelativeTime(
    item.publishedAt,
    getLocaleForReading(language),
    t('relativeTime.justNow', { defaultValue: 'Just now' })
  );

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(buildReadingArticlePath(item._id, currentPath))}
      aria-label={'Open news article: ' + item.title}
      style={{
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${KT.line}`,
        background: KT.card,
        borderRadius: 26,
        padding: 16,
        boxShadow: KT.shSm,
        fontFamily: KT.font,
      }}
    >
      <div style={{ display: 'flex', gap: 13, alignItems: 'flex-start' }}>
        <HanjaSeal c="新" size={44} bg={KT.butterDeep} round={15} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
            <Chip
              tone={
                item.difficultyLevel === 'L1'
                  ? 'mint'
                  : item.difficultyLevel === 'L2'
                    ? 'sky'
                    : 'lilac'
              }
            >
              {item.difficultyLevel}
            </Chip>
            <span style={{ color: KT.subLight, fontSize: 10, fontWeight: 850 }}>
              {item.sourceKey || 'News'} · {dateLabel}
            </span>
          </div>
          <h3
            style={{
              marginTop: 9,
              color: KT.ink,
              fontSize: 16,
              fontWeight: 950,
              letterSpacing: -0.35,
              lineHeight: 1.28,
              ...clampStyle(2),
            }}
          >
            {item.title}
          </h3>
          {item.summary ? (
            <p
              style={{
                marginTop: 7,
                color: KT.sub,
                fontSize: 12,
                lineHeight: 1.5,
                fontWeight: 600,
                ...clampStyle(2),
              }}
            >
              {item.summary}
            </p>
          ) : null}
          <div
            style={{
              marginTop: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: `1px solid ${KT.line}`,
              paddingTop: 10,
              color: KT.subLight,
              fontSize: 10,
              fontWeight: 850,
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Newspaper size={12} />
              {Math.max(5, Math.round((item.bodyText?.length || 0) / 95))} words
            </span>
            <span
              style={{ color: KT.crimson, display: 'inline-flex', alignItems: 'center', gap: 3 }}
            >
              Read <ChevronRight size={14} />
            </span>
          </div>
        </div>
      </div>
    </motion.button>
  );
};
