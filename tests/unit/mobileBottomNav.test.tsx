import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LayoutProvider } from '../../src/contexts/LayoutContext';

const navigateMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('convex/react', () => ({
  useQuery: () => undefined,
}));

vi.mock('../../convex/_generated/api', () => ({
  api: {
    achievements: { getPendingBadges: 'achievements:getPendingBadges' },
  },
}));

vi.mock('../../src/components/layout/DesktopSidebar', () => ({
  default: () => <aside data-testid="desktop-sidebar" />,
}));

vi.mock('../../src/components/layout/Footer', () => ({
  default: () => <footer data-testid="footer" />,
}));

vi.mock('../../src/components/mobile/MobileHeader', () => ({
  MobileHeader: () => <header data-testid="mobile-header" />,
}));

vi.mock('../../src/components/modals/GlobalModalContainer', () => ({
  GlobalModalContainer: () => null,
}));

vi.mock('../../src/components/modals/ProfileSetupModalTrigger', () => ({
  ProfileSetupModalTrigger: () => null,
}));

vi.mock('../../src/components/common/GlobalCommandPalette', () => ({
  GlobalCommandPalette: () => null,
}));

vi.mock('../../src/components/common', () => ({
  ContentSkeleton: () => <div data-testid="content-skeleton" />,
}));

import { MobileBottomNav } from '../../src/components/mobile/MobileBottomNav';
import AppLayout from '../../src/components/layout/AppLayout';

const renderNav = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<MobileBottomNav />} />
      </Routes>
    </MemoryRouter>
  );

const learnButton = () => screen.getByRole('button', { name: /^Learn$/i });
const myButton = () => screen.getByRole('button', { name: /^My$/i });
const todayButton = () => screen.getByRole('button', { name: /^Today$/i });
const immerseButton = () => screen.getByRole('button', { name: /^Immerse$/i });

const setMobileMatchMedia = () => {
  const matcher = (query: string) => {
    const matches =
      query.includes('max-width: 767px') ||
      query.includes('max-width: 1023px') ||
      query.includes('pointer: coarse');
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  };
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation(matcher),
  });
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MobileBottomNav tab state', () => {
  it('marks Learn tab active on review routes', () => {
    renderNav('/review');
    expect(learnButton()).toHaveAttribute('data-active', 'true');
  });

  it('marks Learn tab active on notebook routes (PR1: notebook moved from My to Learn)', () => {
    renderNav('/notebook');
    expect(learnButton()).toHaveAttribute('data-active', 'true');
    expect(myButton()).toHaveAttribute('data-active', 'false');
  });

  it('marks Learn tab active on vocab-book routes', () => {
    renderNav('/vocab-book');
    expect(learnButton()).toHaveAttribute('data-active', 'true');
    expect(myButton()).toHaveAttribute('data-active', 'false');
  });

  it('marks Learn tab active on /course/:id/vocab', () => {
    renderNav('/course/ysk-1/vocab');
    expect(learnButton()).toHaveAttribute('data-active', 'true');
  });

  it('marks Today tab active on dashboard routes', () => {
    renderNav('/dashboard');
    expect(todayButton()).toHaveAttribute('data-active', 'true');
    expect(learnButton()).toHaveAttribute('data-active', 'false');
  });

  it('marks Immerse tab active on media/reading routes', () => {
    renderNav('/reading');
    expect(immerseButton()).toHaveAttribute('data-active', 'true');
    expect(learnButton()).toHaveAttribute('data-active', 'false');
  });

  it('marks My tab active on profile routes only (PR1: vocab-book/notebook removed from My)', () => {
    renderNav('/profile');
    expect(myButton()).toHaveAttribute('data-active', 'true');
    expect(learnButton()).toHaveAttribute('data-active', 'false');
  });

  it('keeps My tab inactive when on notebook (was previously active under My)', () => {
    renderNav('/notebook');
    expect(myButton()).toHaveAttribute('data-active', 'false');
  });

  it('keeps only the visible pill interactive so the transparent shell does not block page taps', () => {
    const { container } = renderNav('/dashboard');
    const nav = container.querySelector('nav');
    const pill = nav?.firstElementChild;

    expect(nav).toHaveClass('pointer-events-none');
    expect(pill).toHaveClass('pointer-events-auto');
  });

  it('reserves mobile viewport height for the bottom nav in the app layout', () => {
    setMobileMatchMedia();

    render(
      <LayoutProvider>
        <MemoryRouter initialEntries={['/en/dashboard']}>
          <Routes>
            <Route path="/:lang/*" element={<AppLayout />}>
              <Route path="dashboard" element={<div>Dashboard content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </LayoutProvider>
    );

    const main = screen.getByText('Dashboard content').closest('main');
    const shell = screen.getByText('Dashboard content').closest('[data-mobile-page-mode]');
    expect(main).toHaveStyle({
      height: 'calc(100dvh - var(--mobile-bottom-nav-offset))',
      maxHeight: 'calc(100dvh - var(--mobile-bottom-nav-offset))',
    });
    expect(shell).toHaveAttribute('data-mobile-bottom-nav-safe', 'true');
  });
});
