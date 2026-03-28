import {
  safeGetSessionStorageItem,
  safeRemoveSessionStorageItem,
  safeSetSessionStorageItem,
} from './browserStorage';

export type ReadingArticleSessionState = {
  scrollTop: number;
  fontSize: number;
  translationEnabled: boolean;
  panelTab: 'ai' | 'notes';
  activeWord: string;
  timestamp: number;
};

export type PictureBookReaderSessionState = {
  pageIndex: number;
  activeSentenceIndex: number;
  playbackRate: 0.8 | 1 | 1.2 | 1.5;
  autoFlip: boolean;
  timestamp: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isReadingArticleSessionState(value: unknown): value is ReadingArticleSessionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<ReadingArticleSessionState>;
  return (
    isFiniteNumber(state.scrollTop) &&
    isFiniteNumber(state.fontSize) &&
    typeof state.translationEnabled === 'boolean' &&
    (state.panelTab === 'ai' || state.panelTab === 'notes') &&
    typeof state.activeWord === 'string' &&
    isFiniteNumber(state.timestamp)
  );
}

function isPictureBookReaderSessionState(value: unknown): value is PictureBookReaderSessionState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<PictureBookReaderSessionState>;
  return (
    isFiniteNumber(state.pageIndex) &&
    isFiniteNumber(state.activeSentenceIndex) &&
    (state.playbackRate === 0.8 ||
      state.playbackRate === 1 ||
      state.playbackRate === 1.2 ||
      state.playbackRate === 1.5) &&
    typeof state.autoFlip === 'boolean' &&
    isFiniteNumber(state.timestamp)
  );
}

function loadSessionState<T>(key: string, isValid: (value: unknown) => value is T): T | null {
  const raw = safeGetSessionStorageItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (isValid(parsed)) {
      return parsed;
    }
  } catch {
    // Malformed session state is treated like a cache miss.
  }

  safeRemoveSessionStorageItem(key);
  return null;
}

function persistSessionState<T>(key: string, state: T): void {
  safeSetSessionStorageItem(key, JSON.stringify(state));
}

export function buildReadingArticleSessionStorageKey(articleId: string): string {
  return `reading-article-session:${articleId || 'default'}`;
}

export function loadReadingArticleSessionState(key: string): ReadingArticleSessionState | null {
  return loadSessionState(key, isReadingArticleSessionState);
}

export function persistReadingArticleSessionState(
  key: string,
  state: ReadingArticleSessionState
): void {
  persistSessionState(key, state);
}

export function buildPictureBookReaderSessionStorageKey(slug?: string): string {
  return `picture-book-reader-session:${slug || 'default'}`;
}

export function loadPictureBookReaderSessionState(
  key: string
): PictureBookReaderSessionState | null {
  return loadSessionState(key, isPictureBookReaderSessionState);
}

export function persistPictureBookReaderSessionState(
  key: string,
  state: PictureBookReaderSessionState
): void {
  persistSessionState(key, state);
}
