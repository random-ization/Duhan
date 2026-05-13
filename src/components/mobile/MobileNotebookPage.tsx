import React, { Suspense, lazy } from 'react';
import {
  ArrowLeft,
  Loader2,
  Maximize2,
  Minimize2,
  MoreVertical,
  Play,
  Trash2,
  X,
} from 'lucide-react';
import { useQuery } from 'convex/react';

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
import type { JSONContent } from '@tiptap/core';
import { NavigateFunction, useSearchParams } from 'react-router-dom';

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
import { appendReturnToPath, hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { ANNOTATIONS, type RecentAnnotation } from '../../utils/convexRefs';
import { buildReadingArticlePath } from '../../utils/readingRoutes';
import { KT, Chip, HanjaSeal, SectionHead, PageShell } from './ksoft/ksoft';

const OfficialTiptapEditor = lazy(() => import('../notebook/OfficialTiptapEditor'));

export interface SourceSummaryItem {
  key: string;
  label: string;
  count: number;
  modules: string[];
}

interface MobileNotebookPageProps {
  t: TranslateFn;
  navigate: NavigateFunction;
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
  sourceSummary: SourceSummaryItem[];
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
  const [searchParams] = useSearchParams();
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

  const handleBack = () => {
    const returnTo = searchParams.get('returnTo');
    if (hasSafeReturnTo(returnTo)) {
      navigate(resolveSafeReturnTo(returnTo, '/courses'));
      return;
    }
    navigate('/courses');
  };

  const recentAnnotations = useQuery(ANNOTATIONS.getRecent, { limit: 6 });
  const hasRecentHighlights = Array.isArray(recentAnnotations) && recentAnnotations.length > 0;
  // Snapshot "now" once per mount so relative time labels stay stable across
  // re-renders (avoids impure Date.now() calls during render).
  const [renderTime] = React.useState(() => Date.now());

  const handleOpenAnnotation = (ann: RecentAnnotation) => {
    if (typeof window === 'undefined') return;
    const currentPath = `${window.location.pathname}${window.location.search}`;
    if (ann.scopeType === 'READING_ARTICLE' && ann.scopeId) {
      const base = buildReadingArticlePath(ann.scopeId, currentPath);
      navigate(`${base}&annotationId=${ann.id}`);
      return;
    }
    if (ann.scopeType === 'TOPIK_REVIEW' && ann.scopeId) {
      const topikReviewPath = appendReturnToPath(
        `/topik/${ann.scopeId}/review?annotationId=${ann.id}`,
        currentPath
      );
      navigate(topikReviewPath);
      return;
    }
    // Other scope types don't have a deep-link target yet.
  };

  const formatAnnotationTime = (ts: number) => {
    const diff = renderTime - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('relativeTime.justNow', { defaultValue: 'just now' });
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return new Date(ts).toLocaleDateString(dateLocale);
  };

  const annotationScopeLabel = (scopeType?: string) => {
    switch (scopeType) {
      case 'READING_ARTICLE':
        return t('notes.v2.scope.reading', { defaultValue: 'Reading' });
      case 'TOPIK_REVIEW':
        return t('notes.v2.scope.topik', { defaultValue: 'TOPIK' });
      case 'READING_BOOK':
        return t('notes.v2.scope.book', { defaultValue: 'Book' });
      case 'PODCAST':
        return t('notes.v2.scope.podcast', { defaultValue: 'Podcast' });
      case 'VIDEO':
        return t('notes.v2.scope.video', { defaultValue: 'Video' });
      default:
        return t('notes.v2.scope.note', { defaultValue: 'Note' });
    }
  };

  return (
    <PageShell>
      {/* ── Page header ────────────────────────────── */}
      <div
        style={{
          padding: '14px 22px 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                marginBottom: 14,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                color: KT.sub,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: KT.font,
              }}
            >
              ← {t('common.back', { defaultValue: 'Back' })}
            </button>
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 13,
                color: KT.crimson,
                letterSpacing: 4,
                marginBottom: 4,
                fontWeight: 500,
              }}
            >
              記錄 · NOTEBOOK
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: KT.ink,
                letterSpacing: -0.6,
              }}
            >
              {t('notes.v2.page.titleAllNotes', { defaultValue: 'Smart notes' })}
            </div>
            <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>
              {t('notes.mobileSubtitle', {
                defaultValue: 'Capture quotes, track mistakes, and keep your review queue moving.',
              })}
            </div>
          </div>

          {/* new note button */}
          <button
            type="button"
            onClick={handleCreateNote}
            aria-label={t('notes.v2.page.newNote', { defaultValue: 'Create note' })}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: KT.card,
              border: `1px solid ${KT.line2}`,
              boxShadow: KT.shSm,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              marginTop: 34,
              fontFamily: KT.serif,
              fontSize: 18,
              color: KT.crimson,
            }}
          >
            +
          </button>
        </div>

        {/* search */}
        <div style={{ position: 'relative', marginTop: 12 }}>
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              color: KT.sub,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            id="mobile-notebook-search"
            name="notebookSearch"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('notes.v2.page.searchPlaceholder', {
              defaultValue: 'Search quote or note…',
            })}
            style={{
              width: '100%',
              background: 'rgba(31,27,23,0.05)',
              border: 'none',
              borderRadius: 16,
              padding: '12px 16px 12px 38px',
              fontSize: 14,
              fontFamily: KT.font,
              fontWeight: 500,
              color: KT.ink,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* ── Main content ────────────────────────────── */}
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Smart Review CTA */}
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: `linear-gradient(135deg, ${KT.indigo} 0%, #5466A0 100%)`,
            borderRadius: 24,
            padding: '20px 20px 18px',
            boxShadow: '0 8px 24px rgba(47,63,104,0.3)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '50%',
            }}
          />
          <div style={{ position: 'relative' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <HanjaSeal c="復" size={34} bg="rgba(255,255,255,0.18)" round={10} />
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.65)',
                    letterSpacing: 1,
                    marginBottom: 2,
                  }}
                >
                  {t('notes.v2.page.todayReviewTitle', { defaultValue: "TODAY'S REVIEW" })}
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                  {pendingReviewCount}{' '}
                  <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.7 }}>
                    {t('notes.v2.context.pendingReview', { defaultValue: 'cards pending' })}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/review')}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.95)',
                border: 'none',
                borderRadius: 14,
                padding: '11px 0',
                fontSize: 14,
                fontWeight: 800,
                color: KT.indigo,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontFamily: KT.font,
              }}
            >
              <Play size={16} fill={KT.indigo} />
              {t('notes.v2.context.startSmartReview', { defaultValue: 'Start Smart Review' })}
            </button>
          </div>
        </div>

        {/* Notebooks Carousel */}
        <div>
          <SectionHead
            kanji="冊"
            title={t('notes.picker.myNotebooks', { defaultValue: 'My Notebooks' })}
          />
          <div
            className="hide-scroll"
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              marginLeft: -18,
              marginRight: -18,
              padding: '4px 18px 12px',
            }}
          >
            {/* All notebooks button */}
            <button
              type="button"
              onClick={() => {
                setActiveNotebookId(null);
                setSelectedPageId(null);
              }}
              style={{
                flexShrink: 0,
                width: 130,
                height: 88,
                background: KT.card,
                borderRadius: 20,
                padding: '14px',
                boxShadow: activeNotebookId === null ? KT.sh : KT.shSm,
                border:
                  activeNotebookId === null ? `2px solid ${KT.crimson}30` : `1px solid ${KT.line}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                <span
                  style={{
                    fontFamily: KT.serif,
                    fontSize: 18,
                    color: activeNotebookId === null ? KT.crimson : KT.sub,
                  }}
                >
                  全
                </span>
                <Chip tone="muted">{searchResult.items.length}</Chip>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: KT.ink,
                  fontFamily: KT.font,
                }}
              >
                {t('notes.tabs.all', { defaultValue: 'All' })}
              </span>
            </button>

            {notebooksResult.notebooks.map((nb, i) => {
              const isActive = activeNotebookId === nb.id;
              const seals = ['冊', '記', '文', '誌', '箋'];
              return (
                <button
                  key={nb.id}
                  type="button"
                  onClick={() => {
                    setActiveNotebookId(nb.id);
                    setSelectedPageId(null);
                  }}
                  style={{
                    flexShrink: 0,
                    width: 130,
                    height: 88,
                    background: KT.card,
                    borderRadius: 20,
                    padding: '14px',
                    boxShadow: isActive ? KT.sh : KT.shSm,
                    border: isActive ? `2px solid ${KT.crimson}30` : `1px solid ${KT.line}`,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span
                      style={{
                        fontFamily: KT.serif,
                        fontSize: 18,
                        color: isActive ? KT.crimson : KT.sub,
                      }}
                    >
                      {seals[i % seals.length]}
                    </span>
                    <Chip tone="muted">{nb.noteCount}</Chip>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: KT.ink,
                      fontFamily: KT.font,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      width: '100%',
                      textAlign: 'left',
                    }}
                  >
                    {nb.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent highlights — annotations across reading/TOPIK/etc. */}
        {hasRecentHighlights && (
          <div>
            <SectionHead
              kanji="錄"
              title={t('notes.v2.context.recentHighlights', {
                defaultValue: 'Recent highlights',
              })}
            />
            <div
              className="hide-scroll"
              style={{
                display: 'flex',
                gap: 10,
                overflowX: 'auto',
                marginLeft: -18,
                marginRight: -18,
                padding: '4px 18px 12px',
              }}
            >
              {recentAnnotations!.map(ann => {
                const quote = ann.quote || ann.text;
                const scopeLabel = annotationScopeLabel(ann.scopeType);
                const timeLabel = formatAnnotationTime(ann.updatedAt ?? ann.createdAt);
                const accent = ann.color?.trim() || KT.crimson;
                return (
                  <button
                    key={String(ann.id)}
                    type="button"
                    onClick={() => handleOpenAnnotation(ann)}
                    style={{
                      flexShrink: 0,
                      width: 220,
                      background: KT.card,
                      borderRadius: 18,
                      padding: '14px 14px 12px',
                      boxShadow: KT.shSm,
                      border: `1px solid ${KT.line}`,
                      borderLeft: `3px solid ${accent}`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontFamily: KT.font,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        width: '100%',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8,
                      }}
                    >
                      <Chip tone="muted">{scopeLabel}</Chip>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: KT.sub,
                          letterSpacing: 0.3,
                        }}
                      >
                        {timeLabel}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: KT.ink,
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {quote}
                    </div>
                    {ann.note && ann.note.trim() && (
                      <div
                        style={{
                          marginTop: 8,
                          fontSize: 11,
                          color: KT.sub,
                          fontWeight: 500,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {ann.note}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Notes Feed */}
        <div style={{ paddingBottom: 24 }}>
          <SectionHead
            kanji="記"
            title={
              activeNotebookId
                ? (notebooksResult.notebooks.find(n => n.id === activeNotebookId)?.title ?? '')
                : t('notes.v2.context.allNotes', { defaultValue: 'All Notes' })
            }
          />

          {searchResult.items.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: KT.card,
                borderRadius: 24,
                boxShadow: KT.shSm,
              }}
            >
              <div
                style={{
                  fontFamily: KT.serif,
                  fontSize: 40,
                  color: KT.sub,
                  opacity: 0.25,
                  marginBottom: 10,
                }}
              >
                無
              </div>
              <div style={{ fontSize: 13, color: KT.sub, fontWeight: 600 }}>
                {t('notes.v2.context.noNotebooksHint', { defaultValue: 'No notes here.' })}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {searchResult.items.map(item => {
                const cardType = toCardType(item, t);
                const status = toStatusBadge(item.status || 'Inbox', t);
                const snippetHtml = toPreviewHtml(item.snippet);
                const quoteHtml = toPreviewHtml(item.quoteText);
                const noteHtml = toPreviewHtml(item.noteText || item.snippet);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedPageId(item.id);
                      setEditorExpanded(false);
                      handleEditorOpenChange(true);
                    }}
                    style={{
                      width: '100%',
                      background: KT.card,
                      borderRadius: 20,
                      boxShadow: KT.sh,
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      textAlign: 'left',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        width: '100%',
                        marginBottom: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{cardType.icon}</span>
                        <Chip tone="muted">{cardType.label}</Chip>
                      </div>
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: KT.mint,
                          color: KT.mintDeep,
                          fontFamily: KT.font,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: KT.ink,
                        marginBottom: 8,
                        lineHeight: 1.35,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {toPlainText(item.title) || item.title}
                    </div>

                    {item.noteKind === 'quote_card' && quoteHtml ? (
                      <blockquote
                        className={`${QUOTE_CARD_RICH_CLASS} ${RICH_TEXT_CLASS}`}
                        style={{
                          width: '100%',
                          marginBottom: 10,
                          borderRadius: 12,
                          padding: '10px 12px',
                          fontSize: 13,
                          color: KT.ink2,
                          background: KT.bg2,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                        }}
                        dangerouslySetInnerHTML={{ __html: quoteHtml }}
                      />
                    ) : null}

                    {noteHtml ? (
                      <div
                        className={RICH_TEXT_CLASS}
                        style={{
                          width: '100%',
                          fontSize: 12,
                          color: KT.sub,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                        dangerouslySetInnerHTML={{
                          __html:
                            item.noteKind === 'quote_card' ? noteHtml : snippetHtml || noteHtml,
                        }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: KT.subLight }}>
                        {t('notes.v2.page.clickToViewAndEdit', {
                          defaultValue: 'Tap to view and edit content',
                        })}
                      </div>
                    )}

                    <div
                      style={{
                        marginTop: 12,
                        paddingTop: 10,
                        borderTop: `1px solid ${KT.line}`,
                        width: '100%',
                        fontSize: 10,
                        fontWeight: 600,
                        color: KT.sub,
                        fontFamily: KT.font,
                      }}
                    >
                      {formatTime(item.updatedAt, dateLocale)} ·{' '}
                      {toSourceLabel(item.sourceModule, t)}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Note Editor Sheet (keep Shadcn sheet for overlay behavior) ── */}
      <Sheet open={editorOpen} onOpenChange={handleEditorOpenChange}>
        <SheetPortal>
          <SheetOverlay className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm" />
          <SheetContent
            unstyled
            closeOnEscape={false}
            lockBodyScroll={false}
            className={`fixed bottom-0 left-0 right-0 rounded-t-[2rem] z-50 flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-300 ${editorExpanded ? 'h-[95dvh]' : 'h-[85dvh]'}`}
            style={{ background: KT.card }}
          >
            <div className="flex flex-col h-full overflow-hidden relative pb-safe">
              {/* Drag indicator */}
              <div className="absolute top-0 left-0 right-0 h-8 flex items-center justify-center shrink-0">
                <div
                  style={{
                    width: 48,
                    height: 6,
                    background: KT.line2,
                    borderRadius: 999,
                  }}
                />
              </div>

              {/* Editor Header */}
              <div
                style={{
                  padding: '32px 20px 16px',
                  borderBottom: `1px solid ${KT.line}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <div>
                  <SheetTitle
                    style={{
                      fontSize: 18,
                      fontWeight: 800,
                      color: KT.ink,
                      maxWidth: 200,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {title || t('notes.v2.page.editNote', { defaultValue: 'Edit Note' })}
                  </SheetTitle>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: KT.sub,
                      letterSpacing: 0.5,
                      marginTop: 3,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      fontFamily: KT.font,
                    }}
                  >
                    {saveState === 'saving' && <Loader2 size={10} className="animate-spin" />}
                    {saveState === 'saving'
                      ? t('notes.v2.page.saveState.saving', { defaultValue: 'Saving…' })
                      : saveState === 'error'
                        ? t('notes.v2.page.saveState.error', { defaultValue: 'Save failed' })
                        : t('notes.v2.page.saveState.saved', { defaultValue: 'Saved' })}
                  </div>
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
                      {t('notes.v2.editor.loading', { defaultValue: 'Loading editor…' })}
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
                          {editorOpen ? (
                            <Suspense
                              fallback={
                                <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-muted/50">
                                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                              }
                            >
                              <OfficialTiptapEditor
                                value={editorDoc}
                                onChange={setEditorDoc}
                                placeholder={t('notes.v2.page.quoteEditorPlaceholder', {
                                  defaultValue: 'Write your understanding…',
                                })}
                                preset="study"
                              />
                            </Suspense>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      editorOpen ? (
                        <Suspense
                          fallback={
                            <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-border bg-muted/50">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          }
                        >
                          <OfficialTiptapEditor
                            value={editorDoc}
                            onChange={setEditorDoc}
                            placeholder={t('notes.v2.page.editorPlaceholder', {
                              defaultValue: 'Start writing your thoughts here…',
                            })}
                            preset="full"
                          />
                        </Suspense>
                      ) : null
                    )}
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </PageShell>
  );
};
