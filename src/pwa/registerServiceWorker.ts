import { registerSW } from 'virtual:pwa-register';
import { logger } from '../utils/logger';

export const registerServiceWorker = () => {
  if (typeof globalThis.window === 'undefined') return;
  if (import.meta.env.DEV) return;

  const host = globalThis.location.hostname;
  const isLocalHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host.endsWith('.local');
  if (isLocalHost) return;

  const updateServiceWorker = registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;

      // Keep installed PWA reasonably fresh to avoid stale auth/runtime code.
      const intervalMs = 30 * 60 * 1000;
      globalThis.window.setInterval(() => {
        void registration.update();
      }, intervalMs);
    },
    onRegisterError(error) {
      logger.warn('Service worker registration failed', error);
    },
  });

  const onVisibilityChange = () => {
    if (document.visibilityState !== 'visible') return;
    void updateServiceWorker(false);
  };

  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });
};
