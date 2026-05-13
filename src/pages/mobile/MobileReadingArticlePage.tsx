import React from 'react';
import { ChevronLeft, Volume2, BookOpen, Languages, Star, Check } from 'lucide-react';
import { TFunction } from 'i18next';
import { NavigateFunction } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { Sheet, SheetContent, SheetOverlay, SheetPortal, SheetTitle } from '../../components/ui';
import { KT } from '../../components/mobile/ksoft/ksoft';
import {
  ReadingParagraphBlocks,
  ReadingSelectionToolbar,
} from '../reading/ReadingComponents';
import type {
  NewsArticle,
  NoteVisualState,
  ReaderNote,
  DraftNote,
  SelectionToolbarState,
  NoteColor,
} from '../reading/types';

interface MobileReadingArticlePageProps {
  t: TFunction;
  navigate: NavigateFunction;
  backPath: string;
  resolvedArticle: NewsArticle;
  difficultyClass: (level: string) => string;
  difficultyLabel: (level: string, t: TFunction) => string;
  sourceDisplayLabel: string;
  increaseFontSize: () => void;
  toggleSpeak: () => Promise<void>;
  speaking: boolean;
  speakingLoading: boolean;
  ttsError: string | null;
  translationError: string | null;
  translationLoading: boolean;
  translationEnabled: boolean;
  onToggleTranslation: () => void;
  fontSize: number;
  paragraphs: string[];
  translations: string[];
  draftNote: DraftNote | null;
  notes: ReaderNote[];
  getNoteVisualState: (noteId: string) => NoteVisualState;
  focusNote: (noteId: string) => void;
  setHoveredNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  wordCount: number;
  publishedDateLabel: string;
  readingSidebarContent: React.ReactNode;
  selectionToolbar: SelectionToolbarState;
  noteColor: NoteColor;
  setNoteColor: (color: NoteColor) => void;
  onLookupSelection: () => void;
  onSaveSelectionWord: (text: string) => Promise<void>;
  startNoteFromSelection: () => void;
  setSelectionToolbar: React.Dispatch<React.SetStateAction<SelectionToolbarState>>;
  mobilePanelOpen: boolean;
  setMobilePanelOpen: (open: boolean) => void;
  handleMobileSaveWord: () => void;
  mobileWordSaved: boolean;
}

export default function MobileReadingArticlePage({
  t,
  navigate,
  backPath,
  resolvedArticle,
  difficultyClass,
  difficultyLabel,
  sourceDisplayLabel,
  increaseFontSize,
  toggleSpeak,
  speaking,
  speakingLoading,
  ttsError,
  translationError,
  translationLoading,
  translationEnabled,
  onToggleTranslation,
  fontSize,
  paragraphs,
  translations,
  draftNote,
  notes,
  getNoteVisualState,
  focusNote,
  setHoveredNoteId,
  contentRef,
  wordCount,
  publishedDateLabel,
  readingSidebarContent,
  selectionToolbar,
  noteColor,
  setNoteColor,
  onLookupSelection,
  onSaveSelectionWord,
  startNoteFromSelection,
  setSelectionToolbar,
  mobilePanelOpen,
  setMobilePanelOpen,
  handleMobileSaveWord,
  mobileWordSaved,
}: MobileReadingArticlePageProps) {
  return (
    <div
      className="relative flex h-dvh flex-col overflow-hidden"
      style={{ background: KT.bg }}
    >
      <header
        className="flex h-[72px] items-center justify-between border-b px-4 pt-env(safe-area-inset-top)"
        style={{ borderColor: KT.line, background: KT.bg }}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => navigate(backPath)}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ color: KT.ink }}
            aria-label={t('readingArticle.backToDiscovery', { defaultValue: 'Back' })}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex flex-col">
            <span
              className={`inline-flex self-start rounded-md border px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${difficultyClass(resolvedArticle.difficultyLevel)}`}
            >
              {difficultyLabel(resolvedArticle.difficultyLevel, t)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={increaseFontSize}
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors active:bg-black/5"
            style={{ 
              background: KT.card, 
              color: KT.ink,
              boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.02)'
            }}
            aria-label={t('readingArticle.controls.fontSize', { defaultValue: 'Font size' })}
          >
            <span className="text-sm font-black">Aa</span>
          </button>
        </div>
      </header>

      <div
        ref={contentRef}
        className="h-[calc(100dvh-72px-env(safe-area-inset-top))] overflow-y-auto px-6 pb-[calc(var(--mobile-safe-bottom)+130px)] pt-4"
      >
        <div
          className="font-serif text-[12px] font-semibold tracking-[0.26em]"
          style={{ color: KT.crimson }}
        >
          {t('readingArticle.articleLabel', { defaultValue: 'ARTICLE' })}
        </div>
        <h1 className="mt-1 text-[34px] font-black leading-tight" style={{ color: KT.ink }}>
          {resolvedArticle.title}
        </h1>
        <div className="mt-3 text-xs font-semibold" style={{ color: KT.sub }}>
          {sourceDisplayLabel} · {publishedDateLabel} · {wordCount}
        </div>
        {translationError ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            {translationError}
          </div>
        ) : null}
        {ttsError ? (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
            {ttsError}
          </div>
        ) : null}

        <div className="mt-6 text-[17px]" style={{ fontSize, color: KT.ink2 }}>
          <ReadingParagraphBlocks
            t={t}
            paragraphs={paragraphs}
            translations={translations}
            translationEnabled={translationEnabled}
            translationLoading={translationLoading}
            translationError={translationError}
            draftNote={draftNote}
            notes={notes}
            getNoteVisualState={getNoteVisualState}
            focusNote={focusNote}
            setHoveredNoteId={setHoveredNoteId}
          />
        </div>
      </div>

      <ReadingSelectionToolbar
        t={t}
        selectionToolbar={selectionToolbar}
        noteColor={noteColor}
        setNoteColor={setNoteColor}
        onLookupSelection={onLookupSelection}
        onSaveSelectionWord={onSaveSelectionWord}
        startNoteFromSelection={startNoteFromSelection}
        onClose={() => setSelectionToolbar((prev: SelectionToolbarState) => ({ ...prev, visible: false }))}
      />

      {!mobilePanelOpen ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 backdrop-blur"
          style={{ borderColor: KT.line, background: 'rgba(251,248,243,0.94)' }}
        >
          <div className="mx-auto flex max-w-md items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void toggleSpeak();
              }}
              className="flex-1 rounded-xl px-3 py-3 text-xs font-black shadow-sm"
              style={{ background: KT.card, color: KT.ink }}
            >
              <span className="inline-flex items-center gap-1">
                <Volume2 size={14} />
                듣기
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMobilePanelOpen(true)}
              className="flex-1 rounded-xl px-3 py-3 text-xs font-black shadow-sm"
              style={{ background: KT.card, color: KT.ink }}
            >
              <span className="inline-flex items-center gap-1">
                <BookOpen size={14} />
                노트
              </span>
            </button>
            <button
              type="button"
              onClick={onToggleTranslation}
              className="flex-1 rounded-xl px-3 py-3 text-xs font-black shadow-sm"
              style={{
                background: translationEnabled ? KT.ink : KT.card,
                color: translationEnabled ? KT.card : KT.ink,
              }}
            >
              <span className="inline-flex items-center gap-1">
                <Languages size={14} />
                번역
              </span>
            </button>
            <button
              type="button"
              onClick={handleMobileSaveWord}
              className="grid h-10 w-10 place-items-center rounded-xl shadow-sm"
              style={{ background: KT.card, color: KT.ink }}
              aria-label={t('readingArticle.dictionary.save', { defaultValue: 'Save word' })}
            >
              {mobileWordSaved ? <Check size={14} /> : <Star size={14} />}
            </button>
          </div>
        </div>
      ) : null}

      <Sheet open={mobilePanelOpen} onOpenChange={setMobilePanelOpen}>
        <SheetPortal>
          <SheetOverlay className="z-[60] bg-black/55 backdrop-blur-sm" />
          <SheetContent
            className="fixed inset-x-0 bottom-0 z-[61] mt-10 flex flex-col overflow-hidden rounded-t-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 shadow-2xl"
            style={{
              borderColor: KT.line,
              background: KT.bg,
              height: 'min(72dvh, 560px)',
              zIndex: 80,
            }}
          >
            <SheetTitle className="sr-only">
              {t('readingArticle.tabs.ai', { defaultValue: 'AI Analysis' })}
            </SheetTitle>
            <div className="mx-auto mb-3 h-1.5 w-10 shrink-0 rounded-full bg-[#D3C5AF]" />
            <div
              className="min-h-0 flex-1 overflow-y-auto pr-1"
              style={{
                WebkitOverflowScrolling: 'touch',
                overscrollBehavior: 'contain',
                touchAction: 'pan-y',
              }}
            >
              {readingSidebarContent}
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </div>
  );
}
