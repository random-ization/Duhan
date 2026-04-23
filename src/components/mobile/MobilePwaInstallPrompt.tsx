import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { safeGetSessionStorageItem, safeSetSessionStorageItem } from '../../utils/browserStorage';
import { matchesMediaQuery } from '../../utils/mediaQuery';
import { useGlobalModal } from '../../contexts/GlobalModalContext';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const DISMISS_STORAGE_KEY = 'duhan-pwa-install-dismissed';

const loadMobilePwaInstallPromptCard = () =>
  import('./MobilePwaInstallPromptCard').then(module => ({
    default: module.MobilePwaInstallPromptCard,
  }));

const LazyMobilePwaInstallPromptCard = lazy(loadMobilePwaInstallPromptCard);

const isStandalone = () => {
  if (typeof globalThis.window === 'undefined') {
    return false;
  }

  const displayModeStandalone = matchesMediaQuery('(display-mode: standalone)');
  const nav = navigator as Navigator & { standalone?: boolean };
  return displayModeStandalone || nav.standalone === true;
};

const isIosSafari = () => {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isOtherBrowserOnIOS = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIOS && isWebKit && !isOtherBrowserOnIOS;
};

export function MobilePwaInstallPrompt() {
  const { t } = useTranslation();
  const { activeModal } = useGlobalModal();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);
  const [readyToRender, setReadyToRender] = useState(false);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') {
      return;
    }

    setDismissed(safeGetSessionStorageItem(DISMISS_STORAGE_KEY) === '1');
    setInstalled(isStandalone());
    setIosSafari(isIosSafari());
  }, []);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (!isStandalone()) {
        setDeferredPrompt(event as BeforeInstallPromptEvent);
      }
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    globalThis.window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    globalThis.window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      globalThis.window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      globalThis.window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const canPromptInstall = deferredPrompt !== null;
  const shouldShowIosGuide = iosSafari && !isStandalone();
  const shouldShowPromptUi =
    !installed &&
    !dismissed &&
    activeModal === null &&
    (canPromptInstall || shouldShowIosGuide);

  useEffect(() => {
    if (!shouldShowPromptUi) {
      setReadyToRender(false);
      return;
    }

    const timerId = globalThis.window.setTimeout(() => {
      setReadyToRender(true);
    }, 3000);

    return () => {
      globalThis.window.clearTimeout(timerId);
    };
  }, [shouldShowPromptUi]);

  useEffect(() => {
    if (!shouldShowPromptUi || typeof globalThis.window === 'undefined') {
      return;
    }

    const idleWindow = globalThis.window as IdleWindow;
    if (!idleWindow.requestIdleCallback) {
      void loadMobilePwaInstallPromptCard();
      return;
    }

    const idleHandle = idleWindow.requestIdleCallback(() => {
      void loadMobilePwaInstallPromptCard();
    }, { timeout: 2000 });

    return () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
    };
  }, [shouldShowPromptUi]);

  const dismiss = () => {
    setDismissed(true);
    if (typeof globalThis.window !== 'undefined') {
      safeSetSessionStorageItem(DISMISS_STORAGE_KEY, '1');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  const description = useMemo(() => {
    if (canPromptInstall) {
      return t('pwa.install.androidHint', {
        defaultValue: 'Install for faster launch and a full-screen mobile experience.',
      });
    }

    return t('pwa.install.iosHint', {
      defaultValue: 'In Safari, tap Share and choose Add to Home Screen.',
    });
  }, [canPromptInstall, t]);

  if (!shouldShowPromptUi || !readyToRender) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyMobilePwaInstallPromptCard
        canPromptInstall={canPromptInstall}
        title={t('pwa.install.title', { defaultValue: 'Install DuHan App' })}
        description={description}
        actionLabel={t('pwa.install.action', { defaultValue: 'Install now' })}
        closeLabel={t('common.close', { defaultValue: 'Close' })}
        onInstall={handleInstall}
        onDismiss={dismiss}
      />
    </Suspense>
  );
}
