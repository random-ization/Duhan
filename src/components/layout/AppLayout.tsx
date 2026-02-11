import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { isValidLanguage } from '../LanguageRouter';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileBottomNav } from '../mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useMutation } from 'convex/react';
import { mRef, NoArgs } from '../../utils/convexRefs';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useLayout } from '../../contexts/LayoutContext';
import { getLabels } from '../../utils/i18n';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

export default function AppLayout() {
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { user, language } = useAuth();
  const labels = getLabels(language);
  const { sidebarHidden, setSidebarHidden, footerHidden } = useLayout();
  const [profilePromptDismissed, setProfilePromptDismissed] = useState(() => {
    if (globalThis.window === undefined) return true;
    return globalThis.window.sessionStorage.getItem('profile_setup_prompt_dismissed') === '1';
  });
  const syncProfileFromIdentityMutation = useMutation(
    mRef<NoArgs, { updated: boolean }>('auth:syncProfileFromIdentity')
  );

  // Hide footer on these pages and their sub-pages
  const hideFooterPaths = [
    '/courses',
    '/podcasts',
    '/videos',
    '/topik',
    '/dashboard',
    '/dashboard/',
    '/notebook',
    '/vocab-book',
    '/vocabbook',
  ];
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathWithoutLang =
    pathSegments[0] && isValidLanguage(pathSegments[0])
      ? `/${pathSegments.slice(1).join('/')}`
      : location.pathname;

  // Safety net: some fullscreen flows toggle sidebarHidden to hide mobile chrome.
  // If that state ever gets stuck (e.g. a component crashes/unmounts unexpectedly),
  // restore it on normal pages so the bottom nav/header doesn't disappear.
  useEffect(() => {
    if (!sidebarHidden) return;

    const allowHidden =
      pathWithoutLang.startsWith('/typing') ||
      pathWithoutLang.startsWith('/podcasts/player') ||
      pathWithoutLang.startsWith('/video/') ||
      // TOPIK exam flows can be fullscreen (cover, exam, result, review)
      (pathWithoutLang.startsWith('/topik/') && !pathWithoutLang.startsWith('/topik/history'));

    if (!allowHidden) {
      setSidebarHidden(false);
    }
  }, [pathWithoutLang, sidebarHidden, setSidebarHidden]);

  const shouldHideFooter =
    footerHidden || hideFooterPaths.some(path => pathWithoutLang.startsWith(path));
  const hideMobileHeaderPaths = ['/video/', '/podcasts/player'];
  const hideMobileNavPaths = ['/video/', '/podcasts/player'];
  const shouldHideMobileHeader =
    sidebarHidden || hideMobileHeaderPaths.some(path => pathWithoutLang.startsWith(path));
  const shouldHideMobileNav =
    sidebarHidden || hideMobileNavPaths.some(path => pathWithoutLang.startsWith(path));
  const isProfilePage = pathWithoutLang === '/profile' || pathWithoutLang.startsWith('/profile/');
  const shouldShowProfileSetupPrompt = useMemo(() => {
    if (!user) return false;
    if (profilePromptDismissed) return false;
    if (isProfilePage) return false;
    const nameMissing = !user.name?.trim();
    const avatarMissing = !user.avatar;
    return nameMissing || avatarMissing;
  }, [user, profilePromptDismissed, isProfilePage]);

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-background overflow-hidden font-sans">
      {!pathWithoutLang.startsWith('/typing') && <Sidebar />}
      <main
        className="flex-1 h-screen h-[100dvh] overflow-y-auto relative scroll-smooth"
        style={{
          backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      >
        {shouldShowProfileSetupPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <Card className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-xl">
              <CardContent className="p-6 sm:p-8">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  {labels.profileSetupPrompt?.title || 'Complete your profile'}
                </h2>
                <p className="mt-2 text-sm sm:text-base text-slate-600">
                  {labels.profileSetupPrompt?.description ||
                    'Import your current login profile (name/avatar) or create your own.'}
                </p>
                <div className="mt-6 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={async () => {
                      try {
                        await syncProfileFromIdentityMutation();
                      } finally {
                        setProfilePromptDismissed(true);
                        if (globalThis.window !== undefined) {
                          globalThis.window.sessionStorage.setItem(
                            'profile_setup_prompt_dismissed',
                            '1'
                          );
                        }
                      }
                    }}
                    className="flex-1 rounded-2xl px-5 py-3 font-bold text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-95 active:opacity-90 transition"
                  >
                    {labels.profileSetupPrompt?.useSocial || 'Use social profile'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="auto"
                    onClick={() => {
                      setProfilePromptDismissed(true);
                      if (globalThis.window !== undefined) {
                        globalThis.window.sessionStorage.setItem(
                          'profile_setup_prompt_dismissed',
                          '1'
                        );
                      }
                      navigate('/profile');
                    }}
                    className="flex-1 rounded-2xl px-5 py-3 font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 transition"
                  >
                    {labels.profileSetupPrompt?.createMyself || 'Create myself'}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    setProfilePromptDismissed(true);
                    if (globalThis.window !== undefined) {
                      globalThis.window.sessionStorage.setItem(
                        'profile_setup_prompt_dismissed',
                        '1'
                      );
                    }
                  }}
                  className="mt-4 w-full text-sm font-bold text-slate-500 hover:text-slate-700 transition"
                >
                  {labels.profileSetupPrompt?.maybeLater || 'Maybe later'}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
        {!shouldHideMobileHeader && <MobileHeader />}

        <div
          className={`min-h-full flex flex-col ${pathWithoutLang.startsWith('/typing') ? 'p-0' : 'p-4 sm:p-6 md:p-10'}`}
        >
          <div
            className={`flex-1 w-full ${pathWithoutLang.startsWith('/typing') ? '' : 'max-w-[1400px] mx-auto'}`}
          >
            <Outlet />
          </div>
          {!shouldHideFooter && <Footer />}
        </div>
        {!shouldHideMobileNav && (
          <div className="h-[calc(env(safe-area-inset-bottom)+96px)] md:h-0" />
        )}
      </main>
      {!shouldHideMobileNav && <MobileBottomNav />}
    </div>
  );
}
