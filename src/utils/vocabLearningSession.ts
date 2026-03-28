import type { LearningSessionSnapshot } from '../features/vocab/components/VocabQuiz';
import {
  safeGetSessionStorageItem,
  safeRemoveSessionStorageItem,
  safeSetSessionStorageItem,
} from './browserStorage';

const VOCAB_BOOK_SPELLING_SESSION_PREFIX = 'vocab-book-spelling-session:';

export function isLearningSessionSnapshot(value: unknown): value is LearningSessionSnapshot {
  if (!value || typeof value !== 'object') return false;
  const snapshot = value as Partial<LearningSessionSnapshot>;
  return (
    Array.isArray(snapshot.wordIds) &&
    typeof snapshot.questionIndex === 'number' &&
    Array.isArray(snapshot.wrongWordIds) &&
    typeof snapshot.correctCount === 'number' &&
    typeof snapshot.totalAnswered === 'number' &&
    typeof snapshot.currentBatchNum === 'number' &&
    !!snapshot.settings &&
    typeof snapshot.timestamp === 'number'
  );
}

export function buildVocabBookSpellingSessionStorageKey(
  searchParams: URLSearchParams | string
): string {
  const query = typeof searchParams === 'string' ? searchParams : searchParams.toString();
  return `${VOCAB_BOOK_SPELLING_SESSION_PREFIX}${query || 'default'}`;
}

export function loadLearningSessionSnapshot(key: string): LearningSessionSnapshot | null {
  const raw = safeGetSessionStorageItem(key);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (isLearningSessionSnapshot(parsed)) {
      return parsed;
    }
  } catch {
    // Ignore malformed payloads and clear them below.
  }

  safeRemoveSessionStorageItem(key);
  return null;
}

export function persistLearningSessionSnapshot(
  key: string,
  snapshot: LearningSessionSnapshot
): void {
  safeSetSessionStorageItem(key, JSON.stringify(snapshot));
}

export function clearLearningSessionSnapshot(key: string): void {
  safeRemoveSessionStorageItem(key);
}
