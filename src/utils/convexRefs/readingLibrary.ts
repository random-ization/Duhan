import type { FunctionReference } from 'convex/server';
import { qRef, mRef } from './base';
import type {
  BookDetailResponse,
  ChapterReaderResponse,
  EpubLibraryBook,
} from '../../types/readingLibrary';

type PublicShelfResponse = {
  books: EpubLibraryBook[];
  nextCursor: string | null;
  hasMore: boolean;
};

type ReadingLibraryOwner = {
  id: string;
  name?: string;
  email?: string;
};

type ReadingLibraryFirstChapter = {
  _id: string;
  bookId: string;
  chapterIndex: number;
  title: string;
  href: string;
  htmlSanitized: string;
  plainText: string;
  paragraphs?: string[];
  wordCount: number;
  createdAt: number;
} | null;

type AdminBookRow = EpubLibraryBook & {
  owner: ReadingLibraryOwner;
  firstChapter: ReadingLibraryFirstChapter;
};

type AdminReviewChapter = {
  id: string;
  index: number;
  title: string;
  wordCount: number;
  preview: string;
};

type AdminBookReviewResponse = {
  book: EpubLibraryBook;
  owner: ReadingLibraryOwner;
  chapters: AdminReviewChapter[];
};

type ReadingLibraryStatusCounts = {
  DRAFT_UPLOADED: number;
  PROCESSING: number;
  READY_FOR_REVIEW: number;
  IN_REVIEW: number;
  PUBLISHED: number;
  REJECTED: number;
  PROCESSING_FAILED: number;
};

type ReadingLibraryVisibilityCounts = {
  OWNER_ONLY: number;
  PUBLIC: number;
};

type EpubBookDetailResponse = BookDetailResponse & {
  epubUrl?: string;
};

type ReadingLibraryMetadataUpdate = {
  bookId: string;
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  tags?: string[];
};

type AdminBookListResponse = {
  books: AdminBookRow[];
  nextCursor: string | null;
  hasMore: boolean;
};

type AdminStatsResponse = {
  total: number;
  byStatus: ReadingLibraryStatusCounts;
  byVisibility: ReadingLibraryVisibilityCounts;
  totalWords: number;
  totalChapters: number;
};

export const READING_LIBRARY = {
  getMyUploads: qRef<{ status?: string }, EpubLibraryBook[]>('readingLibrary:getMyUploads'),
  getPublicShelf: qRef<{ limit?: number; cursor?: string }, PublicShelfResponse>(
    'readingLibrary:getPublicShelf'
  ),
  getBookDetail: qRef<{ slug: string; shareToken?: string }, EpubBookDetailResponse>(
    'readingLibrary:getBookDetail'
  ),
  getReaderChapter: qRef<
    { bookId: string; chapterIndex: number; shareToken?: string },
    ChapterReaderResponse
  >('readingLibrary:getReaderChapter'),

  createUploadDraft: mRef<
    {
      title: string;
      author: string;
      description?: string;
      language: string;
      tags?: string[];
      epubObjectKey: string;
    },
    { bookId: string; slug: string }
  >('readingLibrary:createUploadDraft'),
  submitForReview: mRef<{ bookId: string }, { success: boolean }>('readingLibrary:submitForReview'),
  ensureShareLink: mRef<{ bookId: string }, { success: boolean; shareToken: string }>(
    'readingLibrary:ensureShareLink'
  ),
  disableShareLink: mRef<{ bookId: string }, { success: boolean }>(
    'readingLibrary:disableShareLink'
  ),
  saveProgress: mRef<
    {
      bookId: string;
      chapterIndex: number;
      shareToken?: string;
      blockId?: string;
      scrollTop?: number;
      completionPercent?: number;
    },
    { success: boolean; progressId: string }
  >('readingLibrary:saveProgress'),
  updateBookMetadata: mRef<ReadingLibraryMetadataUpdate, { success: boolean }>(
    'readingLibrary:updateBookMetadata'
  ),
  deleteBook: mRef<{ bookId: string }, { success: boolean }>('readingLibrary:deleteBook'),

  admin: {
    listPending: qRef<{ status?: string; limit?: number }, AdminBookListResponse>(
      'readingLibraryAdmin:listPending'
    ),
    getBookForReview: qRef<{ bookId: string }, AdminBookReviewResponse>(
      'readingLibraryAdmin:getBookForReview'
    ),
    getStats: qRef<Record<string, never>, AdminStatsResponse>('readingLibraryAdmin:getStats'),
  },

  adminMutations: {
    approve: mRef<{ bookId: string; reviewNote?: string }, { success: boolean }>(
      'readingLibraryAdmin:approve'
    ),
    reject: mRef<{ bookId: string; reviewNote: string }, { success: boolean }>(
      'readingLibraryAdmin:reject'
    ),
    retryProcessing: mRef<{ bookId: string }, { success: boolean }>(
      'readingLibraryAdmin:retryProcessing'
    ),
  },
} as const;

export type ReadingLibraryQuery = FunctionReference<'query', 'public'>;
export type ReadingLibraryMutation = FunctionReference<'mutation', 'public'>;
