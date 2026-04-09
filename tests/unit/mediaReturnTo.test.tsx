import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { useMutation, useQuery } from 'convex/react';

const navigateMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ language: 'en', user: null }),
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => []),
  useMutation: vi.fn(() => async () => undefined),
}));

import MediaHubPage from '../../src/pages/MediaHubPage';
import VideoLibraryPage from '../../src/pages/VideoLibraryPage';
import { MobileMediaPage } from '../../src/components/mobile/MobileMediaPage';

const useQueryMock = vi.mocked(useQuery);
const useMutationMock = vi.mocked(useMutation);

const renderWithRouter = (element: ReactElement, path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={element} />
      </Routes>
    </MemoryRouter>
  );

describe('Media returnTo flow', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();
    useQueryMock.mockReturnValue([]);
    useMutationMock.mockReturnValue(async () => undefined);
  });

  it('passes returnTo when opening videos and podcasts from media hub', () => {
    renderWithRouter(<MediaHubPage />, '/media?tab=videos');

    fireEvent.click(screen.getByRole('button', { name: /videos/i }));
    expect(navigateMock).toHaveBeenCalledWith('/videos?returnTo=%2Fmedia%3Ftab%3Dvideos');

    fireEvent.click(screen.getByRole('button', { name: /podcasts/i }));
    expect(navigateMock).toHaveBeenCalledWith('/podcasts?returnTo=%2Fmedia%3Ftab%3Dpodcasts');
  });

  it('uses returnTo for video page back navigation', () => {
    renderWithRouter(<VideoLibraryPage />, '/videos?returnTo=%2Fmedia%3Ftab%3Dvideos');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/media?tab=videos');
  });

  it('falls back to /media?tab=videos when video returnTo is missing or invalid', () => {
    renderWithRouter(<VideoLibraryPage />, '/videos?returnTo=https://evil.example.com');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/media?tab=videos');
  });

  it('falls back to /media?tab=videos for protocol-relative returnTo', () => {
    renderWithRouter(<VideoLibraryPage />, '/videos?returnTo=%2F%2Fevil.example.com');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/media?tab=videos');
  });

  it('preserves the current video library path when opening a video', () => {
    useQueryMock.mockReturnValue([
      {
        _id: 'video-1',
        title: 'Intro Video',
        level: 'Beginner',
        views: 12,
        createdAt: 0,
        duration: 120,
        description: 'Example video',
        thumbnailUrl: null,
      },
    ]);

    renderWithRouter(<VideoLibraryPage />, '/videos?returnTo=%2Fmedia%3Ftab%3Dvideos');

    fireEvent.click(screen.getByRole('button', { name: /intro video/i }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/video/video-1?returnTo=%2Fvideos%3FreturnTo%3D%252Fmedia%253Ftab%253Dvideos'
    );
  });

  it('respects the podcast tab query on mobile media page', async () => {
    useQueryMock
      .mockImplementationOnce(() => [
        {
          _id: 'video-1',
          title: 'Intro Video',
          level: 'Beginner',
          views: 12,
          createdAt: 0,
          duration: 120,
          description: 'Example video',
          thumbnailUrl: null,
        },
      ])
      .mockImplementationOnce(() => ({
        internal: [
          {
            _id: 'pod-1',
            title: 'Podcast Channel',
            author: 'Host',
            artworkUrl: '',
          },
        ],
        external: [],
      }))
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => []);

    renderWithRouter(<MobileMediaPage />, '/media?tab=podcast');

    expect(await screen.findByText('Podcast Channel')).toBeInTheDocument();
    expect(screen.queryByText('Intro Video')).not.toBeInTheDocument();
  });

  it('preserves mobile media returnTo when reopening a podcast episode', async () => {
    useQueryMock
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => ({
        internal: [],
        external: [],
      }))
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [
        {
          _id: 'history-1',
          episodeGuid: 'ep-1',
          episodeTitle: 'History Episode',
          episodeUrl: 'https://example.com/episode.mp3',
          channelName: 'History Channel',
          channelImage: 'https://example.com/cover.png',
          playedAt: Date.now(),
        },
      ]);

    renderWithRouter(<MobileMediaPage />, '/media?tab=podcast');

    fireEvent.click(await screen.findByRole('button', { name: /history episode/i }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/podcasts/player?returnTo=%2Fmedia%3Ftab%3Dpodcast',
      {
        state: {
          episode: {
            guid: 'ep-1',
            title: 'History Episode',
            audioUrl: 'https://example.com/episode.mp3',
            channel: {
              title: 'History Channel',
              artworkUrl: 'https://example.com/cover.png',
            },
          },
        },
      }
    );
  });

  it('shows a fallback label instead of Invalid Date for bad media timestamps', async () => {
    useQueryMock
      .mockImplementationOnce(() => [
        {
          _id: 'video-1',
          title: 'Intro Video',
          level: 'Beginner',
          views: 12,
          createdAt: Number.NaN,
          duration: 120,
          description: 'Example video',
          thumbnailUrl: null,
        },
      ])
      .mockImplementationOnce(() => ({
        internal: [],
        external: [],
      }))
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [
        {
          _id: 'history-1',
          episodeGuid: 'ep-1',
          episodeTitle: 'History Episode',
          episodeUrl: 'https://example.com/episode.mp3',
          channelName: 'History Channel',
          channelImage: 'https://example.com/cover.png',
          playedAt: Number.NaN,
        },
      ]);

    renderWithRouter(<MobileMediaPage />, '/media?tab=podcast');

    expect(await screen.findByText('History Episode')).toBeInTheDocument();
    expect(screen.queryByText('Invalid Date')).not.toBeInTheDocument();
  });

  it('preserves mobile media returnTo when opening storybooks from the reading tab', async () => {
    useQueryMock
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => ({ internal: [], external: [] }))
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => [
        {
          _id: 'book-1',
          slug: 'storybook',
          title: 'Storybook',
          coverImageUrl: 'https://example.com/storybook.png',
          levelLabel: 'Level 1',
        },
      ])
      .mockImplementationOnce(() => [])
      .mockImplementationOnce(() => ({ news: [] }));

    renderWithRouter(<MobileMediaPage />, '/media?tab=reading');

    fireEvent.click(await screen.findByRole('button', { name: /open storybook/i }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/reading/books/storybook?returnTo=%2Fmedia%3Ftab%3Dreading'
    );
  });
});
