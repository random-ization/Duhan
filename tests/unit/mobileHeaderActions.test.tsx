import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RouteUiConfig } from '../../src/config/routes.config';

const navigateMock = vi.fn();
const notifySuccessMock = vi.fn();
const notifyErrorMock = vi.fn();
const notifyInfoMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => null),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: (message: string) => notifySuccessMock(message),
    error: (message: string) => notifyErrorMock(message),
    info: (message: string) => notifyInfoMock(message),
  },
}));

import { MobileHeader } from '../../src/components/mobile/MobileHeader';

const baseConfig: RouteUiConfig = {
  hasDesktopSidebar: false,
  hasBottomNav: true,
  hasHeader: true,
  hasFooter: false,
  usePatternBackground: false,
  useDesktopContainerPadding: false,
  useDesktopMaxWidth: false,
  lockMainScroll: false,
  headerType: 'section',
  headerAction: 'none',
  headerTitle: 'nav.test',
  headerTitleDefault: 'Test',
  allowHiddenChrome: false,
  mobilePageMode: 'workspace',
};

const renderHeader = ({
  routeUiConfig,
  path,
  pathWithoutLang,
}: {
  routeUiConfig: RouteUiConfig;
  path: string;
  pathWithoutLang: string;
}) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={<MobileHeader routeUiConfig={routeUiConfig} pathWithoutLang={pathWithoutLang} />}
        />
      </Routes>
    </MemoryRouter>
  );

describe('MobileHeader action behavior', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    notifySuccessMock.mockReset();
    notifyErrorMock.mockReset();
    notifyInfoMock.mockReset();
  });

  it('hides filter action on non-media section pages', () => {
    renderHeader({
      routeUiConfig: { ...baseConfig, headerAction: 'filter' },
      path: '/topik',
      pathWithoutLang: '/topik',
    });

    expect(screen.queryByRole('button', { name: /filter/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /switch tab/i })).not.toBeInTheDocument();
  });

  it('shows media filter button and toggles between media tabs', () => {
    renderHeader({
      routeUiConfig: { ...baseConfig, headerAction: 'filter', headerTitleDefault: 'Media' },
      path: '/media?tab=videos',
      pathWithoutLang: '/media',
    });

    const switchTabButton = screen.getByRole('button', { name: /switch tab/i });
    fireEvent.click(switchTabButton);

    expect(navigateMock).toHaveBeenCalledWith('/media?tab=podcasts');
  });

  it('navigates dictionary search with encoded returnTo on search action', () => {
    renderHeader({
      routeUiConfig: { ...baseConfig, headerAction: 'search', headerTitleDefault: 'Courses' },
      path: '/courses?level=1',
      pathWithoutLang: '/courses',
    });

    const searchButton = screen.getByRole('button', { name: /search/i });
    fireEvent.click(searchButton);

    expect(navigateMock).toHaveBeenCalledWith('/dictionary/search?returnTo=%2Fcourses%3Flevel%3D1');
  });

  it('falls back to showing the URL when share APIs are unavailable', async () => {
    Object.defineProperty(window.navigator, 'share', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });

    renderHeader({
      routeUiConfig: { ...baseConfig, headerType: 'detail' },
      path: '/dashboard',
      pathWithoutLang: '/dashboard',
    });

    fireEvent.click(screen.getByRole('button', { name: /more actions/i }));
    fireEvent.click(screen.getByRole('button', { name: /share/i }));

    await Promise.resolve();

    expect(notifyInfoMock).toHaveBeenCalledWith(window.location.href);
  });
});
