/**
 * NotePages types and constants
 * Extracted from convex/notePages.ts for better organization
 */

import type { Doc, Id } from '../_generated/dataModel';

// Types
export type NotePageDoc = Doc<'note_pages'>;
export type NoteKind = 'quote_card' | 'longform_page' | 'vocab_item';

export type PageMetadata = {
  kind?: string;
  notebookKey?: string;
  pinned?: boolean;
};

export type SourceNotebookBucket = {
  notebookKey: string;
  notebookId: Id<'notebooks'>;
  count: number;
  latestCreatedAt: number;
};

export type SearchFacet = {
  type: string;
  count: number;
  label?: string;
};

export type SearchResult = {
  pages: NotePageDoc[];
  facets: SearchFacet[];
  hasMore: boolean;
  nextCursor?: string;
};

export type BlockInput = {
  blockKey?: string;
  blockType: string;
  content: unknown;
  props?: Record<string, unknown>;
  sortOrder: number;
};

export type PageInput = {
  notebookKey: string;
  title: string;
  kind: NoteKind;
  tags: string[];
  blocks: BlockInput[];
  sortOrder?: number;
};

export type UpdatePageInput = {
  title?: string;
  tags?: string[];
  blocks?: BlockInput[];
  sortOrder?: number;
};

// Constants
export const MAX_SEARCH_LIMIT = 100;
export const MAX_PAGE_SCAN = 2500;
export const PREVIEW_MAX = 200;
export const SNIPPET_MAX = 280;
export const LEGACY_ALL_NOTES_MIGRATION_KEY = 'migration:legacy-all-notes:v1';
export const SOURCE_NOTEBOOK_MIGRATION_KEY = 'migration:notebook-source-buckets:v1';
export const NOTEBOOK_CONTAINER_FLAG = 'isNotebookContainer';
export const NOTEBOOK_KEY_FIELD = 'notebookKey';

// Validators
export const blockInputValidator = {
  blockKey: 'string?',
  blockType: 'string',
  content: 'any',
  props: 'record(string, any)?',
  sortOrder: 'number',
} as const;

export const pageInputValidator = {
  notebookKey: 'string',
  title: 'string',
  kind: 'string',
  tags: 'array(string)',
  blocks: 'array(any)',
  sortOrder: 'number?',
} as const;

export const updatePageInputValidator = {
  title: 'string?',
  tags: 'array(string)?',
  blocks: 'array(any)?',
  sortOrder: 'number?',
} as const;
