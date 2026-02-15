import { mutation, query } from './_generated/server';
import { v } from 'convex/values';
import { getAuthUserId } from './utils';

/**
 * Generate an upload URL for Convex built-in storage
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async ctx => {
    await getAuthUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Get the public URL for a stored file
 */
export const getFileUrl = query({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

/**
 * Store a file upload result and return the public URL
 */
export const saveUploadedFile = mutation({
  args: { storageId: v.id('_storage') },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    const url = await ctx.storage.getUrl(args.storageId);
    return { url, storageId: args.storageId };
  },
});
