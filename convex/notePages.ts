import { mutation, query } from './_generated/server';
import { ConvexError, v } from 'convex/values';
import { getAuthUserId, getOptionalAuthUserId } from './utils';

const normalizeSortOrder = (value: number | undefined, fallback: number) =>
  Number.isFinite(value) ? Number(value) : fallback;

const isNonEmptyString = (value: string | undefined | null): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const MAX_SEARCH_LIMIT = 100;
const MAX_PAGE_SCAN = 2500;
const PREVIEW_MAX = 200;
const SNIPPET_MAX = 280;
const LEGACY_ALL_NOTES_MIGRATION_KEY = 'migration:legacy-all-notes:v1';

const blockInputValidator = v.object({
  blockKey: v.optional(v.string()),
  blockType: v.string(),
  content: v.any(),
  props: v.optional(v.record(v.string(), v.any())),
  sortOrder: v.number(),
});

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const normalizeMetadata = (raw: unknown): Record<string, unknown> => {
  const metadata = asRecord(raw) || {};
  const status =
    typeof metadata.status === 'string' && metadata.status.trim().length > 0
      ? metadata.status.trim()
      : 'Inbox';
  const pinned = metadata.pinned === true;
  const lastReviewedAt =
    typeof metadata.lastReviewedAt === 'number' ? metadata.lastReviewedAt : undefined;

  return {
    ...metadata,
    status,
    pinned,
    ...(lastReviewedAt !== undefined ? { lastReviewedAt } : {}),
  };
};

const parseSourceModule = (metadata: Record<string, unknown>): string | undefined => {
  const sourceRef = asRecord(metadata.sourceRef);
  if (!sourceRef) return undefined;
  return typeof sourceRef.module === 'string' ? sourceRef.module : undefined;
};

const toSearchableText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(toSearchableText).join(' ');
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.values(record).map(toSearchableText).join(' ');
  }
  return '';
};

const buildSnippet = (haystack: string, needle: string) => {
  if (!needle.trim()) return haystack.trim().slice(0, SNIPPET_MAX);
  const idx = haystack.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return haystack.trim().slice(0, SNIPPET_MAX);
  const start = Math.max(0, idx - 48);
  const end = Math.min(haystack.length, idx + needle.length + 72);
  return haystack.slice(start, end).trim();
};

const blockKeyFor = (block: { blockKey?: string; sortOrder: number }, index: number, now: number) => {
  const explicit = block.blockKey?.trim();
  if (explicit) return explicit;
  return `block-${now}-${block.sortOrder}-${index}`;
};

const anchorKeyFor = (args: {
  scopeType: string;
  scopeId: string;
  blockId: string;
  start: number;
  end: number;
  quote: string;
}) =>
  [args.scopeType, args.scopeId, args.blockId, String(args.start), String(args.end), args.quote]
    .map(item => item.replaceAll('|', '\\|'))
    .join('|');

const normalizeSourceModule = (value?: string) => (value?.trim().toUpperCase() || 'PRACTICE');

const normalizeNoteType = (value?: string) => (value?.trim().toLowerCase() || 'manual');

const normalizeStatus = (value?: string) => (value?.trim() || 'Inbox');

const normalizeColor = (value?: string) => {
  if (!value) return '';
  if (value === '__none__') return '';
  return value;
};

const buildFallbackDedupeKey = (args: {
  sourceModule: string;
  sourceRef?: Record<string, unknown>;
  title?: string;
  quote?: string;
  note?: string;
  noteType: string;
}) => {
  const contentId =
    typeof args.sourceRef?.contentId === 'string'
      ? args.sourceRef.contentId
      : typeof args.sourceRef?.scopeId === 'string'
        ? args.sourceRef.scopeId
        : '';
  const blockId = typeof args.sourceRef?.blockId === 'string' ? args.sourceRef.blockId : '';
  const excerpt = (args.quote || args.note || '').trim().slice(0, 120).toLowerCase();
  const title = (args.title || '').trim().slice(0, 100).toLowerCase();
  return [args.sourceModule, args.noteType, contentId, blockId, title, excerpt].join('|');
};

const buildSearchTextFromBlocks = (
  title: string,
  tags: string[] | undefined,
  blocks: Array<{ content: unknown }>
) => {
  const blockText = blocks.map(block => toSearchableText(block.content)).join(' ');
  return `${title} ${(tags || []).join(' ')} ${blockText}`.trim().slice(0, 8000);
};

const defaultEditorDoc = () => ({
  type: 'doc',
  content: [{ type: 'paragraph' }],
});

const normalizeEditorDoc = (value: unknown) => {
  const record = asRecord(value);
  if (record?.type === 'doc') return record;
  return defaultEditorDoc();
};

const extractEditorDocText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map(extractEditorDocText).join(' ');
  }
  const record = asRecord(value);
  if (!record) return '';
  const text = typeof record.text === 'string' ? record.text : '';
  const contentText = extractEditorDocText(record.content);
  return `${text} ${contentText}`.trim();
};

const editorDocHasHighlight = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(item => editorDocHasHighlight(item));
  const record = asRecord(value);
  if (!record) return false;
  const marks = Array.isArray(record.marks) ? record.marks : [];
  const hasMark = marks.some(mark => {
    const markRecord = asRecord(mark);
    return markRecord?.type === 'highlight';
  });
  if (hasMark) return true;
  return editorDocHasHighlight(record.content);
};

const blockToEditorNode = (block: { blockType: string; content: unknown }) => {
  const text = toSearchableText(block.content).trim();
  const textNode = text ? [{ type: 'text', text }] : undefined;

  if (block.blockType === 'heading_1') {
    return { type: 'heading', attrs: { level: 1 }, content: textNode };
  }
  if (block.blockType === 'heading_2') {
    return { type: 'heading', attrs: { level: 2 }, content: textNode };
  }
  if (block.blockType === 'quote') {
    return { type: 'blockquote', content: [{ type: 'paragraph', content: textNode }] };
  }
  if (block.blockType === 'code') {
    return { type: 'codeBlock', content: textNode };
  }
  if (block.blockType === 'bulleted_list') {
    return {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: textNode }] }],
    };
  }
  if (block.blockType === 'numbered_list') {
    return {
      type: 'orderedList',
      content: [{ type: 'listItem', content: [{ type: 'paragraph', content: textNode }] }],
    };
  }
  if (block.blockType === 'todo') {
    return {
      type: 'taskList',
      content: [
        { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: textNode }] },
      ],
    };
  }
  return { type: 'paragraph', content: textNode };
};

const extractEditorDocFromBlocks = (
  blocks: Array<{ blockType: string; content: unknown }>
): Record<string, unknown> | null => {
  const tiptapBlock = blocks.find(block => block.blockType === 'tiptap_doc');
  if (!tiptapBlock) return null;
  return normalizeEditorDoc(tiptapBlock.content);
};

const blocksToEditorDoc = (blocks: Array<{ blockType: string; content: unknown; sortOrder: number }>) => {
  const fromStored = extractEditorDocFromBlocks(blocks);
  if (fromStored) return fromStored;

  const sorted = blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const content = sorted.map(block => blockToEditorNode(block));
  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
};

const derivePageIndexesFromBlocks = (args: {
  title: string;
  tags?: string[];
  blocks: Array<{ blockType: string; blockKey?: string; content: unknown; sortOrder: number }>;
}) => {
  const editorDoc = blocksToEditorDoc(args.blocks);
  const docText = extractEditorDocText(editorDoc).trim();
  const searchableText = `${args.title} ${(args.tags || []).join(' ')} ${docText}`.trim().slice(0, 8000);
  const detected = detectNoteAndHighlight(args.blocks);
  const hasHighlight = detected.hasHighlight || editorDocHasHighlight(editorDoc);
  const hasNote = detected.hasNote || docText.length > 0;

  return {
    editorDoc,
    searchText: searchableText,
    previewText: docText.slice(0, PREVIEW_MAX),
    hasNote,
    hasHighlight,
  };
};

const detectNoteAndHighlight = (
  blocks: Array<{ blockType: string; blockKey?: string; content: unknown }>
) => {
  const hasNote = blocks.some(block => {
    if (block.blockType !== 'paragraph') return false;
    const key = block.blockKey || '';
    if (key === 'note' || key === 'legacy-content') return true;
    return isNonEmptyString(toSearchableText(block.content));
  });
  const hasHighlight = blocks.some(block => {
    if (block.blockType === 'quote') {
      const record = asRecord(block.content);
      if (!record) return true;
      const color = normalizeColor(typeof record.color === 'string' ? record.color : '');
      return color.length > 0;
    }
    return false;
  });
  return { hasNote, hasHighlight };
};

const parseSourceModuleFromPage = (page: {
  sourceModule?: string;
  metadata?: unknown;
}) => page.sourceModule || parseSourceModule(normalizeMetadata(page.metadata));

const parseNoteTypeFromPage = (page: {
  noteType?: string;
  metadata?: unknown;
}) => {
  if (typeof page.noteType === 'string' && page.noteType.trim()) return page.noteType;
  const metadata = normalizeMetadata(page.metadata);
  return typeof metadata.noteType === 'string' && metadata.noteType.trim()
    ? metadata.noteType
    : 'manual';
};

const parsePageStatus = (page: {
  status?: string;
  metadata?: unknown;
}) => {
  if (typeof page.status === 'string' && page.status.trim()) return page.status;
  const metadata = normalizeMetadata(page.metadata);
  return typeof metadata.status === 'string' && metadata.status.trim() ? metadata.status : 'Inbox';
};

const parsePagePinned = (page: {
  pinned?: boolean;
  metadata?: unknown;
}) => {
  if (typeof page.pinned === 'boolean') return page.pinned;
  const metadata = normalizeMetadata(page.metadata);
  return metadata.pinned === true;
};

const parseLastReviewedAt = (page: {
  lastReviewedAt?: number;
  metadata?: unknown;
}) => {
  if (typeof page.lastReviewedAt === 'number') return page.lastReviewedAt;
  const metadata = normalizeMetadata(page.metadata);
  return typeof metadata.lastReviewedAt === 'number' ? metadata.lastReviewedAt : undefined;
};

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

        const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return b.updatedAt - a.updatedAt;
      })
      .map(page => {
        const metadata = normalizeMetadata(page.metadata);
        const sourceModule = parseSourceModuleFromPage(page);
        const noteType = parseNoteTypeFromPage(page);
        const status = parsePageStatus(page);
        const pinned = parsePagePinned(page);
        const lastReviewedAt = parseLastReviewedAt(page);
        return {
          id: page._id,
          parentPageId: page.parentPageId,
          title: page.title,
          icon: page.icon,
          cover: page.cover,
          tags: page.tags ?? [],
          isArchived: page.isArchived ?? false,
          isTemplate: page.isTemplate ?? false,
          sortOrder: page.sortOrder ?? 0,
          metadata,
          pinned,
          status,
          sourceModule,
          noteType,
          dedupeKey: page.dedupeKey,
          previewText: page.previewText,
          searchText: page.searchText,
          hasNote: page.hasNote ?? false,
          hasHighlight: page.hasHighlight ?? false,
          lastReviewedAt: lastReviewedAt ?? null,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt,
        };
      });
  },
});

export const getPage = query({
  args: {
    pageId: v.id('note_pages'),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return null;

    const page = await ctx.db.get(args.pageId);
    if (!page || page.userId !== userId) return null;

    const [blocks, linksFrom, linksTo, children] = await Promise.all([
      ctx.db
        .query('note_blocks')
        .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
        .collect(),
      ctx.db
        .query('note_links')
        .withIndex('by_user_source', q => q.eq('userId', userId).eq('sourcePageId', args.pageId))
        .collect(),
      ctx.db
        .query('note_links')
        .withIndex('by_user_target', q => q.eq('userId', userId).eq('targetPageId', args.pageId))
        .collect(),
      ctx.db
        .query('note_pages')
        .withIndex('by_user_parent', q => q.eq('userId', userId).eq('parentPageId', args.pageId))
        .collect(),
    ]);

    const sourceIds = [...new Set(linksTo.map(link => link.sourcePageId))];
    const targetIds = [...new Set(linksFrom.map(link => link.targetPageId))];

    const [sourcePages, targetPages] = await Promise.all([
      Promise.all(sourceIds.map(id => ctx.db.get(id))),
      Promise.all(targetIds.map(id => ctx.db.get(id))),
    ]);

    const metadata = normalizeMetadata(page.metadata);
    const sourceModule = parseSourceModuleFromPage(page);
    const noteType = parseNoteTypeFromPage(page);
    const status = parsePageStatus(page);
    const pinned = parsePagePinned(page);
    const lastReviewedAt = parseLastReviewedAt(page);

    const sortedBlocks = blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    const derived = derivePageIndexesFromBlocks({
      title: page.title,
      tags: page.tags ?? [],
      blocks: sortedBlocks,
    });

    return {
      page: {
        id: page._id,
        parentPageId: page.parentPageId,
        title: page.title,
        icon: page.icon,
        cover: page.cover,
        tags: page.tags ?? [],
        isArchived: page.isArchived ?? false,
        isTemplate: page.isTemplate ?? false,
        sortOrder: page.sortOrder ?? 0,
        metadata,
        pinned,
        status,
        sourceModule,
        noteType,
        dedupeKey: page.dedupeKey,
        previewText: page.previewText,
        searchText: page.searchText,
        hasNote: page.hasNote ?? false,
        hasHighlight: page.hasHighlight ?? false,
        lastReviewedAt: lastReviewedAt ?? null,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt,
      },
      editorDoc: derived.editorDoc,
      blocks: sortedBlocks.map(block => ({
          id: block._id,
          blockKey: block.blockKey,
          blockType: block.blockType,
          content: block.content,
          props: block.props ?? {},
          sortOrder: block.sortOrder,
          createdAt: block.createdAt,
          updatedAt: block.updatedAt,
        })),
      backlinks: sourcePages
        .filter((item): item is NonNullable<typeof item> => !!item)
        .map(item => ({ id: item._id, title: item.title, icon: item.icon })),
      outgoingLinks: targetPages
        .filter((item): item is NonNullable<typeof item> => !!item)
        .map(item => ({ id: item._id, title: item.title, icon: item.icon })),
      children: children
        .slice()
        .sort((a, b) => {
          const metaA = normalizeMetadata(a.metadata);
          const metaB = normalizeMetadata(b.metadata);
          const pinnedA = metaA.pinned === true ? 1 : 0;
          const pinnedB = metaB.pinned === true ? 1 : 0;
          if (pinnedA !== pinnedB) return pinnedB - pinnedA;

          const orderA = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
          const orderB = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
          if (orderA !== orderB) return orderA - orderB;
          return b.updatedAt - a.updatedAt;
        })
        .map(child => ({
          id: child._id,
          title: child.title,
          icon: child.icon,
          sortOrder: child.sortOrder ?? 0,
          isArchived: child.isArchived ?? false,
          metadata: normalizeMetadata(child.metadata),
        })),
    };
  },
});

export const search = query({
  args: {
    query: v.optional(v.string()),
    tag: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    statuses: v.optional(v.array(v.string())),
    sourceModule: v.optional(v.string()),
    sourceModules: v.optional(v.array(v.string())),
    noteType: v.optional(v.string()),
    noteTypes: v.optional(v.array(v.string())),
    pinned: v.optional(v.boolean()),
    reviewed: v.optional(v.boolean()),
    hasNote: v.optional(v.boolean()),
    hasHighlight: v.optional(v.boolean()),
    updatedAfter: v.optional(v.number()),
    updatedBefore: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return { items: [], nextCursor: null };

    const queryText = (args.query || '').trim();
    const limit = Math.max(1, Math.min(args.limit ?? 40, MAX_SEARCH_LIMIT));
    const sourceFilters = new Set(
      [
        ...(args.sourceModules || []),
        ...(args.sourceModule ? [args.sourceModule] : []),
      ]
        .map(normalizeSourceModule)
        .filter(Boolean)
    );
    const typeFilters = new Set(
      [
        ...(args.noteTypes || []),
        ...(args.noteType ? [args.noteType] : []),
      ]
        .map(normalizeNoteType)
        .filter(Boolean)
    );
    const statusFilters = new Set(
      [
        ...(args.statuses || []),
        ...(args.status ? [args.status] : []),
      ]
        .map(item => item.trim())
        .filter(Boolean)
    );
    const tagFilters = new Set(
      [
        ...(args.tags || []),
        ...(args.tag ? [args.tag] : []),
      ]
        .map(item => item.trim())
        .filter(Boolean)
    );

    const pages = await ctx.db
      .query('note_pages')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(MAX_PAGE_SCAN);

    const withText = await Promise.all(
      pages
        .filter(page => !page.isArchived)
        .map(async page => {
          const metadata = normalizeMetadata(page.metadata);
          const sourceModule = parseSourceModuleFromPage(page);
          const noteType = parseNoteTypeFromPage(page);
          const status = parsePageStatus(page);
          const pinned = parsePagePinned(page);
          const reviewedAt = parseLastReviewedAt(page);
          const tags = page.tags || [];

          if (args.pinned !== undefined && pinned !== args.pinned) return null;
          if (statusFilters.size > 0 && !statusFilters.has(status)) return null;
          if (sourceFilters.size > 0 && !sourceFilters.has(normalizeSourceModule(sourceModule))) {
            return null;
          }
          if (typeFilters.size > 0 && !typeFilters.has(normalizeNoteType(noteType))) return null;
          if (tagFilters.size > 0 && !tags.some(tag => tagFilters.has(tag))) return null;
          const reviewed = typeof reviewedAt === 'number';
          if (args.reviewed !== undefined && reviewed !== args.reviewed) return null;
          if (args.updatedBefore !== undefined && page.updatedAt >= args.updatedBefore) return null;
          if (args.updatedAfter !== undefined && page.updatedAt <= args.updatedAfter) return null;

          let blocks:
            | Array<{ blockType: string; blockKey?: string; content: unknown; sortOrder: number }>
            | null = null;
          const ensureBlocks = async () => {
            if (blocks) return blocks;
            blocks = await ctx.db
              .query('note_blocks')
              .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', page._id))
              .collect();
            return blocks;
          };

          let hasNote = page.hasNote;
          let hasHighlight = page.hasHighlight;
          if (typeof hasNote !== 'boolean' || typeof hasHighlight !== 'boolean') {
            const rows = await ensureBlocks();
            const detected = detectNoteAndHighlight(rows);
            hasNote = detected.hasNote;
            hasHighlight = detected.hasHighlight;
          }

          if (args.hasNote !== undefined && hasNote !== args.hasNote) return null;
          if (args.hasHighlight !== undefined && hasHighlight !== args.hasHighlight) return null;

          let searchText = (page.searchText || '').trim();
          if (!searchText || queryText) {
            const rows = await ensureBlocks();
            searchText = buildSearchTextFromBlocks(page.title, tags, rows);
          }

          if (queryText && !searchText.toLowerCase().includes(queryText.toLowerCase())) return null;

          const previewText = (page.previewText || '').trim();
          return {
            page,
            metadata,
            sourceModule,
            noteType,
            status,
            pinned,
            reviewedAt,
            hasNote: Boolean(hasNote),
            hasHighlight: Boolean(hasHighlight),
            searchText,
            previewText,
          };
        })
    );

    const matched = withText
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => {
        const pinnedA = a.pinned === true ? 1 : 0;
        const pinnedB = b.pinned === true ? 1 : 0;
        if (pinnedA !== pinnedB) return pinnedB - pinnedA;
        return b.page.updatedAt - a.page.updatedAt;
      });

    const sliced = matched.slice(0, limit);
    const nextCursor = matched.length > limit ? sliced[sliced.length - 1]?.page.updatedAt || null : null;

    return {
      items: sliced.map(item => ({
        id: item.page._id,
        title: item.page.title,
        icon: item.page.icon,
        tags: item.page.tags || [],
        status: item.status,
        pinned: item.pinned,
        sourceModule: item.sourceModule,
        noteType: item.noteType,
        hasNote: item.hasNote,
        hasHighlight: item.hasHighlight,
        sourceRef: asRecord(item.metadata.sourceRef),
        lastReviewedAt: item.reviewedAt ?? null,
        updatedAt: item.page.updatedAt,
        createdAt: item.page.createdAt,
        snippet: buildSnippet(item.searchText || item.previewText, queryText).slice(0, SNIPPET_MAX),
      })),
      nextCursor,
    };
  },
});

export const listFacets = query({
  args: {
    query: v.optional(v.string()),
    sourceModules: v.optional(v.array(v.string())),
    noteTypes: v.optional(v.array(v.string())),
    statuses: v.optional(v.array(v.string())),
    hasNote: v.optional(v.boolean()),
    hasHighlight: v.optional(v.boolean()),
    updatedAfter: v.optional(v.number()),
    updatedBefore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) {
      return {
        total: 0,
        todayAdded: 0,
        withNote: 0,
        withHighlight: 0,
        sources: [] as Array<{ key: string; count: number; unreviewed: number; todayAdded: number }>,
        noteTypes: [] as Array<{ key: string; count: number }>,
        statuses: [] as Array<{ key: string; count: number }>,
      };
    }

    const queryText = (args.query || '').trim().toLowerCase();
    const sourceFilters = new Set((args.sourceModules || []).map(normalizeSourceModule));
    const typeFilters = new Set((args.noteTypes || []).map(normalizeNoteType));
    const statusFilters = new Set((args.statuses || []).map(item => item.trim()).filter(Boolean));

    const pages = await ctx.db
      .query('note_pages')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(MAX_PAGE_SCAN);

    const sourceCounts = new Map<
      string,
      { count: number; unreviewed: number; todayAdded: number }
    >();
    const typeCounts = new Map<string, number>();
    const statusCounts = new Map<string, number>();
    let total = 0;
    let withNote = 0;
    let withHighlight = 0;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const dayStartMs = startOfDay.getTime();
    let todayAdded = 0;

    for (const page of pages) {
      if (page.isArchived) continue;
      const sourceModule = normalizeSourceModule(parseSourceModuleFromPage(page));
      const noteType = normalizeNoteType(parseNoteTypeFromPage(page));
      const status = parsePageStatus(page);

      if (sourceFilters.size > 0 && !sourceFilters.has(sourceModule)) continue;
      if (typeFilters.size > 0 && !typeFilters.has(noteType)) continue;
      if (statusFilters.size > 0 && !statusFilters.has(status)) continue;
      if (args.updatedBefore !== undefined && page.updatedAt >= args.updatedBefore) continue;
      if (args.updatedAfter !== undefined && page.updatedAt <= args.updatedAfter) continue;

      let hasNote = page.hasNote;
      let hasHighlight = page.hasHighlight;
      if (typeof hasNote !== 'boolean' || typeof hasHighlight !== 'boolean' || queryText) {
        const blocks = await ctx.db
          .query('note_blocks')
          .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', page._id))
          .collect();
        const detected = detectNoteAndHighlight(blocks);
        hasNote = detected.hasNote;
        hasHighlight = detected.hasHighlight;
        if (queryText) {
          const searchText = ((page.searchText || '') + ' ' + buildSearchTextFromBlocks(page.title, page.tags, blocks)).toLowerCase();
          if (!searchText.includes(queryText)) continue;
        }
      }

      if (args.hasNote !== undefined && hasNote !== args.hasNote) continue;
      if (args.hasHighlight !== undefined && hasHighlight !== args.hasHighlight) continue;

      total += 1;
      if (hasNote) withNote += 1;
      if (hasHighlight) withHighlight += 1;
      if (page.updatedAt >= dayStartMs) todayAdded += 1;

      const existingSource = sourceCounts.get(sourceModule) || {
        count: 0,
        unreviewed: 0,
        todayAdded: 0,
      };
      existingSource.count += 1;
      if (status.toLowerCase() !== 'reviewed') existingSource.unreviewed += 1;
      if (page.updatedAt >= dayStartMs) existingSource.todayAdded += 1;
      sourceCounts.set(sourceModule, existingSource);
      typeCounts.set(noteType, (typeCounts.get(noteType) || 0) + 1);
      statusCounts.set(status, (statusCounts.get(status) || 0) + 1);
    }

    return {
      total,
      todayAdded,
      withNote,
      withHighlight,
      sources: [...sourceCounts.entries()]
        .map(([key, counts]) => ({
          key,
          count: counts.count,
          unreviewed: counts.unreviewed,
          todayAdded: counts.todayAdded,
        }))
        .sort((a, b) => b.count - a.count),
      noteTypes: [...typeCounts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count),
      statuses: [...statusCounts.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count),
    };
  },
});

export const createPage = mutation({
  args: {
    parentPageId: v.optional(v.id('note_pages')),
    title: v.string(),
    icon: v.optional(v.string()),
    cover: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.record(v.string(), v.any())),
    isTemplate: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    if (args.parentPageId) {
      const parent = await ctx.db.get(args.parentPageId);
      if (!parent || parent.userId !== userId) {
        throw new ConvexError({ code: 'FORBIDDEN' });
      }
    }

    const id = await ctx.db.insert('note_pages', {
      userId,
      parentPageId: args.parentPageId,
      title: args.title.trim() || 'Untitled',
      icon: args.icon,
      cover: args.cover,
      tags: args.tags,
      metadata: normalizeMetadata(args.metadata),
      isTemplate: args.isTemplate ?? false,
      isArchived: false,
      sortOrder: normalizeSortOrder(args.sortOrder, now),
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const updatePage = mutation({
  args: {
    pageId: v.id('note_pages'),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    cover: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    metadata: v.optional(v.record(v.string(), v.any())),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const updates: {
      title?: string;
      icon?: string;
      cover?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
      sortOrder?: number;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    if (args.title !== undefined) updates.title = args.title.trim() || 'Untitled';
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.cover !== undefined) updates.cover = args.cover;
    if (args.tags !== undefined) updates.tags = args.tags;
    if (args.metadata !== undefined) {
      updates.metadata = normalizeMetadata({
        ...normalizeMetadata(page.metadata),
        ...args.metadata,
      });
    }
    if (args.sortOrder !== undefined) updates.sortOrder = args.sortOrder;

    await ctx.db.patch(args.pageId, updates);
    return { success: true };
  },
});

export const movePage = mutation({
  args: {
    pageId: v.id('note_pages'),
    parentPageId: v.optional(v.id('note_pages')),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    if (args.parentPageId) {
      const parent = await ctx.db.get(args.parentPageId);
      if (!parent || parent.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });
      if (parent._id === page._id) throw new ConvexError({ code: 'INVALID_ARGUMENT' });
    }

    await ctx.db.patch(args.pageId, {
      parentPageId: args.parentPageId,
      sortOrder: args.sortOrder,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const archivePage = mutation({
  args: {
    pageId: v.id('note_pages'),
    archived: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    await ctx.db.patch(args.pageId, {
      isArchived: args.archived,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const togglePin = mutation({
  args: {
    pageId: v.id('note_pages'),
    pinned: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const metadata = normalizeMetadata(page.metadata);
    await ctx.db.patch(args.pageId, {
      metadata: {
        ...metadata,
        pinned: args.pinned,
      },
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

export const markReviewed = mutation({
  args: {
    pageId: v.id('note_pages'),
    reviewedAt: v.optional(v.number()),
    queueStatus: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const now = args.reviewedAt ?? Date.now();
    const metadata = normalizeMetadata(page.metadata);
    await ctx.db.patch(args.pageId, {
      metadata: {
        ...metadata,
        lastReviewedAt: now,
      },
      updatedAt: now,
    });

    const existingQueue = await ctx.db
      .query('note_review_queue')
      .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
      .collect();

    const status = args.queueStatus || 'done';
    if (existingQueue.length > 0) {
      await ctx.db.patch(existingQueue[0]._id, {
        status,
        reviewedAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('note_review_queue', {
        userId,
        pageId: args.pageId,
        status,
        reviewedAt: now,
        scheduledFor: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, reviewedAt: now };
  },
});

export const enqueueReview = mutation({
  args: {
    pageId: v.id('note_pages'),
    scheduledFor: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const now = Date.now();
    const scheduledFor = args.scheduledFor ?? now;
    const existingQueue = await ctx.db
      .query('note_review_queue')
      .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
      .collect();

    if (existingQueue.length > 0) {
      await ctx.db.patch(existingQueue[0]._id, {
        status: 'queued',
        scheduledFor,
        updatedAt: now,
      });
    } else {
      const metadata = normalizeMetadata(page.metadata);
      await ctx.db.insert('note_review_queue', {
        userId,
        pageId: args.pageId,
        status: 'queued',
        scheduledFor,
        sourceRef: asRecord(metadata.sourceRef),
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true, scheduledFor };
  },
});

export const listReviewQueue = query({
  args: {
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const limit = Math.max(1, Math.min(args.limit ?? 100, 500));

    const rows = args.status
      ? await ctx.db
          .query('note_review_queue')
          .withIndex('by_user_status', q => q.eq('userId', userId).eq('status', args.status!))
          .take(limit)
      : await ctx.db
          .query('note_review_queue')
          .withIndex('by_user', q => q.eq('userId', userId))
          .take(limit);

    const pages = await Promise.all(rows.map(row => ctx.db.get(row.pageId)));

    return rows
      .map((row, index) => {
        const page = pages[index];
        if (!page || page.userId !== userId) return null;
        const metadata = normalizeMetadata(page.metadata);
        return {
          id: row._id,
          status: row.status,
          reviewedAt: row.reviewedAt,
          scheduledFor: row.scheduledFor,
          updatedAt: row.updatedAt,
          sourceRef: row.sourceRef,
          page: {
            id: page._id,
            title: page.title,
            icon: page.icon,
            tags: page.tags || [],
            updatedAt: page.updatedAt,
            metadata,
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item)
      .sort((a, b) => {
        const aSchedule = a.scheduledFor || 0;
        const bSchedule = b.scheduledFor || 0;
        if (aSchedule !== bSchedule) return aSchedule - bSchedule;
        return b.updatedAt - a.updatedAt;
      });
  },
});

export const saveBlocks = mutation({
  args: {
    pageId: v.id('note_pages'),
    blocks: v.optional(v.array(blockInputValidator)),
    upsertBlocks: v.optional(v.array(blockInputValidator)),
    deleteBlockKeys: v.optional(v.array(v.string())),
    reorderBlockKeys: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const now = Date.now();

    const existing = await ctx.db
      .query('note_blocks')
      .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
      .collect();

    // Legacy full replace mode
    if (args.blocks && args.blocks.length >= 0) {
      for (const block of existing) {
        await ctx.db.delete(block._id);
      }

      const sorted = args.blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      for (let index = 0; index < sorted.length; index += 1) {
        const block = sorted[index];
        await ctx.db.insert('note_blocks', {
          userId,
          pageId: args.pageId,
          blockKey: blockKeyFor(block, index, now),
          blockType: block.blockType,
          content: block.content,
          props: block.props,
          sortOrder: index,
          createdAt: now,
          updatedAt: now,
        });
      }

      const derived = derivePageIndexesFromBlocks({
        title: page.title,
        tags: page.tags ?? [],
        blocks: sorted.map((block, index) => ({
          blockType: block.blockType,
          blockKey: block.blockKey || blockKeyFor(block, index, now),
          content: block.content,
          sortOrder: index,
        })),
      });

      await ctx.db.patch(args.pageId, {
        updatedAt: now,
        previewText: derived.previewText,
        searchText: derived.searchText,
        hasNote: derived.hasNote,
        hasHighlight: derived.hasHighlight,
      });
      return { success: true, count: sorted.length, mode: 'replace' };
    }

    const existingByKey = new Map<string, (typeof existing)[number]>();
    for (const row of existing) {
      if (row.blockKey) existingByKey.set(row.blockKey, row);
    }

    let touched = 0;

    if (args.upsertBlocks && args.upsertBlocks.length > 0) {
      const sorted = args.upsertBlocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
      for (let index = 0; index < sorted.length; index += 1) {
        const block = sorted[index];
        const key = blockKeyFor(block, index, now);
        const existingRow = existingByKey.get(key);
        if (existingRow) {
          await ctx.db.patch(existingRow._id, {
            blockType: block.blockType,
            content: block.content,
            props: block.props,
            sortOrder: block.sortOrder,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert('note_blocks', {
            userId,
            pageId: args.pageId,
            blockKey: key,
            blockType: block.blockType,
            content: block.content,
            props: block.props,
            sortOrder: block.sortOrder,
            createdAt: now,
            updatedAt: now,
          });
        }
        touched += 1;
      }
    }

    if (args.deleteBlockKeys && args.deleteBlockKeys.length > 0) {
      const toDelete = new Set(args.deleteBlockKeys);
      const rows = existing.filter(row => row.blockKey && toDelete.has(row.blockKey));
      for (const row of rows) {
        await ctx.db.delete(row._id);
        touched += 1;
      }
    }

    if (args.reorderBlockKeys && args.reorderBlockKeys.length > 0) {
      for (let index = 0; index < args.reorderBlockKeys.length; index += 1) {
        const key = args.reorderBlockKeys[index];
        const row = existingByKey.get(key);
        if (!row) continue;
        await ctx.db.patch(row._id, {
          sortOrder: index,
          updatedAt: now,
        });
        touched += 1;
      }
    }

    if (touched > 0) {
      const finalRows = await ctx.db
        .query('note_blocks')
        .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
        .collect();

      const derived = derivePageIndexesFromBlocks({
        title: page.title,
        tags: page.tags ?? [],
        blocks: finalRows,
      });

      await ctx.db.patch(args.pageId, {
        updatedAt: now,
        previewText: derived.previewText,
        searchText: derived.searchText,
        hasNote: derived.hasNote,
        hasHighlight: derived.hasHighlight,
      });
    }

    return { success: true, count: touched, mode: 'patch' };
  },
});

export const saveEditorDoc = mutation({
  args: {
    pageId: v.id('note_pages'),
    doc: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const page = await ctx.db.get(args.pageId);
    if (!page) return { success: false, error: 'Not found' };
    if (page.userId !== userId) throw new ConvexError({ code: 'FORBIDDEN' });

    const now = Date.now();
    const doc = normalizeEditorDoc(args.doc);

    const existing = await ctx.db
      .query('note_blocks')
      .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
      .collect();
    for (const row of existing) {
      await ctx.db.delete(row._id);
    }

    await ctx.db.insert('note_blocks', {
      userId,
      pageId: args.pageId,
      blockKey: 'tiptap-doc',
      blockType: 'tiptap_doc',
      content: doc,
      props: {},
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    });

    const searchableText = `${page.title} ${(page.tags || []).join(' ')} ${extractEditorDocText(doc)}`
      .trim()
      .slice(0, 8000);

    await ctx.db.patch(args.pageId, {
      updatedAt: now,
      previewText: extractEditorDocText(doc).trim().slice(0, PREVIEW_MAX),
      searchText: searchableText,
      hasNote: extractEditorDocText(doc).trim().length > 0,
      hasHighlight: editorDocHasHighlight(doc),
    });

    return { success: true };
  },
});

type IngestSourceArgs = {
  sourceModule: string;
  sourceRef?: Record<string, unknown>;
  noteType?: string;
  title?: string;
  quote?: string;
  note?: string;
  color?: string;
  tags?: string[];
  status?: string;
  pinned?: boolean;
  dedupeKey?: string;
  blocks?: Array<{
    blockKey?: string;
    blockType: string;
    content: unknown;
    props?: Record<string, unknown>;
    sortOrder: number;
  }>;
  createReviewQueue?: boolean;
  scheduledFor?: number;
  scopeType?: string;
  scopeId?: string;
  blockId?: string;
  start?: number;
  end?: number;
  contextBefore?: string;
  contextAfter?: string;
  contextKey?: string;
  contentId?: string;
  contentTitle?: string;
  annotationId?: string;
};

const resolvePageTitle = (args: IngestSourceArgs) => {
  const explicit = args.title?.trim();
  if (explicit) return explicit.slice(0, 120);
  const quote = args.quote?.trim();
  if (quote) return quote.length > 72 ? `${quote.slice(0, 72)}...` : quote;
  const note = args.note?.trim();
  if (note) return note.length > 72 ? `${note.slice(0, 72)}...` : note;
  return 'Untitled';
};

const pickPreviewFromBlocks = (blocks: Array<{ content: unknown }>) => {
  for (const block of blocks) {
    const text = toSearchableText(block.content).trim();
    if (text) return text.slice(0, PREVIEW_MAX);
  }
  return '';
};

const findExistingPageBySourceRef = async (
  ctx: any,
  userId: string,
  sourceRef: Record<string, unknown>
) => {
  const anchorKey = typeof sourceRef.anchorKey === 'string' ? sourceRef.anchorKey : '';
  const module = typeof sourceRef.module === 'string' ? sourceRef.module : '';
  const contentId = typeof sourceRef.contentId === 'string' ? sourceRef.contentId : '';
  const blockId = typeof sourceRef.blockId === 'string' ? sourceRef.blockId : '';
  const start = typeof sourceRef.start === 'number' ? sourceRef.start : undefined;
  const end = typeof sourceRef.end === 'number' ? sourceRef.end : undefined;

  const rows = await ctx.db
    .query('note_pages')
    .withIndex('by_user', (q: any) => q.eq('userId', userId))
    .take(MAX_PAGE_SCAN);

  return rows.find((row: any) => {
    const metadata = normalizeMetadata(row.metadata);
    const rowSourceRef = asRecord(metadata.sourceRef);
    if (!rowSourceRef) return false;
    if (anchorKey && rowSourceRef.anchorKey === anchorKey) return true;
    if (module && rowSourceRef.module !== module) return false;
    if (contentId && rowSourceRef.contentId !== contentId) return false;
    if (blockId && rowSourceRef.blockId !== blockId) return false;
    if (start !== undefined && rowSourceRef.start !== start) return false;
    if (end !== undefined && rowSourceRef.end !== end) return false;
    return Boolean(module || contentId || blockId);
  });
};

const deletePageCascade = async (
  ctx: any,
  userId: string,
  pageId: string,
  softDelete: boolean
) => {
  const page = await ctx.db.get(pageId);
  if (!page || page.userId !== userId) return { success: false, error: 'Not found' };
  if (softDelete) {
    await ctx.db.patch(pageId, { isArchived: true, updatedAt: Date.now() });
    return { success: true, archived: true };
  }

  const [blocks, queueRows, sourceLinks, targetLinks] = await Promise.all([
    ctx.db
      .query('note_blocks')
      .withIndex('by_user_page', (q: any) => q.eq('userId', userId).eq('pageId', pageId))
      .collect(),
    ctx.db
      .query('note_review_queue')
      .withIndex('by_user_page', (q: any) => q.eq('userId', userId).eq('pageId', pageId))
      .collect(),
    ctx.db
      .query('note_links')
      .withIndex('by_user_source', (q: any) => q.eq('userId', userId).eq('sourcePageId', pageId))
      .collect(),
    ctx.db
      .query('note_links')
      .withIndex('by_user_target', (q: any) => q.eq('userId', userId).eq('targetPageId', pageId))
      .collect(),
  ]);

  for (const row of blocks) await ctx.db.delete(row._id);
  for (const row of queueRows) await ctx.db.delete(row._id);
  for (const row of sourceLinks) await ctx.db.delete(row._id);
  for (const row of targetLinks) await ctx.db.delete(row._id);
  await ctx.db.delete(pageId);
  return { success: true, archived: false };
};

export const ingestFromSourceInternal = async (
  ctx: any,
  userId: string,
  args: IngestSourceArgs
) => {
  const now = Date.now();
  const sourceModule = normalizeSourceModule(args.sourceModule || args.scopeType);
  const noteType = normalizeNoteType(args.noteType);
  const status = normalizeStatus(args.status);
  const pinned = Boolean(args.pinned);
  const normalizedColor = normalizeColor(args.color);

  const baseSourceRef = asRecord(args.sourceRef) || {};
  const contentId =
    args.contentId ||
    args.scopeId ||
    (typeof baseSourceRef.contentId === 'string' ? baseSourceRef.contentId : '');
  const contentTitle =
    args.contentTitle ||
    (typeof baseSourceRef.contentTitle === 'string' ? baseSourceRef.contentTitle : '') ||
    '';

  const shouldBuildAnchor =
    isNonEmptyString(args.scopeType) &&
    isNonEmptyString(args.scopeId) &&
    isNonEmptyString(args.blockId) &&
    typeof args.start === 'number' &&
    typeof args.end === 'number' &&
    isNonEmptyString(args.quote);

  const anchorKey = shouldBuildAnchor
    ? anchorKeyFor({
        scopeType: args.scopeType!,
        scopeId: args.scopeId!,
        blockId: args.blockId!,
        start: args.start!,
        end: args.end!,
        quote: args.quote!,
      })
    : undefined;

  const sourceRef: Record<string, unknown> = {
    ...baseSourceRef,
    module: sourceModule,
    ...(contentId ? { contentId } : {}),
    ...(contentTitle ? { contentTitle } : {}),
    ...(args.contextKey ? { contextKey: args.contextKey } : {}),
    ...(args.scopeType ? { scopeType: args.scopeType } : {}),
    ...(args.scopeId ? { scopeId: args.scopeId } : {}),
    ...(args.blockId ? { blockId: args.blockId } : {}),
    ...(typeof args.start === 'number' ? { start: args.start } : {}),
    ...(typeof args.end === 'number' ? { end: args.end } : {}),
    ...(args.contextBefore ? { contextBefore: args.contextBefore } : {}),
    ...(args.contextAfter ? { contextAfter: args.contextAfter } : {}),
    ...(anchorKey ? { anchorKey } : {}),
    ...(args.annotationId ? { annotationId: args.annotationId } : {}),
  };

  const dedupeKey =
    args.dedupeKey ||
    anchorKey ||
    buildFallbackDedupeKey({
      sourceModule,
      sourceRef,
      title: args.title,
      quote: args.quote,
      note: args.note,
      noteType,
    });

  let existingPage: any | undefined;
  if (dedupeKey) {
    existingPage = await ctx.db
      .query('note_pages')
      .withIndex('by_user_dedupeKey', (q: any) => q.eq('userId', userId).eq('dedupeKey', dedupeKey))
      .first();
  }
  if (!existingPage) {
    existingPage = await findExistingPageBySourceRef(ctx, userId, sourceRef);
  }

  const mergedTags = [...new Set(['note', sourceModule.toLowerCase(), ...(args.tags || [])])]
    .map(item => item.trim())
    .filter(Boolean);

  const title = resolvePageTitle(args);
  let pageId = existingPage?._id;
  let created = false;

  if (!pageId) {
    pageId = await ctx.db.insert('note_pages', {
      userId,
      title,
      icon: '📝',
      tags: mergedTags,
      sourceModule,
      noteType,
      dedupeKey,
      status,
      pinned,
      isArchived: false,
      isTemplate: false,
      sortOrder: now,
      metadata: normalizeMetadata({
        status,
        pinned,
        sourceRef,
        noteType,
        dedupeKey,
      }),
      createdAt: now,
      updatedAt: now,
    });
    created = true;
  } else {
    const page = await ctx.db.get(pageId);
    const metadata = normalizeMetadata(page?.metadata);
    await ctx.db.patch(pageId, {
      title: title || page?.title || 'Untitled',
      tags: [...new Set([...(page?.tags || []), ...mergedTags])],
      sourceModule,
      noteType,
      dedupeKey,
      status,
      pinned,
      metadata: {
        ...metadata,
        status,
        pinned,
        sourceRef,
        noteType,
        dedupeKey,
      },
      updatedAt: now,
    });
  }

  const existingBlocks = await ctx.db
    .query('note_blocks')
    .withIndex('by_user_page', (q: any) => q.eq('userId', userId).eq('pageId', pageId))
    .collect();
  const byKey = new Map<string, (typeof existingBlocks)[number]>();
  for (const row of existingBlocks) {
    if (row.blockKey) byKey.set(row.blockKey, row);
  }

  if (args.blocks) {
    for (const row of existingBlocks) {
      await ctx.db.delete(row._id);
    }
    const sorted = args.blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    for (let index = 0; index < sorted.length; index += 1) {
      const block = sorted[index];
      await ctx.db.insert('note_blocks', {
        userId,
        pageId,
        blockKey: blockKeyFor(block, index, now),
        blockType: block.blockType,
        content: block.content,
        props: block.props,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      });
    }
  } else {
    const quoteText = args.quote?.trim() || '';
    const quoteBlock = byKey.get('quote');
    if (quoteText) {
      const incomingColorSpecified = args.color !== undefined;
      const preservedColor =
        typeof asRecord(quoteBlock?.content)?.color === 'string'
          ? String(asRecord(quoteBlock?.content)?.color)
          : '';
      const quoteContent = {
        text: quoteText,
        // Explicit clear (`__none__` => '') must win over previous/default colors.
        color: incomingColorSpecified ? normalizedColor : preservedColor || 'yellow',
        contextBefore: args.contextBefore || '',
        contextAfter: args.contextAfter || '',
      };
      if (quoteBlock) {
        await ctx.db.patch(quoteBlock._id, {
          blockType: 'quote',
          content: quoteContent,
          props: { ...(quoteBlock.props || {}), sourceRef },
          sortOrder: 0,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('note_blocks', {
          userId,
          pageId,
          blockKey: 'quote',
          blockType: 'quote',
          content: quoteContent,
          props: { sourceRef },
          sortOrder: 0,
          createdAt: now,
          updatedAt: now,
        });
      }
    } else if (quoteBlock && args.color !== undefined) {
      const content = asRecord(quoteBlock.content) || {};
      await ctx.db.patch(quoteBlock._id, {
        content: {
          ...content,
          color: normalizedColor,
        },
        updatedAt: now,
      });
    }

    if (args.note !== undefined) {
      const noteText = args.note.trim();
      const noteBlock = byKey.get('note');
      if (noteText) {
        if (noteBlock) {
          await ctx.db.patch(noteBlock._id, {
            blockType: 'paragraph',
            content: { text: noteText },
            sortOrder: 1,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert('note_blocks', {
            userId,
            pageId,
            blockKey: 'note',
            blockType: 'paragraph',
            content: { text: noteText },
            props: { source: sourceModule.toLowerCase() },
            sortOrder: 1,
            createdAt: now,
            updatedAt: now,
          });
        }
      } else if (noteBlock) {
        await ctx.db.delete(noteBlock._id);
      }
    }
  }

  const finalBlocks = await ctx.db
    .query('note_blocks')
    .withIndex('by_user_page', (q: any) => q.eq('userId', userId).eq('pageId', pageId))
    .collect();
  const sortedBlocks = finalBlocks
    .slice()
    .sort((a: any, b: any) => a.sortOrder - b.sortOrder);
  const detected = detectNoteAndHighlight(sortedBlocks);
  const previewText =
    (args.note?.trim() || args.quote?.trim() || pickPreviewFromBlocks(sortedBlocks) || '').slice(
      0,
      PREVIEW_MAX
    );
  const searchText = buildSearchTextFromBlocks(title, mergedTags, sortedBlocks);

  await ctx.db.patch(pageId, {
    sourceModule,
    noteType,
    dedupeKey,
    status,
    pinned,
    hasNote: detected.hasNote,
    hasHighlight: detected.hasHighlight,
    previewText,
    searchText,
    updatedAt: now,
  });

  if (args.createReviewQueue !== false) {
    const existingQueue = await ctx.db
      .query('note_review_queue')
      .withIndex('by_user_page', (q: any) => q.eq('userId', userId).eq('pageId', pageId))
      .collect();

    const scheduledFor = args.scheduledFor ?? now;
    if (existingQueue.length === 0) {
      await ctx.db.insert('note_review_queue', {
        userId,
        pageId,
        status: 'queued',
        scheduledFor,
        sourceRef,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existingQueue[0]._id, {
        status: existingQueue[0].status || 'queued',
        scheduledFor: existingQueue[0].scheduledFor || scheduledFor,
        sourceRef,
        updatedAt: now,
      });
    }
  }

  return { success: true, pageId, created, dedupeKey, sourceRef, hasNote: detected.hasNote, hasHighlight: detected.hasHighlight };
};

export const ingestFromSource = mutation({
  args: {
    sourceModule: v.string(),
    sourceRef: v.optional(v.record(v.string(), v.any())),
    noteType: v.optional(v.string()),
    title: v.optional(v.string()),
    quote: v.optional(v.string()),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    pinned: v.optional(v.boolean()),
    dedupeKey: v.optional(v.string()),
    blocks: v.optional(v.array(blockInputValidator)),
    createReviewQueue: v.optional(v.boolean()),
    scheduledFor: v.optional(v.number()),
    scopeType: v.optional(v.string()),
    scopeId: v.optional(v.string()),
    blockId: v.optional(v.string()),
    start: v.optional(v.number()),
    end: v.optional(v.number()),
    contextBefore: v.optional(v.string()),
    contextAfter: v.optional(v.string()),
    contextKey: v.optional(v.string()),
    contentId: v.optional(v.string()),
    contentTitle: v.optional(v.string()),
    annotationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    return await ingestFromSourceInternal(ctx, userId, args);
  },
});

export const deleteBySourceRef = mutation({
  args: {
    pageId: v.optional(v.id('note_pages')),
    dedupeKey: v.optional(v.string()),
    sourceRef: v.optional(v.record(v.string(), v.any())),
    softDelete: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    let page: any | null = null;

    if (args.pageId) {
      page = await ctx.db.get(args.pageId);
      if (!page || page.userId !== userId) return { success: false, error: 'Not found' };
    } else if (args.dedupeKey) {
      page = await ctx.db
        .query('note_pages')
        .withIndex('by_user_dedupeKey', q => q.eq('userId', userId).eq('dedupeKey', args.dedupeKey!))
        .first();
    } else if (args.sourceRef) {
      page = await findExistingPageBySourceRef(ctx, userId, args.sourceRef);
    } else {
      return { success: false, error: 'Missing identifier' };
    }

    if (!page) return { success: false, error: 'Not found' };
    return await deletePageCascade(ctx, userId, page._id, args.softDelete === true);
  },
});

export const upsertFromAnnotation = mutation({
  args: {
    scopeType: v.string(),
    scopeId: v.string(),
    blockId: v.string(),
    start: v.number(),
    end: v.number(),
    quote: v.string(),
    contextBefore: v.optional(v.string()),
    contextAfter: v.optional(v.string()),
    note: v.optional(v.string()),
    color: v.optional(v.string()),
    contextKey: v.optional(v.string()),
    sourceModule: v.optional(v.string()),
    contentId: v.optional(v.string()),
    contentTitle: v.optional(v.string()),
    annotationId: v.optional(v.id('annotations')),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const result = await ingestFromSourceInternal(ctx, userId, {
      sourceModule: args.sourceModule || args.scopeType,
      noteType: 'manual',
      title: args.quote,
      quote: args.quote,
      note: args.note,
      color: args.color,
      tags: ['annotation', ...(args.tags || [])],
      scopeType: args.scopeType,
      scopeId: args.scopeId,
      blockId: args.blockId,
      start: args.start,
      end: args.end,
      contextBefore: args.contextBefore,
      contextAfter: args.contextAfter,
      contextKey: args.contextKey || `${args.scopeType}:${args.scopeId}`,
      contentId: args.contentId || args.scopeId,
      contentTitle: args.contentTitle || '',
      annotationId: args.annotationId ? String(args.annotationId) : undefined,
      createReviewQueue: true,
    });

    return {
      success: true,
      pageId: result.pageId,
      created: result.created,
      anchorKey:
        (typeof result.sourceRef?.anchorKey === 'string' ? String(result.sourceRef.anchorKey) : '') ||
        anchorKeyFor(args),
    };
  },
});

export const createLink = mutation({
  args: {
    sourcePageId: v.id('note_pages'),
    targetPageId: v.id('note_pages'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const [source, target] = await Promise.all([
      ctx.db.get(args.sourcePageId),
      ctx.db.get(args.targetPageId),
    ]);

    if (!source || !target) return { success: false, error: 'Not found' };
    if (source.userId !== userId || target.userId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN' });
    }

    const existing = await ctx.db
      .query('note_links')
      .withIndex('by_user_source', q => q.eq('userId', userId).eq('sourcePageId', args.sourcePageId))
      .collect();

    const duplicate = existing.some(item => item.targetPageId === args.targetPageId);
    if (duplicate) {
      return { success: true, duplicated: true };
    }

    const id = await ctx.db.insert('note_links', {
      userId,
      sourcePageId: args.sourcePageId,
      targetPageId: args.targetPageId,
      createdAt: Date.now(),
    });

    return { success: true, id, duplicated: false };
  },
});

export const removeLink = mutation({
  args: {
    sourcePageId: v.id('note_pages'),
    targetPageId: v.id('note_pages'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const rows = await ctx.db
      .query('note_links')
      .withIndex('by_user_source', q => q.eq('userId', userId).eq('sourcePageId', args.sourcePageId))
      .collect();

    const targets = rows.filter(item => item.targetPageId === args.targetPageId);
    for (const row of targets) {
      await ctx.db.delete(row._id);
    }

    return { success: true, removed: targets.length };
  },
});

export const listTemplates = query({
  args: {},
  handler: async ctx => {
    const userId = await getOptionalAuthUserId(ctx);
    if (!userId) return [];

    const templates = await ctx.db
      .query('note_templates')
      .withIndex('by_user', q => q.eq('userId', userId))
      .collect();

    return templates
      .slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(item => ({
        id: item._id,
        name: item.name,
        description: item.description,
        icon: item.icon,
        blocks: item.blocks,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      }));
  },
});

export const createTemplate = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    icon: v.optional(v.string()),
    blocks: v.array(
      v.object({
        blockKey: v.optional(v.string()),
        blockType: v.string(),
        content: v.any(),
        props: v.optional(v.record(v.string(), v.any())),
        sortOrder: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const now = Date.now();

    const id = await ctx.db.insert('note_templates', {
      userId,
      name: args.name.trim() || 'Untitled Template',
      description: args.description,
      icon: args.icon,
      blocks: args.blocks,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, id };
  },
});

export const applyTemplate = mutation({
  args: {
    pageId: v.id('note_pages'),
    templateId: v.id('note_templates'),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const [page, template] = await Promise.all([
      ctx.db.get(args.pageId),
      ctx.db.get(args.templateId),
    ]);

    if (!page || !template) return { success: false, error: 'Not found' };
    if (page.userId !== userId || template.userId !== userId) {
      throw new ConvexError({ code: 'FORBIDDEN' });
    }

    const oldBlocks = await ctx.db
      .query('note_blocks')
      .withIndex('by_user_page', q => q.eq('userId', userId).eq('pageId', args.pageId))
      .collect();
    for (const block of oldBlocks) {
      await ctx.db.delete(block._id);
    }

    const now = Date.now();
    const sortedBlocks = template.blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
    for (let index = 0; index < sortedBlocks.length; index += 1) {
      const block = sortedBlocks[index];
      await ctx.db.insert('note_blocks', {
        userId,
        pageId: args.pageId,
        blockKey: blockKeyFor(block, index, now),
        blockType: block.blockType,
        content: block.content,
        props: block.props,
        sortOrder: index,
        createdAt: now,
        updatedAt: now,
      });
    }

    const derived = derivePageIndexesFromBlocks({
      title: page.title,
      tags: page.tags ?? [],
      blocks: sortedBlocks.map((block, index) => ({
        blockType: block.blockType,
        blockKey: blockKeyFor({ sortOrder: block.sortOrder }, index, now),
        content: block.content,
        sortOrder: index,
      })),
    });

    await ctx.db.patch(args.pageId, {
      updatedAt: now,
      previewText: derived.previewText,
      searchText: derived.searchText,
      hasNote: derived.hasNote,
      hasHighlight: derived.hasHighlight,
    });
    return { success: true, count: sortedBlocks.length };
  },
});

const serializeLegacyNotebookContent = (content: unknown): string => {
  if (typeof content === 'string') return content;
  const record = asRecord(content);
  if (!record) return '';
  if (typeof record.text === 'string') return record.text;
  if (typeof record.notes === 'string') return record.notes;
  return toSearchableText(content);
};

export const migrateLegacyAnnotationsWithNotes = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const dryRun = args.dryRun ?? false;
    const limit = Math.max(1, Math.min(args.limit ?? 5000, 10000));

    const rows = await ctx.db
      .query('annotations')
      .withIndex('by_user', q => q.eq('userId', userId))
      .take(limit);

    const noteRows = rows
      .filter(row => isNonEmptyString(row.note))
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    const dedupMap = new Map<string, (typeof noteRows)[number]>();
    for (const row of noteRows) {
      const key = `${row.contextKey}::${row.text}`;
      if (!dedupMap.has(key)) dedupMap.set(key, row);
    }

    const deduped = [...dedupMap.values()];

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        found: rows.length,
        noteRows: noteRows.length,
        deduped: deduped.length,
      };
    }

    const now = Date.now();
    const rootPageId = await ctx.db.insert('note_pages', {
      userId,
      title: 'Migrated Annotation Notes',
      icon: '🧭',
      tags: ['migration', 'annotations'],
      isArchived: false,
      isTemplate: false,
      sortOrder: now,
      metadata: normalizeMetadata({
        status: 'Collections',
        source: 'annotations',
        migratedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    });

    for (let index = 0; index < deduped.length; index += 1) {
      const row = deduped[index];
      const pageId = await ctx.db.insert('note_pages', {
        userId,
        parentPageId: rootPageId,
        title: row.text.length > 48 ? `${row.text.slice(0, 48)}...` : row.text,
        icon: '📝',
        tags: ['migrated', row.scopeType || row.targetType || 'annotation'],
        isArchived: false,
        isTemplate: false,
        sortOrder: index,
        metadata: normalizeMetadata({
          source: 'annotation',
          contextKey: row.contextKey,
          scopeType: row.scopeType,
          scopeId: row.scopeId,
          blockId: row.blockId,
          quote: row.quote || row.text,
          startOffset: row.startOffset,
          endOffset: row.endOffset,
          color: row.color,
          migratedAt: now,
        }),
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert('note_blocks', {
        userId,
        pageId,
        blockKey: 'quote',
        blockType: 'quote',
        content: {
          text: row.quote || row.text,
          color: row.color || 'yellow',
        },
        props: {
          source: row.contextKey,
        },
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert('note_blocks', {
        userId,
        pageId,
        blockKey: 'note',
        blockType: 'paragraph',
        content: {
          text: row.note,
        },
        props: {
          migrated: true,
        },
        sortOrder: 1,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      success: true,
      dryRun: false,
      rootPageId,
      found: rows.length,
      noteRows: noteRows.length,
      deduped: deduped.length,
      createdPages: deduped.length + 1,
    };
  },
});

export const migrateLegacyAllNotes = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const dryRun = args.dryRun ?? false;
    const limit = Math.max(1, Math.min(args.limit ?? 8000, 12000));
    const migrationMarker = await ctx.db
      .query('note_pages')
      .withIndex('by_user_dedupeKey', q =>
        q.eq('userId', userId).eq('dedupeKey', LEGACY_ALL_NOTES_MIGRATION_KEY)
      )
      .first();

    if (migrationMarker) {
      return {
        success: true,
        dryRun,
        alreadyMigrated: true,
        createdPages: 0,
      };
    }

    const [annotations, notebooks] = await Promise.all([
      ctx.db
        .query('annotations')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(limit),
      ctx.db
        .query('notebooks')
        .withIndex('by_user', q => q.eq('userId', userId))
        .take(limit),
    ]);

    const annRows = annotations
      .filter(
        row =>
          isNonEmptyString(row.note) ||
          (typeof row.color === 'string' && row.color.trim().length > 0)
      )
      .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));

    const dedupAnn = new Map<string, (typeof annRows)[number]>();
    for (const row of annRows) {
      const key = [
        row.scopeType || 'LEGACY',
        row.scopeId || row.contextKey || '',
        row.blockId || '',
        typeof row.startOffset === 'number' ? String(row.startOffset) : '',
        typeof row.endOffset === 'number' ? String(row.endOffset) : '',
        (row.quote || row.text || '').trim().toLowerCase(),
      ].join('::');
      if (!dedupAnn.has(key)) dedupAnn.set(key, row);
    }

    const notebookRows = notebooks.slice().sort((a, b) => b.createdAt - a.createdAt);
    const dedupNotebook = new Map<string, (typeof notebookRows)[number]>();
    for (const row of notebookRows) {
      const contentText = serializeLegacyNotebookContent(row.content).slice(0, 200);
      const key = `${row.type}::${row.title}::${contentText}`;
      if (!dedupNotebook.has(key)) dedupNotebook.set(key, row);
    }

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        annotationsFound: annotations.length,
        annotationMigratable: annRows.length,
        annotationDeduped: dedupAnn.size,
        notebooksFound: notebooks.length,
        notebookDeduped: dedupNotebook.size,
      };
    }

    if (dedupAnn.size === 0 && dedupNotebook.size === 0) {
      const now = Date.now();
      await ctx.db.insert('note_pages', {
        userId,
        title: 'Legacy Migration Marker',
        icon: '✅',
        tags: ['migration', 'legacy'],
        dedupeKey: LEGACY_ALL_NOTES_MIGRATION_KEY,
        isArchived: true,
        isTemplate: false,
        sortOrder: now,
        metadata: normalizeMetadata({
          status: 'Collections',
          source: 'legacy',
          migratedAt: now,
          markerOnly: true,
        }),
        createdAt: now,
        updatedAt: now,
      });

      return {
        success: true,
        dryRun: false,
        createdPages: 0,
        createdNotebookPages: 0,
        createdAnnotationPages: 0,
        notebooksFound: notebooks.length,
        notebooksDeduped: dedupNotebook.size,
        annotationsFound: annotations.length,
        annotationDeduped: dedupAnn.size,
      };
    }

    const now = Date.now();
    const rootPageId = await ctx.db.insert('note_pages', {
      userId,
      title: 'Migrated Legacy Notes',
      icon: '🗂️',
      tags: ['migration', 'legacy'],
      dedupeKey: LEGACY_ALL_NOTES_MIGRATION_KEY,
      isArchived: false,
      isTemplate: false,
      sortOrder: now,
      metadata: normalizeMetadata({
        status: 'Collections',
        source: 'legacy',
        migratedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    });

    const notebookRootId = await ctx.db.insert('note_pages', {
      userId,
      parentPageId: rootPageId,
      title: 'Legacy Notebook Entries',
      icon: '📒',
      tags: ['migration', 'legacy-notebook'],
      isArchived: false,
      isTemplate: false,
      sortOrder: 0,
      metadata: normalizeMetadata({
        status: 'Collections',
        source: 'legacy_notebook',
        migratedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    });

    const annotationRootId = await ctx.db.insert('note_pages', {
      userId,
      parentPageId: rootPageId,
      title: 'Legacy Annotation Notes',
      icon: '🧭',
      tags: ['migration', 'legacy-annotation'],
      isArchived: false,
      isTemplate: false,
      sortOrder: 1,
      metadata: normalizeMetadata({
        status: 'Collections',
        source: 'legacy_annotation',
        migratedAt: now,
      }),
      createdAt: now,
      updatedAt: now,
    });

    let createdNotebookPages = 0;
    let createdAnnotationPages = 0;

    const dedupNotebookRows = [...dedupNotebook.values()];
    for (let index = 0; index < dedupNotebookRows.length; index += 1) {
      const row = dedupNotebookRows[index];
      const contentText = serializeLegacyNotebookContent(row.content);
      const pageId = await ctx.db.insert('note_pages', {
        userId,
        parentPageId: notebookRootId,
        title: row.title.length > 64 ? `${row.title.slice(0, 64)}...` : row.title,
        icon: '📝',
        tags: [...new Set(['migrated', 'legacy', row.type.toLowerCase()])],
        isArchived: false,
        isTemplate: false,
        sortOrder: index,
        metadata: normalizeMetadata({
          status: 'Inbox',
          source: 'legacy_notebook',
          sourceRef: {
            module: 'legacy_notebook',
            contentId: String(row._id),
            contentTitle: row.title,
            notebookType: row.type,
          },
          migratedAt: now,
          originalCreatedAt: row.createdAt,
        }),
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert('note_blocks', {
        userId,
        pageId,
        blockKey: 'legacy-content',
        blockType: 'paragraph',
        content: {
          text: contentText || row.preview || row.title,
        },
        props: {
          source: 'legacy_notebook',
        },
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      createdNotebookPages += 1;
    }

    const dedupAnnRows = [...dedupAnn.values()];
    for (let index = 0; index < dedupAnnRows.length; index += 1) {
      const row = dedupAnnRows[index];
      const pageId = await ctx.db.insert('note_pages', {
        userId,
        parentPageId: annotationRootId,
        title: row.text.length > 64 ? `${row.text.slice(0, 64)}...` : row.text,
        icon: '📌',
        tags: [...new Set(['migrated', 'legacy', row.scopeType || row.targetType || 'annotation'])],
        sourceModule: normalizeSourceModule(row.scopeType || 'LEGACY_ANNOTATION'),
        noteType: 'manual',
        dedupeKey: [
          row.scopeType || 'LEGACY',
          row.scopeId || row.contextKey || '',
          row.blockId || '',
          typeof row.startOffset === 'number' ? String(row.startOffset) : '',
          typeof row.endOffset === 'number' ? String(row.endOffset) : '',
          (row.quote || row.text || '').trim().toLowerCase(),
        ].join('::'),
        hasNote: Boolean(row.note && row.note.trim().length > 0),
        hasHighlight: Boolean(row.color && row.color.trim().length > 0),
        previewText: (row.note || row.quote || row.text || '').slice(0, PREVIEW_MAX),
        searchText: `${row.contextKey || ''} ${row.quote || row.text || ''} ${row.note || ''}`
          .trim()
          .slice(0, 8000),
        isArchived: false,
        isTemplate: false,
        sortOrder: index,
        metadata: normalizeMetadata({
          status: 'Inbox',
          source: 'legacy_annotation',
          sourceRef: {
            module: row.scopeType || 'ANNOTATION',
            contentId: row.scopeId || row.contextKey,
            contentTitle: row.contextKey,
            contextKey: row.contextKey,
            blockId: row.blockId,
            start: row.startOffset,
            end: row.endOffset,
          },
          migratedAt: now,
          originalCreatedAt: row.createdAt,
        }),
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.insert('note_blocks', {
        userId,
        pageId,
        blockKey: 'quote',
        blockType: 'quote',
        content: {
          text: row.quote || row.text,
          color: row.color || '',
        },
        props: {
          source: 'legacy_annotation',
        },
        sortOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      if (isNonEmptyString(row.note)) {
        await ctx.db.insert('note_blocks', {
          userId,
          pageId,
          blockKey: 'note',
          blockType: 'paragraph',
          content: {
            text: row.note || '',
          },
          props: {
            source: 'legacy_annotation',
          },
          sortOrder: 1,
          createdAt: now,
          updatedAt: now,
        });
      }

      createdAnnotationPages += 1;
    }

    return {
      success: true,
      dryRun: false,
      rootPageId,
      createdNotebookPages,
      createdAnnotationPages,
      createdPages: createdNotebookPages + createdAnnotationPages + 3,
      notebooksFound: notebooks.length,
      notebooksDeduped: dedupNotebook.size,
      annotationsFound: annotations.length,
      annotationDeduped: dedupAnn.size,
    };
  },
});
