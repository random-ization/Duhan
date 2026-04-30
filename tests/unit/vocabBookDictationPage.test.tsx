import { render, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildVocabBookPracticeSessionStorageKey } from '../../src/utils/vocabBookPracticeSession';
import VocabBookDictationPage from '../../src/pages/VocabBookDictationPage';

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

vi.mock('../../src/hooks/useGlobalSettings', () => ({
  useGlobalSettings: () => useGlobalSettingsMock(),
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

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<VocabBookDictationPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('VocabBookDictationPage session persistence', () => {
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
        dictationPlayCount: 3,
        dictationGapSeconds: 6,
        dictationAutoNext: false,
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
      ],
      nextCursor: null,
      hasMore: false,
    });
  });

  it('persists resumable session state including dictation preferences', async () => {
    const key = buildVocabBookPracticeSessionStorageKey('dictation', 'category=DUE');

    renderPage('/vocab-book/dictation?category=DUE');

    await waitFor(() => {
      const storedValue = sessionStorage.getItem(key);
      expect(storedValue).not.toBeNull();
      const parsed = JSON.parse(storedValue || '{}') as Record<string, unknown>;
      expect(parsed.index).toBe(0);
      expect(parsed.started).toBe(false);
      expect(parsed.mode).toBe('HEAR_PRONUNCIATION');
      expect(parsed.playCount).toBe(2);
      expect(parsed.gapSeconds).toBe(2);
      expect(parsed.autoNext).toBe(true);
    });
  });
});
