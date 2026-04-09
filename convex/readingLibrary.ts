import { ConvexError, v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
  QueryCtx,
  MutationCtx,
} from './_generated/server';
import { Doc, Id } from './_generated/dataModel';
import { getAuthUserId, getOptionalAuthUserId } from './utils';
import { getSpacesPublicConfig, getSpacesHost, getSpacesCdnBaseUrl } from './spacesConfig';

type ReadingLibraryBook = Doc<'reading_library_books'>;

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

function slugify(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/^-+|-+$/g, '');
  return normalized || `book-${Date.now().toString(36)}`;
}

async function ensureUniqueSlug(ctx: MutationCtx | QueryCtx, title: string): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let suffix = 1;

  while (
    await ctx.db
      .query('reading_library_books')
      .withIndex('by_slug', q => q.eq('slug', candidate))
      .unique()
  ) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

function getPreviewChapterLimit(chapterCount: number): number {
  if (chapterCount <= 0) return 0;
  if (chapterCount < 3) return 1;
  return Math.max(1, Math.min(2, Math.floor(chapterCount * 0.2)));
}

function getBookCoverUrl(book: ReadingLibraryBook): string | undefined {
  return book.coverSignedUrlCache || undefined;
}

function canBookBeShared(book: ReadingLibraryBook) {
  return (
    book.chapterCount > 0 &&
    !['DRAFT_UPLOADED', 'PROCESSING', 'PROCESSING_FAILED'].includes(book.status)
  );
}

function hasValidShareAccess(book: ReadingLibraryBook, shareToken?: string | null) {
  if (!shareToken || !book.shareEnabled || !book.shareToken) return false;
  if (!canBookBeShared(book)) return false;
  return shareToken === book.shareToken;
}

function createShareToken() {
  return crypto.randomUUID().replaceAll('-', '');
}

function toClientBook(
  book: ReadingLibraryBook,
  options: {
    isOwner: boolean;
    canRead: boolean;
    canEdit?: boolean;
    canSubmitForReview?: boolean;
    canShare?: boolean;
  }
) {
  const bookWithoutShareToken = { ...book };
  Reflect.deleteProperty(bookWithoutShareToken, 'shareToken');
  return {
    ...bookWithoutShareToken,
    coverSignedUrlCache: getBookCoverUrl(book),
    shareEnabled: Boolean(book.shareEnabled),
    isOwner: options.isOwner,
    canRead: options.canRead,
    canEdit: options.canEdit ?? options.isOwner,
    canSubmitForReview: options.canSubmitForReview ?? false,
    canShare: options.canShare ?? false,
  };
}

function getAccessState(
  book: ReadingLibraryBook,
  options: {
    hasFullAccess: boolean;
  }
) {
  if (options.hasFullAccess) {
    return {
      canReadFull: true,
      availableChapters: book.chapterCount,
      totalChapters: book.chapterCount,
      isPreviewLimited: false,
      previewChapterLimit: book.chapterCount,
    };
  }
  return {
    canReadFull: false,
    availableChapters: 0,
    totalChapters: book.chapterCount,
    isPreviewLimited: true,
    previewChapterLimit: 0,
  };
}

async function assertBookReadable(
  ctx: QueryCtx | MutationCtx,
  book: ReadingLibraryBook,
  userId: Id<'users'> | null,
  shareToken?: string | null
) {
  const viewer = userId ? await ctx.db.get(userId) : null;
  const isOwner = book.ownerUserId === userId;
  const isAdmin = viewer?.role === 'ADMIN';
  const isSharedAccess = hasValidShareAccess(book, shareToken);

  if (!isOwner && !isAdmin && !isSharedAccess) {
    throw new ConvexError({ code: 'FORBIDDEN', message: 'Access denied' });
  }

  return { isOwner, isAdmin, isSharedAccess };
}

function getPublicObjectUrl(key: string): string {
  const spaces = getSpacesPublicConfig();
  if (!spaces) return '';
  const host = getSpacesHost(spaces.endpoint);
  const cdnBase = getSpacesCdnBaseUrl(spaces.bucket, host);
  return `${cdnBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export const getPublicShelf = query({
  args: {
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()),
  },
  handler: async (_ctx, _args) => {
    return {
      books: [],
      nextCursor: null,
      hasMore: false,
    };
  },
});

export const getMyUploads = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    let books = await ctx.db
      .query('reading_library_books')
      .withIndex('by_owner', q => q.eq('ownerUserId', userId))
      .collect();

    if (args.status) {
      books = books.filter(book => book.status === args.status);
    }

    books.sort((a, b) => b.updatedAt - a.updatedAt);
    return books.map(book =>
      toClientBook(book, {
        isOwner: true,
        canRead: book.chapterCount > 0,
        canSubmitForReview: false,
        canShare: canBookBeShared(book),
      })
    );
  },
});

export const getBookDetail = query({
  args: {
    slug: v.string(),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, { slug, shareToken }) => {
    const userId = await getOptionalAuthUserId(ctx);
    const book = await ctx.db
      .query('reading_library_books')
      .withIndex('by_slug', q => q.eq('slug', slug))
      .unique();

    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    const { isOwner, isAdmin, isSharedAccess } = await assertBookReadable(
      ctx,
      book,
      userId,
      shareToken
    );
    const chapters = await ctx.db
      .query('reading_library_chapters')
      .withIndex('by_book', q => q.eq('bookId', book._id))
      .order('asc')
      .collect();

    const userProgress = userId
      ? await ctx.db
          .query('reading_library_progress')
          .withIndex('by_user_book', q => q.eq('userId', userId).eq('bookId', book._id))
          .unique()
      : null;
    const accessState = getAccessState(book, {
      hasFullAccess: isOwner || isAdmin || isSharedAccess,
    });

    return {
      book: {
        ...toClientBook(book, {
          isOwner,
          canRead: isOwner || isAdmin || isSharedAccess || accessState.availableChapters > 0,
          canSubmitForReview: false,
          canShare: isOwner && canBookBeShared(book),
        }),
        chapters: chapters.map(chapter => ({
          id: chapter._id,
          index: chapter.chapterIndex,
          title: chapter.title,
          wordCount: chapter.wordCount,
        })),
      },
      isOwner,
      isSharedAccess,
      userProgress,
      accessState,
      epubUrl:
        isOwner || isAdmin || isSharedAccess ? getPublicObjectUrl(book.epubObjectKey) : undefined,
    };
  },
});

export const getEpubFile = query({
  args: {
    bookId: v.id('reading_library_books'),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, { bookId, shareToken }) => {
    const userId = await getOptionalAuthUserId(ctx);
    const book = await ctx.db.get(bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    const { isOwner, isAdmin, isSharedAccess } = await assertBookReadable(
      ctx,
      book,
      userId,
      shareToken
    );

    if (!isOwner && !isAdmin && !isSharedAccess) {
      throw new ConvexError({ code: 'ACCESS_DENIED', message: 'No access to this book' });
    }

    const publicUrl = getPublicObjectUrl(book.epubObjectKey);
    return { epubUrl: publicUrl };
  },
});

export const getReaderChapter = query({
  args: {
    bookId: v.id('reading_library_books'),
    chapterIndex: v.number(),
    shareToken: v.optional(v.string()),
  },
  handler: async (ctx, { bookId, chapterIndex, shareToken }) => {
    const userId = await getOptionalAuthUserId(ctx);
    const book = await ctx.db.get(bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    const { isOwner, isAdmin, isSharedAccess } = await assertBookReadable(
      ctx,
      book,
      userId,
      shareToken
    );
    const accessState = getAccessState(book, {
      hasFullAccess: isOwner || isAdmin || isSharedAccess,
    });
    if (!isOwner && !isAdmin && chapterIndex >= accessState.availableChapters) {
      throw new ConvexError({
        code: 'UPGRADE_REQUIRED',
        message: 'Upgrade to read this chapter',
      });
    }

    const chapter = await ctx.db
      .query('reading_library_chapters')
      .withIndex('by_book', q => q.eq('bookId', bookId).eq('chapterIndex', chapterIndex))
      .unique();

    if (!chapter) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Chapter not found' });
    }

    return {
      chapter: {
        ...chapter,
        content: chapter.htmlSanitized,
        plainText: chapter.plainText,
      },
      bookInfo: {
        title: book.title,
        author: book.author,
        totalChapters: book.chapterCount,
        currentChapterIndex: chapterIndex,
      },
    };
  },
});

export const createUploadDraft = mutation({
  args: {
    title: v.string(),
    author: v.string(),
    description: v.optional(v.string()),
    language: v.string(),
    tags: v.optional(v.array(v.string())),
    epubObjectKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();
    const slug = await ensureUniqueSlug(ctx, args.title);

    const bookId = await ctx.db.insert('reading_library_books', {
      ownerUserId: userId,
      slug,
      title: args.title.trim(),
      author: args.author.trim(),
      description: args.description?.trim() || undefined,
      language: args.language.trim() || 'en',
      epubObjectKey: args.epubObjectKey.trim(),
      coverObjectKey: undefined,
      coverSignedUrlCache: undefined,
      shareToken: undefined,
      shareEnabled: false,
      sharedAt: undefined,
      status: 'DRAFT_UPLOADED',
      visibility: 'OWNER_ONLY',
      accessMode: 'FREE_PREVIEW_PLUS_PRO',
      chapterCount: 0,
      wordCount: 0,
      sampleChapterCount: 0,
      toc: [],
      tags: args.tags?.filter(Boolean),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, processUploadedBookAction, { bookId });

    return {
      bookId: bookId.toString(),
      slug,
    };
  },
});

export const submitForReview = mutation({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.ownerUserId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Book not found or access denied' });
    }
    if (book.chapterCount <= 0 || book.status === 'PROCESSING') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Book is not ready for review' });
    }

    await ctx.db.patch(book._id, {
      status: 'IN_REVIEW',
      submittedAt: Date.now(),
      updatedAt: Date.now(),
      reviewNote: undefined,
    });

    return { success: true };
  },
});

export const ensureShareLink = mutation({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.ownerUserId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Book not found or access denied' });
    }
    if (!canBookBeShared(book)) {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Book is not ready to share' });
    }

    const shareToken = book.shareEnabled && book.shareToken ? book.shareToken : createShareToken();
    const now = Date.now();
    await ctx.db.patch(book._id, {
      shareToken,
      shareEnabled: true,
      sharedAt: now,
      updatedAt: now,
    });

    return {
      success: true,
      shareToken,
    };
  },
});

export const disableShareLink = mutation({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.ownerUserId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Book not found or access denied' });
    }

    await ctx.db.patch(book._id, {
      shareEnabled: false,
      shareToken: undefined,
      sharedAt: undefined,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const saveProgress = mutation({
  args: {
    bookId: v.id('reading_library_books'),
    chapterIndex: v.number(),
    shareToken: v.optional(v.string()),
    blockId: v.optional(v.string()),
    scrollTop: v.optional(v.number()),
    completionPercent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }

    await assertBookReadable(ctx, book, userId, args.shareToken);

    const now = Date.now();
    const existing = await ctx.db
      .query('reading_library_progress')
      .withIndex('by_user_book', q => q.eq('userId', userId).eq('bookId', args.bookId))
      .unique();

    const payload = {
      chapterIndex: args.chapterIndex,
      blockId: args.blockId,
      scrollTop: Math.max(0, args.scrollTop ?? 0),
      completionPercent: Math.max(0, Math.min(100, args.completionPercent ?? 0)),
      lastReadAt: now,
      updatedAt: now,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return { success: true, progressId: existing._id };
    }

    const progressId = await ctx.db.insert('reading_library_progress', {
      userId,
      bookId: args.bookId,
      createdAt: now,
      ...payload,
    });
    return { success: true, progressId };
  },
});

export const updateBookMetadata = mutation({
  args: {
    bookId: v.id('reading_library_books'),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    description: v.optional(v.string()),
    language: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.ownerUserId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Book not found or access denied' });
    }
    if (book.status === 'IN_REVIEW' || book.status === 'PUBLISHED') {
      throw new ConvexError({ code: 'INVALID_STATE', message: 'Published books cannot be edited' });
    }

    const updates: Partial<ReadingLibraryBook> & { updatedAt: number } = { updatedAt: Date.now() };
    if (args.title?.trim()) {
      updates.title = args.title.trim();
      if (updates.title !== book.title) {
        updates.slug = await ensureUniqueSlug(ctx, updates.title);
      }
    }
    if (args.author?.trim()) updates.author = args.author.trim();
    if (args.description !== undefined) updates.description = args.description.trim() || undefined;
    if (args.language?.trim()) updates.language = args.language.trim();
    if (args.tags) updates.tags = args.tags.filter(Boolean);

    await ctx.db.patch(book._id, updates);
    return { success: true };
  },
});

export const deleteBook = mutation({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book || book.ownerUserId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN', message: 'Book not found or access denied' });
    }
    if (book.status === 'PUBLISHED') {
      throw new ConvexError({
        code: 'INVALID_STATE',
        message: 'Published books cannot be deleted',
      });
    }

    const chapters = await ctx.db
      .query('reading_library_chapters')
      .withIndex('by_book', q => q.eq('bookId', book._id))
      .collect();
    const progress = await ctx.db.query('reading_library_progress').collect();

    for (const chapter of chapters) {
      await ctx.db.delete(chapter._id);
    }
    for (const row of progress) {
      if (row.bookId === book._id) {
        await ctx.db.delete(row._id);
      }
    }
    await ctx.db.delete(book._id);
    return { success: true };
  },
});

export const completeProcessing = internalMutation({
  args: {
    bookId: v.id('reading_library_books'),
    title: v.string(),
    author: v.string(),
    description: v.optional(v.string()),
    language: v.string(),
    toc: v.array(
      v.object({
        title: v.string(),
        href: v.string(),
        level: v.number(),
      })
    ),
    chapters: v.array(
      v.object({
        chapterIndex: v.number(),
        title: v.string(),
        href: v.string(),
        htmlSanitized: v.string(),
        plainText: v.string(),
        paragraphs: v.array(v.string()),
        wordCount: v.number(),
      })
    ),
    coverObjectKey: v.optional(v.string()),
    coverSignedUrlCache: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) return { success: false };

    const existingChapters = await ctx.db
      .query('reading_library_chapters')
      .withIndex('by_book', q => q.eq('bookId', book._id))
      .collect();
    for (const chapter of existingChapters) {
      await ctx.db.delete(chapter._id);
    }

    const now = Date.now();
    let wordCount = 0;
    for (const chapter of args.chapters) {
      wordCount += chapter.wordCount;
      await ctx.db.insert('reading_library_chapters', {
        bookId: args.bookId,
        chapterIndex: chapter.chapterIndex,
        title: chapter.title,
        href: chapter.href,
        htmlSanitized: chapter.htmlSanitized,
        plainText: chapter.plainText,
        paragraphs: chapter.paragraphs,
        wordCount: chapter.wordCount,
        createdAt: now,
      });
    }

    const chapterCount = args.chapters.length;
    await ctx.db.patch(args.bookId, {
      title: args.title,
      author: args.author,
      description: args.description,
      language: args.language || book.language,
      status: 'READY_FOR_REVIEW',
      chapterCount,
      wordCount,
      sampleChapterCount: getPreviewChapterLimit(chapterCount),
      toc: args.toc,
      coverObjectKey: args.coverObjectKey,
      coverSignedUrlCache: args.coverSignedUrlCache,
      updatedAt: now,
    });
    return { success: true };
  },
});

export const getBookForProcessing = internalQuery({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }
    return book;
  },
});

export const failProcessing = internalMutation({
  args: {
    bookId: v.id('reading_library_books'),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) return { success: false };
    await ctx.db.patch(args.bookId, {
      status: 'PROCESSING_FAILED',
      reviewNote: args.message.slice(0, 500),
      updatedAt: Date.now(),
    });
    return { success: true };
  },
});

export const markProcessing = internalMutation({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db.get(args.bookId);
    if (!book) return { success: false };
    await ctx.db.patch(args.bookId, {
      status: 'PROCESSING',
      updatedAt: Date.now(),
      reviewNote: undefined,
    });
    return { success: true };
  },
});

export const readingLibraryAdminShared = {
  loadBookForAdmin: async (ctx: QueryCtx, bookId: Id<'reading_library_books'>) => {
    const book = await ctx.db.get(bookId);
    if (!book) {
      throw new ConvexError({ code: 'NOT_FOUND', message: 'Book not found' });
    }
    const owner = await ctx.db.get(book.ownerUserId);
    const chapters = await ctx.db
      .query('reading_library_chapters')
      .withIndex('by_book', q => q.eq('bookId', book._id))
      .order('asc')
      .collect();
    return { book, owner, chapters };
  },
};
