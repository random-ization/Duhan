import { useSyncExternalStore } from 'react';
import { getMediaQueryList, matchesMediaQuery, subscribeToMediaQuery } from '../utils/mediaQuery';

const MOBILE_BREAKPOINT = 768; // Matching Tailwind's 'md' breakpoint
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

let cachedMediaQueryList: MediaQueryList | null | undefined;

const getMobileMediaQueryList = () => {
  if (cachedMediaQueryList !== undefined) return cachedMediaQueryList;
  cachedMediaQueryList = getMediaQueryList(MOBILE_QUERY);
  return cachedMediaQueryList;
};

const getMobileSnapshot = () => {
  if (typeof globalThis.window === 'undefined') return false;
  return matchesMediaQuery(MOBILE_QUERY);
};

const getServerSnapshot = () => false;

const subscribeMobile = (onStoreChange: () => void) => {
  const mediaQuery = getMobileMediaQueryList();
  return subscribeToMediaQuery(mediaQuery, () => {
    onStoreChange();
  });
};

/**
 * Hook to detect if the current viewport is mobile.
 * Uses matchMedia for performant checking.
 */
export function useIsMobile() {
  return useSyncExternalStore(subscribeMobile, getMobileSnapshot, getServerSnapshot);
}
