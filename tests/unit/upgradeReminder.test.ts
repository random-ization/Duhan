import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearDashboardUpgradeBannerSession,
  dismissDashboardUpgradeBanner,
  shouldShowDashboardUpgradeBanner,
} from '../../src/utils/upgradeReminder';

describe('upgradeReminder', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      localStorage: globalThis.localStorage,
      sessionStorage: globalThis.sessionStorage,
    });
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    globalThis.localStorage.clear();
    globalThis.sessionStorage.clear();
  });

  it('shows the banner on a fresh login session', () => {
    expect(shouldShowDashboardUpgradeBanner('user-1', 1_000)).toBe(true);
  });

  it('hides the banner after dismissing during the same session', () => {
    dismissDashboardUpgradeBanner('user-1', 1_000);
    expect(shouldShowDashboardUpgradeBanner('user-1', 2_000)).toBe(false);
  });

  it('shows the banner again after 24 hours in the same session', () => {
    dismissDashboardUpgradeBanner('user-1', 1_000);
    expect(shouldShowDashboardUpgradeBanner('user-1', 1_000 + 24 * 60 * 60 * 1000 + 1)).toBe(true);
  });

  it('shows the banner again after logout clears the session marker', () => {
    dismissDashboardUpgradeBanner('user-1', 1_000);
    clearDashboardUpgradeBannerSession();
    expect(shouldShowDashboardUpgradeBanner('user-1', 2_000)).toBe(true);
  });
});
