import React, { Suspense } from 'react';
import {
  CheckCircle2,
  Grid3X3,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Plus,
  Search,
  Table,
  Trash2,
  ArrowUpRight,
  Filter,
  X,
} from 'lucide-react';

import {
  Button,
  Input,
  Select,
} from '../../components/ui';
import {
  toCardType,
  toStatusBadge,
  toSourcePath,
  formatTime,
  toPreviewHtml,
  toPlainText,
  RICH_TEXT_CLASS,
  QUOTE_CARD_RICH_CLASS,
} from '../NotebookV2Page';

interface DesktopNotebookV2PageProps {
  t: any;
  navigate: any;
  dateLocale: string;
  activeNotebookId: any;
  setActiveNotebookId: (id: any) => void;
  selectedPageId: any;
  setSelectedPageId: (id: any) => void;
  query: string;
  setQuery: (q: string) => void;
  sourceFilter: string;
  setSourceFilter: (sf: string) => void;
  viewMode: 'gallery' | 'list' | 'table';
  setViewMode: (v: 'gallery' | 'list' | 'table') => void;
  editorOpen: boolean;
  setEditorOpen: (o: boolean) => void;
  handleEditorOpenChange: (open: boolean) => void;
  editorExpanded: boolean;
  setEditorExpanded: (e: boolean) => void;
  title: string;
  setTitle: (t: string) => void;
  noteKind: 'quote_card' | 'longform_page';
  setNoteKind: (k: 'quote_card' | 'longform_page') => void;
  quoteText: string;
  setQuoteText: (t: string) => void;
  editorDoc: any;
  setEditorDoc: (d: any) => void;
  saveState: string;
  lastSavedAt: number | null;
  notebooksResult: any;
  sourceSummary: any[];
  searchResult: any;
  pendingReviewCount: number;
  selectedSearchItem: any;
  selectedIsQuoteCard: boolean;
  selectedPagePayload: any;
  handleCreateNote: () => Promise<void>;
  handleDeletePage: (id: any) => Promise<void>;
  handleOpenSource: () => void;
  handleRetrySave: () => Promise<void>;
  editorFallback: React.ReactNode;
  togglePin: any;
  OfficialTiptapEditor: any;
}

export default function DesktopNotebookV2Page({
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
  viewMode,
  setViewMode,
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
  editorFallback,
  togglePin,
  OfficialTiptapEditor,
}: DesktopNotebookV2PageProps) {

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
              {t('notes.v2.page.viewList', { defaultValue: 'Detailed List' })}
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
              {t('notes.v2.page.viewTable', { defaultValue: 'Spreadsheet' })}
            </Button>
          </div>

          <div className="flex items-center gap-3 ml-auto flex-wrap sm:flex-nowrap">
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
              <Input
                type="text"
                placeholder={t('notes.v2.page.searchPlaceholder', { defaultValue: 'Search notes...' })}
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 h-9 rounded-lg border-border text-sm"
              />
            </div>

            <div className="flex items-center gap-2 min-w-[140px]">
              <Filter className="w-4 h-4 text-muted-foreground/70 shrink-0" />
              <select
                value={sourceFilter}
                onChange={e => setSourceFilter(e.target.value)}
                className="h-9 text-sm rounded-lg border border-border bg-background px-3 py-1 flex-1 focus:outline-none focus:ring-1 focus:ring-primary"
              >

                <option value="">
                  {t('notes.v2.page.allSources', { defaultValue: 'All Sources' })}
                </option>
                {sourceSummary.map(item => (
                  <option key={item.key} value={item.key}>
                    {item.label} ({item.count})
                  </option>
                ))}
              </select>
            </div>


            <Button
              type="button"
              variant="default"
              size="auto"
              onClick={handleCreateNote}
              className="px-4 py-1.5 h-9 rounded-lg font-bold flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />{' '}
              {t('notes.v2.page.newNote', { defaultValue: 'New Note' })}
            </Button>
          </div>
        </div>

        {searchResult.items.length === 0 ? (
          <div className="py-24 text-center rounded-2xl border-2 border-dashed border-border bg-muted/20">
            <p className="text-xl font-bold text-foreground/80 mb-1">
              {t('notes.v2.page.emptyNotesTitle', { defaultValue: 'No notes found' })}
            </p>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              {t('notes.v2.page.emptyNotesSummary', {
                defaultValue: 'Adjust your search queries or create a fresh learning snippet.',
              })}
            </p>
          </div>
        ) : (
          <>
            {viewMode === 'gallery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {searchResult.items.map((item: any) => {
                  const cardType = toCardType(item, t);
                  const statusBadge = toStatusBadge(item.status, t);
                  const isSelected = selectedPageId === item.id;
                  const isPinned = item.pinned;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedPageId(item.id);
                        handleEditorOpenChange(true);
                      }}
                      className={`group relative rounded-2xl border-2 p-5 flex flex-col justify-between min-h-[180px] cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-background shadow-md'
                          : 'border-border bg-background hover:border-primary/40 hover:shadow-sm'
                      }`}
                    >
                      <div className="absolute top-4 right-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            void togglePin({ pageId: item.id });
                          }}
                          className="w-7 h-7 rounded-full hover:bg-muted p-0 shrink-0"
                        >
                          {isPinned ? (
                            <PinOff className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            void handleDeletePage(item.id);
                          }}
                          className="w-7 h-7 rounded-full hover:bg-muted p-0 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>

                      <div className="pr-12">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xl" role="img" aria-label="note-icon">
                            {item.icon || cardType.icon}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cardType.badgeClass}`}
                          >
                            {cardType.label}
                          </span>
                        </div>
                        <h3 className="font-extrabold text-foreground line-clamp-2 text-lg mb-2 group-hover:text-primary transition-colors">
                          {toPlainText(item.title) || 'Untitled'}
                        </h3>
                        {item.snippet && (
                          <div
                            className={`text-sm text-muted-foreground line-clamp-3 mb-4 break-words ${RICH_TEXT_CLASS}`}
                            dangerouslySetInnerHTML={{ __html: toPreviewHtml(item.snippet) }}
                          />
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/60">
                        <span className="text-xs text-muted-foreground/80">
                          {formatTime(item.updatedAt, dateLocale)}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusBadge.className}`}>
                          {statusBadge.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-4">
                {searchResult.items.map((item: any) => {
                  const cardType = toCardType(item, t);
                  const statusBadge = toStatusBadge(item.status, t);
                  const isSelected = selectedPageId === item.id;
                  const isPinned = item.pinned;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setSelectedPageId(item.id);
                        handleEditorOpenChange(true);
                      }}
                      className={`group flex gap-5 p-5 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'border-primary bg-background shadow-md'
                          : 'border-border bg-background hover:border-primary/40'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2 shrink-0">
                        <span className="text-3xl" role="img" aria-label="note-icon">
                          {item.icon || cardType.icon}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cardType.badgeClass}`}>
                          {cardType.label}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0 pr-16 relative">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="font-extrabold text-xl text-foreground group-hover:text-primary transition-colors truncate">
                            {toPlainText(item.title) || 'Untitled'}
                          </h3>
                          {isPinned && <Pin className="w-4 h-4 text-primary shrink-0" />}
                        </div>

                        {item.snippet && (
                          <div
                            className={`text-sm text-muted-foreground line-clamp-2 break-words mb-3 ${RICH_TEXT_CLASS}`}
                            dangerouslySetInnerHTML={{ __html: toPreviewHtml(item.snippet) }}
                          />
                        )}

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>
                            {t('notes.v2.page.updated', { defaultValue: 'Updated:' })}{' '}
                            {formatTime(item.updatedAt, dateLocale)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </div>

                        <div className="absolute top-0 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              void togglePin({ pageId: item.id });
                            }}
                            className="w-8 h-8 rounded-full hover:bg-muted p-0 shrink-0"
                          >
                            {isPinned ? (
                              <PinOff className="w-4 h-4 text-primary" />
                            ) : (
                              <Pin className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={e => {
                              e.stopPropagation();
                              void handleDeletePage(item.id);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-muted p-0 shrink-0"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {viewMode === 'table' && (
              <div className="overflow-x-auto border border-border rounded-xl bg-background shadow-sm">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs font-bold uppercase tracking-wider">
                      <th className="py-3.5 px-5 w-12">{/* Icon */}</th>
                      <th className="py-3.5 px-4">{t('notes.v2.page.tableTitle', { defaultValue: 'Title' })}</th>
                      <th className="py-3.5 px-4 w-32">{t('notes.v2.page.tableType', { defaultValue: 'Type' })}</th>
                      <th className="py-3.5 px-4 w-32">{t('notes.v2.page.tableStatus', { defaultValue: 'Status' })}</th>
                      <th className="py-3.5 px-4 w-40">{t('notes.v2.page.tableUpdated', { defaultValue: 'Last Updated' })}</th>
                      <th className="py-3.5 px-5 w-24 text-right">{t('notes.v2.page.tableActions', { defaultValue: 'Actions' })}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 text-sm">
                    {searchResult.items.map((item: any) => {
                      const cardType = toCardType(item, t);
                      const statusBadge = toStatusBadge(item.status, t);
                      const isSelected = selectedPageId === item.id;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedPageId(item.id);
                            handleEditorOpenChange(true);
                          }}
                          className={`group cursor-pointer hover:bg-muted/30 transition-colors ${
                            isSelected ? 'bg-primary/5 font-semibold' : ''
                          }`}
                        >
                          <td className="py-4 px-5 text-center text-xl">
                            {item.icon || cardType.icon}
                          </td>
                          <td className="py-4 px-4 text-foreground font-extrabold pr-10">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-sm block">
                                {toPlainText(item.title) || 'Untitled'}
                              </span>
                              {item.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cardType.badgeClass}`}>
                              {cardType.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${statusBadge.className}`}>
                              {statusBadge.label}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-muted-foreground/80 text-xs">
                            {formatTime(item.updatedAt, dateLocale)}
                          </td>
                          <td className="py-4 px-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="flex justify-end items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={e => {
                                  e.stopPropagation();
                                  void togglePin({ pageId: item.id });
                                }}
                                className="w-7 h-7 rounded-full hover:bg-muted p-0 shrink-0"
                              >
                                {item.pinned ? (
                                  <PinOff className="w-3.5 h-3.5 text-primary" />
                                ) : (
                                  <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                                )}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={e => {
                                  e.stopPropagation();
                                  void handleDeletePage(item.id);
                                }}
                                className="w-7 h-7 rounded-full hover:bg-muted p-0 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>

      {/* Editor Sidebar Drawer */}
      <div
        className={`fixed top-0 right-0 h-screen border-l-2 border-border bg-background shadow-2xl z-40 transition-all duration-300 ease-out flex flex-col ${
          editorOpen ? 'translate-x-0' : 'translate-x-full'
        } ${editorExpanded ? 'w-[80vw]' : 'w-[45vw] min-w-[500px]'}`}
      >
        {selectedSearchItem ? (
          <>
            {/* Drawer Header */}
            <div className="p-5 border-b border-border bg-card flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs bg-muted font-bold text-muted-foreground border border-border/50">
                  <span className="text-sm">
                    {toCardType(selectedSearchItem, t).icon}
                  </span>
                  {toCardType(selectedSearchItem, t).label}
                </div>

                {saveState === 'saving' && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
                    <Loader2 className="w-3 h-3 animate-spin" />{' '}
                    {t('notes.v2.page.saving', { defaultValue: 'Saving...' })}
                  </span>
                )}
                {saveState === 'dirty' && (
                  <span className="text-xs text-amber-600 font-bold">
                    ●{' '}
                    {t('notes.v2.page.unsaved', { defaultValue: 'Unsaved changes' })}
                  </span>
                )}
                {saveState === 'saved' && (
                  <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                    ✓{' '}
                    {lastSavedAt
                      ? `${t('notes.v2.page.savedAt', { defaultValue: 'Saved at' })} ${formatTime(lastSavedAt, dateLocale)}`
                      : t('notes.v2.page.saved', { defaultValue: 'Saved' })}
                  </span>
                )}
                {saveState === 'error' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => {
                      void handleRetrySave();
                    }}
                    className="text-xs text-destructive hover:underline p-0 font-bold"
                  >
                    ⚠{' '}
                    {t('notes.v2.page.saveError', { defaultValue: 'Save failed. Retry?' })}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setEditorExpanded(!editorExpanded)}
                  className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted p-0"
                >
                  {editorExpanded ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>

                {toSourcePath(selectedSearchItem.sourceRef) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleOpenSource}
                    className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted p-0"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEditorOpenChange(false)}
                  className="w-8 h-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
              {/* Title Section */}
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={t('notes.v2.page.noteTitlePlaceholder', { defaultValue: 'Note Title' })}
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-3xl font-extrabold tracking-tight border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent text-foreground placeholder:text-muted-foreground/50"
                />
                <div className="flex items-center gap-4 text-xs text-muted-foreground/80">
                  <span>
                    {t('notes.v2.page.created', { defaultValue: 'Created:' })}{' '}
                    {formatTime(selectedSearchItem.createdAt, dateLocale)}
                  </span>
                  <span>
                    {t('notes.v2.page.updated', { defaultValue: 'Updated:' })}{' '}
                    {formatTime(selectedSearchItem.updatedAt, dateLocale)}
                  </span>
                </div>
              </div>

              {/* Note Content Section */}
              {selectedIsQuoteCard ? (
                <div className="space-y-6 animate-in fade-in-50 duration-300">
                  {quoteText && (
                    <div className={`p-5 rounded-2xl ${QUOTE_CARD_RICH_CLASS}`}>
                      <div className="absolute top-3 left-3 text-primary/10 text-6xl font-serif select-none pointer-events-none">
                        “
                      </div>
                      <div
                        className={`relative z-10 text-lg font-bold text-foreground break-words leading-relaxed ${RICH_TEXT_CLASS}`}
                        dangerouslySetInnerHTML={{ __html: toPreviewHtml(quoteText) }}
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground/80 tracking-wider uppercase block">
                      {t('notes.v2.page.noteField', { defaultValue: 'Your Thoughts' })}
                    </label>
                    <Suspense fallback={editorFallback}>
                      <OfficialTiptapEditor
                        doc={editorDoc}
                        onChange={setEditorDoc}
                        placeholder={t('notes.v2.page.notePlaceholder', { defaultValue: 'Type your insights here...' })}
                        editable
                        minHeight="180px"
                      />
                    </Suspense>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in-50 duration-300 pt-2">
                  <Suspense fallback={editorFallback}>
                    <OfficialTiptapEditor
                      doc={editorDoc}
                      onChange={setEditorDoc}
                      placeholder={t('notes.v2.page.startWriting', { defaultValue: 'Start writing your learning notes...' })}
                      editable
                      minHeight="400px"
                    />
                  </Suspense>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {t('notes.v2.page.loadingNote', { defaultValue: 'Retrieving note content...' })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
