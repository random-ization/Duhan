import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationPreferencesDto } from '../../convex/notifications';
import { ProfileSettingsTab } from '../../src/pages/profile/tabs/ProfileSettingsTab';

const {
  navigateMock,
  changeLanguageMock,
  updateUserSettingsMock,
  genericMutationMock,
  safeSetLocalStorageItemMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  changeLanguageMock: vi.fn(),
  updateUserSettingsMock: vi.fn(),
  genericMutationMock: vi.fn(async () => undefined),
  safeSetLocalStorageItemMock: vi.fn(),
}));

const basePreferences: NotificationPreferencesDto = {
  enabled: true,
  channels: {
    inApp: true,
    pwa: false,
  },
  categories: {
    learning: true,
    exam: true,
    social: true,
    system: true,
  },
  dailyReminderLocalTime: '20:00',
  timezone: 'Asia/Seoul',
  quietHours: {
    enabled: true,
    start: '22:00',
    end: '08:00',
  },
};

vi.mock('react-router-dom', () => ({
  useLocation: () => ({
    pathname: '/en/profile',
    search: '?tab=settings',
    hash: '#language',
  }),
  useNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: {
      language: 'en',
      resolvedLanguage: 'en',
      changeLanguage: changeLanguageMock,
    },
  }),
}));

vi.mock('../../src/utils/browserStorage', () => ({
  safeSetLocalStorageItem: safeSetLocalStorageItemMock,
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../src/pwa/pushNotifications', () => ({
  ensurePushSubscription: vi.fn(),
  getPushPermissionState: () => 'granted',
  hasPushRegistration: vi.fn(async () => true),
  requestPushPermission: vi.fn(async () => 'granted'),
  unsubscribeCurrentPushSubscription: vi.fn(),
}));

vi.mock('../../src/utils/convexRefs', () => ({
  NOTIFICATIONS: {
    getPreferences: 'notifications:getPreferences',
    listRecent: 'notifications:listRecent',
    getVapidPublicKey: 'notifications:getVapidPublicKey',
    updatePreferences: 'notifications:updatePreferences',
    subscribePush: 'notifications:subscribePush',
    unsubscribePush: 'notifications:unsubscribePush',
    markRead: 'notifications:markRead',
    markAllRead: 'notifications:markAllRead',
    dismiss: 'notifications:dismiss',
  },
  mRef: (name: string) => name,
}));

vi.mock('convex/react', () => ({
  useQuery: (ref: string) => {
    if (ref === 'notifications:getPreferences') return basePreferences;
    if (ref === 'notifications:listRecent') return [];
    if (ref === 'notifications:getVapidPublicKey') return 'test-vapid-key';
    return undefined;
  },
  useMutation: (ref: string) => {
    if (ref === 'userSettings:updateSettings') return updateUserSettingsMock;
    return genericMutationMock;
  },
}));

describe('ProfileSettingsTab', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    changeLanguageMock.mockReset();
    updateUserSettingsMock.mockReset().mockResolvedValue(null);
    genericMutationMock.mockReset().mockResolvedValue(basePreferences);
    safeSetLocalStorageItemMock.mockReset();
  });

  it('updates the cloud display language when a new language is selected', async () => {
    render(<ProfileSettingsTab labels={{}} section="language" />);

    fireEvent.click(screen.getByRole('button', { name: /中文/i }));

    await waitFor(() => {
      expect(updateUserSettingsMock).toHaveBeenCalledWith({ displayLanguage: 'zh' });
    });
    expect(changeLanguageMock).toHaveBeenCalledWith('zh');
    expect(navigateMock).toHaveBeenCalledWith('/zh/profile?tab=settings#language', {
      replace: true,
    });
  });

  it('keeps the local language switch responsive when cloud sync fails', async () => {
    updateUserSettingsMock.mockRejectedValueOnce(new Error('sync failed'));

    render(<ProfileSettingsTab labels={{}} section="language" />);

    fireEvent.click(screen.getByRole('button', { name: /中文/i }));

    await waitFor(() => {
      expect(updateUserSettingsMock).toHaveBeenCalledWith({ displayLanguage: 'zh' });
    });
    expect(changeLanguageMock).toHaveBeenCalledWith('zh');
    expect(navigateMock).toHaveBeenCalledWith('/zh/profile?tab=settings#language', {
      replace: true,
    });
    expect(safeSetLocalStorageItemMock).toHaveBeenCalledWith('preferredLanguage', 'zh');
    expect(safeSetLocalStorageItemMock).toHaveBeenCalledWith('preferredLanguageSource', 'user');
  });
});
