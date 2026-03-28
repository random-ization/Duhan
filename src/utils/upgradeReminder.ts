import {
  safeGetLocalStorageItem,
  safeGetSessionStorageItem,
  safeRemoveSessionStorageItem,
  safeSetLocalStorageItem,
  safeSetSessionStorageItem,
} from './browserStorage';

const DASHBOARD_UPGRADE_BANNER_SESSION_KEY = 'duhan:upgrade-banner:session-user';
const DASHBOARD_UPGRADE_BANNER_DISMISS_PREFIX = 'duhan:upgrade-banner:dismissed-at';

export const DASHBOARD_UPGRADE_BANNER_INTERVAL_MS = 24 * 60 * 60 * 1000;

export const getDashboardUpgradeBannerDismissKey = (userId: string) =>
  `${DASHBOARD_UPGRADE_BANNER_DISMISS_PREFIX}:${userId}`;

export const shouldShowDashboardUpgradeBanner = (userId: string, nowMs = Date.now()) => {
  if (typeof globalThis.window === 'undefined') return false;

  const sessionUserId = safeGetSessionStorageItem(DASHBOARD_UPGRADE_BANNER_SESSION_KEY);
  if (sessionUserId !== userId) {
    return true;
  }

  const rawDismissedAt = safeGetLocalStorageItem(getDashboardUpgradeBannerDismissKey(userId));
  const dismissedAt = Number(rawDismissedAt);
  if (!Number.isFinite(dismissedAt) || dismissedAt <= 0) {
    return true;
  }

  return nowMs - dismissedAt >= DASHBOARD_UPGRADE_BANNER_INTERVAL_MS;
};

export const dismissDashboardUpgradeBanner = (userId: string, nowMs = Date.now()) => {
  if (typeof globalThis.window === 'undefined') return;

  safeSetLocalStorageItem(getDashboardUpgradeBannerDismissKey(userId), String(nowMs));
  safeSetSessionStorageItem(DASHBOARD_UPGRADE_BANNER_SESSION_KEY, userId);
};

export const clearDashboardUpgradeBannerSession = () => {
  if (typeof globalThis.window === 'undefined') return;
  safeRemoveSessionStorageItem(DASHBOARD_UPGRADE_BANNER_SESSION_KEY);
};
