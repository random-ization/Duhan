import { useCallback, useEffect, useRef, useState } from 'react';

export type AutosaveState = 'saved' | 'saving' | 'dirty' | 'error';

/** Debounce edits, serialize writes, and flush the last edit when leaving a document. */
export function useQueuedAutosave<T extends { pageId: string }>(
  persist: (snapshot: T) => Promise<void>,
  delay = 1000
) {
  const [saveState, setSaveState] = useState<AutosaveState>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const drafts = useRef(new Map<string, T>());
  const active = useRef<T | null>(null);
  const pending = useRef<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef(Promise.resolve());
  const mounted = useRef(true);
  const persistRef = useRef(persist);
  useEffect(() => { persistRef.current = persist; }, [persist]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const snapshot = pending.current;
    pending.current = null;
    if (!snapshot) return queue.current;
    queue.current = queue.current.then(async () => {
      if (mounted.current && active.current === snapshot) setSaveState('saving');
      try {
        await persistRef.current(snapshot);
        if (drafts.current.get(snapshot.pageId) === snapshot) drafts.current.delete(snapshot.pageId);
        if (mounted.current && active.current === snapshot) {
          setSaveState('saved');
          setLastSavedAt(Date.now());
        }
      } catch {
        // Keep the draft available for retry or returning to this note.
        if (mounted.current && active.current === snapshot) setSaveState('error');
      }
    });
    return queue.current;
  }, []);

  const activate = useCallback((snapshot: T) => {
    void flush();
    const draft = drafts.current.get(snapshot.pageId);
    active.current = draft || snapshot;
    setSaveState(draft ? 'dirty' : 'saved');
    return draft || snapshot;
  }, [flush]);

  const schedule = useCallback((snapshot: T) => {
    active.current = snapshot;
    drafts.current.set(snapshot.pageId, snapshot);
    pending.current = snapshot;
    setSaveState('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void flush(); }, delay);
  }, [delay, flush]);

  const retry = useCallback(() => {
    if (active.current && drafts.current.has(active.current.pageId)) {
      pending.current = active.current;
    }
    return flush();
  }, [flush]);

  useEffect(() => {
    mounted.current = true;
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (drafts.current.size === 0) return;
      void flush();
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => {
      mounted.current = false;
      window.removeEventListener('beforeunload', warnUnsaved);
      void flush();
    };
  }, [flush]);

  return { saveState, lastSavedAt, activate, schedule, flush, retry };
}
