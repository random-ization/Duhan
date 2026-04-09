'use node';

import { internalAction } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { makeFunctionReference } from 'convex/server';
import type { FunctionReference } from 'convex/server';
import type { Id } from './_generated/dataModel';
import EPub from 'epub';
import { getSpacesCoreConfig, getSpacesCdnBaseUrl, getSpacesHost } from './spacesConfig';

const markProcessingMutation = makeFunctionReference<
  'mutation',
  { bookId: Id<'reading_library_books'> },
  { success: boolean }
>('readingLibrary:markProcessing') as unknown as FunctionReference<
  'mutation',
  'internal',
  { bookId: Id<'reading_library_books'> },
  { success: boolean }
>;

const completeProcessingMutation = makeFunctionReference<
  'mutation',
  {
    bookId: Id<'reading_library_books'>;
    title: string;
    author: string;
    description?: string;
    language: string;
    toc: Array<{ title: string; href: string; level: number }>;
    chapters: Array<{
      chapterIndex: number;
      title: string;
      href: string;
      htmlSanitized: string;
      plainText: string;
      paragraphs: string[];
      wordCount: number;
    }>;
    coverObjectKey?: string;
    coverSignedUrlCache?: string;
  },
  { success: boolean }
>('readingLibrary:completeProcessing') as unknown as FunctionReference<
  'mutation',
  'internal',
  {
    bookId: Id<'reading_library_books'>;
    title: string;
    author: string;
    description?: string;
    language: string;
    toc: Array<{ title: string; href: string; level: number }>;
    chapters: Array<{
      chapterIndex: number;
      title: string;
      href: string;
      htmlSanitized: string;
      plainText: string;
      paragraphs: string[];
      wordCount: number;
    }>;
    coverObjectKey?: string;
    coverSignedUrlCache?: string;
  },
  { success: boolean }
>;

const failProcessingMutation = makeFunctionReference<
  'mutation',
  { bookId: Id<'reading_library_books'>; message: string },
  { success: boolean }
>('readingLibrary:failProcessing') as unknown as FunctionReference<
  'mutation',
  'internal',
  { bookId: Id<'reading_library_books'>; message: string },
  { success: boolean }
>;

const getBookForProcessingQuery = makeFunctionReference<
  'query',
  { bookId: Id<'reading_library_books'> },
  {
    _id: Id<'reading_library_books'>;
    title: string;
    author: string;
    description?: string;
    language: string;
    epubObjectKey: string;
  }
>('readingLibrary:getBookForProcessing') as unknown as FunctionReference<
  'query',
  'internal',
  { bookId: Id<'reading_library_books'> },
  {
    _id: Id<'reading_library_books'>;
    title: string;
    author: string;
    description?: string;
    language: string;
    epubObjectKey: string;
  }
>;

function getPublicObjectUrl(key: string): string {
  const spaces = getSpacesCoreConfig();
  if (!spaces) {
    throw new ConvexError({ code: 'STORAGE_CONFIG_MISSING' });
  }
  const host = getSpacesHost(spaces.endpoint);
  const cdnBase = getSpacesCdnBaseUrl(spaces.bucket, host);
  return `${cdnBase}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

function sanitizeChapterHtml(input: string): string {
  return input
    .replaceAll(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replaceAll(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replaceAll(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
    .replaceAll(/<img[^>]*>/gi, '')
    .replaceAll(/\son[a-z]+="[^"]*"/gi, '')
    .replaceAll(/\son[a-z]+='[^']*'/gi, '')
    .replaceAll(/\s(href|src)=("|')javascript:[^"']*(["'])/gi, ' $1="#"');
}

function htmlToPlainText(input: string): string {
  return input
    .replaceAll(/<br\s*\/?>/gi, '\n')
    .replaceAll(/<\/p>/gi, '\n\n')
    .replaceAll(/<[^>]+>/g, ' ')
    .replaceAll(/&nbsp;/g, ' ')
    .replaceAll(/&amp;/g, '&')
    .replaceAll(/&lt;/g, '<')
    .replaceAll(/&gt;/g, '>')
    .replaceAll(/\s+\n/g, '\n')
    .replaceAll(/\n{3,}/g, '\n\n')
    .replaceAll(/[ \t]{2,}/g, ' ')
    .trim();
}

function splitParagraphs(input: string): string[] {
  return input
    .split(/\n{2,}/)
    .map(paragraph => paragraph.trim())
    .filter(Boolean);
}

export const processUploadedBook = internalAction({
  args: {
    bookId: v.id('reading_library_books'),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(markProcessingMutation, { bookId: args.bookId });

    try {
      const bookRecord = await ctx.runQuery(getBookForProcessingQuery, { bookId: args.bookId });
      const publicUrl = getPublicObjectUrl(bookRecord.epubObjectKey);
      const response = await fetch(publicUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch EPUB: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const epub = new EPub(buffer);
      await epub.parse();

      const toc = (epub.toc || []).map(item => ({
        title: String(item.title || 'Untitled'),
        href: String(item.href || ''),
        level: Number(item.level || 0),
      }));

      const chapters = [];
      for (let index = 0; index < (epub.flow || []).length; index += 1) {
        const entry = epub.flow[index];
        const rawHtml = await epub.getChapter(entry.id);
        const htmlSanitized = sanitizeChapterHtml(rawHtml);
        const plainText = htmlToPlainText(htmlSanitized);
        const paragraphs = splitParagraphs(plainText);
        const wordCount = plainText ? plainText.split(/\s+/).filter(Boolean).length : 0;
        chapters.push({
          chapterIndex: index,
          title: String(entry.title || `Chapter ${index + 1}`),
          href: String(entry.href || ''),
          htmlSanitized,
          plainText,
          paragraphs,
          wordCount,
        });
      }

      if (chapters.length === 0) {
        throw new Error('No readable chapters found in EPUB');
      }

      await ctx.runMutation(completeProcessingMutation, {
        bookId: args.bookId,
        title: String(epub.metadata.title || bookRecord.title),
        author: String(epub.metadata.creator || bookRecord.author),
        description:
          typeof epub.metadata.description === 'string' && epub.metadata.description.trim()
            ? epub.metadata.description.trim()
            : bookRecord.description,
        language: String(epub.metadata.language || bookRecord.language || 'en'),
        toc,
        chapters,
      });

      return { success: true };
    } catch (error) {
      await ctx.runMutation(failProcessingMutation, {
        bookId: args.bookId,
        message: error instanceof Error ? error.message : String(error),
      });
      return { success: false };
    }
  },
});
