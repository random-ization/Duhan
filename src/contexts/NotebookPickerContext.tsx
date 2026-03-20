import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../convex/_generated/dataModel';
import { NOTE_PAGES } from '../utils/convexRefs';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from '../components/ui';

type PickNotebookOptions = {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  defaultNotebookId?: Id<'note_pages'>;
};

type NotebookPickerContextValue = {
  pickNotebook: (options?: PickNotebookOptions) => Promise<Id<'note_pages'> | null>;
};

const NotebookPickerContext = createContext<NotebookPickerContextValue | null>(null);

const LAST_NOTEBOOK_STORAGE_KEY = 'duhan:notebook-picker:last-id';

type TranslateFn = ReturnType<typeof useTranslation>['t'];

const getDefaultOptions = (
  t: TranslateFn
): Required<Omit<PickNotebookOptions, 'defaultNotebookId'>> => {
  return {
    title: t('notes.picker.defaultTitle', { defaultValue: 'Save to Notebook' }),
    description: t('notes.picker.defaultDescription', {
      defaultValue: 'Select a notebook, or create one quickly before saving.',
    }),
    confirmText: t('notes.picker.defaultConfirm', { defaultValue: 'Save to Notebook' }),
    cancelText: t('notes.picker.defaultCancel', { defaultValue: 'Cancel' }),
  };
};

const readStoredNotebookId = (): Id<'note_pages'> | null => {
  if (typeof globalThis.window === 'undefined') return null;
  const raw = globalThis.window.localStorage.getItem(LAST_NOTEBOOK_STORAGE_KEY);
  if (!raw || !raw.trim()) return null;
  return raw as Id<'note_pages'>;
};

const persistNotebookId = (value: Id<'note_pages'> | null) => {
  if (typeof globalThis.window === 'undefined') return;
  if (!value) {
    globalThis.window.localStorage.removeItem(LAST_NOTEBOOK_STORAGE_KEY);
    return;
  }
  globalThis.window.localStorage.setItem(LAST_NOTEBOOK_STORAGE_KEY, String(value));
};

const formatNotebookMeta = (noteCount: number, reviewCount: number, t: TranslateFn) => {
  return t('notes.picker.meta', {
    noteCount,
    reviewCount,
    defaultValue: '{{noteCount}} notes · {{reviewCount}} pending',
  });
};

export function NotebookPickerProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const notebooksResult = useQuery(NOTE_PAGES.listNotebooks, {});
  const createNotebook = useMutation(NOTE_PAGES.createNotebook);
  const notebooks = useMemo(() => notebooksResult?.notebooks || [], [notebooksResult?.notebooks]);
  const defaultOptions = getDefaultOptions(t);

  const [open, setOpen] = useState(false);
  const [selectedNotebookId, setSelectedNotebookId] = useState<Id<'note_pages'> | null>(null);
  const [options, setOptions] = useState(defaultOptions);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [lastNotebookId, setLastNotebookId] = useState<Id<'note_pages'> | null>(() =>
    readStoredNotebookId()
  );

  const resolverRef = useRef<((value: Id<'note_pages'> | null) => void) | null>(null);

  const closeWith = useCallback((value: Id<'note_pages'> | null) => {
    if (value) {
      setLastNotebookId(value);
      persistNotebookId(value);
    }
    resolverRef.current?.(value);
    resolverRef.current = null;
    setOpen(false);
    setSelectedNotebookId(null);
    setNewNotebookName('');
    setIsCreating(false);
  }, []);

  const pickNotebook = useCallback(
    (nextOptions?: PickNotebookOptions) => {
      if (resolverRef.current) {
        resolverRef.current(null);
        resolverRef.current = null;
      }

      setOptions({
        ...defaultOptions,
        ...nextOptions,
      });
      const preferredNotebookId =
        nextOptions?.defaultNotebookId || lastNotebookId || notebooks[0]?.id || null;
      setSelectedNotebookId(preferredNotebookId);
      setNewNotebookName('');
      setOpen(true);

      return new Promise<Id<'note_pages'> | null>(resolve => {
        resolverRef.current = resolve;
      });
    },
    [defaultOptions, lastNotebookId, notebooks]
  );

  const handleCreateNotebook = useCallback(async () => {
    const name = newNotebookName.trim();
    if (!name || isCreating) return;

    setIsCreating(true);
    try {
      const created = await createNotebook({ name });
      if (created?.id) {
        setSelectedNotebookId(created.id);
        setNewNotebookName('');
      }
    } finally {
      setIsCreating(false);
    }
  }, [newNotebookName, isCreating, createNotebook]);

  useEffect(() => {
    if (!open) return;
    if (selectedNotebookId) return;
    const fallbackNotebookId = lastNotebookId || notebooks[0]?.id || null;
    if (!fallbackNotebookId) return;
    setSelectedNotebookId(fallbackNotebookId);
  }, [open, selectedNotebookId, lastNotebookId, notebooks]);

  const value = useMemo(() => ({ pickNotebook }), [pickNotebook]);

  return (
    <NotebookPickerContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={nextOpen => {
          if (!nextOpen) closeWith(null);
        }}
      >
        <DialogContent
          className="max-w-lg border border-[#e4e1db] bg-white rounded-2xl p-0"
          data-testid="notebook-picker-dialog"
        >
          <DialogHeader className="px-6 pt-6">
            <DialogTitle className="text-xl font-bold text-[#2f2d29]">{options.title}</DialogTitle>
            <DialogDescription className="text-sm text-[#6d675f]">
              {options.description}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 pb-6 space-y-4">
            <div
              className="max-h-64 overflow-y-auto rounded-xl border border-[#ece8e2] bg-[#faf9f7] p-2"
              data-testid="notebook-picker-list"
            >
              {notebooks.length === 0 ? (
                <p className="px-3 py-2 text-sm text-[#7a7369]">
                  {t('notes.picker.empty', {
                    defaultValue: 'No notebooks yet. Create one to continue.',
                  })}
                </p>
              ) : (
                <div className="space-y-1">
                  {notebooks.map(notebook => (
                    <button
                      key={notebook.id}
                      type="button"
                      onClick={() => setSelectedNotebookId(notebook.id)}
                      data-testid={`notebook-picker-item-${String(notebook.id)}`}
                      className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                        selectedNotebookId === notebook.id
                          ? 'border-[#337ea9] bg-[#e9f3fb]'
                          : 'border-transparent bg-white hover:border-[#d9d4cc]'
                      }`}
                    >
                      <p className="text-sm font-semibold text-[#2f2d29]">
                        {notebook.icon || '📒'} {notebook.title}
                      </p>
                      <p className="text-xs text-[#7a7369] mt-0.5">
                        {formatNotebookMeta(notebook.noteCount, notebook.reviewCount, t)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-[#ece8e2] p-3 bg-white">
              <p className="text-sm font-semibold text-[#2f2d29] mb-2">
                {t('notes.picker.newNotebook', { defaultValue: 'Create notebook' })}
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={newNotebookName}
                  onChange={event => setNewNotebookName(event.target.value)}
                  placeholder={t('notes.picker.newNotebookPlaceholder', {
                    defaultValue: 'For example: TOPIK Review',
                  })}
                  className="h-9"
                  data-testid="notebook-picker-create-input"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  disabled={!newNotebookName.trim() || isCreating}
                  onClick={handleCreateNotebook}
                  className="h-9 rounded-lg border border-[#d9d4cc] px-3"
                  data-testid="notebook-picker-create-button"
                >
                  {isCreating
                    ? t('notes.picker.creating', { defaultValue: 'Creating...' })
                    : t('notes.picker.create', { defaultValue: 'Create' })}
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 pb-6 sm:justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => closeWith(null)}
              data-testid="notebook-picker-cancel-button"
            >
              {options.cancelText}
            </Button>
            <Button
              type="button"
              size="auto"
              disabled={!selectedNotebookId}
              onClick={() => closeWith(selectedNotebookId)}
              className="bg-[#337ea9] text-white hover:bg-[#2f7297]"
              data-testid="notebook-picker-confirm-button"
            >
              {options.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NotebookPickerContext.Provider>
  );
}

export const useNotebookPicker = () => {
  const context = useContext(NotebookPickerContext);
  if (!context) {
    throw new Error('useNotebookPicker must be used within NotebookPickerProvider');
  }
  return context;
};
