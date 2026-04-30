import { useSyncExternalStore } from 'react';
import { getMediaQueryList, matchesMediaQuery, subscribeToMediaQuery } from '../utils/mediaQuery';

const DESKTOP_BREAKPOINT = 1024; // Matching Tailwind's 'lg' breakpoint
const DESKTOP_QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`;

let cachedMediaQueryList: MediaQueryList | null | undefined;

const getDesktopMediaQueryList = () => {
  if (cachedMediaQueryList !== undefined) return cachedMediaQueryList;
  cachedMediaQueryList = getMediaQueryList(DESKTOP_QUERY);
  return cachedMediaQueryList;
};

const getDesktopSnapshot = () => {
  if (typeof globalThis.window === 'undefined') return false;
  return matchesMediaQuery(DESKTOP_QUERY);
};

const getServerSnapshot = () => false;

const subscribeDesktop = (onStoreChange: () => void) => {
  const mediaQuery = getDesktopMediaQueryList();
  return subscribeToMediaQuery(mediaQuery, () => {
    onStoreChange();
  });
};

/**
 * Hook to detect if the current viewport is desktop (>= 1024px).
 * Uses matchMedia for performant checking.
 */
export function useIsDesktop() {
  return useSyncExternalStore(subscribeDesktop, getDesktopSnapshot, getServerSnapshot);
}
