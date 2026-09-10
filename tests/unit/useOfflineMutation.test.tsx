import { act, renderHook, waitFor } from '@testing-library/react';
import { makeFunctionReference } from 'convex/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: { user: undefined as { id: string } | undefined, loading: false },
  mutate: vi.fn(),
  convexMutation: vi.fn(),
  enqueue: vi.fn(),
  drain: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useMutation: () => mocks.mutate,
  useConvex: () => ({ mutation: mocks.convexMutation }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mocks.auth,
}));

vi.mock('../../src/utils/mutationQueue', () => ({
  enqueueMutation: (...args: unknown[]) => mocks.enqueue(...args),
  drainMutationQueue: (...args: unknown[]) => mocks.drain(...args),
  queueSize: vi.fn(async () => 0),
  shouldQueueError: vi.fn(() => true),
  subscribeMutationQueue: vi.fn(() => () => {}),
}));

import {
  useDrainMutationQueueOnOnline,
  useOfflineMutation,
} from '../../src/hooks/useOfflineMutation';

const mutationRef = makeFunctionReference<'mutation'>('vocab:updateProgress');

function setOnline(value: boolean) {
  Object.defineProperty(globalThis.navigator, 'onLine', {
    configurable: true,
    value,
  });
}

describe('offline mutation account isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.user = { id: 'account-a' };
    mocks.auth.loading = false;
    mocks.mutate.mockResolvedValue({ success: true });
    mocks.drain.mockResolvedValue({ drained: 0, dropped: 0, remaining: 0 });
    setOnline(true);
  });

  it('reports an offline action as queued only after durable persistence succeeds', async () => {
    setOnline(false);
    mocks.enqueue.mockResolvedValue('queued-1');
    const { result } = renderHook(() => useOfflineMutation(mutationRef));

    await expect(result.current({ wordId: 'word-1' })).resolves.toEqual({
      ok: true,
      queued: true,
      id: 'queued-1',
    });
    expect(mocks.enqueue).toHaveBeenCalledWith(
      'vocab:updateProgress',
      { wordId: 'word-1' },
      'account-a'
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('surfaces storage failure instead of claiming that an offline action was saved', async () => {
    setOnline(false);
    mocks.enqueue.mockResolvedValue(null);
    const { result } = renderHook(() => useOfflineMutation(mutationRef));

    await expect(result.current({ wordId: 'word-1' })).rejects.toThrow(
      'Offline action could not be saved'
    );
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it('waits for authentication and drains each account through its own owner scope', async () => {
    mocks.auth.user = undefined;
    mocks.auth.loading = true;
    const { rerender } = renderHook(() => useDrainMutationQueueOnOnline());

    expect(mocks.drain).not.toHaveBeenCalled();

    await act(async () => {
      mocks.auth.user = { id: 'account-a' };
      mocks.auth.loading = false;
      rerender();
    });
    await waitFor(() => expect(mocks.drain).toHaveBeenCalledWith(expect.any(Function), 'account-a'));

    await act(async () => {
      mocks.auth.user = { id: 'account-b' };
      rerender();
    });
    await waitFor(() => expect(mocks.drain).toHaveBeenCalledWith(expect.any(Function), 'account-b'));
  });
});
