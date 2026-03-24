import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileNotebookPage } from '../components/mobile/MobileNotebookPage';
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
import OfficialTiptapEditor from '../components/notebook/OfficialTiptapEditor';
import { useContextualSidebar } from '../hooks/useContextualSidebar';
import { sanitizeHtml } from '../utils/sanitize';
import {
  ContextualCountBadge,
  ContextualEmptyState,
  ContextualListItemButton,
  ContextualPrimaryActionButton,
  ContextualSection,
} from '../components/layout/contextualSidebarBlocks';

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
  nextCursor: number | null;
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
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorExpanded, setEditorExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [noteKind, setNoteKind] = useState<NoteKind>('longform_page');
  const [quoteText, setQuoteText] = useState('');
  const [editorDoc, setEditorDoc] = useState<JSONContent>(EMPTY_DOC);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const migrationDoneRef = useRef(false);
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

  const notebooksResult = (useQuery(NOTE_PAGES.listNotebooks, {}) as
    | NotebookListResult
    | undefined) || {
    notebooks: [],
    totals: { notebooks: 0, notes: 0, unassigned: 0 },
  };

  const baseSearchResult = (useQuery(NOTE_PAGES.search, {
    query: query.trim() || undefined,
    notebookId: activeNotebookId || undefined,
    limit: 500,
  }) as SearchResult | undefined) || { items: [], nextCursor: null };

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
  const migrateNotesIntoSourceNotebooks = useMutation(NOTE_PAGES.migrateNotesIntoSourceNotebooks);

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
    if (migrationDoneRef.current) return;
    migrationDoneRef.current = true;
    void migrateNotesIntoSourceNotebooks({ limit: 8000 }).catch(() => {
      // idempotent best-effort
    });
  }, [migrateNotesIntoSourceNotebooks]);

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

  const searchResult = (useQuery(NOTE_PAGES.search, {
    query: query.trim() || undefined,
    sourceModules: selectedSourceModules,
    notebookId: activeNotebookId || undefined,
    limit: 500,
  }) as SearchResult | undefined) || { items: [], nextCursor: null };

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
    if (path) navigate(path);
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
    return <MobileNotebookPage {...{
      t, navigate, dateLocale, activeNotebookId, setActiveNotebookId,
      selectedPageId, setSelectedPageId, query, setQuery, sourceFilter, setSourceFilter,
      editorOpen, setEditorOpen, handleEditorOpenChange, editorExpanded, setEditorExpanded,
      title, setTitle, noteKind, setNoteKind, quoteText, setQuoteText, editorDoc, setEditorDoc,
      saveState, lastSavedAt, notebooksResult, sourceSummary, searchResult, pendingReviewCount,
      selectedSearchItem, selectedIsQuoteCard, selectedPagePayload,
      handleCreateNote, handleDeletePage, handleOpenSource, handleRetrySave,
    }} />;
  }

  return (
    <div className="w-full min-h-full bg-background text-foreground font-sans rounded-3xl border border-border overflow-hidden">
      <main className="p-6 lg:p-8 bg-card min-h-full">
        <div className="mb-8 relative">
          <h1 className="text-4xl font-extrabold text-foreground">
            {t('notes.v2.page.titleAllNotes', { defaultValue: 'All Notes' })}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('notes.v2.page.subtitleAllNotes', {
              defaultValue: 'Manage all your learning assets here and launch smart review.',
            })}
          </p>
        </div>

        <div className="bg-accent border border-border p-5 rounded-xl mb-10 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <CheckCircle2 className="h-7 w-7 text-primary" />
            <div>
              <p className="font-semibold text-foreground">
                {t('notes.v2.page.todayReviewTitle', { defaultValue: 'Today’s Review Queue' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('notes.v2.page.todayReviewSummary', {
                  count: pendingReviewCount,
                  defaultValue: 'You have {{count}} item(s) to review today.',
                })}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="default"
            size="auto"
            onClick={() => navigate('/review')}
            className="px-5 py-2.5 rounded-lg font-bold shadow-sm transition-all"
          >
            {t('notes.v2.context.startSmartReview', { defaultValue: 'Start Smart Review' })}
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8 border-b border-border pb-3 gap-3 flex-wrap">
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setViewMode('gallery')}
              className={`px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 ${
                viewMode === 'gallery'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Grid3X3 className="w-4 h-4 text-muted-foreground" />{' '}
              {t('notes.v2.page.viewGallery', { defaultValue: 'Gallery View' })}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setViewMode('list')}
              className={`px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 ${
                viewMode === 'list'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <List className="w-4 h-4 text-muted-foreground" />{' '}
              {t('notes.v2.page.viewList', { defaultValue: 'List View' })}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-lg font-medium text-sm flex items-center gap-2 ${
                viewMode === 'table'
                  ? 'bg-muted text-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Table className="w-4 h-4 text-muted-foreground" />{' '}
              {t('notes.v2.page.viewTable', { defaultValue: 'Table View' })}
            </Button>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={t('notes.v2.page.searchPlaceholder', {
                  defaultValue: 'Search quote or note...',
                })}
                className="w-full bg-card border border-border rounded-xl py-2 pl-10 pr-4 text-sm"
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Select
                value={sourceFilter}
                onChange={event => setSourceFilter(event.target.value)}
                className="h-10 rounded-lg text-sm border border-border bg-card pl-9 pr-8 text-muted-foreground"
              >
                <option value="">
                  {t('notes.v2.sidebar.allSources', { defaultValue: 'All sources' })}
                </option>
                {sourceSummary.map(source => (
                  <option key={source.key} value={source.key}>
                    {t('notes.v2.page.sourceOption', {
                      label: source.label,
                      count: source.count,
                      defaultValue: '{{label}} ({{count}})',
                    })}
                  </option>
                ))}
              </Select>
            </div>

            <Button
              type="button"
              variant="default"
              size="auto"
              onClick={handleCreateNote}
              className="px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />{' '}
              {t('notes.v2.page.newNoteButton', { defaultValue: 'New Note' })}
            </Button>
          </div>
        </div>

        {searchResult.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-muted-foreground">
            {t('notes.v2.page.emptyNotes', {
              defaultValue: 'No notes yet. Click “New Note” to start capturing your learning.',
            })}
          </div>
        ) : null}

        {searchResult.items.length > 0 && viewMode === 'gallery' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {searchResult.items.map(item => {
              const cardType = toCardType(item, t);
              const status = toStatusBadge(item.status || 'Inbox', t);
              const snippetHtml = toPreviewHtml(item.snippet);
              const quoteHtml = toPreviewHtml(item.quoteText);
              const noteHtml = toPreviewHtml(item.noteText || item.snippet);
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    setSelectedPageId(item.id);
                    setEditorExpanded(false);
                    setEditorOpen(true);
                  }}
                  className="!block bg-card p-5 rounded-2xl border border-border hover:shadow-lg hover:-translate-y-1 transition-all text-left h-full !whitespace-normal"
                >
                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <span>{cardType.icon}</span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded tracking-wide ${cardType.badgeClass}`}
                      >
                        {cardType.label}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-foreground mb-2 line-clamp-1">
                    {toPlainText(item.title) || item.title}
                  </h3>
                  {item.noteKind === 'quote_card' && quoteHtml ? (
                    <blockquote
                      className={`mb-3 rounded-xl px-3 py-2 text-sm font-medium text-foreground line-clamp-3 ${QUOTE_CARD_RICH_CLASS} ${RICH_TEXT_CLASS}`}
                      dangerouslySetInnerHTML={{ __html: quoteHtml }}
                    />
                  ) : null}
                  {noteHtml ? (
                    <div
                      className={`text-muted-foreground text-sm mb-4 flex-grow line-clamp-2 ${RICH_TEXT_CLASS}`}
                      dangerouslySetInnerHTML={{
                        __html: item.noteKind === 'quote_card' ? noteHtml : snippetHtml || noteHtml,
                      }}
                    />
                  ) : (
                    <p className="text-muted-foreground text-sm mb-4 flex-grow line-clamp-2">
                      {t('notes.v2.page.clickToViewAndEdit', {
                        defaultValue: 'Click to view and edit content',
                      })}
                    </p>
                  )}

                  <div className="flex gap-2 mt-auto flex-wrap">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {toSourceLabel(item.sourceModule, t)}
                    </span>
                    {(item.tags || []).slice(0, 2).map(tag => (
                      <span
                        key={tag}
                        className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </Button>
              );
            })}
          </div>
        ) : null}

        {searchResult.items.length > 0 && viewMode === 'list' ? (
          <div className="space-y-3">
            {searchResult.items.map(item => {
              const snippetHtml = toPreviewHtml(item.snippet);
              const quoteHtml = toPreviewHtml(item.quoteText);
              const noteHtml = toPreviewHtml(item.noteText || item.snippet);
              return (
                <Button
                  key={item.id}
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    setSelectedPageId(item.id);
                    setEditorExpanded(false);
                    setEditorOpen(true);
                  }}
                  className="w-full rounded-xl border border-border bg-card p-4 text-left hover:bg-muted/30 !justify-start !whitespace-normal h-auto"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                      <p className="font-semibold text-foreground line-clamp-1">
                        {toPlainText(item.title) || item.title}
                      </p>
                      {item.noteKind === 'quote_card' && quoteHtml ? (
                        <blockquote
                          className={`rounded-lg px-3 py-2 text-sm font-medium text-foreground line-clamp-2 ${QUOTE_CARD_RICH_CLASS} ${RICH_TEXT_CLASS}`}
                          dangerouslySetInnerHTML={{ __html: quoteHtml }}
                        />
                      ) : null}
                      {noteHtml ? (
                        <div
                          className={`text-sm text-muted-foreground line-clamp-1 mt-1 ${RICH_TEXT_CLASS}`}
                          dangerouslySetInnerHTML={{
                            __html:
                              item.noteKind === 'quote_card' ? noteHtml : snippetHtml || noteHtml,
                          }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {t('notes.v2.page.clickToViewAndEdit', {
                            defaultValue: 'Click to view and edit content',
                          })}
                        </p>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">
                      {toSourceLabel(item.sourceModule, t)}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        ) : null}

        {searchResult.items.length > 0 && viewMode === 'table' ? (
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">
                    {t('notes.v2.page.table.title', { defaultValue: 'Title' })}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    {t('notes.v2.page.table.quote', { defaultValue: 'Quote' })}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    {t('notes.v2.page.table.source', { defaultValue: 'Source' })}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    {t('notes.v2.page.table.status', { defaultValue: 'Status' })}
                  </th>
                  <th className="px-4 py-2 text-left font-semibold">
                    {t('notes.v2.page.table.updatedAt', { defaultValue: 'Updated' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {searchResult.items.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => {
                      setSelectedPageId(item.id);
                      setEditorExpanded(false);
                      setEditorOpen(true);
                    }}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">{toPlainText(item.title) || item.title}</td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                      {toPlainText(item.quoteText) ||
                        t('notes.v2.page.table.emptyQuote', { defaultValue: '—' })}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {toSourceLabel(item.sourceModule, t)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {toStatusBadge(item.status || 'Inbox', t).label}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatTime(item.updatedAt, dateLocale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>

      <Sheet open={editorOpen} onOpenChange={handleEditorOpenChange}>
        <SheetPortal>
          <SheetOverlay className="fixed inset-0 z-40 bg-foreground/30" />
          <SheetContent
            className={`fixed right-0 top-0 z-50 h-screen overflow-y-auto border-l border-border bg-card p-0 shadow-2xl transition-[width] duration-200 ${
              editorExpanded ? 'w-[min(1280px,98vw)]' : 'w-[min(760px,96vw)]'
            }`}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card px-6 py-4">
              <SheetTitle className="text-base font-bold text-foreground">
                {t('notes.v2.page.editNote', { defaultValue: 'Edit Note' })}
              </SheetTitle>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => setEditorExpanded(prev => !prev)}
                  className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted"
                >
                  {editorExpanded ? (
                    <>
                      <Minimize2 className="mr-1 h-4 w-4" />{' '}
                      {t('notes.v2.page.restore', { defaultValue: 'Restore' })}
                    </>
                  ) : (
                    <>
                      <Maximize2 className="mr-1 h-4 w-4" />{' '}
                      {t('notes.v2.page.expand', { defaultValue: 'Expand' })}
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditorOpenChange(false)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!selectedPagePayload ? (
              <div className="px-6 py-12 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />{' '}
                {t('notes.v2.editor.loading', { defaultValue: 'Loading editor...' })}
              </div>
            ) : (
              <div className="px-6 py-6">
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {saveState === 'saving'
                      ? t('notes.v2.page.saveState.saving', { defaultValue: 'Saving...' })
                      : null}
                    {saveState === 'dirty'
                      ? t('notes.v2.page.saveState.dirty', { defaultValue: 'Unsaved changes' })
                      : null}
                    {saveState === 'saved'
                      ? t('notes.v2.page.saveState.saved', { defaultValue: 'Saved' })
                      : null}
                    {saveState === 'error'
                      ? t('notes.v2.page.saveState.error', { defaultValue: 'Save failed' })
                      : null}
                  </span>
                  <span>{lastSavedAt ? formatTime(lastSavedAt, dateLocale) : ''}</span>
                </div>

                <Input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  className="h-auto border-0 px-0 text-4xl font-extrabold shadow-none focus-visible:ring-0"
                  placeholder={t('notes.titlePlaceholder', { defaultValue: 'Untitled' })}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() =>
                      selectedSearchItem &&
                      togglePin({
                        pageId: selectedSearchItem.id,
                        pinned: !selectedSearchItem.pinned,
                      })
                    }
                  >
                    {selectedSearchItem?.pinned ? (
                      <>
                        <PinOff className="w-4 h-4 mr-1" />{' '}
                        {t('notes.v2.actions.unpin', { defaultValue: 'Unpin' })}
                      </>
                    ) : (
                      <>
                        <Pin className="w-4 h-4 mr-1" />{' '}
                        {t('notes.v2.actions.pin', { defaultValue: 'Pin' })}
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    disabled={!toSourcePath(selectedSearchItem?.sourceRef)}
                    onClick={handleOpenSource}
                  >
                    <ArrowUpRight className="w-4 h-4 mr-1" />{' '}
                    {t('notes.v2.actions.openSource', { defaultValue: 'Open Source' })}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    className="text-red-600 hover:text-red-700"
                    onClick={() => handleDeletePage(selectedPagePayload.page.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />{' '}
                    {t('notes.v2.actions.delete', { defaultValue: 'Delete' })}
                  </Button>

                  {saveState === 'error' ? (
                    <Button type="button" variant="ghost" size="auto" onClick={handleRetrySave}>
                      {t('notes.v2.page.retrySave', { defaultValue: 'Retry Save' })}
                    </Button>
                  ) : null}
                </div>

                <div className="mt-6">
                  {selectedIsQuoteCard ? (
                    <div className="space-y-4">
                      <div
                        className={`rounded-2xl border border-border p-4 ${QUOTE_CARD_RICH_CLASS}`}
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-bold uppercase tracking-wide text-primary">
                            {t('notes.v2.page.quoteSectionTitle', { defaultValue: 'Quote' })}
                          </p>
                          <span className="text-[11px] text-muted-foreground">
                            {t('notes.v2.page.quoteSectionHint', {
                              defaultValue: 'Keep source emphasis styling',
                            })}
                          </span>
                        </div>
                        {toRichHtml(quoteText) ? (
                          <div className="relative">
                            <span className="pointer-events-none absolute -left-1 -top-2 text-4xl font-black leading-none text-primary/25">
                              &ldquo;
                            </span>
                            <blockquote
                              className={`whitespace-pre-wrap pl-4 text-base font-medium leading-relaxed text-foreground ${RICH_TEXT_CLASS}`}
                              dangerouslySetInnerHTML={{ __html: toRichHtml(quoteText) }}
                            />
                          </div>
                        ) : (
                          <blockquote className="whitespace-pre-wrap text-base font-medium leading-relaxed text-foreground">
                            {t('notes.v2.page.quoteMissing', {
                              defaultValue: 'Original quote not found',
                            })}
                          </blockquote>
                        )}
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                          {t('notes.v2.page.myNote', { defaultValue: 'My Note' })}
                        </p>
                        <OfficialTiptapEditor
                          value={editorDoc}
                          onChange={setEditorDoc}
                          placeholder={t('notes.v2.page.quoteEditorPlaceholder', {
                            defaultValue:
                              'Write your understanding, questions, or translation for this quote.',
                          })}
                          preset="study"
                        />
                      </div>
                    </div>
                  ) : (
                    <OfficialTiptapEditor
                      value={editorDoc}
                      onChange={setEditorDoc}
                      placeholder={t('notes.v2.page.editorPlaceholder', {
                        defaultValue: 'Start writing your thoughts here...',
                      })}
                      preset="full"
                    />
                  )}
                </div>
              </div>
            )}
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
}
