import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import { useFSRSBatchProgress } from '../../src/features/vocab/hooks/useVocabProgress';

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock('../../src/hooks/useOfflineMutation', () => ({ useOfflineMutation: () => mutate }));

const persistKey = 'test-fsrs-queue';
const review = (wordId: string) => ({ wordId: wordId as Id<'words'>, isCorrect: true });

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  mutate.mockReset();
  mutate.mockResolvedValue({ ok: true, queued: false });
});

afterEach(async () => {
  cleanup();
  await Promise.resolve();
  vi.useRealTimers();
});

describe('FSRS buffered progress', () => {
  it('retains in-flight reviews in recovery storage until persistence succeeds', async () => {
    let acknowledge!: () => void;
    mutate.mockReturnValueOnce(new Promise<void>(resolve => { acknowledge = resolve; }));
    const { result } = renderHook(() => useFSRSBatchProgress({ persistKey, maxBatchSize: 1 }));
    act(() => { result.current.enqueueReview(review('word-a')); });
    expect(JSON.parse(sessionStorage.getItem(persistKey) ?? '[]')).toHaveLength(1);
    await act(async () => { acknowledge(); });
    expect(JSON.parse(sessionStorage.getItem(persistKey) ?? '[]')).toHaveLength(0);
  });

  it('flushes new reviews that arrived while a previous request was in flight', async () => {
    let acknowledge!: () => void;
    mutate.mockReturnValueOnce(new Promise<void>(resolve => { acknowledge = resolve; }));
    const { result } = renderHook(() => useFSRSBatchProgress({ persistKey, maxBatchSize: 1 }));
    act(() => { result.current.enqueueReview(review('word-a')); });
    act(() => { result.current.enqueueReview(review('word-b')); });
    await act(async () => { acknowledge(); });
    expect(mutate).toHaveBeenCalledTimes(2);
    expect(mutate.mock.calls[1][0].items[0].wordId).toBe('word-b');
    expect(result.current.pendingCount).toBe(0);
  });

  it('does not resurrect an acknowledged batch when the hook rerenders', async () => {
    const { result, rerender } = renderHook(() => useFSRSBatchProgress({ persistKey }));
    act(() => { result.current.enqueueReview(review('word-a')); });
    await act(async () => { await result.current.flushQueue(); });
    rerender();
    expect(mutate).toHaveBeenCalledTimes(1);
  });
});
