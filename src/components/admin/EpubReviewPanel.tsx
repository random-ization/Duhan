import React, { useMemo, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertCircle,
  Book,
  CheckCircle2,
  FileText,
  Filter,
  Loader2,
  RotateCcw,
  User,
  XCircle,
} from 'lucide-react';
import { zhCN, enUS } from 'date-fns/locale';
import { READING_LIBRARY } from '../../utils/convexRefs';
import { logError, logInfo } from '../../utils/logger';

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    PROCESSING: 'bg-blue-100 text-blue-800',
    READY_FOR_REVIEW: 'bg-amber-100 text-amber-800',
    IN_REVIEW: 'bg-orange-100 text-orange-800',
    PUBLISHED: 'bg-emerald-100 text-emerald-800',
    REJECTED: 'bg-rose-100 text-rose-800',
    PROCESSING_FAILED: 'bg-rose-100 text-rose-800',
  };
  return styles[status] || 'bg-zinc-100 text-zinc-700';
}

export const EpubReviewPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [selectedStatus, setSelectedStatus] = useState<string>('READY_FOR_REVIEW');
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  const booksData = useQuery(READING_LIBRARY.admin.listPending, {
    status: selectedStatus === 'ALL' ? undefined : selectedStatus,
    limit: 40,
  });
  const selectedBook = useQuery(
    READING_LIBRARY.admin.getBookForReview,
    selectedBookId ? { bookId: selectedBookId } : 'skip'
  );
  const stats = useQuery(READING_LIBRARY.admin.getStats, {});

  const approve = useMutation(READING_LIBRARY.adminMutations.approve);
  const reject = useMutation(READING_LIBRARY.adminMutations.reject);
  const retryProcessing = useMutation(READING_LIBRARY.adminMutations.retryProcessing);

  const statusOptions = useMemo(
    () => [
      { value: 'ALL', label: t('admin.epubReview.status.allBooks', { defaultValue: 'All Books' }) },
      {
        value: 'PROCESSING',
        label: t('admin.epubReview.status.processing', { defaultValue: 'Processing' }),
      },
      {
        value: 'READY_FOR_REVIEW',
        label: t('admin.epubReview.status.readyForReview', { defaultValue: 'Ready for Review' }),
      },
      {
        value: 'IN_REVIEW',
        label: t('admin.epubReview.status.inReview', { defaultValue: 'In Review' }),
      },
      {
        value: 'PUBLISHED',
        label: t('admin.epubReview.status.published', { defaultValue: 'Published' }),
      },
      {
        value: 'REJECTED',
        label: t('admin.epubReview.status.rejected', { defaultValue: 'Rejected' }),
      },
      {
        value: 'PROCESSING_FAILED',
        label: t('admin.epubReview.status.processingFailed', {
          defaultValue: 'Processing Failed',
        }),
      },
    ],
    [t]
  );

  const statusSummary = useMemo(() => {
    if (!stats) return null;
    return [
      [
        t('admin.epubReview.summary.ready', { defaultValue: 'Ready' }),
        stats.byStatus.READY_FOR_REVIEW,
      ],
      [
        t('admin.epubReview.summary.processing', { defaultValue: 'Processing' }),
        stats.byStatus.PROCESSING,
      ],
      [
        t('admin.epubReview.summary.published', { defaultValue: 'Published' }),
        stats.byStatus.PUBLISHED,
      ],
      [
        t('admin.epubReview.summary.failed', { defaultValue: 'Failed' }),
        stats.byStatus.PROCESSING_FAILED,
      ],
    ];
  }, [stats, t]);

  const dateLocale = i18n.language === 'zh' ? zhCN : enUS;

  const formatStatusLabel = (status: string) => {
    const suffixMap: Record<string, string> = {
      PROCESSING: 'processing',
      READY_FOR_REVIEW: 'readyForReview',
      IN_REVIEW: 'inReview',
      PUBLISHED: 'published',
      REJECTED: 'rejected',
      PROCESSING_FAILED: 'processingFailed',
    };
    const suffix = suffixMap[status];
    return suffix
      ? t(`admin.epubReview.status.${suffix}`, {
          defaultValue: status.replaceAll('_', ' '),
        })
      : status.replaceAll('_', ' ');
  };

  const handleApprove = async () => {
    if (!selectedBookId) return;
    setIsMutating(true);
    try {
      await approve({ bookId: selectedBookId, reviewNote: reviewNote.trim() || undefined });
      logInfo('EPUB approved', { bookId: selectedBookId });
      setReviewNote('');
    } catch (error) {
      logError('Failed to approve EPUB', error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleReject = async () => {
    if (!selectedBookId || !reviewNote.trim()) return;
    setIsMutating(true);
    try {
      await reject({ bookId: selectedBookId, reviewNote: reviewNote.trim() });
      logInfo('EPUB rejected', { bookId: selectedBookId });
      setReviewNote('');
    } catch (error) {
      logError('Failed to reject EPUB', error);
    } finally {
      setIsMutating(false);
    }
  };

  const handleRetry = async () => {
    if (!selectedBookId) return;
    setIsMutating(true);
    try {
      await retryProcessing({ bookId: selectedBookId });
      logInfo('EPUB processing retried', { bookId: selectedBookId });
    } catch (error) {
      logError('Failed to retry EPUB processing', error);
    } finally {
      setIsMutating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t('admin.epubReview.title', { defaultValue: 'EPUB Library Review' })}
          </h1>
          <p className="mt-1 text-gray-600">
            {t('admin.epubReview.subtitle', {
              defaultValue:
                'Moderate community EPUB uploads and publish them into the reading library.',
            })}
          </p>
        </div>
        {statusSummary ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {statusSummary.map(([label, count]) => (
              <div key={label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {label}
                </div>
                <div className="mt-1 text-xl font-black text-gray-900">{count}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-semibold text-gray-700">
                {t('admin.epubReview.filterTitle', { defaultValue: 'Status Filter' })}
              </span>
            </div>
            <div className="space-y-1">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedStatus(option.value)}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                    selectedStatus === option.value
                      ? 'bg-blue-50 font-semibold text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[520px] overflow-y-auto">
            {booksData === undefined ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : booksData.books.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <Book className="mx-auto mb-3 h-8 w-8 text-gray-400" />
                <p className="text-sm">
                  {t('admin.epubReview.empty', {
                    defaultValue: 'No books found for this status.',
                  })}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {booksData.books.map((book: any) => (
                  <button
                    key={book._id}
                    type="button"
                    onClick={() => {
                      setSelectedBookId(book._id);
                      setReviewNote(book.reviewNote || '');
                    }}
                    className={`w-full p-4 text-left transition hover:bg-gray-50 ${
                      selectedBookId === book._id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <h3 className="line-clamp-2 font-semibold text-gray-900">{book.title}</h3>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${getStatusBadge(book.status)}`}
                      >
                        {formatStatusLabel(book.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{book.author}</p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {book.owner?.name ||
                          book.owner?.email ||
                          t('admin.epubReview.unknownOwner', { defaultValue: 'Unknown' })}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(book.updatedAt), {
                          addSuffix: true,
                          locale: dateLocale,
                        })}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
          {!selectedBookId ? (
            <div className="flex h-full min-h-[420px] flex-col items-center justify-center text-center text-gray-500">
              <Book className="mb-4 h-10 w-10 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t('admin.epubReview.selectTitle', {
                  defaultValue: 'Select a book to review',
                })}
              </h2>
              <p className="mt-2 max-w-md text-sm text-gray-600">
                {t('admin.epubReview.selectBody', {
                  defaultValue:
                    'Pick a submission from the list to inspect metadata, chapter previews, and moderation actions.',
                })}
              </p>
            </div>
          ) : selectedBook === undefined ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 border-b border-gray-200 pb-5 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadge(selectedBook.book.status)}`}
                    >
                      {formatStatusLabel(selectedBook.book.status)}
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t('admin.epubReview.chapterCount', {
                        defaultValue: '{{count}} chapters',
                        count: selectedBook.book.chapterCount,
                      })}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedBook.book.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{selectedBook.book.author}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-700">
                    {selectedBook.book.description ||
                      t('admin.epubReview.noDescription', {
                        defaultValue: 'No description provided.',
                      })}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  <div>
                    {t('admin.epubReview.owner', { defaultValue: 'Owner' })}:{' '}
                    {selectedBook.owner?.name ||
                      selectedBook.owner?.email ||
                      t('admin.epubReview.unknownOwner', { defaultValue: 'Unknown' })}
                  </div>
                  <div className="mt-1">
                    {t('admin.epubReview.language', { defaultValue: 'Language' })}:{' '}
                    {selectedBook.book.language}
                  </div>
                  <div className="mt-1">
                    {t('admin.epubReview.words', { defaultValue: 'Words' })}:{' '}
                    {(selectedBook.book.wordCount || 0).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-black uppercase tracking-wide text-gray-700">
                  {t('admin.epubReview.reviewNote', { defaultValue: 'Review Note' })}
                </h3>
                <textarea
                  value={reviewNote}
                  onChange={event => setReviewNote(event.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm"
                  placeholder={t('admin.epubReview.reviewNotePlaceholder', {
                    defaultValue: 'Optional approval note, or required rejection reason.',
                  })}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={isMutating}
                  className="inline-flex items-center rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  {t('admin.epubReview.actions.approve', { defaultValue: 'Approve' })}
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={isMutating || !reviewNote.trim()}
                  className="inline-flex items-center rounded-2xl bg-rose-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('admin.epubReview.actions.reject', { defaultValue: 'Reject' })}
                </button>
                <button
                  type="button"
                  onClick={handleRetry}
                  disabled={isMutating}
                  className="inline-flex items-center rounded-2xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-700 disabled:opacity-50"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {t('admin.epubReview.actions.retry', {
                    defaultValue: 'Retry Processing',
                  })}
                </button>
              </div>

              <div>
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-black uppercase tracking-wide text-gray-700">
                    {t('admin.epubReview.chapterPreview', {
                      defaultValue: 'Chapter Preview',
                    })}
                  </h3>
                </div>
                {selectedBook.chapters.length === 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {t('admin.epubReview.noParsedChapters', {
                          defaultValue: 'No parsed chapters are available yet.',
                        })}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedBook.chapters.slice(0, 6).map((chapter: any) => (
                      <div key={chapter.id} className="rounded-2xl border border-gray-200 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <h4 className="font-semibold text-gray-900">
                            {chapter.index + 1}. {chapter.title}
                          </h4>
                          <span className="text-xs font-semibold text-gray-500">
                            {t('admin.epubReview.wordCount', {
                              defaultValue: '{{count}} words',
                              count: chapter.wordCount,
                            })}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-600">
                          {chapter.preview ||
                            t('admin.epubReview.noPreview', {
                              defaultValue: 'No preview available.',
                            })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
