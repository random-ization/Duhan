import React from 'react';
import { ChevronLeft, VolumeX, Volume2 } from 'lucide-react';
import { TFunction } from 'i18next';
import { NavigateFunction } from 'react-router-dom';
import { Button } from '../../components/ui/button';
import { AppBreadcrumb } from '../../components/common/AppBreadcrumb';
import { KT } from '../../components/mobile/ksoft/ksoft';

// Import local components from the parent page
import {
  ReadingTranslationToggleButton,
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

interface DesktopReadingArticlePageProps {
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
  translationLabel: string;
  publishedDateLabel: string;
  readingSidebarContent: React.ReactNode;
  selectionToolbar: SelectionToolbarState;
  noteColor: NoteColor;
  setNoteColor: (color: NoteColor) => void;
  onLookupSelection: () => void;
  onSaveSelectionWord: (text: string) => Promise<void>;
  startNoteFromSelection: () => void;
  setSelectionToolbar: React.Dispatch<React.SetStateAction<SelectionToolbarState>>;
}


export default function DesktopReadingArticlePage({
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
  translationLabel,
  publishedDateLabel,
  readingSidebarContent,
  selectionToolbar,
  noteColor,
  setNoteColor,
  onLookupSelection,
  onSaveSelectionWord,
  startNoteFromSelection,
  setSelectionToolbar,
}: DesktopReadingArticlePageProps) {
  return (
    <div className="relative h-full min-h-full overflow-hidden border border-border bg-muted">
      <main className="relative z-10 flex h-full min-h-full flex-col border-border bg-card">
        <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <AppBreadcrumb
              className="hidden 2xl:block max-w-[360px]"
              items={[
                { label: t('nav.media', { defaultValue: 'Media' }), to: '/media' },
                {
                  label: t('readingArticle.backToDiscovery', { defaultValue: 'Reading' }),
                  to: backPath,
                },
                { label: resolvedArticle.title },
              ]}
            />
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => navigate(backPath)}
              className="flex items-center gap-1 text-sm font-semibold text-muted-foreground transition hover:text-muted-foreground"
            >
              <ChevronLeft size={16} />
              {t('readingArticle.backToDiscovery', { defaultValue: 'Back to discovery' })}
            </Button>
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${difficultyClass(resolvedArticle.difficultyLevel)}`}
            >
              {difficultyLabel(resolvedArticle.difficultyLevel, t)} ({sourceDisplayLabel})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={increaseFontSize}
              className="rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              Aa
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                void toggleSpeak();
              }}
              className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-muted"
            >
              {speaking || speakingLoading ? <VolumeX size={15} /> : <Volume2 size={15} />}
              {speaking || speakingLoading
                ? t('readingArticle.tts.stop', { defaultValue: 'Stop' })
                : t('readingArticle.tts.play', { defaultValue: 'Read aloud' })}
            </Button>
            <ReadingTranslationToggleButton
              t={t}
              translationError={translationError}
              translationLoading={translationLoading}
              translationEnabled={translationEnabled}
              onToggleTranslation={onToggleTranslation}
            />
          </div>
        </header>

        <div className="flex-1 overflow-hidden">
          <div className="flex h-full min-h-0">
            <div
              className="min-w-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8 lg:px-12"
              ref={contentRef}
            >
              <div className="mx-auto w-full max-w-4xl">
                <h1 className="mb-6 text-3xl font-black leading-tight text-foreground">
                  {resolvedArticle.title}
                </h1>
                <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-medium text-muted-foreground">
                  <span>{publishedDateLabel}</span>
                  <span>{sourceDisplayLabel}</span>
                  <span>
                    {t('readingArticle.meta.words', '{{count}} chars', {
                      count: Number(wordCount),
                    })}
                  </span>
                  <span>
                    {t('readingArticle.meta.translationTarget', {
                      defaultValue: 'Translation: {{language}}',
                      language: translationLabel,
                    })}
                  </span>
                </div>
                {ttsError && (
                  <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/35 dark:text-rose-300">
                    {t('readingArticle.tts.status', { defaultValue: 'TTS status' })}: {ttsError}
                  </div>
                )}
                {translationError && (
                  <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300">
                    {t('readingArticle.translation.status', { defaultValue: 'Translation status' })}
                    : {translationError}
                  </div>
                )}

                <div style={{ lineHeight: 2.05, fontSize }}>
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
            </div>

            <aside className="hidden w-[360px] shrink-0 border-l border-border bg-muted/20 p-4 lg:block xl:w-[380px]">
              <div className="h-full overflow-y-auto pr-1">{readingSidebarContent}</div>
            </aside>
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
          onClose={() => setSelectionToolbar((prev: any) => ({ ...prev, visible: false }))}
        />
      </main>
    </div>
  );
}
