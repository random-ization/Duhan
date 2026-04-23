import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProtectedUserSettingsSync } from '../../src/components/layout/ProtectedUserSettingsSync';

const useAuthMock = vi.fn();
const useGlobalSettingsMock = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock('../../src/hooks/useGlobalSettings', () => ({
  useGlobalSettings: () => useGlobalSettingsMock(),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="pathname">{location.pathname}</div>;
};

describe('ProtectedUserSettingsSync', () => {
  beforeEach(() => {
    useAuthMock.mockReset();
    useGlobalSettingsMock.mockReset();
    sessionStorage.clear();
    localStorage.clear();
  });

  it('navigates protected routes to the cloud language and updates local language state', async () => {
    const setLanguageMock = vi.fn();

    useAuthMock.mockReturnValue({
      user: { id: 'user-1' },
      language: 'en',
      setLanguage: setLanguageMock,
    });
    useGlobalSettingsMock.mockReturnValue({
      settings: {
        displayLanguage: 'zh',
      },
      storedSettings: { displayLanguage: 'zh' },
      updateSettings: vi.fn(),
      isLoading: false,
    });

    render(
      <MemoryRouter initialEntries={['/en/profile']}>
        <ProtectedUserSettingsSync />
        <LocationProbe />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('pathname')).toHaveTextContent('/zh/profile');
    });
    expect(setLanguageMock).toHaveBeenCalledWith('zh');
  });
});
