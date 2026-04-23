import { safeGetSessionStorageItem, safeSetSessionStorageItem } from './browserStorage';

export type VocabBookListenSessionState = {
  index: number;
  mode: 'BASIC' | 'ADVANCED';
  timestamp: number;
};

export type VocabBookDictationSessionState = {
  index: number;
  started: boolean;
  mode: 'HEAR_PRONUNCIATION' | 'HEAR_MEANING';
  timestamp: number;
};

export type VocabBookImmersiveSessionState = {
  index: number;
  mode: 'BROWSE' | 'RECALL';
  revealed: boolean;
  timestamp: number;
};

type PracticeSessionKind = 'listen' | 'dictation' | 'immersive';

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isListenSessionState(value: unknown): value is VocabBookListenSessionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<VocabBookListenSessionState>;
  return (
    isFiniteNumber(state.index) &&
    (state.mode === 'BASIC' || state.mode === 'ADVANCED') &&
    isFiniteNumber(state.timestamp)
  );
}

function isDictationSessionState(value: unknown): value is VocabBookDictationSessionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<VocabBookDictationSessionState>;
  return (
    isFiniteNumber(state.index) &&
    typeof state.started === 'boolean' &&
    (state.mode === 'HEAR_PRONUNCIATION' || state.mode === 'HEAR_MEANING') &&
    isFiniteNumber(state.timestamp)
  );
}

function isImmersiveSessionState(value: unknown): value is VocabBookImmersiveSessionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<VocabBookImmersiveSessionState>;
  return (
    isFiniteNumber(state.index) &&
    (state.mode === 'BROWSE' || state.mode === 'RECALL') &&
    typeof state.revealed === 'boolean' &&
    isFiniteNumber(state.timestamp)
  );
}

export function buildVocabBookPracticeSessionStorageKey(
  kind: PracticeSessionKind,
  searchParams: URLSearchParams | string
): string {
  const query = typeof searchParams === 'string' ? searchParams : searchParams.toString();
  return `vocab-book-${kind}-session:${query || 'default'}`;
}

function loadSessionState<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const raw = safeGetSessionStorageItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistSessionState<T>(key: string, state: T): void {
  safeSetSessionStorageItem(key, JSON.stringify(state));
}

export const loadVocabBookListenSessionState = (key: string) =>
  loadSessionState(key, isListenSessionState);
export const persistVocabBookListenSessionState = (
  key: string,
  state: VocabBookListenSessionState
) => persistSessionState(key, state);

export const loadVocabBookDictationSessionState = (key: string) =>
  loadSessionState(key, isDictationSessionState);
export const persistVocabBookDictationSessionState = (
  key: string,
  state: VocabBookDictationSessionState
) => persistSessionState(key, state);

export const loadVocabBookImmersiveSessionState = (key: string) =>
  loadSessionState(key, isImmersiveSessionState);
export const persistVocabBookImmersiveSessionState = (
  key: string,
  state: VocabBookImmersiveSessionState
) => persistSessionState(key, state);
