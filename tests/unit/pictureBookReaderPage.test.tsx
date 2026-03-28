import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPictureBookReaderSessionStorageKey } from '../../src/utils/readingSession';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();

class MockAudio {
  preload = '';
  src = '';
  currentTime = 0;
  playbackRate = 1;
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  pause = vi.fn();
  play = vi.fn(async () => {});
}

class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  naturalWidth = 1200;
  naturalHeight = 900;

  set src(_value: string) {
    queueMicrotask(() => {
      this.onload?.();
    });
  }

  async decode() {}
}

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string; title?: string; page?: number }) =>
        options?.defaultValue ?? key,
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

import PictureBookReaderPage from '../../src/pages/PictureBookReaderPage';

const renderPage = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/reading/books/:slug" element={<PictureBookReaderPage />} />
      </Routes>
    </MemoryRouter>
  );

describe('PictureBookReaderPage session restore', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useQueryMock.mockReset();
    sessionStorage.clear();
    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('Image', MockImage);

    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (!args || args === 'skip') return undefined;
      if (typeof args === 'object' && args && 'slug' in args && !('pageIndex' in args)) {
        return {
          _id: 'book-1',
          slug: 'storybook',
          title: 'Storybook',
          pageCount: 3,
          levelLabel: 'Level 2',
        };
      }
      if (typeof args === 'object' && args && 'slug' in args && 'pageIndex' in args) {
        const pageIndex = Number((args as { pageIndex: number }).pageIndex);
        if (pageIndex < 0 || pageIndex > 2) return null;
        return {
          book: {
            _id: 'book-1',
            slug: 'storybook',
            title: 'Storybook',
            pageCount: 3,
            levelLabel: 'Level 2',
          },
          page: {
            _id: `page-${pageIndex}`,
            pageIndex,
            imageUrl: `/page-${pageIndex}.png`,
            sentenceCount: 1,
            sentences: [
              {
                _id: `sentence-${pageIndex}`,
                sentenceIndex: 0,
                text: `Sentence ${pageIndex + 1}`,
                audioUrl: `/audio-${pageIndex}.mp3`,
              },
            ],
          },
          pageCount: 3,
          pageIndex,
          hasPreviousPage: pageIndex > 0,
          hasNextPage: pageIndex < 2,
        };
      }
      return undefined;
    });
  });

  it('restores the saved picture book page from sessionStorage', async () => {
    const key = buildPictureBookReaderSessionStorageKey('storybook');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        pageIndex: 1,
        activeSentenceIndex: 0,
        playbackRate: 1.2,
        autoFlip: false,
        timestamp: 123,
      })
    );

    renderPage('/reading/books/storybook');

    await waitFor(() => {
      expect(screen.getByText(text => text.includes('2 / 3'))).toBeInTheDocument();
    });
  });

  it('clamps a stale saved page index instead of showing not found', async () => {
    const key = buildPictureBookReaderSessionStorageKey('storybook');
    sessionStorage.setItem(
      key,
      JSON.stringify({
        pageIndex: 9,
        activeSentenceIndex: 0,
        playbackRate: 1,
        autoFlip: true,
        timestamp: 123,
      })
    );

    renderPage('/reading/books/storybook');

    await waitFor(() => {
      expect(screen.getByText(text => text.includes('3 / 3'))).toBeInTheDocument();
    });
    expect(screen.queryByText('Picture book not found')).not.toBeInTheDocument();
  });

  it('renders a placeholder instead of a broken page image when imageUrl is blank', async () => {
    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (!args || args === 'skip') return undefined;
      if (typeof args === 'object' && args && 'slug' in args && !('pageIndex' in args)) {
        return {
          _id: 'book-1',
          slug: 'storybook',
          title: 'Storybook',
          pageCount: 1,
          levelLabel: 'Level 2',
        };
      }
      if (typeof args === 'object' && args && 'slug' in args && 'pageIndex' in args) {
        return {
          book: {
            _id: 'book-1',
            slug: 'storybook',
            title: 'Storybook',
            pageCount: 1,
            levelLabel: 'Level 2',
          },
          page: {
            _id: 'page-0',
            pageIndex: 0,
            imageUrl: '   ',
            sentenceCount: 1,
            sentences: [
              {
                _id: 'sentence-0',
                sentenceIndex: 0,
                text: 'Sentence 1',
                audioUrl: '/audio-0.mp3',
              },
            ],
          },
          pageCount: 1,
          pageIndex: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        };
      }
      return undefined;
    });

    renderPage('/reading/books/storybook');

    await waitFor(() => {
      expect(screen.getByText(text => text.includes('1 / 1'))).toBeInTheDocument();
    });
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('reuses the sanitized image url for orientation lookup', async () => {
    class PortraitImage extends MockImage {
      naturalWidth = 600;
      naturalHeight = 1200;
    }

    vi.stubGlobal('Image', PortraitImage);

    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (!args || args === 'skip') return undefined;
      if (typeof args === 'object' && args && 'slug' in args && !('pageIndex' in args)) {
        return {
          _id: 'book-1',
          slug: 'storybook',
          title: 'Storybook',
          pageCount: 1,
          levelLabel: 'Level 2',
        };
      }
      if (typeof args === 'object' && args && 'slug' in args && 'pageIndex' in args) {
        return {
          book: {
            _id: 'book-1',
            slug: 'storybook',
            title: 'Storybook',
            pageCount: 1,
            levelLabel: 'Level 2',
          },
          page: {
            _id: 'page-0',
            pageIndex: 0,
            imageUrl: '   /page-0.png   ',
            sentenceCount: 1,
            sentences: [
              {
                _id: 'sentence-0',
                sentenceIndex: 0,
                text: 'Sentence 1',
                audioUrl: '/audio-0.mp3',
              },
            ],
          },
          pageCount: 1,
          pageIndex: 0,
          hasPreviousPage: false,
          hasNextPage: false,
        };
      }
      return undefined;
    });

    const view = renderPage('/reading/books/storybook');

    let image: HTMLImageElement | null = null;
    await waitFor(() => {
      image = view.container.querySelector('img');
      expect(image).not.toBeNull();
    });
    await waitFor(() => {
      expect(image.parentElement?.className).toContain('w-1/2');
    });
  });
});
