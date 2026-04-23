import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const loadGlobalCommandPaletteDialog = () => import('./GlobalCommandPaletteDialog');
const LazyGlobalCommandPaletteDialog = lazy(loadGlobalCommandPaletteDialog);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function GlobalCommandPalette() {
  const location = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isOpenShortcut) {
        return;
      }

      event.preventDefault();
      setOpen(current => !current);
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [user]);

  useEffect(() => {
    if (!user || typeof globalThis.window === 'undefined') {
      return;
    }

    const idleWindow = globalThis.window as IdleWindow;
    if (!idleWindow.requestIdleCallback) {
      void loadGlobalCommandPaletteDialog();
      return;
    }

    const idleHandle = idleWindow.requestIdleCallback(() => {
      void loadGlobalCommandPaletteDialog();
    }, { timeout: 1500 });

    return () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
    };
  }, [user]);

  if (!user || !open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyGlobalCommandPaletteDialog open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
