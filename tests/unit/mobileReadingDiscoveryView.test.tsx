import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

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
      t: (key: string, options?: { defaultValue?: string; title?: string; count?: number }) =>
        options?.defaultValue ?? (options?.count !== undefined ? String(options.count) : key),
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('convex/react', () => ({
  useQuery: (...args: unknown[]) => useQueryMock(...args),
  useMutation: (...args: unknown[]) => useMutationMock(...args),
}));

import { MobileReadingDiscoveryView } from '../../src/components/mobile/MobileReadingDiscoveryView';

describe('MobileReadingDiscoveryView', () => {
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
              title: 'Economy Brief',
              summary: 'Summary',
              bodyText: 'Body text',
              publishedAt: Date.now(),
              difficultyLevel: 'L2',
            },
          ],
        };
      }

      return [
        {
          _id: 'book-1',
          slug: 'storybook',
          title: 'Storybook',
          author: 'Author',
          coverImageUrl: 'https://cdn.example.com/storybook-cover.png',
          levelLabel: 'Level 1',
        },
      ];
    });
  });

  it('renders picture book covers from the published cover image field', async () => {
    render(
      <MemoryRouter initialEntries={['/media?tab=reading']}>
        <MobileReadingDiscoveryView active />
      </MemoryRouter>
    );

    const cover = await screen.findByRole('img', { name: 'Storybook' });
    expect(cover).toHaveAttribute('src', 'https://cdn.example.com/storybook-cover.png');
  });

  it('falls back to the placeholder if the cover image fails to load', async () => {
    render(
      <MemoryRouter initialEntries={['/media?tab=reading']}>
        <MobileReadingDiscoveryView active />
      </MemoryRouter>
    );

    const cover = await screen.findByRole('img', { name: 'Storybook' });
    fireEvent.error(cover);

    await waitFor(() => {
      expect(screen.queryByRole('img', { name: 'Storybook' })).not.toBeInTheDocument();
    });
  });

  it('preserves the mobile media returnTo path when opening a storybook', async () => {
    render(
      <MemoryRouter initialEntries={['/media?tab=reading']}>
        <MobileReadingDiscoveryView active />
      </MemoryRouter>
    );

    fireEvent.click(await screen.findByRole('button', { name: /open storybook/i }));

    expect(navigateMock).toHaveBeenCalledWith(
      '/reading/books/storybook?returnTo=%2Fmedia%3Ftab%3Dreading'
    );
  });
});
