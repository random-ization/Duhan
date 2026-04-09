import { query } from './_generated/server';
import { v } from 'convex/values';
import { normalizeStoragePublicUrl } from './spacesConfig';

export const listPublishedBooks = query({
  args: {},
  handler: async ctx => {
    const books = await ctx.db
      .query('reading_books')
      .withIndex('by_published_source_book_id', q => q.eq('isPublished', true))
      .order('asc')
      .collect();

    return books.map(book => ({
      _id: book._id,
      slug: book.slug,
      title: book.title,
      pageTitle: book.pageTitle,
      levelLabel: book.levelLabel,
      coverImageUrl: normalizeStoragePublicUrl(book.coverImageUrl) || book.coverImageUrl,
      pageCount: book.pageCount,
      readingMinutes: book.readingMinutes,
      sourceBookId: book.sourceBookId,
    }));
  },
});

export const getBookBySlug = query({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query('reading_books')
      .withIndex('by_slug', q => q.eq('slug', args.slug))
      .unique();

    if (!book || !book.isPublished) return null;

    return {
      _id: book._id,
      slug: book.slug,
      title: book.title,
      pageTitle: book.pageTitle,
      levelLabel: book.levelLabel,
      coverImageUrl: normalizeStoragePublicUrl(book.coverImageUrl) || book.coverImageUrl,
      pageCount: book.pageCount,
      readingMinutes: book.readingMinutes,
      sourcePage: book.sourcePage,
      sourceBookId: book.sourceBookId,
    };
  },
});

export const getBookPageData = query({
  args: {
    slug: v.string(),
    pageIndex: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const book = await ctx.db
      .query('reading_books')
      .withIndex('by_slug', q => q.eq('slug', args.slug))
      .unique();

    if (!book || !book.isPublished) return null;

    const pages = await ctx.db
      .query('reading_book_pages')
      .withIndex('by_book', q => q.eq('bookId', book._id))
      .order('asc')
      .collect();

    if (pages.length === 0) {
      return {
        book: {
          _id: book._id,
          slug: book.slug,
          title: book.title,
          pageTitle: book.pageTitle,
          levelLabel: book.levelLabel,
          coverImageUrl: normalizeStoragePublicUrl(book.coverImageUrl) || book.coverImageUrl,
          pageCount: 0,
          readingMinutes: book.readingMinutes,
        },
        page: null,
        pageCount: 0,
        pageIndex: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      };
    }

    const requestedPageIndex = Math.max(0, args.pageIndex ?? 0);
    const targetPage =
      pages.find(page => page.pageIndex === requestedPageIndex) ??
      pages[Math.min(requestedPageIndex, pages.length - 1)];

    const sentences = await ctx.db
      .query('reading_book_sentences')
      .withIndex('by_page', q => q.eq('pageId', targetPage._id))
      .order('asc')
      .collect();

    return {
      book: {
        _id: book._id,
        slug: book.slug,
        title: book.title,
        pageTitle: book.pageTitle,
        levelLabel: book.levelLabel,
        coverImageUrl: normalizeStoragePublicUrl(book.coverImageUrl) || book.coverImageUrl,
        pageCount: pages.length,
        readingMinutes: book.readingMinutes,
      },
      page: {
        _id: targetPage._id,
        pageIndex: targetPage.pageIndex,
        imageUrl: normalizeStoragePublicUrl(targetPage.imageUrl) || targetPage.imageUrl,
        layoutClass: targetPage.layoutClass,
        sentenceCount: targetPage.sentenceCount,
        sentences: sentences.map(sentence => ({
          _id: sentence._id,
          sentenceIndex: sentence.sentenceIndex,
          spanId: sentence.spanId,
          text: sentence.text,
          audioUrl: normalizeStoragePublicUrl(sentence.audioUrl) || sentence.audioUrl,
          clipBeginMs: sentence.clipBeginMs,
          clipEndMs: sentence.clipEndMs,
          durationMs: sentence.durationMs,
        })),
      },
      pageCount: pages.length,
      pageIndex: targetPage.pageIndex,
      hasPreviousPage: targetPage.pageIndex > 0,
      hasNextPage: targetPage.pageIndex < pages.length - 1,
    };
  },
});
