import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DesktopSidebar from '../../src/components/layout/DesktopSidebar';
import { useLayoutActions } from '../../src/contexts/LayoutContext';

const logoutMock = vi.fn();
const navigateMock = vi.fn();
const toggleEditModeMock = vi.fn();
const toggleSidebarMock = vi.fn();
const setThemeMock = vi.fn();

const useLayoutActionsMock = vi.fn(() => ({ 
  toggleEditMode: toggleEditModeMock,
  toggleSidebar: toggleSidebarMock 
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
  withTranslation: () => (component: any) => component,
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
