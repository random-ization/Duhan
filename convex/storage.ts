'use node';
import { action } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId } from '@convex-dev/auth/server';
import { createPresignedUploadUrl } from './storagePresign';

const MiB = 1024 * 1024;

const UPLOAD_POLICIES = {
  avatars: { maxSize: 5 * MiB, contentTypePrefixes: ['image/'] },
  audio: { maxSize: 50 * MiB, contentTypePrefixes: ['audio/'] },
  podcasts: { maxSize: 250 * MiB, contentTypePrefixes: ['audio/'] },
  'reading-audio': { maxSize: 50 * MiB, contentTypePrefixes: ['audio/'] },
  ebooks: { maxSize: 100 * MiB, contentTypePrefixes: ['application/epub+zip'] },
  'topik-writing': { maxSize: 15 * MiB, contentTypePrefixes: ['image/'] },
  uploads: {
    maxSize: 500 * MiB,
    contentTypePrefixes: ['image/', 'audio/', 'video/', 'application/pdf'],
  },
} as const;

type UploadFolder = keyof typeof UPLOAD_POLICIES;

function sanitizePathSegment(segment: string): string {
  const cleaned = segment
    .trim()
    .replaceAll(/[^A-Za-z0-9._-]+/g, '-')
    .replaceAll(/-+/g, '-');
  return cleaned.replaceAll(/^-+|-+$/g, '');
}

function sanitizeFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() || 'upload.bin';
  const cleaned = sanitizePathSegment(base);
  return cleaned || 'upload.bin';
}

function normalizeFolder(folder?: string): string {
  const raw = (folder || 'uploads').trim();
  const parts = raw.split('/').map(sanitizePathSegment).filter(Boolean);
  const [prefix, ...rest] = parts;

  if (!prefix || !(prefix in UPLOAD_POLICIES)) {
    throw new ConvexError({ code: 'INVALID_UPLOAD_FOLDER' });
  }

  return [prefix, ...rest].join('/');
}

function validateUploadRequest(args: { folder: string; contentType: string; fileSize: number }) {
  const prefix = args.folder.split('/')[0] as UploadFolder;
  const policy = UPLOAD_POLICIES[prefix];

  if (!Number.isFinite(args.fileSize) || args.fileSize <= 0 || args.fileSize > policy.maxSize) {
    throw new ConvexError({ code: 'INVALID_UPLOAD_SIZE' });
  }

  const contentType = args.contentType.trim().toLowerCase();
  const isAllowed = policy.contentTypePrefixes.some(prefixValue =>
    contentType.startsWith(prefixValue)
  );
  if (!isAllowed) {
    throw new ConvexError({ code: 'INVALID_UPLOAD_CONTENT_TYPE' });
  }
}

/**
 * Generate AWS Signature V4 presigned URL for S3-compatible object storage
 * This allows frontend to upload directly to S3-compatible storage
 */
export const getUploadUrl = action({
  args: {
    filename: v.string(),
    contentType: v.string(),
    fileSize: v.number(),
    folder: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError({ code: 'UNAUTHORIZED' });
    }

    const folder = normalizeFolder(args.folder);
    validateUploadRequest({
      folder,
      contentType: args.contentType,
      fileSize: args.fileSize,
    });

    return createPresignedUploadUrl({
      filename: sanitizeFilename(args.filename),
      contentType: args.contentType.trim(),
      folder,
    });
  },
});
