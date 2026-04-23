/**
 * Offline-safe mutation outbox backed by IndexedDB.
 *
 * Learning mutations (FSRS grade, quiz answer, speaking attempt, reading
 * heartbeat) can fail silently when the network drops. This utility lets
 * callers enqueue such mutations so they are retried automatically once
 * the browser comes back online — even if the user closes the tab and
 * reopens it later.
 *
 * The module has zero React / Convex dependencies; a thin React hook
 * (`useOfflineMutation`) layers on top in `src/hooks/useOfflineMutation.ts`.
 */

import { isRetryableConvexNetworkError } from './convexActionRetry';
import { logger } from './logger';

const DB_NAME = 'duhan-outbox';
const DB_VERSION = 1;
const STORE = 'mutations';
const INDEX_CREATED = 'by_createdAt';

export type QueuedMutation = {
  /** UUID-ish string: `<timestamp>-<random>`. */
  id: string;
  /** Convex function reference name, e.g. "vocab:updateProgress". */
  functionName: string;
  /** JSON-serialisable arguments passed to the mutation. */
  args: unknown;
  /** ms since epoch when the mutation was first enqueued. */
  createdAt: number;
  /** Number of drain attempts that have failed for this row. */
  attempts: number;
  /** Last error message if the drain failed; kept for debugging. */
  lastError?: string;
};

const SUPPORTS_IDB =
  typeof globalThis.indexedDB !== 'undefined' && typeof globalThis.window !== 'undefined';

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function openDb(): Promise<IDBDatabase | null> {
  if (!SUPPORTS_IDB) return Promise.resolve(null);
  return new Promise(resolve => {
    try {
      const req = globalThis.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex(INDEX_CREATED, 'createdAt', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        logger.warn('mutationQueue: failed to open IDB', req.error);
        resolve(null);
      };
      req.onblocked = () => resolve(null);
    } catch (err) {
      logger.warn('mutationQueue: IDB open threw', err);
      resolve(null);
    }
  });
}

type TxMode = 'readonly' | 'readwrite';

async function withStore<T>(
  mode: TxMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve, reject) => {
    try {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      const result = fn(store);

      // fn returned a Promise — let it resolve, tx still commits on its own.
      if (result instanceof Promise) {
        result
          .then(value => {
            tx.oncomplete = () => {
              db.close();
              resolve(value);
            };
          })
          .catch(err => {
            db.close();
            reject(err);
          });
        return;
      }

      // fn returned an IDBRequest.
      result.onsuccess = () => {
        tx.oncomplete = () => {
          db.close();
          resolve(result.result);
        };
      };
      result.onerror = () => {
        db.close();
        reject(result.error);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
      tx.onabort = () => {
        db.close();
        reject(tx.error);
      };
    } catch (err) {
      db.close();
      reject(err);
    }
  });
}

/**
 * Enqueue a mutation for later replay. Resolves with the generated id, or
 * `null` if IndexedDB is unavailable (SSR, private browsing, etc.) — callers
 * should treat `null` as "we couldn't persist, surface the original error".
 */
export async function enqueueMutation(functionName: string, args: unknown): Promise<string | null> {
  if (!SUPPORTS_IDB) return null;
  const record: QueuedMutation = {
    id: makeId(),
    functionName,
    args,
    createdAt: Date.now(),
    attempts: 0,
  };
  try {
    await withStore('readwrite', store => store.add(record));
    notifyListeners();
    return record.id;
  } catch (err) {
    logger.warn('mutationQueue: enqueue failed', err);
    return null;
  }
}

/** Fetch all pending mutations in FIFO (createdAt asc) order. */
export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  if (!SUPPORTS_IDB) return [];
  try {
    const rows = await withStore<QueuedMutation[]>('readonly', store => {
      return new Promise<QueuedMutation[]>(resolve => {
        const results: QueuedMutation[] = [];
        const idx = store.index(INDEX_CREATED);
        const req = idx.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (cursor) {
            results.push(cursor.value as QueuedMutation);
            cursor.continue();
          } else {
            resolve(results);
          }
        };
        req.onerror = () => resolve(results);
      });
    });
    return rows ?? [];
  } catch (err) {
    logger.warn('mutationQueue: list failed', err);
    return [];
  }
}

export async function removeQueuedMutation(id: string): Promise<void> {
  if (!SUPPORTS_IDB) return;
  try {
    await withStore('readwrite', store => store.delete(id));
    notifyListeners();
  } catch (err) {
    logger.warn('mutationQueue: delete failed', err);
  }
}

async function markAttempt(row: QueuedMutation, error: unknown): Promise<void> {
  if (!SUPPORTS_IDB) return;
  const next: QueuedMutation = {
    ...row,
    attempts: row.attempts + 1,
    lastError: error instanceof Error ? error.message : String(error),
  };
  try {
    await withStore('readwrite', store => store.put(next));
  } catch (err) {
    logger.warn('mutationQueue: markAttempt failed', err);
  }
}

export async function queueSize(): Promise<number> {
  if (!SUPPORTS_IDB) return 0;
  try {
    const count = await withStore<number>('readonly', store => store.count());
    return count ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Drop rows that have failed too many times; the user will need to redo
 * those actions manually. Stops the queue from growing unboundedly when a
 * mutation permanently 4xx's (e.g. auth revoked).
 */
const MAX_ATTEMPTS = 8;

export type DrainRunner = (row: QueuedMutation) => Promise<'ok' | 'retry' | 'drop'>;

export type DrainResult = {
  drained: number;
  dropped: number;
  remaining: number;
};

/**
 * Drain the outbox by calling `runner` once per queued row in FIFO order.
 *
 * The runner returns:
 *  - "ok"    → row is removed.
 *  - "retry" → row stays; attempts counter incremented.
 *  - "drop"  → row is removed (permanent failure).
 *
 * Drain stops early on the first "retry" to preserve ordering (the next
 * rows likely depend on the failing one completing first).
 */
export async function drainMutationQueue(runner: DrainRunner): Promise<DrainResult> {
  const rows = await listQueuedMutations();
  let drained = 0;
  let dropped = 0;
  for (const row of rows) {
    if (row.attempts >= MAX_ATTEMPTS) {
      await removeQueuedMutation(row.id);
      dropped += 1;
      continue;
    }
    let verdict: 'ok' | 'retry' | 'drop';
    try {
      verdict = await runner(row);
    } catch (err) {
      await markAttempt(row, err);
      // Stop — the network likely went down again.
      break;
    }
    if (verdict === 'ok') {
      await removeQueuedMutation(row.id);
      drained += 1;
    } else if (verdict === 'drop') {
      await removeQueuedMutation(row.id);
      dropped += 1;
    } else {
      await markAttempt(row, new Error('retry requested'));
      break;
    }
  }
  const remaining = await queueSize();
  return { drained, dropped, remaining };
}

// ---------------------------------------------------------------------------
// Change listeners — lets UI badges (e.g. a "N pending" chip) stay in sync.
// ---------------------------------------------------------------------------

type Listener = () => void;
const listeners = new Set<Listener>();

function notifyListeners() {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      logger.warn('mutationQueue: listener threw', err);
    }
  }
}

export function subscribeMutationQueue(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Decide whether a thrown error is "try again later" territory rather than
 * "permanent 4xx". Re-exported for callers that want the same heuristic
 * without importing from `convexActionRetry` directly.
 */
export function shouldQueueError(error: unknown): boolean {
  if (!error) return false;
  if (typeof globalThis.navigator !== 'undefined' && globalThis.navigator.onLine === false) {
    return true;
  }
  return isRetryableConvexNetworkError(error);
}
