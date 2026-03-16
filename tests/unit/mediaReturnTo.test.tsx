import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';

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
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => []),
}));

import MediaHubPage from '../../src/pages/MediaHubPage';
import VideoLibraryPage from '../../src/pages/VideoLibraryPage';

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
});
