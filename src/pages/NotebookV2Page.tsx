import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { BookMarked, ChevronLeft, FilePlus2, Pin, PinOff, Search, Trash2 } from 'lucide-react';
import type { JSONContent } from '@tiptap/core';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../convex/_generated/dataModel';
import { NOTE_PAGES } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { Button, Input } from '../components/ui';
import OfficialTiptapEditor from '../components/notebook/OfficialTiptapEditor';

type NoteBlock = {
  id: string;
  blockKey?: string;
  blockType: string;
  content: unknown;
  props?: Record<string, unknown>;
  sortOrder: number;
};

type PagePayload = {
  page: {
    id: Id<'note_pages'>;
    parentPageId?: Id<'note_pages'>;
    title: string;
    icon?: string;
    tags: string[];
    metadata?: Record<string, unknown>;
    status?: string;
    pinned?: boolean;
  };
  editorDoc?: JSONContent;
  blocks: NoteBlock[];
  backlinks: Array<{ id: Id<'note_pages'>; title: string; icon?: string }>;
  outgoingLinks: Array<{ id: Id<'note_pages'>; title: string; icon?: string }>;
  children: Array<{
    id: Id<'note_pages'>;
    title: string;
    icon?: string;
    sortOrder: number;
    isArchived: boolean;
    metadata?: Record<string, unknown>;
  }>;
};

type SearchItem = {
  id: Id<'note_pages'>;
  title: string;
  icon?: string;
  tags: string[];
  status: string;
  pinned: boolean;
  sourceModule?: string;
  noteType?: string;
  hasNote?: boolean;
  hasHighlight?: boolean;
  sourceRef?: Record<string, unknown>;
  lastReviewedAt?: number | null;
  updatedAt: number;
  createdAt: number;
  snippet: string;
};

type SearchResult = {
  items: SearchItem[];
  nextCursor: number | null;
};

type SidebarView = 'all' | 'reviewed' | 'pinned';
type SaveState = 'saved' | 'saving' | 'dirty' | 'error';

const EMPTY_DOC: JSONContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

const getDateLocale = (language: string): string => {
  if (language.startsWith('zh')) return 'zh-CN';
  if (language.startsWith('vi')) return 'vi-VN';
  if (language.startsWith('mn')) return 'mn-MN';
  if (language.startsWith('ko')) return 'ko-KR';
  return 'en-US';
};

const formatTime = (timestamp: number, locale: string) =>
  new Date(timestamp).toLocaleString(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const toStatusKey = (status: string): string => {
  const normalized = status.trim().toLowerCase();
  if (normalized === 'inbox') return 'inbox';
  if (normalized === 'recent') return 'recent';
  if (normalized === 'collections') return 'collections';
  if (normalized === 'queued') return 'queued';
  if (normalized === 'reviewed') return 'reviewed';
  return 'unknown';
};

const getStatusLabel = (
  status: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  const key = toStatusKey(status);
  if (key === 'unknown') return status;
  return t(`notes.v2.status.${key}`, { defaultValue: status });
};

const getSourceModuleLabel = (
  sourceModule: string,
  t: (key: string, options?: Record<string, unknown>) => string
): string => {
  const normalized = sourceModule.trim().toUpperCase();
  if (normalized.includes('TOPIK')) return t('notes.v2.source.topik', { defaultValue: 'TOPIK' });
  if (normalized.includes('READING') || normalized.includes('NEWS')) {
    return t('notes.v2.source.reading', { defaultValue: 'Reading' });
  }
  if (normalized.includes('TEXTBOOK')) {
    return t('notes.v2.source.textbook', { defaultValue: 'Textbook' });
  }
  if (normalized.includes('DICTIONARY')) {
    return t('notes.v2.source.dictionary', { defaultValue: 'Dictionary' });
  }
  if (normalized.includes('PRACTICE')) {
    return t('notes.v2.source.practice', { defaultValue: 'Practice' });
  }
  return sourceModule;
};

const getNoteTypeLabel = (
  noteType: string | undefined,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  const normalized = (noteType || 'manual').trim().toLowerCase();
  if (normalized === 'ai_mistake') {
    return t('notes.v2.noteType.aiMistake', { defaultValue: 'AI Mistake' });
  }
  if (normalized === 'vocab') {
    return t('notes.v2.noteType.vocab', { defaultValue: 'Vocab' });
  }
  if (normalized === 'grammar') {
    return t('notes.v2.noteType.grammar', { defaultValue: 'Grammar' });
  }
  return t('notes.v2.noteType.manual', { defaultValue: 'Manual' });
};

const buildSourcePath = (sourceRef?: Record<string, unknown>): string | null => {
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

const blocksToEditorDoc = (blocks: NoteBlock[]): JSONContent => {
  const tiptap = blocks.find(block => block.blockType === 'tiptap_doc');
  if (tiptap && tiptap.content && typeof tiptap.content === 'object') {
    return tiptap.content as JSONContent;
  }

  const sorted = blocks.slice().sort((a, b) => a.sortOrder - b.sortOrder);
  const content = sorted.map(block => {
    const text =
      typeof block.content === 'string'
        ? block.content
        : typeof (block.content as { text?: unknown })?.text === 'string'
          ? String((block.content as { text: string }).text)
          : '';

    const textNode = text ? [{ type: 'text', text }] : undefined;

    if (block.blockType === 'heading_1') return { type: 'heading', attrs: { level: 1 }, content: textNode };
    if (block.blockType === 'heading_2') return { type: 'heading', attrs: { level: 2 }, content: textNode };
    if (block.blockType === 'quote') return { type: 'blockquote', content: [{ type: 'paragraph', content: textNode }] };
    if (block.blockType === 'code') return { type: 'codeBlock', content: textNode };
    if (block.blockType === 'bulleted_list') {
      return { type: 'bulletList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: textNode }] }] };
    }
    if (block.blockType === 'numbered_list') {
      return { type: 'orderedList', content: [{ type: 'listItem', content: [{ type: 'paragraph', content: textNode }] }] };
    }
    return { type: 'paragraph', content: textNode };
  });

  if (content.length === 0) return EMPTY_DOC;
  return { type: 'doc', content };
};

const getSaveStateLabel = (
  saveState: SaveState,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  if (saveState === 'saving') {
    return t('notes.v2.save.saving', { defaultValue: 'Saving...' });
  }
  if (saveState === 'dirty') {
    return t('notes.v2.save.dirty', { defaultValue: 'Unsaved changes' });
  }
  if (saveState === 'error') {
    return t('notes.v2.save.error', { defaultValue: 'Save failed' });
  }
  return t('notes.v2.save.saved', { defaultValue: 'Saved' });
};

export default function NotebookV2Page() {
  const { t, i18n } = useTranslation();
  const navigate = useLocalizedNavigate();
  const dateLocale = getDateLocale(i18n.resolvedLanguage || i18n.language || 'en');

  const [selectedPageId, setSelectedPageId] = useState<Id<'note_pages'> | null>(null);
  const [title, setTitle] = useState('');
  const [editorDoc, setEditorDoc] = useState<JSONContent>(EMPTY_DOC);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<SidebarView>('all');
  const [sourceFilter, setSourceFilter] = useState('');
  const [migrationDone, setMigrationDone] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const hydratedPageIdRef = useRef<Id<'note_pages'> | null>(null);
  const lastSyncedRef = useRef<{ pageId: Id<'note_pages'> | null; title: string; doc: string }>({
    pageId: null,
    title: '',
    doc: JSON.stringify(EMPTY_DOC),
  });

  const statusFilter = useMemo(() => {
    if (view === 'reviewed') return ['Reviewed'];
    return undefined;
  }, [view]);

  const selectedPagePayload = useQuery(
    NOTE_PAGES.getPage,
    selectedPageId ? { pageId: selectedPageId } : 'skip'
  ) as PagePayload | null | undefined;

  const sourceBaseResult =
    (useQuery(NOTE_PAGES.search, {
      query: query.trim() || undefined,
      statuses: statusFilter,
      pinned: view === 'pinned' ? true : undefined,
      limit: 300,
    }) as SearchResult | undefined) || { items: [], nextCursor: null };

  const searchResult =
    (useQuery(NOTE_PAGES.search, {
      query: query.trim() || undefined,
      statuses: statusFilter,
      sourceModules: sourceFilter ? [sourceFilter] : undefined,
      pinned: view === 'pinned' ? true : undefined,
      limit: 200,
    }) as SearchResult | undefined) || { items: [], nextCursor: null };

  const createPage = useMutation(NOTE_PAGES.createPage);
  const updatePage = useMutation(NOTE_PAGES.updatePage);
  const saveEditorDoc = useMutation(NOTE_PAGES.saveEditorDoc);
  const togglePin = useMutation(NOTE_PAGES.togglePin);
  const archivePage = useMutation(NOTE_PAGES.archivePage);
  const migrateLegacyAllNotes = useMutation(NOTE_PAGES.migrateLegacyAllNotes);

  useEffect(() => {
    if (migrationDone) return;
    setMigrationDone(true);
    void migrateLegacyAllNotes({ limit: 8000 }).catch(() => {
      // noop: migration is best-effort and idempotent
    });
  }, [migrationDone, migrateLegacyAllNotes]);

  useEffect(() => {
    if (selectedPageId || searchResult.items.length === 0) return;
    setSelectedPageId(searchResult.items[0].id);
  }, [searchResult.items, selectedPageId]);

  useEffect(() => {
    if (!selectedPagePayload?.page) return;
    const nextPageId = selectedPagePayload.page.id;
    if (hydratedPageIdRef.current === nextPageId) return;

    const incomingDoc = selectedPagePayload.editorDoc || blocksToEditorDoc(selectedPagePayload.blocks || []);
    const incomingDocString = JSON.stringify(incomingDoc || EMPTY_DOC);

    setTitle(selectedPagePayload.page.title);
    setEditorDoc(incomingDoc);
    setSaveState('saved');
    setLastSavedAt(Date.now());
    lastSyncedRef.current = {
      pageId: nextPageId,
      title: selectedPagePayload.page.title,
      doc: incomingDocString,
    };
    hydratedPageIdRef.current = nextPageId;
  }, [
    selectedPagePayload?.page.id,
    selectedPagePayload?.page.title,
    selectedPagePayload?.editorDoc,
    selectedPagePayload?.blocks,
  ]);

  const selectedSearchItem = useMemo(
    () => searchResult.items.find(item => item.id === selectedPageId) || null,
    [searchResult.items, selectedPageId]
  );

  const sourceSummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of sourceBaseResult.items) {
      if (!item.sourceModule) continue;
      const key = item.sourceModule;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([key, count]) => ({
        key,
        count,
        label: getSourceModuleLabel(key, t),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sourceBaseResult.items, t]);

  useEffect(() => {
    if (!selectedPagePayload?.page || !selectedPageId) return;

    const nextDocString = JSON.stringify(editorDoc || EMPTY_DOC);
    const nextTitle = title.trim() ? title : t('notes.titlePlaceholder', { defaultValue: 'Untitled' });

    if (
      lastSyncedRef.current.pageId === selectedPageId &&
      lastSyncedRef.current.title === nextTitle &&
      lastSyncedRef.current.doc === nextDocString
    ) {
      setSaveState('saved');
      return;
    }

    setSaveState('dirty');

    const timer = globalThis.window.setTimeout(async () => {
      try {
        setSaveState('saving');
        await updatePage({ pageId: selectedPageId, title: nextTitle });
        await saveEditorDoc({ pageId: selectedPageId, doc: JSON.parse(nextDocString) as Record<string, unknown> });
        lastSyncedRef.current = { pageId: selectedPageId, title: nextTitle, doc: nextDocString };
        setSaveState('saved');
        setLastSavedAt(Date.now());
      } catch {
        setSaveState('error');
      }
    }, 900);

    return () => {
      globalThis.window.clearTimeout(timer);
    };
  }, [selectedPagePayload?.page?.id, selectedPageId, title, editorDoc, updatePage, saveEditorDoc, t]);

  const handleCreateRootPage = async () => {
    const result = await createPage({
      title: t('notes.newPage', { defaultValue: 'Untitled Page' }),
      metadata: { status: 'Inbox', pinned: false },
    });
    if (result?.id) {
      setSelectedPageId(result.id);
    }
  };

  const handleTogglePin = async (pageId: Id<'note_pages'>, pinned: boolean) => {
    await togglePin({ pageId, pinned: !pinned });
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
      hydratedPageIdRef.current = null;
      setSelectedPageId(null);
      setTitle('');
      setEditorDoc(EMPTY_DOC);
    }
  };

  const handleOpenSource = (sourceRef?: Record<string, unknown>) => {
    const path = buildSourcePath(sourceRef);
    if (path) navigate(path);
  };

  const handleRetrySave = async () => {
    if (!selectedPageId) return;
    try {
      setSaveState('saving');
      const nextDocString = JSON.stringify(editorDoc || EMPTY_DOC);
      const nextTitle = title.trim() ? title : t('notes.titlePlaceholder', { defaultValue: 'Untitled' });
      await updatePage({ pageId: selectedPageId, title: nextTitle });
      await saveEditorDoc({ pageId: selectedPageId, doc: JSON.parse(nextDocString) as Record<string, unknown> });
      lastSyncedRef.current = { pageId: selectedPageId, title: nextTitle, doc: nextDocString };
      setSaveState('saved');
      setLastSavedAt(Date.now());
    } catch {
      setSaveState('error');
    }
  };

  const currentStatus = selectedSearchItem?.status || selectedPagePayload?.page.status || 'Inbox';
  const currentPinned = Boolean(selectedSearchItem?.pinned ?? selectedPagePayload?.page.pinned);
  const currentSource = selectedSearchItem?.sourceModule;
  const currentNoteType = selectedSearchItem?.noteType;

  return (
    <div className="min-h-screen bg-[#f7f7f5] dark:bg-background lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-r border-border/80 bg-card/90 backdrop-blur">
        <div className="h-screen overflow-y-auto px-3 py-4">
          <div className="flex items-center justify-between gap-2 px-1">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => navigate('/practice')}
              className="text-muted-foreground"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              {t('dashboard.common.back', { defaultValue: 'Back' })}
            </Button>
            <Button type="button" variant="ghost" size="auto" onClick={handleCreateRootPage}>
              <FilePlus2 className="w-4 h-4 mr-1" />
              {t('notes.newPage', { defaultValue: 'New Page' })}
            </Button>
          </div>

          <div className="mt-3 px-1">
            <p className="text-sm font-semibold text-foreground">{t('notes.title', { defaultValue: 'Notebook' })}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{searchResult.items.length} notes</p>
          </div>

          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('notes.v2.sidebar.searchPlaceholder', {
                defaultValue: 'Search title, content, tag...',
              })}
              className="!pl-9"
            />
          </div>

          <div className="mt-4 space-y-1">
            <button
              type="button"
              onClick={() => setView('all')}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm ${
                view === 'all' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {t('notes.v2.sidebar.allNotes', { defaultValue: 'All Notes' })}
            </button>
            <button
              type="button"
              onClick={() => setView('reviewed')}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm ${
                view === 'reviewed' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {t('notes.v2.status.reviewed', { defaultValue: 'Reviewed' })}
            </button>
            <button
              type="button"
              onClick={() => setView('pinned')}
              className={`w-full rounded-md px-3 py-1.5 text-left text-sm ${
                view === 'pinned' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {t('notes.v2.actions.pin', { defaultValue: 'Pinned' })}
            </button>
          </div>

          <div className="mt-4 space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t('notes.v2.sidebar.sources', { defaultValue: 'Sources' })}
            </p>
            <button
              type="button"
              onClick={() => setSourceFilter('')}
              className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm ${
                sourceFilter === '' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <span>{t('notes.v2.sidebar.allSources', { defaultValue: 'All Sources' })}</span>
              <span className="text-xs text-muted-foreground">{sourceBaseResult.items.length}</span>
            </button>
            {sourceSummary.map(source => (
              <button
                key={source.key}
                type="button"
                onClick={() => setSourceFilter(source.key)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-1.5 text-left text-sm ${
                  sourceFilter === source.key
                    ? 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted/60'
                }`}
              >
                <span>{source.label}</span>
                <span className="text-xs text-muted-foreground">{source.count}</span>
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-0.5 pb-8">
            {searchResult.items.map(item => (
              <div
                key={item.id}
                className={`group rounded-md ${selectedPageId === item.id ? 'bg-muted' : 'hover:bg-muted/60'}`}
              >
                <div className="flex items-start gap-1 px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedPageId(item.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="text-sm text-foreground line-clamp-1">{(item.icon || '📝') + ' ' + item.title}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                      {formatTime(item.updatedAt, dateLocale)}
                      {item.sourceModule ? ` · ${getSourceModuleLabel(item.sourceModule, t)}` : ''}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => handleTogglePin(item.id, item.pinned)}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    {item.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      <main className="h-screen overflow-y-auto bg-background">
        {!selectedPagePayload ? (
          <div className="mx-auto max-w-3xl px-6 py-16">
            <div className="rounded-xl border border-dashed border-border bg-card p-8 text-muted-foreground">
              <p>{t('notes.v2.empty.editor', { defaultValue: 'Select a page to start editing.' })}</p>
              <Button type="button" variant="ghost" size="auto" onClick={handleCreateRootPage} className="mt-4">
                <FilePlus2 className="w-4 h-4 mr-1" />
                {t('notes.newPage', { defaultValue: 'New Page' })}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl px-6 py-10">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                <span>{t('notes.title', { defaultValue: 'Notebook' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{getSaveStateLabel(saveState, t)}</span>
                {lastSavedAt ? <span>· {formatTime(lastSavedAt, dateLocale)}</span> : null}
                {saveState === 'error' ? (
                  <Button type="button" variant="ghost" size="auto" onClick={handleRetrySave}>
                    {t('notes.v2.actions.retry', { defaultValue: 'Retry' })}
                  </Button>
                ) : null}
              </div>
            </div>

            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="mt-4 !text-4xl !font-black !h-auto !px-0 !border-0 !shadow-none focus-visible:!ring-0"
              placeholder={t('notes.titlePlaceholder', { defaultValue: 'Untitled' })}
            />

            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {getStatusLabel(currentStatus, t)}
              </span>
              {currentSource ? (
                <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                  {getSourceModuleLabel(currentSource, t)}
                </span>
              ) : null}
              <span className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground">
                {getNoteTypeLabel(currentNoteType, t)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => handleTogglePin(selectedPagePayload.page.id, currentPinned)}
              >
                {currentPinned
                  ? t('notes.v2.actions.unpin', { defaultValue: 'Unpin' })
                  : t('notes.v2.actions.pin', { defaultValue: 'Pin' })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => handleOpenSource(selectedSearchItem?.sourceRef)}
                disabled={!buildSourcePath(selectedSearchItem?.sourceRef)}
              >
                {t('notes.v2.actions.openSource', { defaultValue: 'Open Source' })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => handleDeletePage(selectedPagePayload.page.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('notes.v2.actions.delete', { defaultValue: 'Delete' })}
              </Button>
            </div>

            <div className="mt-6">
              <OfficialTiptapEditor
                value={editorDoc}
                onChange={setEditorDoc}
                placeholder={t('notes.v2.editor.fallbackPlaceholder', {
                  defaultValue: 'Start writing. Type / for quick commands.',
                })}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
