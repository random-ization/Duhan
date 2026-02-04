'use node';
import { action } from './_generated/server';
import { v } from 'convex/values';
import { createPresignedUploadUrl } from './storagePresign';

/**
 * Generate AWS Signature V4 presigned URL for DigitalOcean Spaces
 * This allows frontend to upload directly to S3-compatible storage
 */
export const getUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
    folder: v.optional(v.string()),
    key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return createPresignedUploadUrl(args);
  },
});
