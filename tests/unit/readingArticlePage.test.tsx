import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReadingArticleSessionStorageKey } from '../../src/utils/readingSession';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();
const useActionMock = vi.fn();
const useMutationMock = vi.fn();
const actionHandlerMock = vi.fn();
const mutationHandlerMock = vi.fn(async () => undefined);
const speakMock = vi.fn(async () => {});
const stopMock = vi.fn();
const upsertAnnotationMock = vi.fn(async () => {});
const emptyAnnotations: never[] = [];
const tMock = (
  key: string,
  options?: { defaultValue?: string; count?: number; language?: string }
) => options?.defaultValue ?? (options?.count !== undefined ? String(options.count) : key);

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ language: 'en' }),
}));

vi.mock('../../src/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: speakMock,
    stop: stopMock,
    isLoading: false,
    error: null,
  }),
}));

vi.mock('../../src/hooks/useOutsideDismiss', () => ({
  useOutsideDismiss: () => undefined,
}));

vi.mock('../../src/features/annotation-kit/hooks/useScopedAnnotations', () => ({
  useScopedAnnotations: () => ({
    annotations: emptyAnnotations,
    upsert: upsertAnnotationMock,
  }),
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: tMock,
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useAction: (...args: unknown[]) => useActionMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

import ReadingArticlePage from '../../src/pages/ReadingArticlePage';

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reading/:articleId" element={<ReadingArticlePage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ReadingArticlePage session restore', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useQueryMock.mockReset();
    useActionMock.mockReset();
    useMutationMock.mockReset();
    actionHandlerMock.mockReset();
    mutationHandlerMock.mockClear();
    speakMock.mockClear();
    stopMock.mockClear();
    upsertAnnotationMock.mockClear();
    sessionStorage.clear();

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });

    useQueryMock.mockReturnValue({
      _id: 'article-1',
      sourceKey: 'khan',
      sourceUrl: 'https://example.com/article-1',
      title: 'Korean Economy Update',
      bodyText: 'First sentence. Second sentence.',
      publishedAt: Date.now(),
      difficultyLevel: 'L2',
      difficultyScore: 2,
    });

    actionHandlerMock.mockImplementation(async (args: unknown) => {
      if (typeof args === 'object' && args && 'paragraphs' in args) {
        const paragraphs = (args as { paragraphs: string[] }).paragraphs;
        return { translations: paragraphs.map(() => 'Translated paragraph') };
      }
      if (typeof args === 'object' && args && 'bodyText' in args) {
        return {
          summary: 'AI summary',
          vocabulary: [],
          grammar: [],
        };
      }
      return null;
    });
    useActionMock.mockReturnValue(actionHandlerMock);

    useMutationMock.mockReturnValue(mutationHandlerMock);
  });

  it('restores translation toggle, font size, and scroll position from sessionStorage', async () => {
    const key = buildReadingArticleSessionStorageKey('article-1');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        scrollTop: 120,
        fontSize: 20,
        translationEnabled: true,
        panelTab: 'ai',
        activeWord: '',
        timestamp: 123,
      })
    );

    const { container } = renderPage('/reading/article-1');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Toggle translation' })).toHaveTextContent(
        'Translation'
      );
      expect(screen.getByRole('button', { name: 'Toggle translation' })).toHaveTextContent('On');
    });

    await waitFor(() => {
      const readingContainer = screen
        .getByText('First sentence. Second sentence.')
        .closest('.overflow-y-auto');
      expect(readingContainer).not.toBeNull();
      expect(readingContainer?.scrollTop).toBe(120);
    });

    expect(container.querySelector('div[style*="font-size: 20px"]')).not.toBeNull();
  });

  it('shows fallback metadata instead of leaking invalid date and blank source', async () => {
    useQueryMock.mockReturnValue({
      _id: 'article-1',
      sourceKey: '   ',
      sourceUrl: 'https://example.com/article-1',
      title: 'Korean Economy Update',
      bodyText: 'First sentence. Second sentence.',
      publishedAt: Number.NaN,
      difficultyLevel: 'L2',
      difficultyScore: 2,
    });

    renderPage('/reading/article-1');

    expect(await screen.findByText('Date unavailable')).toBeInTheDocument();
    expect(screen.getAllByText('Unknown source').length).toBeGreaterThan(0);
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });
});
