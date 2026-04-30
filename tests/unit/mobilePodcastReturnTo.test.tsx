import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const useQueryMock = vi.fn(() => undefined);
let authUser: { id: string } | null = null;

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authUser }),
}));

vi.mock('convex/react', () => ({
  useQuery: (ref: unknown, args: unknown) => useQueryMock(ref, args),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

import { MobilePodcastDashboard } from '../../src/components/mobile/MobilePodcastDashboard';

const renderWithRouter = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<MobilePodcastDashboard />} />
      </Routes>
    </MemoryRouter>
  );

const renderSubscriptionsWithRouter = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<MobilePodcastDashboard view="subscriptions" />} />
      </Routes>
    </MemoryRouter>
  );

describe('MobilePodcastDashboard returnTo behavior', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    useQueryMock.mockReset();
    useQueryMock.mockReturnValue(undefined);
    authUser = null;
  });

  it('uses encoded returnTo when back button is pressed', () => {
    renderWithRouter('/podcasts?returnTo=%2Fmedia%3Ftab%3Dpodcasts');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/media?tab=podcasts');
  });

  it('falls back to /media?tab=podcasts for invalid returnTo', () => {
    renderWithRouter('/podcasts?returnTo=https://evil.example.com');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/media?tab=podcasts');
  });

  it('falls back to /media?tab=podcasts for protocol-relative returnTo', () => {
    renderWithRouter('/podcasts?returnTo=%2F%2Fevil.example.com');

    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(navigateMock).toHaveBeenCalledWith('/media?tab=podcasts');
  });

  it('submits podcast searches from the mobile dashboard', () => {
    renderWithRouter('/podcasts');

    fireEvent.change(screen.getByPlaceholderText('Search podcasts…'), {
      target: { value: 'talk to me' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(navigateMock).toHaveBeenCalledWith('/podcasts/search?q=talk+to+me&returnTo=%2Fpodcasts');
  });

  it('sanitizes nested returnTo when opening search from the dashboard', () => {
    renderWithRouter('/podcasts?returnTo=%2Fmedia%3Ftab%3Dpodcasts');

    fireEvent.change(screen.getByPlaceholderText('Search podcasts…'), {
      target: { value: 'talk to me' },
    });
    fireEvent.click(screen.getByRole('button', { name: /search/i }));

    expect(navigateMock).toHaveBeenCalledWith('/podcasts/search?q=talk+to+me&returnTo=%2Fpodcasts');
  });

  it('does not render the deprecated top filter chips', () => {
    renderWithRouter('/podcasts');

    expect(screen.queryByRole('button', { name: /beginner/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /intermediate/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /daily/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /news/i })).not.toBeInTheDocument();
  });

  it('deduplicates merged internal and external trending channels', () => {
    useQueryMock.mockImplementation((_ref: unknown, args: unknown) => {
      if (args === 'skip') return undefined;
      return {
        internal: [
          {
            _id: 'same-channel',
            title: 'Duplicated Show',
            author: 'Duhan',
            artworkUrl: 'https://cdn.example.com/a.png',
          },
        ],
        external: [
          {
            _id: 'same-channel',
            title: 'Duplicated Show',
            author: 'Duhan',
            artworkUrl: 'https://cdn.example.com/a.png',
          },
        ],
      };
    });

    renderWithRouter('/podcasts');

    expect(screen.getAllByText('Duplicated Show')).toHaveLength(1);
  });

  it('renders the dedicated subscriptions view and opens a channel', () => {
    authUser = { id: 'user-1' };
    useQueryMock
      .mockReturnValueOnce(undefined)
      .mockReturnValueOnce([])
      .mockReturnValueOnce([
        {
          _id: 'sub-1',
          title: 'Subscribed Show',
          author: 'Duhan',
          artworkUrl: 'https://cdn.example.com/sub.png',
        },
      ]);

    renderSubscriptionsWithRouter('/podcasts/subscriptions');

    fireEvent.click(screen.getByRole('button', { name: /subscribed show/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/podcasts/channel?id=sub-1&returnTo=%2Fpodcasts%2Fsubscriptions',
      {
        state: {
          channel: {
            _id: 'sub-1',
            title: 'Subscribed Show',
            author: 'Duhan',
            artworkUrl: 'https://cdn.example.com/sub.png',
          },
        },
      }
    );
  });
});
