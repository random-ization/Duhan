import type { FunctionReference } from 'convex/server';
import { qRef, mRef } from './base';

export const READING_LIBRARY = {
  getMyUploads: qRef<{ status?: string }, any[]>('readingLibrary:getMyUploads'),
  getPublicShelf: qRef<
    { limit?: number; cursor?: string },
    { books: any[]; nextCursor: string | null; hasMore: boolean }
  >('readingLibrary:getPublicShelf'),
  getBookDetail: qRef<{ slug: string; shareToken?: string }, any>('readingLibrary:getBookDetail'),
  getReaderChapter: qRef<{ bookId: string; chapterIndex: number; shareToken?: string }, any>(
    'readingLibrary:getReaderChapter'
  ),

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
  updateBookMetadata: mRef<any, { success: boolean }>('readingLibrary:updateBookMetadata'),
  deleteBook: mRef<{ bookId: string }, { success: boolean }>('readingLibrary:deleteBook'),

  admin: {
    listPending: qRef<
      { status?: string; limit?: number },
      { books: any[]; nextCursor: string | null; hasMore: boolean }
    >('readingLibraryAdmin:listPending'),
    getBookForReview: qRef<{ bookId: string }, any>('readingLibraryAdmin:getBookForReview'),
    getStats: qRef<Record<string, never>, any>('readingLibraryAdmin:getStats'),
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
