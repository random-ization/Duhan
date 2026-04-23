import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

// Authenticated-app Tailwind utilities. Imported here (inside the lazy-loaded
// AppLayout chunk) so Vite code-splits this stylesheet out of the initial
// entry bundle — landing / auth / legal / pricing / learn pages no longer
// pay for full-app Tailwind classes.
import '../../styles/app.css';
// LazyMotion + `m as motion` lets framer-motion's feature bundle be split
// out of the shared vendor chunk. We use `domMax` (not `domAnimation`)
// because authenticated pages rely on drag (VocabBookImmersivePage,
// MobileFlashcardPlayer), layoutId animations (VocabBookPage,
// VocabBookImmersivePage, MobileTopikPage) and the LayoutGroup below.
import { AnimatePresence, LayoutGroup, LazyMotion, domMax, m as motion } from 'framer-motion';
import DesktopSidebar from './DesktopSidebar';
import Footer from './Footer';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileBottomNav } from '../mobile/MobileBottomNav';
import { MobilePwaInstallPrompt } from '../mobile/MobilePwaInstallPrompt';
import { useLayoutActions, useLayoutChromeState } from '../../contexts/LayoutContext';
import { canRouteHideChrome, getRouteUiConfig } from '../../config/routes.config';
import { getPathWithoutLang } from '../../utils/pathname';
import { GlobalModalContainer } from '../modals/GlobalModalContainer';
import { ProfileSetupModalTrigger } from '../modals/ProfileSetupModalTrigger';
import { GlobalCommandPalette } from '../common/GlobalCommandPalette';
import { ContentSkeleton } from '../common';
import { matchesMediaQuery } from '../../utils/mediaQuery';
import { ProtectedUserSettingsSync } from './ProtectedUserSettingsSync';

const shouldAnimateRoutes = () => {
  if (typeof globalThis.window === 'undefined') return true;
  const displayModeStandalone = matchesMediaQuery('(display-mode: standalone)');
  const nav = globalThis.navigator as Navigator & { standalone?: boolean };
  const isStandalone = displayModeStandalone || nav.standalone === true;
  const prefersReducedMotion = matchesMediaQuery('(prefers-reduced-motion: reduce)');
  const mobileLikeViewport =
    matchesMediaQuery('(pointer: coarse)') || matchesMediaQuery('(max-width: 1023px)');

  return !isStandalone && !prefersReducedMotion && !mobileLikeViewport;
};

export default function AppLayout() {
  const location = useLocation();
  const { sidebarHidden, footerHidden } = useLayoutChromeState();
  const { setSidebarHidden } = useLayoutActions();
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const routeUiConfig = getRouteUiConfig(pathWithoutLang);
  const isMobileViewport = matchesMediaQuery('(max-width: 767px)');

  // Safety net: some fullscreen flows toggle sidebarHidden to hide mobile chrome.
  // If that state ever gets stuck (e.g. a component crashes/unmounts unexpectedly),
  // restore it on normal pages so the bottom nav/header doesn't disappear.
  useEffect(() => {
    if (!sidebarHidden) return;
    if (!canRouteHideChrome(pathWithoutLang)) {
      setSidebarHidden(false);
    }
  }, [pathWithoutLang, sidebarHidden, setSidebarHidden]);

  const shouldShowMobileHeader = !sidebarHidden && routeUiConfig.hasHeader;
  const shouldShowMobileNav = !sidebarHidden && routeUiConfig.hasBottomNav;
  const shouldShowFooter = !footerHidden && routeUiConfig.hasFooter;
  const allowRouteMotion = shouldAnimateRoutes();
  const shouldUseDesktopPadding =
    routeUiConfig.hasDesktopSidebar && routeUiConfig.useDesktopContainerPadding;
  const shouldUseDesktopMaxWidth =
    routeUiConfig.hasDesktopSidebar && routeUiConfig.useDesktopMaxWidth;
  const mainOverflowClass = routeUiConfig.lockMainScroll
    ? 'overflow-y-auto lg:overflow-hidden'
    : 'overflow-y-auto';
  const routeShellClass = routeUiConfig.lockMainScroll
    ? 'h-full min-h-0 flex w-full min-w-0 flex-col'
    : 'min-h-full flex w-full min-w-0 flex-col';
  const routeContentClass = routeUiConfig.lockMainScroll
    ? 'flex-1 min-h-0 w-full min-w-0'
    : 'flex-1 w-full min-w-0';
  const mainBackgroundStyle =
    routeUiConfig.usePatternBackground && !isMobileViewport
      ? {
          backgroundImage: 'radial-gradient(hsl(var(--border)) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }
      : undefined;

  return (
    // Single LazyMotion at the authed-app root: every descendant `motion.*`
    // (aliased to framer-motion's `m`) picks up the domMax feature set from
    // context. We don't use `strict` because the codebase still has a few
    // indirect motion usages we can't audit statically.
    <LazyMotion features={domMax}>
      <div className="flex min-h-screen min-h-[100dvh] bg-background overflow-hidden font-sans">
        {routeUiConfig.hasDesktopSidebar && <DesktopSidebar />}
        <main
          className={`flex-1 h-screen h-[100dvh] ${mainOverflowClass} relative scroll-smooth`}
          style={mainBackgroundStyle}
        >
          <ProtectedUserSettingsSync />
          <ProfileSetupModalTrigger pathWithoutLang={pathWithoutLang} />
          <GlobalModalContainer />
          <GlobalCommandPalette />
          {shouldShowMobileHeader && (
            <MobileHeader routeUiConfig={routeUiConfig} pathWithoutLang={pathWithoutLang} />
          )}

          <div
            data-mobile-page-mode={routeUiConfig.mobilePageMode}
            className={`${routeShellClass} ${shouldUseDesktopPadding ? 'p-4 sm:p-6 md:p-10' : 'p-0'}`}
          >
            {allowRouteMotion ? (
              <LayoutGroup id="app-route-layout">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={location.pathname}
                    className={`${routeContentClass} ${shouldUseDesktopMaxWidth ? 'max-w-[1400px] mx-auto' : ''}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.16, ease: 'easeOut' }}
                  >
                    <Suspense fallback={<ContentSkeleton />}>
                      <Outlet />
                    </Suspense>
                  </motion.div>
                </AnimatePresence>
              </LayoutGroup>
            ) : (
              <div
                key={location.pathname}
                className={`${routeContentClass} ${shouldUseDesktopMaxWidth ? 'max-w-[1400px] mx-auto' : ''}`}
              >
                <Suspense fallback={<ContentSkeleton />}>
                  <Outlet />
                </Suspense>
              </div>
            )}
            {shouldShowFooter && <Footer />}
          </div>
          {shouldShowMobileNav && (
            <div className="h-[var(--mobile-bottom-nav-offset)] md:h-0 flex-shrink-0" />
          )}
        </main>
        {shouldShowMobileNav && <MobilePwaInstallPrompt />}
        {shouldShowMobileNav && <MobileBottomNav />}
      </div>
    </LazyMotion>
  );
}
