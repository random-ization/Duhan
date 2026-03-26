import React from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Folder,
  Search,
  Plus,
  Loader2,
  Play,
  Maximize2,
  Minimize2,
  X,
  MoreVertical,
  Trash2,
} from 'lucide-react';

import {
  Button,
  Input,
  Sheet,
  SheetContent,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui';
import OfficialTiptapEditor from '../notebook/OfficialTiptapEditor';
import type { JSONContent } from '@tiptap/core';

import type { Id } from '../../../convex/_generated/dataModel';
import {
  type SaveState,
  type NoteKind,
  type TranslateFn,
  type NotebookListResult,
  type SearchItem,
  type SearchResult,
  type PagePayload,
  toSourceLabel,
  toCardType,
  toStatusBadge,
  formatTime,
  RICH_TEXT_CLASS,
  QUOTE_CARD_RICH_CLASS,
  toPlainText,
  toPreviewHtml,
  toRichHtml,
} from '../../pages/NotebookV2Page';

interface MobileNotebookPageProps {
  t: TranslateFn;
  navigate: any;
  dateLocale: string;
  activeNotebookId: Id<'note_pages'> | null;
  setActiveNotebookId: (id: Id<'note_pages'> | null) => void;
  selectedPageId: Id<'note_pages'> | null;
  setSelectedPageId: (id: Id<'note_pages'> | null) => void;
  query: string;
  setQuery: (q: string) => void;
  sourceFilter: string;
  setSourceFilter: (filter: string) => void;
  editorOpen: boolean;
  setEditorOpen: (open: boolean) => void;
  handleEditorOpenChange: (open: boolean) => void;
  editorExpanded: boolean;
  setEditorExpanded: (expanded: boolean | ((prev: boolean) => boolean)) => void;
  title: string;
  setTitle: (t: string) => void;
  noteKind: NoteKind;
  setNoteKind: (k: NoteKind) => void;
  quoteText: string;
  setQuoteText: (q: string) => void;
  editorDoc: JSONContent;
  setEditorDoc: (d: JSONContent) => void;
  saveState: SaveState;
  lastSavedAt: number | null;
  notebooksResult: NotebookListResult;
  sourceSummary: any[];
  searchResult: SearchResult;
  pendingReviewCount: number;
  selectedSearchItem: SearchItem | null;
  selectedIsQuoteCard: boolean;
  selectedPagePayload: PagePayload | null | undefined;
  handleCreateNote: () => Promise<void>;
  handleDeletePage: (id: Id<'note_pages'>) => Promise<void>;
  handleOpenSource: () => void;
  handleRetrySave: () => Promise<void>;
}

export const MobileNotebookPage: React.FC<MobileNotebookPageProps> = props => {
  const {
    t,
    navigate,
    dateLocale,
    activeNotebookId,
    setActiveNotebookId,
    selectedPageId,
    setSelectedPageId,
    query,
    setQuery,
    editorOpen,
    handleEditorOpenChange,
    editorExpanded,
    setEditorExpanded,
    title,
    setTitle,
    quoteText,
    editorDoc,
    setEditorDoc,
    saveState,
    notebooksResult,
    searchResult,
    pendingReviewCount,
    selectedSearchItem,
    selectedIsQuoteCard,
    selectedPagePayload,
    handleCreateNote,
    handleDeletePage,
    handleOpenSource,
  } = props;

  return (
    <div className="min-h-screen bg-muted/30 pb-[130px] flex flex-col font-sans">
      {/* Header - Glassmorphism */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="-ml-3 rounded-full"
                onClick={() => navigate('/practice')}
              >
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </Button>
              <h1 className="text-2xl font-black text-foreground">
                {t('notes.v2.page.titleAllNotes', { defaultValue: 'Smart Notebook' })}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCreateNote}
              className="bg-primary/10 text-primary rounded-full hover:bg-primary/20"
            >
              <Plus className="w-5 h-5" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={t('notes.v2.page.searchPlaceholder', {
                defaultValue: 'Search quote or note...',
              })}
              className="w-full bg-muted/60 border-transparent rounded-[1.2rem] py-3 pl-11 pr-4 text-sm font-medium focus:bg-background focus:border-primary/50 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
            />
          </div>
        </div>
      </div>

      <div className="px-5 py-6 space-y-8 flex-1">
        {/* Smart Review CTA */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-violet-600 rounded-[2rem] p-6 text-white shadow-xl shadow-indigo-500/20 active:scale-[0.98] transition-transform">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
          <div className="relative z-10 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-5 h-5 text-indigo-200" />
                <span className="font-bold text-indigo-100">
                  {t('notes.v2.page.todayReviewTitle', { defaultValue: 'Today’s Review Queue' })}
                </span>
              </div>
              <p className="text-3xl font-black">
                {pendingReviewCount}{' '}
                <span className="text-lg font-medium text-indigo-200 opacity-80">
                  {t('notes.v2.context.pendingReview', { defaultValue: 'Pending' })}
                </span>
              </p>
            </div>
            <Button
              variant="secondary"
              onClick={() => navigate('/review')}
              className="w-full rounded-2xl h-12 font-black text-indigo-600 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Play className="w-5 h-5 fill-current" />
              {t('notes.v2.context.startSmartReview', { defaultValue: 'Start Smart Review' })}
            </Button>
          </div>
        </div>

        {/* Notebooks Carousel (My Notebooks) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">
              {t('notes.picker.myNotebooks', { defaultValue: 'My Notebooks' })}
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar -mx-5 px-5 snap-x">
            <Button
              variant="outline"
              onClick={() => {
                setActiveNotebookId(null);
                setSelectedPageId(null);
              }}
              className={`snap-start shrink-0 w-[140px] h-24 flex flex-col items-start justify-between p-4 rounded-2xl border-2 transition-all ${
                activeNotebookId === null
                  ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                  : 'border-border bg-card text-muted-foreground'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <Folder
                  className={`w-6 h-6 ${activeNotebookId === null ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`}
                />
                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md">
                  {searchResult.items.length}
                </span>
              </div>
              <span className="font-bold truncate w-full text-left text-sm">
                {t('notes.tabs.all', { defaultValue: 'All' })}
              </span>
            </Button>
            {notebooksResult.notebooks.map(nb => (
              <Button
                key={nb.id}
                variant="outline"
                onClick={() => {
                  setActiveNotebookId(nb.id);
                  setSelectedPageId(null);
                }}
                className={`snap-start shrink-0 w-[140px] h-24 flex flex-col items-start justify-between p-4 rounded-2xl border-2 transition-all ${
                  activeNotebookId === nb.id
                    ? 'border-primary bg-primary/5 shadow-md shadow-primary/10'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <Folder
                    className={`w-6 h-6 ${activeNotebookId === nb.id ? 'text-primary fill-primary/20' : 'text-muted-foreground'}`}
                  />
                  <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-md">
                    {nb.noteCount}
                  </span>
                </div>
                <span className="font-bold truncate w-full text-left text-sm">{nb.title}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Feed matching activeNotebookId */}
        <div className="space-y-4">
          <h2 className="text-lg font-black text-foreground">
            {activeNotebookId
              ? notebooksResult.notebooks.find(n => n.id === activeNotebookId)?.title
              : t('notes.v2.context.allNotes', { defaultValue: 'All Notes' })}
          </h2>

          {searchResult.items.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center px-6 border-2 border-dashed border-border rounded-3xl bg-card">
              <Folder className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">
                {t('notes.v2.context.noNotebooksHint', { defaultValue: 'No notes here.' })}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {searchResult.items.map(item => {
                const cardType = toCardType(item, t);
                const status = toStatusBadge(item.status || 'Inbox', t);
                const snippetHtml = toPreviewHtml(item.snippet);
                const quoteHtml = toPreviewHtml(item.quoteText);
                const noteHtml = toPreviewHtml(item.noteText || item.snippet);

                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    onClick={() => {
                      setSelectedPageId(item.id);
                      setEditorExpanded(false);
                      handleEditorOpenChange(true);
                    }}
                    className="h-auto w-full flex-col items-start p-5 bg-card rounded-3xl border border-border/60 shadow-sm active:scale-[0.98] transition-all !whitespace-normal"
                  >
                    <div className="flex justify-between items-start w-full mb-3 gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{cardType.icon}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider ${cardType.badgeClass}`}
                        >
                          {cardType.label}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </div>

                    <h3 className="text-[17px] leading-tight font-black text-foreground mb-2 text-left line-clamp-2 w-full">
                      {toPlainText(item.title) || item.title}
                    </h3>

                    {item.noteKind === 'quote_card' && quoteHtml ? (
                      <blockquote
                        className={`w-full mb-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground line-clamp-3 ${QUOTE_CARD_RICH_CLASS} ${RICH_TEXT_CLASS}`}
                        dangerouslySetInnerHTML={{ __html: quoteHtml }}
                      />
                    ) : null}

                    {noteHtml ? (
                      <div
                        className={`w-full text-muted-foreground text-sm flex-grow line-clamp-2 text-left leading-relaxed ${RICH_TEXT_CLASS}`}
                        dangerouslySetInnerHTML={{
                          __html:
                            item.noteKind === 'quote_card' ? noteHtml : snippetHtml || noteHtml,
                        }}
                      />
                    ) : (
                      <p className="w-full text-muted-foreground text-sm flex-grow text-left">
                        {t('notes.v2.page.clickToViewAndEdit', {
                          defaultValue: 'Click to view and edit content',
                        })}
                      </p>
                    )}

                    <div className="flex gap-2 mt-4 pt-3 border-t border-border w-full flex-wrap items-center">
                      <span className="text-[11px] font-bold text-muted-foreground uppercase">
                        {formatTime(item.updatedAt, dateLocale)} ·{' '}
                        {toSourceLabel(item.sourceModule, t)}
                      </span>
                    </div>
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Note Editor Drawer / Sheet */}
      <Sheet open={editorOpen} onOpenChange={handleEditorOpenChange}>
        <SheetPortal>
          <SheetOverlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
          <SheetContent
            unstyled
            closeOnEscape={false}
            lockBodyScroll={false}
            className={`fixed bottom-0 left-0 right-0 bg-card rounded-t-[2rem] z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-300 ${editorExpanded ? 'h-[95dvh]' : 'h-[85dvh]'}`}
          >
            <div className="flex flex-col h-full overflow-hidden relative pb-safe">
              {/* Drag indicator */}
              <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center shrink-0">
                <div className="w-12 h-1.5 bg-muted rounded-full" />
              </div>

              {/* Editor Header */}
              <div className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-border shrink-0">
                <div className="flex flex-col">
                  <SheetTitle className="text-xl font-black text-foreground truncate max-w-[200px]">
                    {title || t('notes.v2.page.editNote', { defaultValue: 'Edit Note' })}
                  </SheetTitle>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 mt-1">
                    {saveState === 'saving' && <Loader2 className="w-3 h-3 animate-spin" />}
                    {saveState === 'saving'
                      ? t('notes.v2.page.saveState.saving', { defaultValue: 'Saving...' })
                      : saveState === 'error'
                        ? t('notes.v2.page.saveState.error', { defaultValue: 'Save failed' })
                        : t('notes.v2.page.saveState.saved', { defaultValue: 'Saved' })}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditorExpanded(!editorExpanded)}
                    className="text-muted-foreground w-9 h-9"
                  >
                    {editorExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground w-9 h-9">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      unstyled
                      className="z-[60] absolute right-4 top-12 min-w-[160px] rounded-2xl border border-border bg-card p-1.5 shadow-xl"
                    >
                      {selectedSearchItem?.sourceRef && (
                        <div
                          onClick={handleOpenSource}
                          className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold hover:bg-muted active:bg-muted cursor-pointer"
                        >
                          <ArrowLeft className="w-4 h-4" />{' '}
                          {t('notes.v2.page.viewSource', { defaultValue: 'View Source' })}
                        </div>
                      )}
                      <div
                        onClick={() => {
                          handleDeletePage(selectedPageId!);
                          handleEditorOpenChange(false);
                        }}
                        className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-destructive hover:bg-destructive/10 active:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />{' '}
                        {t('notes.detail.deleteTitle', { defaultValue: 'Delete' })}
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditorOpenChange(false)}
                    className="bg-muted text-muted-foreground rounded-full ml-1 w-9 h-9"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Editor Content */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                {!selectedPagePayload ? (
                  <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                    <p className="text-sm font-medium">
                      {t('notes.v2.editor.loading', { defaultValue: 'Loading editor...' })}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-4 pb-10">
                    <Input
                      value={title}
                      onChange={event => setTitle(event.target.value)}
                      className="h-auto border-0 px-0 text-3xl font-extrabold shadow-none focus-visible:ring-0 bg-transparent"
                      placeholder={t('notes.titlePlaceholder', { defaultValue: 'Untitled' })}
                    />
                    {selectedIsQuoteCard ? (
                      <div className="space-y-4">
                        <div
                          className={`rounded-2xl border border-border p-4 ${QUOTE_CARD_RICH_CLASS}`}
                        >
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-primary">
                            {t('notes.v2.page.quoteSectionTitle', { defaultValue: 'Quote' })}
                          </p>
                          {toRichHtml(quoteText) ? (
                            <blockquote
                              className={`whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-foreground ${RICH_TEXT_CLASS}`}
                              dangerouslySetInnerHTML={{ __html: toRichHtml(quoteText) }}
                            />
                          ) : (
                            <blockquote className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-foreground">
                              {t('notes.v2.page.quoteMissing', {
                                defaultValue: 'Original quote not found',
                              })}
                            </blockquote>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {t('notes.v2.page.myNote', { defaultValue: 'My Note' })}
                          </p>
                          <OfficialTiptapEditor
                            value={editorDoc}
                            onChange={setEditorDoc}
                            placeholder={t('notes.v2.page.quoteEditorPlaceholder', {
                              defaultValue: 'Write your understanding...',
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
                )}
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
};
