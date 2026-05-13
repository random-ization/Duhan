import React, { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import {
  ArrowUpRight,
  CheckCircle2,
  Filter,
  Folder,
  Grid3X3,
  Home,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  Pin,
  PinOff,
  Plus,
  Table,
  Trash2,
  X,
} from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import type { Id } from '../../convex/_generated/dataModel';
import { NOTE_PAGES } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import {
  Button,
  Input,
  Select,
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from '../components/ui';
import { useContextualSidebar } from '../hooks/useContextualSidebar';
import { sanitizeHtml } from '../utils/sanitize';
import { appendReturnToPath } from '../utils/navigation';
import {
  ContextualCountBadge,
  ContextualEmptyState,
  ContextualListItemButton,
  ContextualPrimaryActionButton,
  ContextualSection,
} from '../components/layout/contextualSidebarBlocks';

const OfficialTiptapEditor = lazy(() => import('../components/notebook/OfficialTiptapEditor'));
const DesktopNotebookV2Page = lazy(() => import('./desktop/DesktopNotebookV2Page'));
const LazyMobileNotebookPage = lazy(() =>

  import('../components/mobile/MobileNotebookPage').then(module => ({
    default: module.MobileNotebookPage,
  }))
);

export type ViewMode = 'gallery' | 'list' | 'table';
export type SaveState = 'saved' | 'saving' | 'dirty' | 'error';
export type NoteKind = 'quote_card' | 'longform_page';
export type TranslateFn = ReturnType<typeof useTranslation>['t'];

export type NotebookListResult = {
  notebooks: Array<{
    id: Id<'note_pages'>;
    title: string;
    icon?: string;
    noteCount: number;
    reviewCount: number;
    updatedAt: number;
  }>;
  totals: {
    notebooks: number;
    notes: number;
    unassigned: number;
  };
};

export type SearchItem = {
  id: Id<'note_pages'>;
  title: string;
  icon?: string;
  tags: string[];
  status: string;
  pinned: boolean;
  sourceModule?: string;
  noteType?: string;
  noteKind?: NoteKind;
  quoteText?: string;
  noteText?: string;
  sourceRef?: Record<string, unknown>;
  updatedAt: number;
  createdAt: number;
  snippet: string;
};

export type SearchResult = {
  items: SearchItem[];
  nextCursor: string | null;
};

const EMPTY_SEARCH_RESULT: SearchResult = { items: [], nextCursor: null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;

const numberOrFallback = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const stringArrayOrEmpty = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const normalizeNotebookListResult = (value: unknown): NotebookListResult => {
  if (!isRecord(value)) {
    return { notebooks: [], totals: { notebooks: 0, notes: 0, unassigned: 0 } };
  }

  const rawNotebooks = Array.isArray(value.notebooks) ? value.notebooks : [];
  const rawTotals = isRecord(value.totals) ? value.totals : {};

  return {
    notebooks: rawNotebooks
      .map((notebook): NotebookListResult['notebooks'][number] | null => {
        if (!isRecord(notebook)) return null;
        const id = stringOrUndefined(notebook.id);
        const title = stringOrUndefined(notebook.title);
        if (!id || !title) return null;
        return {
          id: id as Id<'note_pages'>,
          title,
          icon: stringOrUndefined(notebook.icon),
          noteCount: numberOrFallback(notebook.noteCount, 0),
          reviewCount: numberOrFallback(notebook.reviewCount, 0),
          updatedAt: numberOrFallback(notebook.updatedAt, 0),
        };
      })
      .filter((notebook): notebook is NotebookListResult['notebooks'][number] => notebook !== null),
    totals: {
      notebooks: numberOrFallback(rawTotals.notebooks, rawNotebooks.length),
      notes: numberOrFallback(rawTotals.notes, 0),
      unassigned: numberOrFallback(rawTotals.unassigned, 0),
    },
  };
};

const noteKindOrUndefined = (value: unknown): NoteKind | undefined =>
  value === 'quote_card' || value === 'longform_page' ? value : undefined;

const normalizeSearchItem = (value: unknown): SearchItem | null => {
  if (!isRecord(value)) return null;
  const id = stringOrUndefined(value.id);
  const title = stringOrUndefined(value.title);
  if (!id || !title) return null;

  return {
    id: id as Id<'note_pages'>,
    title,
    icon: stringOrUndefined(value.icon),
    tags: stringArrayOrEmpty(value.tags),
    status: stringOrUndefined(value.status) ?? 'Inbox',
    pinned: typeof value.pinned === 'boolean' ? value.pinned : false,
    sourceModule: stringOrUndefined(value.sourceModule),
    noteType: stringOrUndefined(value.noteType),
    noteKind: noteKindOrUndefined(value.noteKind),
    quoteText: stringOrUndefined(value.quoteText),
    noteText: stringOrUndefined(value.noteText),
    sourceRef: isRecord(value.sourceRef) ? value.sourceRef : undefined,
    updatedAt: numberOrFallback(value.updatedAt, 0),
    createdAt: numberOrFallback(value.createdAt, 0),
    snippet: stringOrUndefined(value.snippet) ?? '',
  };
};

export const normalizeSearchResult = (value: unknown): SearchResult => {
  if (!isRecord(value)) return EMPTY_SEARCH_RESULT;
  const rawItems = Array.isArray(value.items)
    ? value.items
    : Array.isArray(value.pages)
      ? value.pages
      : [];
  const rawNextCursor = value.nextCursor;
  const nextCursor =
    typeof rawNextCursor === 'string'
      ? rawNextCursor
      : typeof rawNextCursor === 'number' && Number.isFinite(rawNextCursor)
        ? String(rawNextCursor)
        : null;

  return {
    items: rawItems.map(normalizeSearchItem).filter((item): item is SearchItem => item !== null),
    nextCursor,
  };
};

export type NoteBlock = {
  id: string;
  blockKey?: string;
  blockType: string;
  content: unknown;
  sortOrder: number;
};

export type PagePayload = {
  page: {
    id: Id<'note_pages'>;
    title: string;
    pinned?: boolean;
    status?: string;
    noteKind?: NoteKind;
    quoteText?: string;
    noteText?: string;
  };
  editorDoc?: JSONContent;
  blocks: NoteBlock[];
};

export const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export const toSourceLabel = (sourceModule: string | undefined, t: TranslateFn) => {
  if (!sourceModule) return t('notes.v2.source.manual', { defaultValue: 'Manual' });
  const normalized = sourceModule.trim().toUpperCase();
  if (normalized.includes('TOPIK')) return t('notes.v2.source.topik', { defaultValue: 'TOPIK' });
  if (
    normalized.includes('READING') ||
    normalized.includes('TEXTBOOK') ||
    normalized.includes('NEWS')
  ) {
    return t('notes.v2.source.reading', { defaultValue: 'Reading' });
  }
  if (normalized.includes('VOCAB')) return t('notes.v2.source.vocab', { defaultValue: 'Vocab' });
  if (normalized.includes('GRAMMAR'))
    return t('notes.v2.source.grammar', { defaultValue: 'Grammar' });
  if (normalized.includes('DICTIONARY')) {
    return t('notes.v2.source.dictionary', { defaultValue: 'Dictionary' });
  }
  if (normalized.includes('PRACTICE'))
    return t('notes.v2.source.practice', { defaultValue: 'Practice' });
  return t('notes.v2.source.manual', { defaultValue: 'Manual' });
};

export const toCardType = (item: SearchItem, t: TranslateFn) => {
  const source = toSourceLabel(item.sourceModule, t);
  const noteType = (item.noteType || '').toLowerCase();

  if (
    noteType.includes('vocab') ||
    source === t('notes.v2.source.vocab', { defaultValue: 'Vocab' })
  ) {
    return {
      label: t('notes.v2.cardType.vocab', { defaultValue: 'Vocab' }),
      icon: '📚',
      badgeClass: 'text-primary bg-accent',
    };
  }
  if (
    noteType.includes('grammar') ||
    source === t('notes.v2.source.grammar', { defaultValue: 'Grammar' })
  ) {
    return {
      label: t('notes.v2.cardType.grammar', { defaultValue: 'Grammar' }),
      icon: '🎓',
      badgeClass: 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-500/15',
    };
  }
  if (
    noteType.includes('mistake') ||
    source === t('notes.v2.source.topik', { defaultValue: 'TOPIK' })
  ) {
    return {
      label: t('notes.v2.cardType.mistake', { defaultValue: 'Mistake' }),
      icon: '❌',
      badgeClass: 'text-rose-700 bg-rose-100 dark:text-rose-200 dark:bg-rose-500/15',
    };
  }
  return {
    label:
      item.noteKind === 'quote_card'
        ? t('notes.v2.cardType.quoteCard', { defaultValue: 'Quote Note' })
        : t('notes.v2.cardType.note', { defaultValue: 'Note' }),
    icon: '📝',
    badgeClass: 'text-muted-foreground bg-muted',
  };
};

export const toStatusBadge = (status: string, t: TranslateFn) => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'reviewed') {
    return {
      label: t('notes.v2.status.reviewed', { defaultValue: 'Reviewed' }),
      className: 'text-emerald-700 bg-emerald-100 dark:text-emerald-200 dark:bg-emerald-500/15',
    };
  }
  return {
    label: t('notes.v2.status.queued', { defaultValue: 'Queued' }),
    className: 'text-amber-700 bg-amber-100 dark:text-amber-200 dark:bg-amber-500/15',
  };
};

export const toSourcePath = (sourceRef?: Record<string, unknown>): string | null => {
  if (!sourceRef) return null;
  const module = typeof sourceRef.module === 'string' ? sourceRef.module : '';
  const contentId =
    typeof sourceRef.contentId === 'string'
      ? sourceRef.contentId
      : typeof sourceRef.scopeId === 'string'
        ? sourceRef.scopeId
        : '';

  if (!contentId) return null;
  if (module.includes('READING')) return `/reading/${contentId}`;
  if (module.includes('TOPIK')) return `/topik/${contentId}/review`;
  return null;
};

export const blocksToEditorDoc = (blocks: NoteBlock[]): JSONContent => {
  const tiptapDoc = blocks.find(block => block.blockType === 'tiptap_doc');
  if (tiptapDoc && tiptapDoc.content && typeof tiptapDoc.content === 'object') {
    return tiptapDoc.content as JSONContent;
  }
  return EMPTY_DOC;
};

export const formatTime = (timestamp: number, locale: string) =>
  new Date(timestamp).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const decodeCommonHtmlEntities = (value: string) =>
  value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");

export const normalizeLooseInlineTags = (value: string) =>
  value.replace(
    /<\s*(\/?)\s*(u|strong|b|em|i|mark|code|del|ins)\s*>/gi,
    (_all, slash: string, tag: string) => `<${slash}${tag.toLowerCase()}>`
  );

export const RICH_TEXT_CLASS =
  '[&_u]:underline [&_u]:decoration-2 [&_u]:underline-offset-2 [&_u]:decoration-primary/70 ' +
  '[&_strong]:font-extrabold [&_em]:italic [&_mark]:rounded [&_mark]:bg-yellow-200/70 [&_mark]:px-1 ' +
  '[&_code]:rounded [&_code]:bg-foreground/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.95em] ' +
  '[&_del]:opacity-80 [&_del]:line-through [&_ins]:underline [&_ins]:decoration-2 [&_ins]:underline-offset-2';

export const QUOTE_CARD_RICH_CLASS =
  'relative overflow-hidden border-l-[3px] border-primary/70 bg-gradient-to-br from-muted/60 via-muted/30 to-card ' +
  'shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]';

export const toPlainText = (value?: string | null) => {
  if (!value) return '';
  return normalizeLooseInlineTags(decodeCommonHtmlEntities(value))
    .replace(/<[^>]*>/g, ' ')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\+\+(.*?)\+\+/g, '$1')
    .replace(/==(.*?)==/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
};

export const toRichHtml = (value?: string | null) => {
  if (!value) return '';
  const decoded = normalizeLooseInlineTags(decodeCommonHtmlEntities(value));
  const withMarkdown = decoded
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\+\+(.*?)\+\+/g, '<u>$1</u>')
    .replace(/==(.*?)==/g, '<mark>$1</mark>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
  return sanitizeHtml(withMarkdown.replace(/\n/g, '<br />'));
};

export const toPreviewHtml = (snippet?: string | null) => toRichHtml(snippet);

export const extractBlockText = (content: unknown): string => {
  if (typeof content === 'string') return content.trim();
  if (Array.isArray(content)) return content.map(extractBlockText).join(' ').trim();
  if (!content || typeof content !== 'object') return '';

  const record = content as Record<string, unknown>;
  const prioritized = [record.text, record.quote, record.note]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map(value => value.trim())
    .join(' ')
    .trim();
  if (prioritized) return prioritized;

  return Object.values(record).map(extractBlockText).join(' ').trim();
};

export const getQuoteCardContent = (payload?: PagePayload | null) => {
  const blocks = payload?.blocks || [];
  const quoteBlock = blocks.find(
    block => block.blockKey === 'quote' || block.blockType === 'quote'
  );
  const noteBlock = blocks.find(
    block =>
      block.blockKey === 'note' || (block.blockType === 'paragraph' && block.blockKey !== 'quote')
  );

  return {
    quoteText:
      payload?.page.quoteText?.trim() || extractBlockText(quoteBlock?.content).trim() || '',
    noteText: payload?.page.noteText?.trim() || extractBlockText(noteBlock?.content).trim() || '',
  };
};

export const noteTextToEditorDoc = (value: string): JSONContent => {
  const lines = value
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return EMPTY_DOC;
  return {
    type: 'doc',
    content: lines.map(line => ({
      type: 'paragraph',
      content: [{ type: 'text', text: line }],
    })),
  };
};

export const extractEditorDocText = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map(extractEditorDocText).join(' ');
  if (!value || typeof value !== 'object') return '';
  const record = value as Record<string, unknown>;
  const text = typeof record.text === 'string' ? record.text : '';
  const content = extractEditorDocText(record.content);
  return `${text} ${content}`.trim();
};

export default function NotebookV2Page() {
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const dateLocale = useMemo(() => {
    const language = i18n.resolvedLanguage || i18n.language || 'en';
    if (language.startsWith('zh')) return 'zh-CN';
    if (language.startsWith('vi')) return 'vi-VN';
    if (language.startsWith('mn')) return 'mn-MN';
    return 'en-US';
  }, [i18n.language, i18n.resolvedLanguage]);

  const [activeNotebookId, setActiveNotebookId] = useState<Id<'note_pages'> | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<Id<'note_pages'> | null>(null);
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('gallery');
  const [insightQueryReady, setInsightQueryReady] = useState(
    () => typeof globalThis.window === 'undefined'
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [noteKind, setNoteKind] = useState<NoteKind>('longform_page');
  const [quoteText, setQuoteText] = useState('');
  const [editorDoc, setEditorDoc] = useState<JSONContent>(EMPTY_DOC);
  const [saveState, setSaveState] = useState<SaveState>('saved');

  const editorFallback = (
    <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-border bg-muted/50">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const hydratedPageIdRef = useRef<Id<'note_pages'> | null>(null);
  const lastSyncedRef = useRef<{
    pageId: Id<'note_pages'> | null;
    title: string;
    noteKind: NoteKind;
    doc: string;
    noteText: string;
  }>({
    pageId: null,
    title: '',
    noteKind: 'longform_page',
    doc: JSON.stringify(EMPTY_DOC),
    noteText: '',
  });

  const notebooksResult = normalizeNotebookListResult(useQuery(NOTE_PAGES.listNotebooks, {}));

  const baseSearchResult = normalizeSearchResult(
    useQuery(
      NOTE_PAGES.search,
      insightQueryReady
        ? {
          query: query.trim(),
          notebookId: activeNotebookId || undefined,
          limit: 500,
        }
        : 'skip'
    )
  );

  const selectedPagePayload = useQuery(
    NOTE_PAGES.getPage,
    selectedPageId ? { pageId: selectedPageId } : 'skip'
  ) as PagePayload | null | undefined;

  const createPage = useMutation(NOTE_PAGES.createPage);
  const updatePage = useMutation(NOTE_PAGES.updatePage);
  const saveBlocks = useMutation(NOTE_PAGES.saveBlocks);
  const saveEditorDoc = useMutation(NOTE_PAGES.saveEditorDoc);
  const togglePin = useMutation(NOTE_PAGES.togglePin);
  const archivePage = useMutation(NOTE_PAGES.archivePage);
  const hydrateEditorFromPayload = React.useCallback((payload: PagePayload) => {
    const pageId = payload.page.id;
    if (hydratedPageIdRef.current === pageId) return;

    const incomingNoteKind = payload.page.noteKind || 'longform_page';
    const quoteCardContent = getQuoteCardContent(payload);
    const incomingDoc =
      incomingNoteKind === 'quote_card'
        ? noteTextToEditorDoc(quoteCardContent.noteText)
        : payload.editorDoc || blocksToEditorDoc(payload.blocks || []);
    const incomingDocString = JSON.stringify(incomingDoc || EMPTY_DOC);

    const normalizedTitle =
      incomingNoteKind === 'quote_card'
        ? toPlainText(payload.page.title) || payload.page.title
        : payload.page.title;
    setTitle(normalizedTitle);
    setNoteKind(incomingNoteKind);
    setQuoteText(quoteCardContent.quoteText);
    setEditorDoc(incomingDoc);
    setSaveState('saved');
    setLastSavedAt(Date.now());

    lastSyncedRef.current = {
      pageId,
      title: normalizedTitle,
      noteKind: incomingNoteKind,
      doc: incomingDocString,
      noteText: extractEditorDocText(incomingDoc).trim(),
    };
    hydratedPageIdRef.current = pageId;
  }, []);

  const ensureSelectedPageExists = React.useCallback(
    (items: SearchItem[]) => {
      const exists = items.some(item => item.id === selectedPageId);
      if (exists) return;
      setSelectedPageId(items[0]?.id || null);
      hydratedPageIdRef.current = null;
    },
    [selectedPageId]
  );

  const markSaveStateSaved = React.useCallback(() => {
    setSaveState('saved');
  }, []);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') {
      return;
    }

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const idleWindow = globalThis.window as IdleWindow;
    let timerId: number | null = null;
    let idleId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => setInsightQueryReady(true), { timeout: 1500 });
    } else {
      timerId = globalThis.window.setTimeout(() => setInsightQueryReady(true), 600);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        globalThis.window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (activeNotebookId) return;
    if (notebooksResult.notebooks.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initialize default notebook once list query resolves
    setActiveNotebookId(notebooksResult.notebooks[0].id);
  }, [activeNotebookId, notebooksResult.notebooks]);

  useEffect(() => {
    if (!selectedPagePayload?.page) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate local editor state when selected page payload changes
    hydrateEditorFromPayload(selectedPagePayload);
  }, [
    hydrateEditorFromPayload,
    selectedPagePayload,
    selectedPagePayload?.page?.id,
    selectedPagePayload?.page?.title,
    selectedPagePayload?.editorDoc,
    selectedPagePayload?.blocks,
  ]);

  useEffect(() => {
    if (!selectedPageId || !selectedPagePayload?.page) return;

    const nextTitle = title.trim() || 'Untitled';
    const nextDocString = JSON.stringify(editorDoc || EMPTY_DOC);
    const nextNoteText = extractEditorDocText(editorDoc || EMPTY_DOC).trim();

    if (
      lastSyncedRef.current.pageId === selectedPageId &&
      lastSyncedRef.current.title === nextTitle &&
      lastSyncedRef.current.noteKind === noteKind &&
      lastSyncedRef.current.doc === nextDocString &&
      lastSyncedRef.current.noteText === nextNoteText
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keep derived save badge in sync with persisted snapshot
      markSaveStateSaved();
      return;
    }

    setSaveState('dirty');

    const timer = globalThis.window.setTimeout(async () => {
      try {
        setSaveState('saving');
        await updatePage({ pageId: selectedPageId, title: nextTitle });

        if (noteKind === 'quote_card') {
          await saveBlocks({
            pageId: selectedPageId,
            upsertBlocks: nextNoteText
              ? [
                {
                  blockKey: 'note',
                  blockType: 'paragraph',
                  content: { text: nextNoteText },
                  props: { source: 'notebook' },
                  sortOrder: 1,
                },
              ]
              : undefined,
            deleteBlockKeys: nextNoteText ? undefined : ['note'],
          });
        } else {
          await saveEditorDoc({
            pageId: selectedPageId,
            doc: JSON.parse(nextDocString) as Record<string, unknown>,
          });
        }

        lastSyncedRef.current = {
          pageId: selectedPageId,
          title: nextTitle,
          noteKind,
          doc: nextDocString,
          noteText: nextNoteText,
        };
        setSaveState('saved');
        setLastSavedAt(Date.now());
      } catch {
        setSaveState('error');
      }
    }, 1000);

    return () => globalThis.window.clearTimeout(timer);
  }, [
    editorDoc,
    markSaveStateSaved,
    noteKind,
    saveBlocks,
    saveEditorDoc,
    selectedPageId,
    selectedPagePayload?.page,
    selectedPagePayload?.page?.id,
    title,
    updatePage,
  ]);

  const sourceSummary = useMemo(() => {
    const groups = new Map<
      string,
      { key: string; label: string; count: number; modules: Set<string> }
    >();
    for (const item of baseSearchResult.items) {
      if (!item.sourceModule) continue;
      const label = toSourceLabel(item.sourceModule, t);
      const key = label.toUpperCase();
      const group = groups.get(key) || { key, label, count: 0, modules: new Set<string>() };
      group.count += 1;
      group.modules.add(item.sourceModule);
      groups.set(key, group);
    }
    return Array.from(groups.values())
      .map(group => ({
        key: group.key,
        label: group.label,
        count: group.count,
        modules: Array.from(group.modules),
      }))
      .sort((a, b) => b.count - a.count);
  }, [baseSearchResult.items, t]);

  const selectedSourceModules = useMemo(() => {
    if (!sourceFilter) return undefined;
    const target = sourceSummary.find(item => item.key === sourceFilter);
    if (!target || target.modules.length === 0) return undefined;
    return target.modules;
  }, [sourceSummary, sourceFilter]);

  const searchResult = normalizeSearchResult(
    useQuery(NOTE_PAGES.search, {
      query: query.trim(),
      sourceModules: selectedSourceModules,
      notebookId: activeNotebookId || undefined,
      limit: 500,
    })
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keep selected note valid when filtered list changes
    ensureSelectedPageExists(searchResult.items);
  }, [ensureSelectedPageExists, searchResult.items]);

  const pendingReviewCount = useMemo(() => {
    return baseSearchResult.items.filter(item => item.status.trim().toLowerCase() !== 'reviewed')
      .length;
  }, [baseSearchResult.items]);

  const selectedSearchItem = useMemo(
    () => searchResult.items.find(item => item.id === selectedPageId) || null,
    [searchResult.items, selectedPageId]
  );
  const selectedIsQuoteCard = selectedPagePayload?.page.noteKind === 'quote_card';

  const handleEditorOpenChange = React.useCallback((open: boolean) => {
    setEditorOpen(open);
    if (!open) {
      setEditorExpanded(false);
    }
  }, []);

  const handleCreateNote = async () => {
    const result = await createPage({
      parentPageId: activeNotebookId || undefined,
      title: t('notes.v2.page.newNoteTitle', { defaultValue: 'New Note' }),
      metadata: { status: 'Inbox', pinned: false },
      icon: '📝',
    });
    if (result?.id) {
      hydratedPageIdRef.current = null;
      setSelectedPageId(result.id);
      setEditorExpanded(false);
      setEditorOpen(true);
    }
  };

  const handleDeletePage = async (pageId: Id<'note_pages'>) => {
    const confirmed = globalThis.window.confirm(
      t('notes.v2.confirm.deletePage', {
        defaultValue: 'Delete this note? It will be moved out of your active notebook.',
      })
    );
    if (!confirmed) return;
    await archivePage({ pageId, archived: true });
    if (selectedPageId === pageId) {
      setSelectedPageId(null);
      handleEditorOpenChange(false);
      setTitle('');
      setNoteKind('longform_page');
      setQuoteText('');
      setEditorDoc(EMPTY_DOC);
      hydratedPageIdRef.current = null;
    }
  };

  const handleOpenSource = () => {
    const path = toSourcePath(selectedSearchItem?.sourceRef);
    if (!path) return;
    const currentPath =
      typeof window === 'undefined' ? null : `${window.location.pathname}${window.location.search}`;
    navigate(appendReturnToPath(path, currentPath));
  };

  const handleRetrySave = async () => {
    if (!selectedPageId) return;
    try {
      const nextTitle = title.trim() || 'Untitled';
      const nextDocString = JSON.stringify(editorDoc || EMPTY_DOC);
      const nextNoteText = extractEditorDocText(editorDoc || EMPTY_DOC).trim();
      setSaveState('saving');
      await updatePage({ pageId: selectedPageId, title: nextTitle });
      if (noteKind === 'quote_card') {
        await saveBlocks({
          pageId: selectedPageId,
          upsertBlocks: nextNoteText
            ? [
              {
                blockKey: 'note',
                blockType: 'paragraph',
                content: { text: nextNoteText },
                props: { source: 'notebook' },
                sortOrder: 1,
              },
            ]
            : undefined,
          deleteBlockKeys: nextNoteText ? undefined : ['note'],
        });
      } else {
        await saveEditorDoc({
          pageId: selectedPageId,
          doc: JSON.parse(nextDocString) as Record<string, unknown>,
        });
      }
      lastSyncedRef.current = {
        pageId: selectedPageId,
        title: nextTitle,
        noteKind,
        doc: nextDocString,
        noteText: nextNoteText,
      };
      setSaveState('saved');
      setLastSavedAt(Date.now());
    } catch {
      setSaveState('error');
    }
  };

  const contextualSidebarContent = useMemo(
    () => (
      <div className="space-y-3">
        <ContextualSection
          title={t('notes.v2.context.smartNotebook', { defaultValue: 'Smart Notebook' })}
          badge={<ContextualCountBadge value={searchResult.items.length} tone="accent" />}
          withRail
        >
          <div className="space-y-1.5">
            <ContextualListItemButton
              icon={Home}
              label={t('notes.v2.views.home', { defaultValue: 'Home' })}
              onClick={() => navigate('/dashboard')}
            />
            <ContextualListItemButton
              icon={Grid3X3}
              label={t('notes.v2.context.allNotes', { defaultValue: 'All Notes' })}
              active
            />
            <ContextualListItemButton
              icon={CheckCircle2}
              label={t('notes.v2.context.reviewPlan', { defaultValue: 'Review Plan' })}
              subtitle={t('notes.v2.context.reviewPlanHint', {
                defaultValue: 'Open today’s review queue',
              })}
              onClick={() => navigate('/review')}
            />
          </div>
        </ContextualSection>

        <ContextualSection
          title={t('notes.v2.context.pendingReview', { defaultValue: 'Pending Review' })}
          badge={<ContextualCountBadge value={pendingReviewCount} tone="warning" />}
        >
          <ContextualPrimaryActionButton
            label={t('notes.v2.context.startSmartReview', {
              defaultValue: 'Start Smart Review',
            })}
            onClick={() => navigate('/review')}
          />
        </ContextualSection>

        <ContextualSection
          title={t('notes.picker.myNotebooks', { defaultValue: 'My Notebooks' })}
          badge={<ContextualCountBadge value={notebooksResult.notebooks.length} />}
          withRail
        >
          {notebooksResult.notebooks.length > 0 ? (
            <div className="space-y-1.5">
              {notebooksResult.notebooks.map(notebook => (
                <ContextualListItemButton
                  key={notebook.id}
                  icon={Folder}
                  label={notebook.title}
                  active={activeNotebookId === notebook.id}
                  onClick={() => {
                    setActiveNotebookId(notebook.id);
                    setSelectedPageId(null);
                  }}
                  trailing={<ContextualCountBadge value={notebook.noteCount} />}
                />
              ))}
            </div>
          ) : (
            <ContextualEmptyState
              title={t('notes.v2.context.noNotebooks', { defaultValue: 'No notebooks yet' })}
              subtitle={t('notes.v2.context.noNotebooksHint', {
                defaultValue: 'Create your first note to generate one automatically.',
              })}
            />
          )}
        </ContextualSection>
      </div>
    ),
    [
      activeNotebookId,
      navigate,
      notebooksResult.notebooks,
      pendingReviewCount,
      searchResult.items.length,
      t,
    ]
  );

  useContextualSidebar({
    id: 'notebook-v2-context',
    title: t('notes.v2.context.smartNotebook', { defaultValue: 'Smart Notebook' }),
    subtitle: t('notes.v2.context.smartNotebookSubtitle', {
      defaultValue: 'Notebook quick view',
    }),
    content: contextualSidebarContent,
    enabled: true,
  });

  if (isMobile) {
    return (
      <Suspense fallback={<div className="min-h-[50vh]" />}>
        <LazyMobileNotebookPage
          {...{
            t,
            navigate,
            dateLocale,
            activeNotebookId,
            setActiveNotebookId,
            selectedPageId,
            setSelectedPageId,
            query,
            setQuery,
            sourceFilter,
            setSourceFilter,
            editorOpen,
            setEditorOpen,
            handleEditorOpenChange,
            editorExpanded,
            setEditorExpanded,
            title,
            setTitle,
            noteKind,
            setNoteKind,
            quoteText,
            setQuoteText,
            editorDoc,
            setEditorDoc,
            saveState,
            lastSavedAt,
            notebooksResult,
            sourceSummary,
            searchResult,
            pendingReviewCount,
            selectedSearchItem,
            selectedIsQuoteCard,
            selectedPagePayload,
            handleCreateNote,
            handleDeletePage,
            handleOpenSource,
            handleRetrySave,
          }}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-[50vh]" />}>
      <DesktopNotebookV2Page />
    </Suspense>
  );
}
