import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQueuedAutosave } from '../../src/hooks/useQueuedAutosave';

type Draft = { pageId: string; text: string };
const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>(r => { resolve = r; });
  return { promise, resolve };
};

describe('notebook autosave', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('flushes the last edit on unmount before the debounce expires', async () => {
    const persist = vi.fn(async (_draft: Draft) => {});
    const { result, unmount } = renderHook(() => useQueuedAutosave(persist));
    act(() => result.current.schedule({ pageId: 'a', text: 'last edit' }));
    unmount();
    await act(async () => {});
    expect(persist).toHaveBeenCalledExactlyOnceWith({ pageId: 'a', text: 'last edit' });
  });

  it('saves the previous page when switching and keeps its draft while saving', async () => {
    const saving = deferred();
    const persist = vi.fn((_draft: Draft) => saving.promise);
    const { result } = renderHook(() => useQueuedAutosave(persist));
    const draft = { pageId: 'a', text: 'unsaved edit' };
    act(() => result.current.schedule(draft));
    act(() => result.current.activate({ pageId: 'b', text: 'second note' }));
    await act(async () => {});
    let restored: Draft | undefined;
    act(() => { restored = result.current.activate({ pageId: 'a', text: 'stale server text' }); });
    expect(restored).toEqual(draft);
    expect(persist).toHaveBeenCalledWith(draft);
    await act(async () => saving.resolve());
  });

  it('serializes overlapping saves and never marks a newer edit saved early', async () => {
    const firstSave = deferred();
    const persist = vi.fn<(_: Draft) => Promise<void>>()
      .mockImplementationOnce(() => firstSave.promise)
      .mockResolvedValue(undefined);
    const { result } = renderHook(() => useQueuedAutosave(persist));
    act(() => result.current.schedule({ pageId: 'a', text: 'first' }));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    act(() => result.current.schedule({ pageId: 'a', text: 'newer' }));
    await act(async () => firstSave.resolve());
    expect(result.current.saveState).toBe('dirty');
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(persist.mock.calls.map(([draft]) => draft.text)).toEqual(['first', 'newer']);
    expect(result.current.saveState).toBe('saved');
  });

  it('retains a failed save for an explicit retry', async () => {
    const persist = vi.fn<(_: Draft) => Promise<void>>()
      .mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const { result } = renderHook(() => useQueuedAutosave(persist));
    act(() => result.current.schedule({ pageId: 'a', text: 'keep me' }));
    await act(async () => vi.advanceTimersByTimeAsync(1000));
    expect(result.current.saveState).toBe('error');
    await act(async () => result.current.retry());
    expect(persist).toHaveBeenCalledTimes(2);
    expect(result.current.saveState).toBe('saved');
  });
});
