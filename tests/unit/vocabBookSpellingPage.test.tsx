import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LearningSessionSnapshot } from '../../src/features/vocab/components/VocabQuiz';
import { buildVocabBookSpellingSessionStorageKey } from '../../src/utils/vocabLearningSession';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ language: 'en' }),
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string; count?: number }) =>
        options?.defaultValue ?? (options?.count !== undefined ? String(options.count) : key),
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('../../src/features/vocab/components/VocabQuiz', () => ({
  default: ({
    resumeSnapshot,
    onSessionSnapshot,
    onComplete,
  }: {
    resumeSnapshot?: LearningSessionSnapshot | null;
    onSessionSnapshot?: (snapshot: LearningSessionSnapshot) => void;
    onComplete?: (stats: { correct: number; total: number }) => void;
  }) => (
    <div>
      <div data-testid="resume-timestamp">{resumeSnapshot?.timestamp ?? 'none'}</div>
      <button
        type="button"
        onClick={() =>
          onSessionSnapshot?.({
            wordIds: ['word-1'],
            questionIndex: 1,
            wrongWordIds: [],
            correctCount: 1,
            totalAnswered: 1,
            currentBatchNum: 1,
            settings: {
              multipleChoice: false,
              writingMode: true,
              mcDirection: 'KR_TO_NATIVE',
              writingDirection: 'NATIVE_TO_KR',
              autoTTS: true,
              soundEffects: false,
            },
            timestamp: 456,
          })
        }
      >
        Save Snapshot
      </button>
      <button type="button" onClick={() => onComplete?.({ correct: 1, total: 1 })}>
        Complete Quiz
      </button>
    </div>
  ),
}));

import VocabBookSpellingPage from '../../src/pages/VocabBookSpellingPage';

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<VocabBookSpellingPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('VocabBookSpellingPage session restore', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    sessionStorage.clear();
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue({
      items: [
        {
          id: 'word-1',
          word: '안녕하세요',
          meaning: 'hello',
          meaningEn: 'hello',
          meaningVi: '',
          meaningMn: '',
          partOfSpeech: 'noun',
          progress: {
            id: 'progress-1',
            status: 'LEARNING',
            interval: 1,
            streak: 0,
            nextReviewAt: null,
            lastReviewedAt: null,
            state: 2,
          },
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('restores a persisted spelling session snapshot from sessionStorage', () => {
    const key = buildVocabBookSpellingSessionStorageKey('category=DUE&q=hello');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        wordIds: ['word-1'],
        questionIndex: 1,
        wrongWordIds: [],
        correctCount: 1,
        totalAnswered: 1,
        currentBatchNum: 1,
        settings: {
          multipleChoice: false,
          writingMode: true,
          mcDirection: 'KR_TO_NATIVE',
          writingDirection: 'NATIVE_TO_KR',
          autoTTS: true,
          soundEffects: false,
        },
        timestamp: 123,
      } satisfies LearningSessionSnapshot)
    );

    renderPage('/vocab-book/spelling?category=DUE&q=hello');

    expect(screen.getByTestId('resume-timestamp')).toHaveTextContent('123');
  });

  it('persists in-progress snapshots and clears them on completion', () => {
    const key = buildVocabBookSpellingSessionStorageKey('category=DUE&q=hello');
    renderPage('/vocab-book/spelling?category=DUE&q=hello');

    fireEvent.click(screen.getByRole('button', { name: 'Save Snapshot' }));
    expect(JSON.parse(sessionStorage.getItem(key) || '{}').timestamp).toBe(456);

    fireEvent.click(screen.getByRole('button', { name: 'Complete Quiz' }));
    expect(sessionStorage.getItem(key)).toBeNull();
  });
});
