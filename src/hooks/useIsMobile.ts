import { useState, useEffect } from 'react';
import { getMediaQueryList, matchesMediaQuery, subscribeToMediaQuery } from '../utils/mediaQuery';

const MOBILE_BREAKPOINT = 768; // Matching Tailwind's 'md' breakpoint

/**
 * Hook to detect if the current viewport is mobile.
 * Uses matchMedia for performant checking.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // Initial check (SSR safe)
    if (typeof globalThis.window === 'undefined') return false;
    return matchesMediaQuery(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  });

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const mediaQuery = getMediaQueryList(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    return subscribeToMediaQuery(mediaQuery, handleChange);
  }, []);

  return isMobile;
}
