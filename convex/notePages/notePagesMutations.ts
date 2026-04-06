/**
 * NotePages mutation functions
 * Extracted from convex/notePages.ts for better organization
 */

import { mutation } from '../_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from '../utils';
import type { Doc } from '../_generated/dataModel';
import { validatePageInput, validateUpdatePageInput } from './notePagesUtils';
import type { BlockInput } from './notePagesTypes';

// Create a notebook
export const createNotebook = mutation({
  args: {
    title: v.string(),
    icon: v.optional(v.string()),
    notebookKey: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const now = Date.now();
    const pageId = await ctx.db.insert('note_pages', {
      userId,
      title: args.title,
      icon: args.icon,
      metadata: {
        kind: 'notebook_container',
        notebookKey: args.notebookKey,
      },
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, pageId };
  },
});

// Create a page
export const createPage = mutation({
  args: {
    notebookKey: v.string(),
    title: v.string(),
    kind: v.string(),
    tags: v.array(v.string()),
    blocks: v.array(v.any()),
    sortOrder: v.optional(v.number()),
    parentPageId: v.optional(v.id('note_pages')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    validatePageInput(args);

    const now = Date.now();
    const pageId = await ctx.db.insert('note_pages', {
      userId,
      parentPageId: args.parentPageId,
      title: args.title,
      tags: args.tags,
      metadata: {
        kind: args.kind,
        notebookKey: args.notebookKey,
      },
      sortOrder: args.sortOrder,
      previewText: generatePreview(args.blocks),
      createdAt: now,
      updatedAt: now,
    });

    // Create blocks if provided
    if (args.blocks && args.blocks.length > 0) {
      for (const block of args.blocks) {
        await ctx.db.insert('note_blocks', {
          userId,
          pageId,
          blockKey: block.blockKey,
          blockType: block.blockType,
          content: block.content,
          props: block.props,
          sortOrder: block.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true, pageId };
  },
});

// Update a page
export const updatePage = mutation({
  args: {
    pageId: v.id('note_pages'),
    title: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    blocks: v.optional(v.array(v.any())),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const page = await ctx.db.get(args.pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    validateUpdatePageInput(args);

    const updates: Partial<Doc<'note_pages'>> = {
      updatedAt: Date.now(),
    };

    if (args.title !== undefined) updates.title = args.title;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;
    if (args.blocks !== undefined) updates.previewText = generatePreview(args.blocks);

    await ctx.db.patch(args.pageId, updates);

    // Update blocks if provided
    if (args.blocks !== undefined) {
      // Delete existing blocks
      const existingBlocks = await ctx.db
        .query('note_blocks')
        .withIndex('by_page', q => q.eq('pageId', args.pageId))
        .collect();

      for (const block of existingBlocks) {
        await ctx.db.delete(block._id);
      }

      // Create new blocks
      const now = Date.now();
      for (const block of args.blocks) {
        await ctx.db.insert('note_blocks', {
          userId,
          pageId: args.pageId,
          blockKey: block.blockKey,
          blockType: block.blockType,
          content: block.content,
          props: block.props,
          sortOrder: block.sortOrder,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    return { success: true };
  },
});

// Move a page to another notebook or parent
export const movePage = mutation({
  args: {
    pageId: v.id('note_pages'),
    notebookKey: v.string(),
    parentPageId: v.optional(v.id('note_pages')),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const page = await ctx.db.get(args.pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    await ctx.db.patch(args.pageId, {
      parentPageId: args.parentPageId,
      metadata: {
        ...page.metadata,
        notebookKey: args.notebookKey,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Archive a page
export const archivePage = mutation({
  args: {
    pageId: v.id('note_pages'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const page = await ctx.db.get(args.pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    await ctx.db.patch(args.pageId, {
      isArchived: true,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

// Toggle pin status
export const togglePin = mutation({
  args: {
    pageId: v.id('note_pages'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error('Authentication required');

    const page = await ctx.db.get(args.pageId);
    if (!page || page.userId !== userId) {
      throw new Error('Page not found or access denied');
    }

    const currentPinned = page.pinned || false;
    await ctx.db.patch(args.pageId, {
      pinned: !currentPinned,
      updatedAt: Date.now(),
    });

    return { success: true, pinned: !currentPinned };
  },
});

// Helper function to generate preview from blocks
const generatePreview = (blocks: BlockInput[]): string => {
  if (!blocks || blocks.length === 0) return '';
  
  const textBlocks = blocks
    .filter(block => block.content && typeof block.content === 'string')
    .map(block => block.content as string)
    .join(' ');
  
  return textBlocks.length > 200 
    ? textBlocks.substring(0, 200) + '...' 
    : textBlocks;
};
