import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import DesktopSidebar from '../../src/components/layout/DesktopSidebar';

const logoutMock = vi.fn();
const navigateMock = vi.fn();
const toggleEditModeMock = vi.fn();
const setThemeMock = vi.fn();

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
}));

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
  useCurrentLanguage: () => 'zh',
  getLocalizedPath: (path: string) => `/zh${path}`,
}));

vi.mock('../../src/contexts/LayoutContext', () => ({
  useLayoutDashboardState: () => ({ isEditing: false }),
  useLayoutChromeState: () => ({ sidebarHidden: false }),
  useContextualSidebarState: () => null,
  useLayoutActions: () => ({ toggleEditMode: toggleEditModeMock }),
}));

vi.mock('../../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    resolvedTheme: 'dark',
    setTheme: setThemeMock,
  }),
}));

describe('DesktopSidebar dark mode toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a bottom dark mode switch and toggles global theme', () => {
    render(
      <MemoryRouter initialEntries={['/zh/dashboard']}>
        <DesktopSidebar />
      </MemoryRouter>
    );

    const darkModeSwitch = screen.getByRole('switch', { name: 'Dark mode' });
    expect(darkModeSwitch).toHaveAttribute('aria-checked', 'true');

    fireEvent.click(darkModeSwitch);

    expect(setThemeMock).toHaveBeenCalledWith('light');
  });
});
