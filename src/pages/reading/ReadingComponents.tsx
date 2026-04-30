import React from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { 
  BookOpen, 
  Check, 
  Languages, 
  Star,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipPortal,
  TooltipTrigger,
  Button,
  Textarea
} from '../../components/ui';
import type {
  VocabularyItem,
  GrammarItem,
  DictionaryEntry,
  DictionaryFallbackResult,
  NewsArticle,
  PanelTab,
  NoteVisualState,
  NoteColor,
  ReaderNote,
  DraftNote,
  SelectionToolbarState
} from './types';
import { 
  difficultyLabel, 
  difficultyClass, 
  getDictionaryMeaning, 
  noteColorDotClass, 
  noteUnderlineClass,
  normalizeInlineWhitespace,
  resolveReadingNoteVisualState
} from './helpers';
import { ReadingNotesSection } from './ReadingNotesSection';
import { ContextualSection, ContextualCountBadge } from '../../components/layout/contextualSidebarBlocks';
import AnnotationToolbar from '../../features/annotation-kit/components/AnnotationToolbar';

export const ReadingArticleAiTab: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  aiAnalysisLoading: boolean;
  aiAnalysisError: string | null;
  summary: string;
  vocabulary: VocabularyItem[];
  onWordClick: (word: string) => void;
  onSaveVocabularyItem: (item: VocabularyItem) => Promise<void>;
  savingWordKey: string | null;
  savedWords: Record<string, boolean>;
  grammar: GrammarItem[];
}> = ({
  t,
  aiAnalysisLoading,
  aiAnalysisError,
  summary,
  vocabulary,
  onWordClick,
  onSaveVocabularyItem,
  savingWordKey,
  savedWords,
  grammar,
}) => (
  <>
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-muted-foreground">
        <span>💡</span> {t('readingArticle.ai.summaryTitle', { defaultValue: 'AI Summary' })}
      </h3>
      {aiAnalysisLoading && (
        <p className="mb-2 text-xs font-semibold text-primary">
          {t('readingArticle.ai.loading', { defaultValue: 'Generating AI analysis...' })}
        </p>
      )}
      {aiAnalysisError && (
        <p className="mb-2 text-xs font-semibold text-amber-600 dark:text-amber-300">
          {t('readingArticle.ai.fallbackNotice', {
            defaultValue: 'AI unavailable, local fallback is used.',
          })}
        </p>
      )}
      <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
    </section>
    <section>
      <h3 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
        🔑 {t('readingArticle.ai.coreVocab', { defaultValue: 'Core Vocabulary' })}
      </h3>
      <div className="space-y-2">
        {vocabulary.slice(0, 8).map(item => (
          <div
            key={item.term}
            className="group flex w-full items-center justify-between rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/50"
          >
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => onWordClick(item.term)}
              className="!block flex-1 text-left"
            >
              <div className="font-bold text-muted-foreground">{item.term}</div>
              <div className="text-xs text-muted-foreground">{item.meaning}</div>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                void onSaveVocabularyItem(item);
              }}
              loading={savingWordKey === item.term.toLowerCase()}
              loadingText={
                savedWords[item.term.toLowerCase()]
                  ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                  : t('readingArticle.vocab.save', { defaultValue: 'Add' })
              }
              loadingIconClassName="w-3 h-3"
              className={`ml-3 inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                savedWords[item.term.toLowerCase()]
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-muted text-muted-foreground hover:bg-muted'
              }`}
            >
              {savedWords[item.term.toLowerCase()] ? <Check size={12} /> : <Star size={12} />}
              {savedWords[item.term.toLowerCase()]
                ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                : t('readingArticle.vocab.save', { defaultValue: 'Add' })}
            </Button>
          </div>
        ))}
      </div>
    </section>
    <section>
      <h3 className="mb-3 px-1 text-sm font-bold text-muted-foreground">
        📖 {t('readingArticle.ai.grammarTitle', { defaultValue: 'Grammar Points' })}
      </h3>
      <div className="space-y-3">
        {grammar.map(item => (
          <article
            key={item.pattern}
            className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/35"
          >
            <div className="mb-1 font-bold text-blue-800 dark:text-blue-300">{item.pattern}</div>
            <div className="mb-2 text-sm text-blue-700 dark:text-blue-300/90">
              {item.explanation}
            </div>
            <div className="rounded border border-blue-50 bg-card p-2 text-xs text-muted-foreground dark:border-blue-900/70 dark:bg-background/50">
              {item.example}
            </div>
          </article>
        ))}
      </div>
    </section>
  </>
);

export const ReadingDictionaryStatus: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  dictionaryLoading: boolean;
  dictionaryError: string | null;
  dictionaryFallbackLoading: boolean;
  dictionaryFallbackError: string | null;
  hasFallback: boolean;
}> = ({
  t,
  dictionaryLoading,
  dictionaryError,
  dictionaryFallbackLoading,
  dictionaryFallbackError,
  hasFallback,
}) => (
  <>
    {dictionaryLoading ? (
      <p className="text-sm text-muted-foreground">
        {t('readingArticle.dictionary.loading', { defaultValue: 'Looking up dictionary...' })}
      </p>
    ) : null}
    {!dictionaryLoading && dictionaryError ? (
      <p className="text-sm text-amber-600 dark:text-amber-300">
        {t('readingArticle.dictionary.serviceError', {
          defaultValue: 'Dictionary unavailable, switched to AI fallback.',
        })}
      </p>
    ) : null}
    {dictionaryFallbackLoading ? (
      <p className="text-sm text-muted-foreground">
        {t('readingArticle.dictionary.aiLoading', {
          defaultValue: 'AI is generating explanation...',
        })}
      </p>
    ) : null}
    {!dictionaryFallbackLoading && dictionaryFallbackError && !hasFallback ? (
      <p className="text-sm text-rose-600 dark:text-rose-300">{dictionaryFallbackError}</p>
    ) : null}
  </>
);

export const ReadingDictionaryEntries: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  entries: DictionaryEntry[];
  savingWordKey: string | null;
  savedWords: Record<string, boolean>;
  onSaveDictionaryEntry: (entry: DictionaryEntry) => Promise<void>;
}> = ({ t, entries, savingWordKey, savedWords, onSaveDictionaryEntry }) => {
  if (entries.length === 0) return null;
  return (
    <div className="space-y-2">
      {entries.slice(0, 3).map(entry => {
        const saveKey = normalizeInlineWhitespace(entry.word).toLowerCase();
        return (
          <article key={entry.targetCode} className="rounded-lg border border-border bg-muted p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-foreground">{entry.word}</span>
                <span className="text-xs text-muted-foreground">
                  {[entry.pos, entry.pronunciation].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={() => {
                  void onSaveDictionaryEntry(entry);
                }}
                loading={savingWordKey === saveKey}
                loadingText={
                  savedWords[saveKey]
                    ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                    : t('readingArticle.vocab.save', { defaultValue: 'Add' })
                }
                loadingIconClassName="w-3 h-3"
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
                  savedWords[saveKey]
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                {savedWords[saveKey] ? <Check size={12} /> : <Star size={12} />}
                {savedWords[saveKey]
                  ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
                  : t('readingArticle.vocab.save', { defaultValue: 'Add' })}
              </Button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {getDictionaryMeaning(entry) ||
                t('readingArticle.dictionary.noMeaning', { defaultValue: 'No meaning available.' })}
            </p>
          </article>
        );
      })}
    </div>
  );
};

export const ReadingDictionaryFallbackCard: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  fallback: DictionaryFallbackResult | null;
  savingWordKey: string | null;
  savedWords: Record<string, boolean>;
  onSaveDictionaryFallback: () => Promise<void>;
}> = ({ t, fallback, savingWordKey, savedWords, onSaveDictionaryFallback }) => {
  if (!fallback) return null;
  const fallbackKey = normalizeInlineWhitespace(fallback.word).toLowerCase();
  return (
    <article className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 dark:border-blue-900 dark:bg-blue-950/35">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-foreground">{fallback.word}</span>
          <span className="text-xs text-muted-foreground">
            {fallback.pos ||
              t('readingArticle.dictionary.unknownPos', {
                defaultValue: 'Part of speech pending',
              })}
          </span>
          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
            AI
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => {
            void onSaveDictionaryFallback();
          }}
          loading={savingWordKey === fallbackKey}
          loadingText={
            savedWords[fallbackKey]
              ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
              : t('readingArticle.vocab.save', { defaultValue: 'Add' })
          }
          loadingIconClassName="w-3 h-3"
          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold ${
            savedWords[fallbackKey]
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              : 'bg-card text-muted-foreground hover:bg-muted'
          }`}
        >
          {savedWords[fallbackKey] ? <Check size={12} /> : <Star size={12} />}
          {savedWords[fallbackKey]
            ? t('readingArticle.vocab.saved', { defaultValue: 'Saved' })
            : t('readingArticle.vocab.save', { defaultValue: 'Add' })}
        </Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {fallback.meaning ||
          t('readingArticle.dictionary.noMeaning', { defaultValue: 'No meaning available.' })}
      </p>
      {fallback.example ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {t('readingArticle.dictionary.example', { defaultValue: 'Example' })}:{fallback.example}
        </p>
      ) : null}
      {fallback.note ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {t('readingArticle.dictionary.note', { defaultValue: 'Tip' })}:{fallback.note}
        </p>
      ) : null}
    </article>
  );
};

export const ReadingDictionarySection: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  activeWord: string;
  dictionaryQuery: string;
  dictionaryLoading: boolean;
  dictionaryError: string | null;
  dictionaryFallbackLoading: boolean;
  dictionaryFallbackError: string | null;
  dictionaryFallback: DictionaryFallbackResult | null;
  dictionaryEntries: DictionaryEntry[];
  onSaveDictionaryEntry: (entry: DictionaryEntry) => Promise<void>;
  onSaveDictionaryFallback: () => Promise<void>;
  savingWordKey: string | null;
  savedWords: Record<string, boolean>;
}> = ({
  t,
  activeWord,
  dictionaryQuery,
  dictionaryLoading,
  dictionaryError,
  dictionaryFallbackLoading,
  dictionaryFallbackError,
  dictionaryFallback,
  dictionaryEntries,
  onSaveDictionaryEntry,
  onSaveDictionaryFallback,
  savingWordKey,
  savedWords,
}) => {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-muted-foreground">
        <Languages size={16} />{' '}
        {t('readingArticle.dictionary.title', { defaultValue: 'Dictionary' })}
      </h3>
      {!activeWord ? (
        <p className="text-sm text-muted-foreground">
          {t('readingArticle.dictionary.emptySelection', { defaultValue: 'No selected word yet.' })}
        </p>
      ) : (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">
            {t('readingArticle.dictionary.queryWord', { defaultValue: 'Query' })}:{' '}
            {dictionaryQuery || activeWord}
          </div>
          <ReadingDictionaryStatus
            t={t}
            dictionaryLoading={dictionaryLoading}
            dictionaryError={dictionaryError}
            dictionaryFallbackLoading={dictionaryFallbackLoading}
            dictionaryFallbackError={dictionaryFallbackError}
            hasFallback={!!dictionaryFallback}
          />
          {!dictionaryLoading ? (
            <ReadingDictionaryEntries
              t={t}
              entries={dictionaryEntries}
              savingWordKey={savingWordKey}
              savedWords={savedWords}
              onSaveDictionaryEntry={onSaveDictionaryEntry}
            />
          ) : null}
          {!dictionaryLoading && dictionaryEntries.length === 0 && !dictionaryFallbackLoading ? (
            <ReadingDictionaryFallbackCard
              t={t}
              fallback={dictionaryFallback}
              savingWordKey={savingWordKey}
              savedWords={savedWords}
              onSaveDictionaryFallback={onSaveDictionaryFallback}
            />
          ) : null}
          {!dictionaryLoading &&
          dictionaryEntries.length === 0 &&
          !dictionaryFallbackLoading &&
          !dictionaryFallback &&
          !dictionaryFallbackError ? (
            <p className="text-sm text-muted-foreground">
              {t('readingArticle.dictionary.noResult', {
                defaultValue: 'No available definition found.',
              })}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
};

export const ReadingArticleNotesTab: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  activeWord: string;
  dictionaryQuery: string;
  dictionaryLoading: boolean;
  dictionaryError: string | null;
  dictionaryFallbackLoading: boolean;
  dictionaryFallbackError: string | null;
  dictionaryFallback: DictionaryFallbackResult | null;
  dictionaryEntries: DictionaryEntry[];
  onSaveDictionaryEntry: (entry: DictionaryEntry) => Promise<void>;
  onSaveDictionaryFallback: () => Promise<void>;
  savingWordKey: string | null;
  savedWords: Record<string, boolean>;
  noteSyncError: string | null;
  draftNote: DraftNote | null;
  onDraftCommentChange: (value: string) => void;
  onDiscardDraftNote: () => void;
  onSaveDraftNote: () => Promise<void>;
  notes: ReaderNote[];
  focusNote: (noteId: string) => void;
  setHoveredNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  getNoteVisualState: (noteId: string) => NoteVisualState;
}> = ({
  t,
  activeWord,
  dictionaryQuery,
  dictionaryLoading,
  dictionaryError,
  dictionaryFallbackLoading,
  dictionaryFallbackError,
  dictionaryFallback,
  dictionaryEntries,
  onSaveDictionaryEntry,
  onSaveDictionaryFallback,
  savingWordKey,
  savedWords,
  noteSyncError,
  draftNote,
  onDraftCommentChange,
  onDiscardDraftNote,
  onSaveDraftNote,
  notes,
  focusNote,
  setHoveredNoteId,
  getNoteVisualState,
}) => (
  <>
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="mb-2 flex items-center gap-2 font-bold text-muted-foreground">
        <BookOpen size={16} />{' '}
        {t('readingArticle.dictionary.currentSelection', { defaultValue: 'Current Selection' })}
      </h3>
      <p className="text-sm text-muted-foreground">
        {activeWord ||
          t('readingArticle.dictionary.selectionHint', {
            defaultValue: 'Tap highlighted words or select text to add notes.',
          })}
      </p>
    </section>
    <ReadingDictionarySection
      t={t}
      activeWord={activeWord}
      dictionaryQuery={dictionaryQuery}
      dictionaryLoading={dictionaryLoading}
      dictionaryError={dictionaryError}
      dictionaryFallbackLoading={dictionaryFallbackLoading}
      dictionaryFallbackError={dictionaryFallbackError}
      dictionaryFallback={dictionaryFallback}
      dictionaryEntries={dictionaryEntries}
      onSaveDictionaryEntry={onSaveDictionaryEntry}
      onSaveDictionaryFallback={onSaveDictionaryFallback}
      savingWordKey={savingWordKey}
      savedWords={savedWords}
    />
    <ReadingNotesSection
      t={t}
      noteSyncError={noteSyncError}
      draftNote={draftNote}
      onDraftCommentChange={onDraftCommentChange}
      onDiscardDraftNote={onDiscardDraftNote}
      onSaveDraftNote={onSaveDraftNote}
      notes={notes}
      focusNote={focusNote}
      setHoveredNoteId={setHoveredNoteId}
      getNoteVisualState={getNoteVisualState}
    />
  </>
);

export const ReadingArticleSidebar: React.FC<{
  panelTab: PanelTab;
  setPanelTab: React.Dispatch<React.SetStateAction<PanelTab>>;
  t: ReturnType<typeof useTranslation>['t'];
  aiAnalysisLoading: boolean;
  aiAnalysisError: string | null;
  summary: string;
  vocabulary: VocabularyItem[];
  onWordClick: (word: string) => void;
  onSaveVocabularyItem: (item: VocabularyItem) => Promise<void>;
  savingWordKey: string | null;
  savedWords: Record<string, boolean>;
  grammar: GrammarItem[];
  activeWord: string;
  dictionaryQuery: string;
  dictionaryLoading: boolean;
  dictionaryError: string | null;
  dictionaryFallbackLoading: boolean;
  dictionaryFallbackError: string | null;
  dictionaryFallback: DictionaryFallbackResult | null;
  dictionaryEntries: DictionaryEntry[];
  onSaveDictionaryEntry: (entry: DictionaryEntry) => Promise<void>;
  onSaveDictionaryFallback: () => Promise<void>;
  noteSyncError: string | null;
  draftNote: DraftNote | null;
  onDraftCommentChange: (value: string) => void;
  onDiscardDraftNote: () => void;
  onSaveDraftNote: () => Promise<void>;
  notes: ReaderNote[];
  focusNote: (noteId: string) => void;
  setHoveredNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  getNoteVisualState: (noteId: string) => NoteVisualState;
}> = ({
  panelTab,
  setPanelTab,
  t,
  aiAnalysisLoading,
  aiAnalysisError,
  summary,
  vocabulary,
  onWordClick,
  onSaveVocabularyItem,
  savingWordKey,
  savedWords,
  grammar,
  activeWord,
  dictionaryQuery,
  dictionaryLoading,
  dictionaryError,
  dictionaryFallbackLoading,
  dictionaryFallbackError,
  dictionaryFallback,
  dictionaryEntries,
  onSaveDictionaryEntry,
  onSaveDictionaryFallback,
  noteSyncError,
  draftNote,
  onDraftCommentChange,
  onDiscardDraftNote,
  onSaveDraftNote,
  notes,
  focusNote,
  setHoveredNoteId,
  getNoteVisualState,
}) => (
  <div className="space-y-3">
    <ContextualSection
      title={t('readingArticle.backToDiscovery', { defaultValue: 'Reading' })}
      badge={
        <ContextualCountBadge
          value={
            panelTab === 'ai'
              ? t('readingArticle.tabs.ai', { defaultValue: 'AI Analysis' })
              : t('readingArticle.tabs.notes', { defaultValue: 'Dictionary / Notes' })
          }
          tone="accent"
        />
      }
    >
      <div className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-muted p-1">
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => setPanelTab('ai')}
          className="rounded-md px-2 py-1.5 text-xs font-bold"
          style={{
            backgroundColor:
              panelTab === 'ai' ? 'var(--sb-active-bg, hsl(var(--accent)))' : 'transparent',
            color:
              panelTab === 'ai'
                ? 'var(--sb-active-text, hsl(var(--accent-foreground)))'
                : 'var(--sb-muted-text, hsl(var(--muted-foreground)))',
          }}
        >
          ✨ {t('readingArticle.tabs.ai', { defaultValue: 'AI Analysis' })}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => setPanelTab('notes')}
          className="rounded-md px-2 py-1.5 text-xs font-bold"
          style={{
            backgroundColor:
              panelTab === 'notes' ? 'var(--sb-active-bg, hsl(var(--accent)))' : 'transparent',
            color:
              panelTab === 'notes'
                ? 'var(--sb-active-text, hsl(var(--accent-foreground)))'
                : 'var(--sb-muted-text, hsl(var(--muted-foreground)))',
          }}
        >
          📚 {t('readingArticle.tabs.notes', { defaultValue: 'Dictionary / Notes' })}
        </Button>
      </div>
    </ContextualSection>

    <ContextualSection
      title={
        panelTab === 'ai'
          ? t('readingArticle.ai.summaryTitle', { defaultValue: 'AI Summary' })
          : t('readingArticle.notes.title', { defaultValue: 'Notes' })
      }
      badge={
        <ContextualCountBadge
          value={panelTab === 'ai' ? vocabulary.length + grammar.length : notes.length}
        />
      }
    >
      <div className="space-y-4">
        {panelTab === 'ai' ? (
          <ReadingArticleAiTab
            t={t}
            aiAnalysisLoading={aiAnalysisLoading}
            aiAnalysisError={aiAnalysisError}
            summary={summary}
            vocabulary={vocabulary}
            onWordClick={onWordClick}
            onSaveVocabularyItem={onSaveVocabularyItem}
            savingWordKey={savingWordKey}
            savedWords={savedWords}
            grammar={grammar}
          />
        ) : (
          <ReadingArticleNotesTab
            t={t}
            activeWord={activeWord}
            dictionaryQuery={dictionaryQuery}
            dictionaryLoading={dictionaryLoading}
            dictionaryError={dictionaryError}
            dictionaryFallbackLoading={dictionaryFallbackLoading}
            dictionaryFallbackError={dictionaryFallbackError}
            dictionaryFallback={dictionaryFallback}
            dictionaryEntries={dictionaryEntries}
            onSaveDictionaryEntry={onSaveDictionaryEntry}
            onSaveDictionaryFallback={onSaveDictionaryFallback}
            savingWordKey={savingWordKey}
            savedWords={savedWords}
            noteSyncError={noteSyncError}
            draftNote={draftNote}
            onDraftCommentChange={onDraftCommentChange}
            onDiscardDraftNote={onDiscardDraftNote}
            onSaveDraftNote={onSaveDraftNote}
            notes={notes}
            focusNote={focusNote}
            setHoveredNoteId={setHoveredNoteId}
            getNoteVisualState={getNoteVisualState}
          />
        )}
      </div>
    </ContextualSection>
  </div>
);

export const ReadingTranslationToggleButton: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  translationError: string | null;
  translationLoading: boolean;
  translationEnabled: boolean;
  onToggleTranslation: () => void;
}> = ({ t, translationError, translationLoading, translationEnabled, onToggleTranslation }) => {
  const buttonNode = (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={onToggleTranslation}
      loading={translationLoading}
      loadingText={
        <>
          {t('readingArticle.translation.label', { defaultValue: 'Translation' })}
          <span className="text-xs font-bold">
            {translationEnabled
              ? t('readingArticle.translation.on', { defaultValue: 'On' })
              : t('readingArticle.translation.off', { defaultValue: 'Off' })}
          </span>
        </>
      }
      loadingIconClassName="h-[15px] w-[15px]"
      className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold ${
        translationEnabled
          ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted'
      }`}
      aria-label={t('readingArticle.translation.toggleAria', {
        defaultValue: 'Toggle translation',
      })}
    >
      <Languages size={15} />
      {t('readingArticle.translation.label', { defaultValue: 'Translation' })}
      <span className="text-xs font-bold">
        {translationEnabled
          ? t('readingArticle.translation.on', { defaultValue: 'On' })
          : t('readingArticle.translation.off', { defaultValue: 'Off' })}
      </span>
    </Button>
  );

  if (!translationError) return buttonNode;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{buttonNode}</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side="top">{translationError}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
};

export const ReadingParagraphTextSegment: React.FC<{
  text: string;
  paragraphIndex: number;
  segmentIndex: number;
  getNoteVisualState: (noteId: string) => NoteVisualState;
  focusNote: (noteId: string) => void;
  setHoveredNoteId: React.Dispatch<React.SetStateAction<string | null>>;
  forceUnderlineColor?: NoteColor;
  targetNoteId?: string;
}> = ({
  text,
  paragraphIndex,
  segmentIndex,
  getNoteVisualState,
  focusNote,
  setHoveredNoteId,
  forceUnderlineColor,
  targetNoteId,
}) => {
  if (!text) return null;
  if (!forceUnderlineColor) {
    return <React.Fragment key={`t-${paragraphIndex}-${segmentIndex}`}>{text}</React.Fragment>;
  }

  const resolvedNoteId = targetNoteId || 'draft';
  const noteState = getNoteVisualState(resolvedNoteId);
  return (
    <span
      data-note-id={resolvedNoteId}
      onClick={() => focusNote(resolvedNoteId)}
      onMouseEnter={() => setHoveredNoteId(resolvedNoteId)}
      onMouseLeave={() => setHoveredNoteId(prev => (prev === resolvedNoteId ? null : prev))}
      className={`${noteUnderlineClass(forceUnderlineColor, noteState)} cursor-pointer rounded-[2px]`}
      key={`u-${paragraphIndex}-${segmentIndex}`}
    >
      {text}
    </span>
  );
};

export const ReadingParagraphWithNotes: React.FC<{
  paragraph: string;
  paragraphIndex: number;
  draftNote: DraftNote | null;
  notes: ReaderNote[];
  getNoteVisualState: (noteId: string) => NoteVisualState;
  focusNote: (noteId: string) => void;
  setHoveredNoteId: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({
  paragraph,
  paragraphIndex,
  draftNote,
  notes,
  getNoteVisualState,
  focusNote,
  setHoveredNoteId,
}) => {
  const plainParagraph = normalizeInlineWhitespace(paragraph);
  const noteRefs: ReaderNote[] = [
    ...(draftNote
      ? [
          {
            id: 'draft',
            quote: draftNote.quote,
            comment: draftNote.comment,
            color: draftNote.color,
            createdAt: 0,
            anchor: draftNote.anchor,
          },
        ]
      : []),
    ...notes,
  ];

  const sortedRanges = noteRefs
    .filter(note => note.anchor.paragraphIndex === paragraphIndex)
    .map(note => {
      const directValid =
        note.anchor.start >= 0 &&
        note.anchor.end > note.anchor.start &&
        note.anchor.end <= plainParagraph.length;

      if (directValid) {
        return {
          noteId: note.id,
          color: note.color,
          start: note.anchor.start,
          end: note.anchor.end,
        };
      }

      const fallbackQuote = normalizeInlineWhitespace(note.quote);
      const fallbackStart = plainParagraph.indexOf(fallbackQuote);
      if (fallbackStart < 0) return null;
      return {
        noteId: note.id,
        color: note.color,
        start: fallbackStart,
        end: fallbackStart + fallbackQuote.length,
      };
    })
    .filter((item): item is { noteId: string; color: NoteColor; start: number; end: number } =>
      Boolean(item)
    )
    .sort((a, b) => (a.start === b.start ? b.end - a.end : a.start - b.start));

  if (sortedRanges.length === 0) {
    return (
      <p
        data-paragraph-index={paragraphIndex}
        key={`${paragraphIndex}-${plainParagraph.slice(0, 18)}`}
        className="break-words leading-[2.05] text-inherit"
      >
        <ReadingParagraphTextSegment
          text={plainParagraph}
          paragraphIndex={paragraphIndex}
          segmentIndex={0}
          getNoteVisualState={getNoteVisualState}
          focusNote={focusNote}
          setHoveredNoteId={setHoveredNoteId}
        />
      </p>
    );
  }

  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let segmentIndex = 0;
  for (const range of sortedRanges) {
    if (range.start < lastIndex) {
      continue;
    }
    if (range.start > lastIndex) {
      const before = plainParagraph.slice(lastIndex, range.start);
      nodes.push(
        <ReadingParagraphTextSegment
          key={`seg-${paragraphIndex}-${segmentIndex}`}
          text={before}
          paragraphIndex={paragraphIndex}
          segmentIndex={segmentIndex}
          getNoteVisualState={getNoteVisualState}
          focusNote={focusNote}
          setHoveredNoteId={setHoveredNoteId}
        />
      );
      segmentIndex += 1;
    }
    const highlighted = plainParagraph.slice(range.start, range.end);
    nodes.push(
      <ReadingParagraphTextSegment
        key={`seg-${paragraphIndex}-${segmentIndex}`}
        text={highlighted}
        paragraphIndex={paragraphIndex}
        segmentIndex={segmentIndex}
        getNoteVisualState={getNoteVisualState}
        focusNote={focusNote}
        setHoveredNoteId={setHoveredNoteId}
        forceUnderlineColor={range.color}
        targetNoteId={range.noteId}
      />
    );
    segmentIndex += 1;
    lastIndex = range.end;
  }
  if (lastIndex < plainParagraph.length) {
    nodes.push(
      <ReadingParagraphTextSegment
        key={`seg-${paragraphIndex}-${segmentIndex}`}
        text={plainParagraph.slice(lastIndex)}
        paragraphIndex={paragraphIndex}
        segmentIndex={segmentIndex}
        getNoteVisualState={getNoteVisualState}
        focusNote={focusNote}
        setHoveredNoteId={setHoveredNoteId}
      />
    );
  }

  return (
    <p
      data-paragraph-index={paragraphIndex}
      key={`${paragraphIndex}-${plainParagraph.slice(0, 18)}`}
      className="break-words leading-[2.05] text-inherit"
    >
      {nodes}
    </p>
  );
};

export const ReadingParagraphBlocks: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  paragraphs: string[];
  translations: string[];
  translationEnabled: boolean;
  translationLoading: boolean;
  translationError: string | null;
  draftNote: DraftNote | null;
  notes: ReaderNote[];
  getNoteVisualState: (noteId: string) => NoteVisualState;
  focusNote: (noteId: string) => void;
  setHoveredNoteId: React.Dispatch<React.SetStateAction<string | null>>;
}> = ({
  t,
  paragraphs,
  translations,
  translationEnabled,
  translationLoading,
  translationError,
  draftNote,
  notes,
  getNoteVisualState,
  focusNote,
  setHoveredNoteId,
}) => (
  <div className="space-y-8 text-muted-foreground">
    {paragraphs.map((paragraph, paragraphIndex) => {
      const translated = translations[paragraphIndex] || '';
      return (
        <div key={`${paragraphIndex}-${paragraph.slice(0, 18)}`}>
          <ReadingParagraphWithNotes
            paragraph={paragraph}
            paragraphIndex={paragraphIndex}
            draftNote={draftNote}
            notes={notes}
            getNoteVisualState={getNoteVisualState}
            focusNote={focusNote}
            setHoveredNoteId={setHoveredNoteId}
          />
          {translationEnabled &&
            (translated ? (
              <p className="mt-3 break-words text-sm leading-[1.9] text-muted-foreground/85 sm:text-base">
                {translated}
              </p>
            ) : paragraphIndex === 0 && translationLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {t('readingArticle.translation.preparing', {
                  defaultValue: 'Preparing translation...',
                })}
              </p>
            ) : paragraphIndex === 0 && translationError ? (
              <p className="mt-2 text-sm text-amber-600 dark:text-amber-300">{translationError}</p>
            ) : null)}
        </div>
      );
    })}
  </div>
);

export const ReadingSelectionToolbar: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
  selectionToolbar: SelectionToolbarState;
  noteColor: NoteColor;
  setNoteColor: (color: NoteColor) => void;
  onLookupSelection: () => void;
  onSaveSelectionWord: (text: string) => Promise<void>;
  startNoteFromSelection: () => void;
  onClose: () => void;
}> = ({
  t,
  selectionToolbar,
  noteColor,
  setNoteColor,
  onLookupSelection,
  onSaveSelectionWord,
  startNoteFromSelection,
  onClose,
}) => {
  if (!selectionToolbar.visible) return null;

  return (
    <div data-reading-selection-toolbar>
      <AnnotationToolbar
        visible={selectionToolbar.visible}
        position={{ left: selectionToolbar.x, top: selectionToolbar.y }}
        selectedColor={noteColor}
        selectionText={selectionToolbar.text}
        selectionKind={selectionToolbar.selectionKind}
        labels={{
          addNote: t('readingArticle.toolbar.note', { defaultValue: 'Note' }),
          sentenceNote: t('readingArticle.toolbar.saveAsQuoteNote', {
            defaultValue: 'Save as sentence note',
          }),
          saveToVocab: t('readingArticle.toolbar.saveToVocab', {
            defaultValue: 'Save to vocab book',
          }),
          lookup: t('readingArticle.toolbar.lookup', { defaultValue: 'Lookup' }),
          close: t('readingArticle.toolbar.close', { defaultValue: 'Close' }),
        }}
        onAddNote={startNoteFromSelection}
        onLookup={onLookupSelection}
        onSaveToVocab={onSaveSelectionWord}
        onHighlight={color => {
          if (!color) return;
          setNoteColor(color as NoteColor);
        }}
        onColorChange={color => {
          if (!color) return;
          setNoteColor(color as NoteColor);
        }}
        onClose={onClose}
      />
    </div>
  );
};

export function renderReadingArticleState(args: {
  articleId: string;
  article: NewsArticle | null | undefined;
  t: TFunction;
  navigate: (path: string) => void;
  backPath: string;
}) {
  const { articleId, article, t, navigate, backPath } = args;
  if (!articleId) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center text-sm font-semibold text-muted-foreground">
        {t('readingArticle.errors.missingArticleId', { defaultValue: 'Missing article ID' })}
      </div>
    );
  }
  if (article === undefined) {
    return <div className="h-[76vh] animate-pulse rounded-3xl bg-muted" />;
  }
  if (article === null) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <p className="text-base font-bold text-muted-foreground">
          {t('readingArticle.errors.articleUnavailable', {
            defaultValue: 'This article does not exist or is not available.',
          })}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={() => navigate(backPath)}
          className="mt-4 rounded-xl border border-border bg-card px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted"
        >
          {t('readingArticle.backToDiscovery', { defaultValue: 'Back to discovery' })}
        </Button>
      </div>
    );
  }
  return null;
}
