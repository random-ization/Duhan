type MediaQueryChangeHandler = (event: MediaQueryListEvent) => void;

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

export function getMediaQueryList(query: string): LegacyMediaQueryList | null {
  if (typeof globalThis.window === 'undefined') return null;
  if (typeof globalThis.window.matchMedia !== 'function') return null;
  return globalThis.window.matchMedia(query);
}

export function matchesMediaQuery(query: string): boolean {
  return getMediaQueryList(query)?.matches ?? false;
}

export function subscribeToMediaQuery(
  mediaQueryList: LegacyMediaQueryList | null,
  handler: MediaQueryChangeHandler
): () => void {
  if (!mediaQueryList) return () => {};

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handler);
    return () => mediaQueryList.removeEventListener('change', handler);
  }

  if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(handler);
    return () => mediaQueryList.removeListener?.(handler);
  }

  return () => {};
}
