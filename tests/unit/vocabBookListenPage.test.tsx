import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildVocabBookPracticeSessionStorageKey } from '../../src/utils/vocabBookPracticeSession';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();
const useGlobalSettingsMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ language: 'en' }),
}));

vi.mock('../../src/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: vi.fn(async () => {}),
    stop: vi.fn(),
  }),
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('../../src/hooks/useGlobalSettings', () => ({
  useGlobalSettings: () => useGlobalSettingsMock(),
}));

import VocabBookListenPage from '../../src/pages/VocabBookListenPage';

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<VocabBookListenPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('VocabBookListenPage session restore', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useQueryMock.mockReset();
    useGlobalSettingsMock.mockReset();
    sessionStorage.clear();
    useGlobalSettingsMock.mockReturnValue({
      settings: {
        displayLanguage: 'en',
        flashcardAutoTTS: true,
        flashcardFront: 'KOREAN',
        flashcardRatingMode: 'PASS_FAIL',
        listenPlayMeaning: true,
        listenPlayExampleTranslation: true,
        audioRepeatCount: 2,
        audioSpeed: 1,
        dictationPlayCount: 2,
        dictationGapSeconds: 2,
        dictationAutoNext: true,
      },
      updateSettings: vi.fn(),
      storedSettings: null,
      isLoading: false,
    });
    useQueryMock.mockReturnValue({
      items: [
        {
          id: 'word-1',
          word: '하나',
          meaning: 'one',
          meaningEn: 'one',
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
        {
          id: 'word-2',
          word: '둘',
          meaning: 'two',
          meaningEn: 'two',
          meaningVi: '',
          meaningMn: '',
          partOfSpeech: 'noun',
          progress: {
            id: 'progress-2',
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

  it('restores the saved listen position from sessionStorage', async () => {
    const key = buildVocabBookPracticeSessionStorageKey('listen', 'category=DUE');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        index: 1,
        mode: 'ADVANCED',
        playMeaning: false,
        playExampleTranslation: false,
        repeatCount: 2,
        speed: 1.2,
        timestamp: 123,
      })
    );

    renderPage('/vocab-book/listen?category=DUE');

    await waitFor(() => {
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });
  });

  it('clamps restored positions that exceed the filtered word count', async () => {
    const key = buildVocabBookPracticeSessionStorageKey('listen', 'category=DUE');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        index: 9,
        mode: 'BASIC',
        playMeaning: true,
        playExampleTranslation: true,
        repeatCount: 2,
        speed: 1,
        timestamp: 123,
      })
    );

    renderPage('/vocab-book/listen?category=DUE');

    await waitFor(() => {
      expect(screen.getByText('2/2')).toBeInTheDocument();
    });
  });

  it('persists only resume state and keeps audio preferences out of sessionStorage', async () => {
    const key = buildVocabBookPracticeSessionStorageKey('listen', 'category=DUE');

    renderPage('/vocab-book/listen?category=DUE');

    await waitFor(() => {
      const storedValue = sessionStorage.getItem(key);
      expect(storedValue).not.toBeNull();
      const parsed = JSON.parse(storedValue ?? '{}') as {
        index?: number;
        mode?: string;
        timestamp?: number;
        playMeaning?: boolean;
        playExampleTranslation?: boolean;
        repeatCount?: number | string;
        speed?: number;
      };
      expect(parsed.index).toBe(0);
      expect(parsed.mode).toBe('BASIC');
      expect(typeof parsed.timestamp).toBe('number');
      expect(parsed.playMeaning).toBeUndefined();
      expect(parsed.playExampleTranslation).toBeUndefined();
      expect(parsed.repeatCount).toBeUndefined();
      expect(parsed.speed).toBeUndefined();
    });
  });
});
