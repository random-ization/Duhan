import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_STORAGE_KEY = 'duhan-pwa-install-dismissed';

const isStandalone = () => {
  if (typeof window === 'undefined') return false;
  const displayModeStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const nav = navigator as Navigator & { standalone?: boolean };
  return displayModeStandalone || nav.standalone === true;
};

const isIosSafari = () => {
  if (typeof navigator === 'undefined') return false;
  const userAgent = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isWebKit = /WebKit/.test(userAgent);
  const isOtherBrowserOnIOS = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
  return isIOS && isWebKit && !isOtherBrowserOnIOS;
};

export function MobilePwaInstallPrompt() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [iosSafari, setIosSafari] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === '1');
    setInstalled(isStandalone());
    setIosSafari(isIosSafari());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

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

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, '1');
    }
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } finally {
      setDeferredPrompt(null);
    }
  };

  if (installed || dismissed) return null;

  const canPromptInstall = deferredPrompt !== null;
  const shouldShowIosGuide = iosSafari && !isStandalone();

  if (!canPromptInstall && !shouldShowIosGuide) return null;

  return (
    <div className="md:hidden fixed left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+110px)] z-50">
      <div className="rounded-2xl border-2 border-slate-900 bg-white shadow-2xl p-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-indigo-100 text-indigo-700 grid place-items-center shrink-0">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900">
            {t('pwa.install.title', { defaultValue: 'Install DuHan App' })}
          </p>
          {canPromptInstall ? (
            <p className="mt-1 text-xs text-slate-600 leading-5">
              {t('pwa.install.androidHint', {
                defaultValue: 'Install for faster launch and a full-screen mobile experience.',
              })}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-600 leading-5">
              {t('pwa.install.iosHint', {
                defaultValue: 'In Safari, tap Share and choose Add to Home Screen.',
              })}
            </p>
          )}
          {canPromptInstall && (
            <Button
              type="button"
              size="sm"
              className="mt-2 h-8 rounded-lg text-xs px-3"
              onClick={handleInstall}
            >
              {t('pwa.install.action', { defaultValue: 'Install now' })}
            </Button>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={dismiss}
          className="h-8 w-8 rounded-lg text-slate-500"
          aria-label={t('common.close', { defaultValue: 'Close' })}
        >
          <X size={16} />
        </Button>
      </div>
    </div>
  );
}
