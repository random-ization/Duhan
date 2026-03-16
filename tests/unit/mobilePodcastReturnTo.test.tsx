import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
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

describe('MobilePodcastDashboard returnTo behavior', () => {
  beforeEach(() => {
    navigateMock.mockReset();
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
});
