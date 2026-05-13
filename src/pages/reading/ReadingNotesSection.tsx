import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui';
import { Textarea } from '../../components/ui';
import type { NoteVisualState, ReaderNote, DraftNote } from './types';
import { noteColorDotClass, noteUnderlineClass } from './helpers';

const ReadingNotesSection: React.FC<{
  t: ReturnType<typeof useTranslation>['t'];
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
  <section>
    <h3 className="mb-3 text-sm font-bold text-muted-foreground">
      📝 {t('readingArticle.notes.title', { defaultValue: 'Notes' })}
    </h3>
    {noteSyncError && (
      <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900 dark:bg-amber-950/35 dark:text-amber-300">
        {t('readingArticle.notes.syncError', {
          defaultValue: 'Saved locally, but failed to sync to Notebook',
        })}
        ：{noteSyncError}
      </div>
    )}
    {draftNote && (
      <article className="mb-3 rounded-xl border border-sky-200 bg-card p-4 shadow-sm dark:border-sky-900">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-bold text-sky-600 dark:text-sky-300">
            {t('readingArticle.notes.newQuote', { defaultValue: 'New Quote Note' })}
          </span>
          <span className={`h-3 w-3 rounded-full ${noteColorDotClass(draftNote.color)}`} />
        </div>
        <blockquote
          className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] rounded bg-muted p-3 text-sm text-muted-foreground ${noteUnderlineClass(draftNote.color, getNoteVisualState('draft'))}`}
        >
          “{draftNote.quote}”
        </blockquote>
        <Textarea
          value={draftNote.comment}
          onChange={e => onDraftCommentChange(e.target.value)}
          placeholder={t('readingArticle.notes.placeholder', {
            defaultValue: 'Write your understanding, questions, or translation...',
          })}
          className="mt-3 h-24 w-full resize-none rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-none"
        />
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={onDiscardDraftNote}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted"
          >
            {t('readingArticle.notes.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => {
              void onSaveDraftNote();
            }}
            className="rounded-lg border border-primary bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:bg-primary/90"
          >
            {t('readingArticle.notes.save', { defaultValue: 'Save Note' })}
          </Button>
        </div>
      </article>
    )}
    <div className="space-y-2">
      {notes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-4 text-xs text-muted-foreground">
          {t('readingArticle.notes.empty', {
            defaultValue: 'No notes yet. Select text and tap Note to create an underlined quote.',
          })}
        </div>
      ) : (
        notes.map(note => (
          <Button
            key={note.id}
            type="button"
            variant="ghost"
            size="auto"
            onClick={() => focusNote(note.id)}
            onMouseEnter={() => setHoveredNoteId(note.id)}
            onMouseLeave={() => setHoveredNoteId(prev => (prev === note.id ? null : prev))}
            className={`!block w-full !whitespace-normal rounded-lg border bg-card px-3 py-3 text-left text-sm text-muted-foreground shadow-sm transition ${
              getNoteVisualState(note.id) === 'hovered'
                ? 'border-yellow-400 shadow-yellow-200 dark:border-yellow-500/70 dark:shadow-yellow-950/40'
                : getNoteVisualState(note.id) === 'selected'
                  ? 'border-yellow-300 shadow-yellow-100 dark:border-yellow-500/55 dark:shadow-yellow-950/30'
                  : 'border-border hover:border-border'
            }`}
          >
            <p
              className={`whitespace-normal break-words [overflow-wrap:anywhere] font-semibold ${noteUnderlineClass(note.color, getNoteVisualState(note.id))}`}
            >
              “{note.quote}”
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {note.comment ||
                t('readingArticle.notes.noComment', { defaultValue: '(No comment)' })}
            </p>
          </Button>
        ))
      )}
    </div>
  </section>
);

export { ReadingNotesSection };
