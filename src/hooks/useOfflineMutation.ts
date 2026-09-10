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
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();
  const ownerId = user?.id;

  return useCallback(
    async args => {
      // Convex waits for reconnection when offline; persist immediately so a
      // tab close cannot lose an action waiting only in the SDK's memory.
      if (ownerId && globalThis.navigator?.onLine === false) {
        const id = await enqueueMutation(name, args, ownerId);
        if (id) return { ok: true, queued: true, id };
        throw new Error('Offline action could not be saved');
      }
      try {
        const value = await mutate(args);
        return { ok: true, queued: false, value };
      } catch (err) {
        if (ownerId && shouldQueueError(err)) {
          const id = await enqueueMutation(name, args as unknown, ownerId);
          if (id) {
            logger.info('useOfflineMutation: queued for replay', { name, id });
            return { ok: true, queued: true, id };
          }
          // Couldn't persist (e.g. SSR) — surface the original error.
        }
        throw err;
      }
    },
    [mutate, name, ownerId]
  );
}

/**
 * Subscribe to the current queue size. Returns the number of pending
 * rows — the value updates whenever the queue changes. Useful for a
 * "N offline actions pending" badge.
 */
export function useMutationQueueSize(): number {
  const [size, setSize] = useState(0);
  const { user } = useAuth();
  const ownerId = user?.id;

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void (ownerId ? queueSize(ownerId) : Promise.resolve(0)).then(n => {
        if (!cancelled) setSize(n);
      });
    };

    refresh();
    const unsubscribe = subscribeMutationQueue(refresh);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ownerId]);

  return size;
}

/**
 * Mount once at the app root. Listens for `online` events and drains the
 * outbox by calling `convex.mutation(name, args)` for each queued row.
 */
export function useDrainMutationQueueOnOnline(): void {
  const convex = useConvex();
  const { user, loading } = useAuth();
  const ownerId = user?.id;
  const runningRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!ownerId || loading || typeof globalThis.window === 'undefined') return;
    let cancelled = false;

    const drain = async () => {
      // A new account waits for an old drain to finish before beginning.
      const previousDrain = runningRef.current;
      if (previousDrain) await previousDrain;
      if (cancelled || globalThis.navigator?.onLine === false) return;
      const run = async () => {
        const result: DrainResult = await drainMutationQueue(async (row: QueuedMutation) => {
          if (cancelled) return 'retry';
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
        }, ownerId);
        if (result.drained || result.dropped) {
          logger.info('useDrainMutationQueueOnOnline: drain complete', result);
        }
      };
      const task = run().catch(error => logger.warn('Offline queue drain failed', error));
      runningRef.current = task;
      await task;
      if (runningRef.current === task) runningRef.current = null;
    };

    // Drain once at mount — covers the case where the tab was reopened
    // after a crash while the browser is already online.
    void drain();

    const handleOnline = () => {
      void drain();
    };
    globalThis.window.addEventListener('online', handleOnline);
    const unsubscribe = subscribeMutationQueue(handleOnline);
    return () => {
      cancelled = true;
      unsubscribe();
      globalThis.window.removeEventListener('online', handleOnline);
    };
  }, [convex, loading, ownerId]);
}
