/**
 * NotePages query functions
 * Extracted from convex/notePages.ts for better organization
 */

import { query } from '../_generated/server';
import { v } from 'convex/values';
import { getOptionalAuthUserId } from '../utils';
import type { Id } from '../_generated/dataModel';
import { MAX_SEARCH_LIMIT, MAX_PAGE_SCAN, type PageMetadata } from './notePagesTypes';
import { normalizeSortOrder, generateSnippet } from './notePagesUtils';

type NotebookInfo = {
  notebookKey: string;
  notebookId: Id<'note_pages'>;
  title: string;
  icon: string | undefined;
  count: number;
  createdAt: number;
  updatedAt: number;
};

// List pages for a user
export const listPages = query({
  args: {
    parentPageId: v.optional(v.id('note_pages')),
    includeArchived: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 500, 2000));
    const includeArchived = args.includeArchived ?? false;

    const pages = await ctx.db
      .query('note_pages')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(limit);

    return pages
      .filter(page => {
        if (!includeArchived && page.isArchived) return false;
        if (args.parentPageId === undefined) return !page.parentPageId;
        return page.parentPageId === args.parentPageId;
      })
      .sort((a, b) => {
        const metaA = normalizeMetadata(a.metadata);
        const metaB = normalizeMetadata(b.metadata);
        const pinnedA = metaA.pinned === true ? 1 : 0;
        const pinnedB = metaB.pinned === true ? 1 : 0;
        if (pinnedA !== pinnedB) return pinnedB - pinnedA;

        const orderA = normalizeSortOrder(a.sortOrder, Number.MAX_SAFE_INTEGER);
        const orderB = normalizeSortOrder(b.sortOrder, Number.MAX_SAFE_INTEGER);
        if (orderA !== orderB) return orderA - orderB;
        return b.updatedAt - a.updatedAt;
      })
      .map(page => {
        const metadata = normalizeMetadata(page.metadata);
        const preview = page.previewText || '';
        return {
          id: page._id,
          parentPageId: page.parentPageId,
          title: page.title,
          icon: page.icon,
          preview,
          tags: page.tags || [],
          kind: metadata.kind || 'longform_page',
          pinned: page.pinned || false,
          sortOrder: normalizeSortOrder(page.sortOrder, 0),
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      });
  },
});

// List notebooks for a user
export const listNotebooks = query({
  args: {
    includeEmpty: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const pages = await ctx.db
      .query('note_pages')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    const notebookMap = new Map<string, NotebookInfo>();
    
    for (const page of pages) {
      const metadata = normalizeMetadata(page.metadata);
      if (metadata.kind === 'notebook_container') {
        const notebookKey = metadata.notebookKey || 'default';
        if (!notebookMap.has(notebookKey)) {
          notebookMap.set(notebookKey, {
            notebookKey,
            notebookId: page._id,
            title: page.title,
            icon: page.icon,
            count: 0,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt,
          });
        }
      }
    }

    // Count pages in each notebook
    for (const page of pages) {
      const metadata = normalizeMetadata(page.metadata);
      const notebookKey = metadata.notebookKey || 'default';
      const notebook = notebookMap.get(notebookKey);
      if (notebook && !page.isArchived) {
        notebook.count++;
      }
    }

    const notebooks = Array.from(notebookMap.values());
    
    if (!args.includeEmpty) {
      return notebooks.filter(nb => nb.count > 0);
    }

    return notebooks.sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

// Get a specific page
export const getPage = query({
  args: {
    pageId: v.id('note_pages'),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const page = await ctx.db.get(args.pageId);
    if (!page || page.userId !== userId || page.isArchived) {
      return null;
    }

    const metadata = normalizeMetadata(page.metadata);
    return {
      id: page._id,
      parentPageId: page.parentPageId,
      notebookKey: metadata.notebookKey,
      title: page.title,
      icon: page.icon,
      content: page.previewText || '',
      tags: page.tags || [],
      kind: metadata.kind || 'longform_page',
      pinned: metadata.pinned || false,
      sortOrder: normalizeSortOrder(page.sortOrder, 0),
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
    };
  },
});

// Search pages
export const search = query({
  args: {
    query: v.string(),
    notebookKey: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return { pages: [], facets: [], hasMore: false };

    const limit = Math.max(1, Math.min(args.limit ?? MAX_SEARCH_LIMIT, MAX_SEARCH_LIMIT));
    const query = args.query.toLowerCase().trim();
    
    if (!query) {
      return { pages: [], facets: [], hasMore: false };
    }

    const pages = await ctx.db
      .query('note_pages')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(MAX_PAGE_SCAN);

    const filteredPages = pages.filter(page => {
      if (page.isArchived) return false;
      const metadata = normalizeMetadata(page.metadata);
      if (args.notebookKey && metadata.notebookKey !== args.notebookKey) return false;
      if (args.tags && args.tags.length > 0) {
        const pageTags = page.tags || [];
        if (!args.tags.some(tag => pageTags.includes(tag))) return false;
      }
      
      const titleMatch = page.title.toLowerCase().includes(query);
      const contentMatch = typeof page.previewText === 'string' && 
        page.previewText.toLowerCase().includes(query);
      
      return titleMatch || contentMatch;
    });

    const results = filteredPages
      .slice(0, limit)
      .map(page => {
        const metadata = normalizeMetadata(page.metadata);
        const snippet = generateSnippet(page.previewText, args.query);
        return {
          id: page._id,
          parentPageId: page.parentPageId,
          notebookKey: metadata.notebookKey,
          title: page.title,
          icon: page.icon,
          snippet,
          tags: page.tags || [],
          kind: metadata.kind || 'longform_page',
          pinned: metadata.pinned || false,
          sortOrder: normalizeSortOrder(page.sortOrder, 0),
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      });

    // Generate facets
    const facetMap = new Map<string, number>();
    for (const page of filteredPages) {
      const metadata = normalizeMetadata(page.metadata);
      const kind = metadata.kind || 'longform_page';
      facetMap.set(kind, (facetMap.get(kind) || 0) + 1);
    }

    const facets = Array.from(facetMap.entries()).map(([type, count]) => ({
      type,
      count,
      label: type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    }));

    return {
      pages: results,
      facets,
      hasMore: filteredPages.length > limit,
    };
  },
});

// Helper functions
const normalizeMetadata = (metadata: unknown): PageMetadata => {
  if (!metadata || typeof metadata !== 'object') return {};
  return metadata as PageMetadata;
};
