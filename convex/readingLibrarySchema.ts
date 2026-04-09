import { defineTable } from 'convex/server';
import { v } from 'convex/values';

// Reading Library Books Table
export const reading_library_books = defineTable({
  // Basic metadata
  ownerUserId: v.id('users'),
  slug: v.string(),
  title: v.string(),
  author: v.string(),
  description: v.optional(v.string()),
  language: v.string(),

  // Storage
  coverObjectKey: v.optional(v.string()),
  coverSignedUrlCache: v.optional(v.string()),
  epubObjectKey: v.string(),
  shareToken: v.optional(v.string()),
  shareEnabled: v.optional(v.boolean()),
  sharedAt: v.optional(v.number()),

  // Status and visibility
  status: v.union(
    v.literal('DRAFT_UPLOADED'),
    v.literal('PROCESSING'),
    v.literal('READY_FOR_REVIEW'),
    v.literal('IN_REVIEW'),
    v.literal('PUBLISHED'),
    v.literal('REJECTED'),
    v.literal('PROCESSING_FAILED')
  ),
  visibility: v.union(v.literal('OWNER_ONLY'), v.literal('PUBLIC')),
  accessMode: v.literal('FREE_PREVIEW_PLUS_PRO'), // Fixed for v1

  // Content metrics
  chapterCount: v.number(),
  wordCount: v.number(),
  sampleChapterCount: v.number(),

  // Structure
  toc: v.optional(
    v.array(
      v.object({
        title: v.string(),
        href: v.string(),
        level: v.number(),
      })
    )
  ),
  tags: v.optional(v.array(v.string())),

  // Review workflow
  submittedAt: v.optional(v.number()),
  reviewedAt: v.optional(v.number()),
  reviewedBy: v.optional(v.id('users')),
  reviewNote: v.optional(v.string()),

  // Timestamps
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_owner', ['ownerUserId', 'status'])
  .index('by_status', ['status', 'createdAt'])
  .index('by_visibility', ['visibility', 'status', 'createdAt'])
  .index('by_slug', ['slug'])
  .index('by_share_token', ['shareToken']);

// Reading Library Chapters Table
export const reading_library_chapters = defineTable({
  bookId: v.id('reading_library_books'),
  chapterIndex: v.number(),
  title: v.string(),
  href: v.string(),
  htmlSanitized: v.string(),
  plainText: v.string(),
  paragraphs: v.optional(v.array(v.string())), // For block-level tracking
  wordCount: v.number(),
  createdAt: v.number(),
}).index('by_book', ['bookId', 'chapterIndex']);

// Reading Library Progress Table
export const reading_library_progress = defineTable({
  userId: v.id('users'),
  bookId: v.id('reading_library_books'),
  chapterIndex: v.number(),
  blockId: v.optional(v.string()), // For paragraph-level tracking
  scrollTop: v.number(),
  completionPercent: v.number(),
  lastReadAt: v.number(),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index('by_user_book', ['userId', 'bookId'])
  .index('by_user', ['userId', 'lastReadAt']);
