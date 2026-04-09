import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import {
  BookMarked,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  Library,
  Loader2,
  Share2,
  Upload,
} from 'lucide-react';
import { READING_LIBRARY } from '../../utils/convexRefs';
import { EpubUpload } from './EpubUpload';
import type { EpubLibraryBook } from '../../types/readingLibrary';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notify';
import { getLocalizedPath } from '../../hooks/useLocalizedNavigate';
import { buildEpubSharedPath } from '../../utils/readingRoutes';

type WikiSpotlightItem = {
  id: string;
  title: string;
  excerpt: string;
  publishedAt?: number;
  sourceLabel?: string;
};

interface ReadingDiscoverySectionProps {
  wikiArticles: WikiSpotlightItem[];
  wikiLoading?: boolean;
  onViewBook: (slug: string) => void;
  onViewWiki: (id: string) => void;
}

function formatStatus(
  status: string,
  t: (key: string, options?: Record<string, unknown>) => string
) {
  const keyMap: Record<string, string> = {
    DRAFT_UPLOADED: 'draftUploaded',
    PROCESSING: 'processing',
    READY_FOR_REVIEW: 'readyForReview',
    IN_REVIEW: 'inReview',
    PUBLISHED: 'published',
    REJECTED: 'rejected',
    PROCESSING_FAILED: 'processingFailed',
  };
  const suffix = keyMap[status];
  if (!suffix) {
    return status.replaceAll('_', ' ').toLowerCase();
  }
  return t(`readingDiscovery.library.status.${suffix}`, {
    defaultValue: status.replaceAll('_', ' ').toLowerCase(),
  });
}

export const ReadingDiscoverySection: React.FC<ReadingDiscoverySectionProps> = ({
  wikiArticles,
  wikiLoading = false,
  onViewBook,
  onViewWiki,
}) => {
  const { user } = useAuth();
  const [currentWikiIndex, setCurrentWikiIndex] = useState(0);
  const [showUploader, setShowUploader] = useState(false);
  const [showMyUploads, setShowMyUploads] = useState(false);
  const { t, i18n } = useTranslation();

  const myUploads = useQuery(READING_LIBRARY.getMyUploads, user?.id ? {} : 'skip');
  const ensureShareLink = useMutation(READING_LIBRARY.ensureShareLink);
  const disableShareLink = useMutation(READING_LIBRARY.disableShareLink);
  const deleteBook = useMutation(READING_LIBRARY.deleteBook);

  const visibleWikiArticles = wikiArticles.slice(0, Math.max(1, wikiArticles.length));
  const currentWiki = visibleWikiArticles[currentWikiIndex] || null;
  const isPrivateShelfLoading = Boolean(user?.id) && myUploads === undefined;
  const isMyUploadsLoading = showMyUploads && isPrivateShelfLoading;

  const nextWiki = () => {
    if (visibleWikiArticles.length <= 1) return;
    setCurrentWikiIndex(current => (current + 1) % visibleWikiArticles.length);
  };

  const prevWiki = () => {
    if (visibleWikiArticles.length <= 1) return;
    setCurrentWikiIndex(
      current => (current - 1 + visibleWikiArticles.length) % visibleWikiArticles.length
    );
  };

  const myBooks = useMemo(() => (Array.isArray(myUploads) ? myUploads : []), [myUploads]);
  const privateBooks = useMemo(() => myBooks.slice(0, 6), [myBooks]);

  const buildShareUrl = (slug: string, shareToken: string) => {
    const path = getLocalizedPath(buildEpubSharedPath(slug, shareToken), i18n.language || 'zh');
    return new URL(path, window.location.origin).toString();
  };

  const handleShare = async (book: any) => {
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-black text-foreground">
            {t('readingDiscovery.library.title', { defaultValue: 'Classic Reading' })}
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            {t('readingDiscovery.library.subtitle', {
              defaultValue:
                'One rotating Wikipedia spotlight, plus community EPUB uploads with personal drafts and review flow.',
            })}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setShowMyUploads(current => !current)}
            className="inline-flex items-center rounded-2xl border border-border bg-background px-4 py-2 text-sm font-bold text-foreground transition hover:bg-muted"
          >
            <Library className="mr-2 h-4 w-4" />
            {t('readingDiscovery.library.myUploads', { defaultValue: 'My Uploads' })}
          </button>
          <button
            type="button"
            onClick={() => setShowUploader(current => !current)}
            className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
          >
            <Upload className="mr-2 h-4 w-4" />
            {t('readingDiscovery.library.uploadCta', { defaultValue: 'Upload EPUB' })}
          </button>
        </div>
      </div>

      {showUploader ? (
        <EpubUpload
          onSuccess={() => {
            setShowUploader(false);
            setShowMyUploads(true);
          }}
        />
      ) : null}

      {showMyUploads ? (
        <section className="rounded-3xl border border-border bg-card/90 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-foreground">
                {t('readingDiscovery.library.myUploads', { defaultValue: 'My Uploads' })}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('readingDiscovery.library.myUploadsSubtitle', {
                  defaultValue:
                    'Drafts, processing jobs, rejected submissions, and published EPUBs.',
                })}
              </p>
            </div>
          </div>

          {isMyUploadsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : myBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('readingDiscovery.library.emptyMyUploads', {
                defaultValue: 'You have not uploaded any EPUBs yet.',
              })}
            </p>
          ) : (
            <div className="space-y-4">
              {myBooks.map((book: any) => (
                <div
                  key={book._id}
                  className="flex flex-col gap-4 rounded-2xl border border-border bg-background/80 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-black text-foreground">
                        {book.title}
                      </h4>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                        {formatStatus(book.status, t)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {book.author} ·{' '}
                      {t('readingDiscovery.library.chapterCount', {
                        defaultValue: '{{count}} chapters',
                        count: book.chapterCount || 0,
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {book.canRead ? (
                      <button
                        type="button"
                        onClick={() => onViewBook(book.slug)}
                        className="rounded-2xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted"
                      >
                        {t('readingDiscovery.library.openReader', { defaultValue: 'Open Reader' })}
                      </button>
                    ) : null}
                    {book.canShare ? (
                      <button
                        type="button"
                        onClick={() => void handleShare(book)}
                        className="rounded-2xl bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                      >
                        <Share2 className="mr-2 inline h-4 w-4" />
                        {t('readingDiscovery.library.shareLink', {
                          defaultValue: 'Share Link',
                        })}
                      </button>
                    ) : null}
                    {book.shareEnabled ? (
                      <button
                        type="button"
                        onClick={() => void handleDisableShare(book._id)}
                        className="rounded-2xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                      >
                        {t('readingDiscovery.library.stopSharing', {
                          defaultValue: 'Stop Sharing',
                        })}
                      </button>
                    ) : null}
                    {book.status !== 'PUBLISHED' ? (
                      <button
                        type="button"
                        onClick={() => void deleteBook({ bookId: book._id })}
                        className="rounded-2xl border border-red-200 px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        {t('common.delete', { defaultValue: 'Delete' })}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.15fr,1.85fr]">
        <section className="rounded-[2rem] border border-border bg-card/90 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                {t('readingDiscovery.library.wikipediaSpotlight', {
                  defaultValue: 'Wikipedia Spotlight',
                })}
              </p>
              <h3 className="mt-1 text-xl font-black text-foreground">
                {t('readingDiscovery.library.wikipediaTitle', {
                  defaultValue: 'Featured archive pick',
                })}
              </h3>
            </div>
            {visibleWikiArticles.length > 1 ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={prevWiki}
                  aria-label={t('readingDiscovery.library.previousSpotlight', {
                    defaultValue: 'Previous spotlight',
                  })}
                  className="rounded-full border border-border p-2 transition hover:bg-muted"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={nextWiki}
                  aria-label={t('readingDiscovery.library.nextSpotlight', {
                    defaultValue: 'Next spotlight',
                  })}
                  className="rounded-full border border-border p-2 transition hover:bg-muted"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </div>

          {wikiLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : currentWiki ? (
            <div className="rounded-[1.75rem] border border-border bg-background/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                <BookMarked className="h-4 w-4 text-primary" />
                {currentWiki.sourceLabel ||
                  t('readingDiscovery.library.wikipediaSourceFallback', {
                    defaultValue: 'Wikipedia',
                  })}
              </div>
              <h4 className="text-2xl font-black text-foreground">{currentWiki.title}</h4>
              <p className="mt-3 line-clamp-6 text-sm leading-7 text-muted-foreground">
                {currentWiki.excerpt}
              </p>
              <div className="mt-5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  {currentWiki.publishedAt
                    ? new Date(currentWiki.publishedAt).toLocaleDateString(
                        i18n.language === 'zh' ? 'zh-CN' : undefined
                      )
                    : t('readingDiscovery.library.featuredToday', {
                        defaultValue: 'Featured today',
                      })}
                </div>
                <button
                  type="button"
                  onClick={() => onViewWiki(currentWiki.id)}
                  className="inline-flex items-center rounded-2xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  {t('readingDiscovery.library.read', { defaultValue: 'Read' })}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('readingDiscovery.library.wikipediaEmpty', {
                defaultValue: 'No Wikipedia spotlight is available yet.',
              })}
            </p>
          )}
        </section>

        <section className="rounded-[2rem] border border-border bg-card/90 p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary">
                {t('readingDiscovery.library.privateLabel', {
                  defaultValue: 'Private EPUB Library',
                })}
              </p>
              <h3 className="mt-1 text-xl font-black text-foreground">
                {t('readingDiscovery.library.privateTitle', {
                  defaultValue: 'Only visible to you and people you share with',
                })}
              </h3>
            </div>
          </div>

          {!user?.id ? (
            <p className="text-sm text-muted-foreground">
              {t('readingDiscovery.library.privateLogin', {
                defaultValue: 'Sign in to see your private EPUB library and create share links.',
              })}
            </p>
          ) : isPrivateShelfLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : privateBooks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('readingDiscovery.library.privateEmpty', {
                defaultValue: 'No private EPUBs yet. Upload your first book from the button above.',
              })}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {privateBooks.map((book: EpubLibraryBook & { coverSignedUrlCache?: string }) => (
                <div
                  key={book._id}
                  className="overflow-hidden rounded-[1.75rem] border border-border bg-background text-left transition hover:-translate-y-1 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => onViewBook(book.slug)}
                    className="group block w-full text-left"
                  >
                    {book.coverSignedUrlCache ? (
                      <div className="aspect-[4/5] overflow-hidden bg-muted">
                        <img
                          src={book.coverSignedUrlCache}
                          alt={book.title}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    ) : (
                      <div className="flex aspect-[4/5] items-end bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.22),_transparent_55%),linear-gradient(180deg,_rgba(99,102,241,0.08),_rgba(15,23,42,0.02))] p-5">
                        <div className="max-w-[14rem]">
                          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/75">
                            EPUB
                          </p>
                          <h4 className="mt-2 line-clamp-3 text-xl font-black text-foreground">
                            {book.title}
                          </h4>
                        </div>
                      </div>
                    )}
                    <div className="space-y-2 p-4">
                      <div>
                        <h4 className="line-clamp-2 text-base font-black text-foreground">
                          {book.title}
                        </h4>
                        <p className="mt-1 text-sm text-muted-foreground">{book.author}</p>
                      </div>
                      <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                        {book.description ||
                          t('readingDiscovery.library.descriptionFallback', {
                            defaultValue:
                              'Open the reader to browse the chapter list and start reading.',
                          })}
                      </p>
                      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                        <span>
                          {t('readingDiscovery.library.chapterCount', {
                            defaultValue: '{{count}} chapters',
                            count: book.chapterCount,
                          })}
                        </span>
                        <span>
                          {t('readingDiscovery.library.wordCount', {
                            defaultValue: '{{count}} words',
                            count: book.wordCount || 0,
                          })}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 border-t border-border/70 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => void handleShare(book)}
                      disabled={!book.canShare}
                      className="inline-flex items-center rounded-2xl border border-border px-3 py-2 text-sm font-semibold transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Share2 className="mr-2 h-4 w-4" />
                      {book.shareEnabled
                        ? t('readingDiscovery.library.copyShareLink', {
                            defaultValue: 'Copy Share Link',
                          })
                        : t('readingDiscovery.library.shareLink', {
                            defaultValue: 'Share Link',
                          })}
                    </button>
                    {book.shareEnabled ? (
                      <button
                        type="button"
                        onClick={() => void handleDisableShare(book._id)}
                        className="inline-flex items-center rounded-2xl border border-amber-200 px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
                      >
                        {t('readingDiscovery.library.stopSharing', {
                          defaultValue: 'Stop Sharing',
                        })}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
