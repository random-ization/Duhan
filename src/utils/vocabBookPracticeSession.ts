import { safeGetSessionStorageItem, safeSetSessionStorageItem } from './browserStorage';

export type VocabBookListenSessionState = {
  index: number;
  mode: 'BASIC' | 'ADVANCED';
  playMeaning: boolean;
  playExampleTranslation: boolean;
  repeatCount: 1 | 2 | 3 | 'INFINITE';
  speed: 0.8 | 1 | 1.2 | 1.4;
  timestamp: number;
};

export type VocabBookDictationSessionState = {
  index: number;
  started: boolean;
  mode: 'HEAR_PRONUNCIATION' | 'HEAR_MEANING';
  playCount: 1 | 2 | 3;
  gapSeconds: 2 | 4 | 6 | 8;
  autoNext: boolean;
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
    typeof state.playMeaning === 'boolean' &&
    typeof state.playExampleTranslation === 'boolean' &&
    (state.repeatCount === 1 ||
      state.repeatCount === 2 ||
      state.repeatCount === 3 ||
      state.repeatCount === 'INFINITE') &&
    (state.speed === 0.8 || state.speed === 1 || state.speed === 1.2 || state.speed === 1.4) &&
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
    (state.playCount === 1 || state.playCount === 2 || state.playCount === 3) &&
    (state.gapSeconds === 2 ||
      state.gapSeconds === 4 ||
      state.gapSeconds === 6 ||
      state.gapSeconds === 8) &&
    typeof state.autoNext === 'boolean' &&
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
