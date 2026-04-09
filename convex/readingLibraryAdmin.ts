import { ConvexError, v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import { mutation, query } from './_generated/server';
import type { Id } from './_generated/dataModel';
import { requireAdmin } from './utils';
import { readingLibraryAdminShared } from './readingLibrary';

const processUploadedBookAction = makeFunctionReference<
  'action',
  { bookId: Id<'reading_library_books'> },
  { success: boolean }
>('readingLibraryActions:processUploadedBook') as unknown as FunctionReference<
  'action',
  'internal',
  { bookId: Id<'reading_library_books'> },
  { success: boolean }
>;

export const listPending = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const status = args.status as
      | 'DRAFT_UPLOADED'
      | 'PROCESSING'
      | 'READY_FOR_REVIEW'
      | 'IN_REVIEW'
      | 'PUBLISHED'
      | 'REJECTED'
      | 'PROCESSING_FAILED'
      | undefined;
    let books = status
      ? await ctx.db
          .query('reading_library_books')
          .withIndex('by_status', q => q.eq('status', status))
          .collect()
      : await ctx.db.query('reading_library_books').collect();

    books.sort((a, b) => b.updatedAt - a.updatedAt);
    const limit = Math.min(args.limit ?? 20, 100);
    const page = books.slice(0, limit);

    const rows = await Promise.all(
      page.map(async book => {
        const owner = await ctx.db.get(book.ownerUserId);
        const firstChapter = await ctx.db
          .query('reading_library_chapters')
          .withIndex('by_book', q => q.eq('bookId', book._id))
          .order('asc')
          .first();
        return {
          ...book,
          owner: {
            id: book.ownerUserId,
            name: owner?.name,
            email: owner?.email,
          },
          firstChapter,
        };
      })
    );

    return {
      books: rows,
      nextCursor: null,
      hasMore: books.length > page.length,
    };
  },
});

export const getBookForReview = query({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { book, owner, chapters } = await readingLibraryAdminShared.loadBookForAdmin(
      ctx,
      args.bookId
    );

    return {
      book,
      owner: {
        id: book.ownerUserId,
        name: owner?.name,
        email: owner?.email,
      },
      chapters: chapters.map(chapter => ({
        id: chapter._id,
        index: chapter.chapterIndex,
        title: chapter.title,
        wordCount: chapter.wordCount,
        preview: chapter.plainText.slice(0, 280),
      })),
    };
  },
});

export const getStats = query({
  args: {},
  handler: async ctx => {
    await requireAdmin(ctx);
    const books = await ctx.db.query('reading_library_books').collect();
    const byStatus = {
      DRAFT_UPLOADED: 0,
      PROCESSING: 0,
      READY_FOR_REVIEW: 0,
      IN_REVIEW: 0,
      PUBLISHED: 0,
      REJECTED: 0,
      PROCESSING_FAILED: 0,
    };
    const byVisibility = {
      OWNER_ONLY: 0,
      PUBLIC: 0,
    };

    let totalWords = 0;
    let totalChapters = 0;
    for (const book of books) {
      byStatus[book.status] += 1;
      byVisibility[book.visibility] += 1;
      totalWords += book.wordCount;
      totalChapters += book.chapterCount;
    }

    return {
      total: books.length,
      byStatus,
      byVisibility,
      totalWords,
      totalChapters,
    };
  },
});

export const approve = mutation({
  args: {
    bookId: v.id('reading_library_books'),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    await ctx.db.patch(args.bookId, {
      status: 'PUBLISHED',
      visibility: 'OWNER_ONLY',
      reviewedAt: Date.now(),
      reviewedBy: admin._id,
      reviewNote: args.reviewNote?.trim() || undefined,
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const reject = mutation({
  args: {
    bookId: v.id('reading_library_books'),
    reviewNote: v.string(),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    await ctx.db.patch(args.bookId, {
      status: 'REJECTED',
      visibility: 'OWNER_ONLY',
      reviewedAt: Date.now(),
      reviewedBy: admin._id,
      reviewNote: args.reviewNote.trim(),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const retryProcessing = mutation({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    await ctx.scheduler.runAfter(0, processUploadedBookAction, { bookId: args.bookId });
    return { success: true };
  },
});
