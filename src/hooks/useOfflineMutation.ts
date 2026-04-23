import { useCallback, useEffect, useRef, useState } from 'react';
import { useConvex, useMutation } from 'convex/react';
import {
  getFunctionName,
  makeFunctionReference,
  type FunctionArgs,
  type FunctionReference,
  type FunctionReturnType,
} from 'convex/server';

import {
  drainMutationQueue,
  enqueueMutation,
  queueSize,
  shouldQueueError,
  subscribeMutationQueue,
  type DrainResult,
  type QueuedMutation,
} from '../utils/mutationQueue';
import { logger } from '../utils/logger';

/**
 * Offline-aware wrapper around `useMutation`.
 *
 * - Online + success → resolves with the mutation's return value.
 * - Online + retryable network error → the call is persisted to the
 *   IndexedDB outbox and resolves with `{ queued: true, id }`. The caller
 *   should treat this as a soft success and proceed; the mutation replays
 *   when connectivity comes back.
 * - Online + hard error (4xx / logic) → rethrows so the UI can surface it.
 *
 * Designed for fire-and-forget learning events (FSRS grade, quiz answer,
 * reading heartbeat, speaking attempt). Do not use it for mutations whose
 * return value the UI awaits to render.
 */

export type OfflineMutationResult<Ret> =
  | { ok: true; queued: false; value: Ret }
  | { ok: true; queued: true; id: string | null };

export function useOfflineMutation<Ref extends FunctionReference<'mutation'>>(
  ref: Ref
): (args: FunctionArgs<Ref>) => Promise<OfflineMutationResult<FunctionReturnType<Ref>>> {
  const mutate = useMutation(ref);
  const name = getFunctionName(ref);

  return useCallback(
    async args => {
      try {
        const value = await mutate(args);
        return { ok: true, queued: false, value };
      } catch (err) {
        if (shouldQueueError(err)) {
          const id = await enqueueMutation(name, args as unknown);
          if (id) {
            logger.info('useOfflineMutation: queued for replay', { name, id });
            return { ok: true, queued: true, id };
          }
          // Couldn't persist (e.g. SSR) — surface the original error.
        }
        throw err;
      }
    },
    [mutate, name]
  );
}

/**
 * Subscribe to the current queue size. Returns the number of pending
 * rows — the value updates whenever the queue changes. Useful for a
 * "N offline actions pending" badge.
 */
export function useMutationQueueSize(): number {
  const [size, setSize] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void queueSize().then(n => {
        if (!cancelled) setSize(n);
      });
    };

    refresh();
    const unsubscribe = subscribeMutationQueue(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return size;
}

/**
 * Mount once at the app root. Listens for `online` events and drains the
 * outbox by calling `convex.mutation(name, args)` for each queued row.
 */
export function useDrainMutationQueueOnOnline(): void {
  const convex = useConvex();
  const runningRef = useRef(false);

  const drain = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    try {
      const result: DrainResult = await drainMutationQueue(async (row: QueuedMutation) => {
        try {
          const ref = makeFunctionReference<'mutation'>(row.functionName);
          await convex.mutation(ref, row.args as FunctionArgs<typeof ref>);
          return 'ok';
        } catch (err) {
          if (shouldQueueError(err)) return 'retry';
          // Permanent failure — drop so we don't get stuck forever.
          logger.warn('useDrainMutationQueueOnOnline: dropping row', {
            functionName: row.functionName,
            error: err instanceof Error ? err.message : String(err),
          });
          return 'drop';
        }
      });
      if (result.drained || result.dropped) {
        logger.info('useDrainMutationQueueOnOnline: drain complete', result);
      }
    } finally {
      runningRef.current = false;
    }
  }, [convex]);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    // Drain once at mount — covers the case where the tab was reopened
    // after a crash while the browser is already online.
    void drain();

    const handleOnline = () => {
      void drain();
    };
    globalThis.window.addEventListener('online', handleOnline);
    return () => {
      globalThis.window.removeEventListener('online', handleOnline);
    };
  }, [drain]);
}
