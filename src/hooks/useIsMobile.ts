import { useState, useEffect } from 'react';

const MOBILE_BREAKPOINT = 768; // Matching Tailwind's 'md' breakpoint

/**
 * Hook to detect if the current viewport is mobile.
 * Uses matchMedia for performant checking.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    // Initial check (SSR safe)
    if (typeof globalThis.window === 'undefined') return false;
    return globalThis.window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  });

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const mediaQuery = globalThis.window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const handleChange = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
    };

    // Modern API
    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return isMobile;
}
