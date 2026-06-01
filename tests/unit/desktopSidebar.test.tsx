import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentType } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DesktopSidebar from '../../src/components/layout/DesktopSidebar';

const logoutMock = vi.fn();
const navigateMock = vi.fn();
const toggleEditModeMock = vi.fn();
const toggleSidebarMock = vi.fn();
const setThemeMock = vi.fn();

const useLayoutActionsMock = vi.fn(() => ({
  toggleEditMode: toggleEditModeMock,
  toggleSidebar: toggleSidebarMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { name: 'Ryan', avatar: undefined },
    logout: logoutMock,
  }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
  withTranslation:
    () =>
    <P extends object>(component: ComponentType<P>) =>
      component,
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => undefined),
}));

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
  useCurrentLanguage: () => 'zh',
  getLocalizedPath: (path: string) => `/zh${path}`,
}));

vi.mock('../../src/contexts/LayoutContext', () => ({
  useLayoutDashboardState: () => ({ isEditing: false }),
  useLayoutChromeState: () => ({ sidebarHidden: false, sidebarCollapsed: false }),
  useContextualSidebarState: () => null,
  useLayoutActions: () => useLayoutActionsMock(),
}));

vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    resolvedTheme: 'dark',
    setTheme: setThemeMock,
  }),
}));

import { LearningProvider } from '../../src/contexts/LearningContext';

describe('DesktopSidebar', () => {
  beforeEach(() => {
    toggleSidebarMock.mockClear();
    useLayoutActionsMock.mockClear();
  });

  it('renders a collapse toggle button and calls toggleSidebar on click', () => {
    render(
      <MemoryRouter initialEntries={['/zh/dashboard']}>
        <LearningProvider>
          <DesktopSidebar />
        </LearningProvider>
      </MemoryRouter>
    );

    const toggleButton = screen.getByRole('button', { name: 'Toggle sidebar' });
    expect(toggleButton).toBeInTheDocument();

    fireEvent.click(toggleButton);
    expect(toggleSidebarMock).toHaveBeenCalled();
  });
});
