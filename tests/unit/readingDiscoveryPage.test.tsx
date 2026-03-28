import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const tMock = (key: string, options?: { defaultValue?: string; count?: number }) =>
  options?.defaultValue ?? (options?.count !== undefined ? String(options.count) : key);

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: tMock,
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

import ReadingDiscoveryPage from '../../src/pages/ReadingDiscoveryPage';

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reading" element={<ReadingDiscoveryPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('ReadingDiscoveryPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useMutationMock.mockReturnValue(async () => undefined);
    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (typeof args === 'object' && args && 'newsLimit' in args) {
        return {
          news: [
            {
              _id: 'news-1',
              sourceKey: 'khan',
              sourceUrl: 'https://example.com/news-1',
              title: 'Economy Brief',
              summary: 'Summary',
              bodyText: 'Body text',
              publishedAt: Date.now(),
              difficultyLevel: 'L2',
              difficultyScore: 2,
            },
          ],
          articles: [],
          refresh: {
            needsInitialization: false,
            hasReadSinceRefresh: false,
            autoRefreshEligible: false,
            nextAutoRefreshAt: null,
            manualRefreshLimit: 3,
            manualRefreshUsed: 0,
            manualRefreshRemaining: 3,
            lastRefreshedAt: null,
            userScoped: false,
          },
        };
      }

      return [
        {
          _id: 'book-1',
          slug: 'book-2',
          title: 'Level Two Story',
          levelLabel: '2단계',
          pageCount: 8,
        },
      ];
    });
  });

  it('uses the first available picture book level when level 1 is unavailable', async () => {
    renderPage('/reading');

    fireEvent.click(await screen.findByRole('button', { name: /level two story/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/reading/books/book-2?returnTo=%2Freading%3Flevel%3D2%25EB%258B%25A8%25EA%25B3%2584'
    );
  });

  it('preserves active filters in article returnTo links', async () => {
    renderPage('/reading');

    fireEvent.click(await screen.findByRole('button', { name: 'Intermediate' }));
    fireEvent.click(await screen.findByRole('button', { name: /economy brief/i }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(
        '/reading/news-1?returnTo=%2Freading%3Fdifficulty%3DL2%26level%3D2%25EB%258B%25A8%25EA%25B3%2584'
      );
    });
  });

  it('expands archive articles when view all is clicked', async () => {
    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (typeof args === 'object' && args && 'newsLimit' in args) {
        return {
          news: [],
          articles: Array.from({ length: 7 }, (_, index) => ({
            _id: `article-${index + 1}`,
            sourceKey: 'wiki_ko_featured',
            sourceUrl: `https://example.com/article-${index + 1}`,
            title: `Archive Article ${index + 1}`,
            summary: 'Summary',
            bodyText: 'Body text',
            publishedAt: Date.now(),
            difficultyLevel: 'L2',
            difficultyScore: 2,
          })),
          refresh: {
            needsInitialization: false,
            hasReadSinceRefresh: false,
            autoRefreshEligible: false,
            nextAutoRefreshAt: null,
            manualRefreshLimit: 3,
            manualRefreshUsed: 0,
            manualRefreshRemaining: 3,
            lastRefreshedAt: null,
            userScoped: false,
          },
        };
      }

      return [
        {
          _id: 'book-1',
          slug: 'book-2',
          title: 'Level Two Story',
          levelLabel: '2단계',
          pageCount: 8,
        },
      ];
    });

    renderPage('/reading');

    expect(screen.queryByText('Archive Article 7')).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'View all articles' }));
    expect(await screen.findByText('Archive Article 7')).toBeInTheDocument();
  });

  it('renders curated fallback cards without broken navigation', async () => {
    renderPage('/reading');

    const fallbackTitle = await screen.findByText('한옥');
    expect(fallbackTitle.closest('button')).toBeNull();

    fireEvent.click(fallbackTitle);
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
