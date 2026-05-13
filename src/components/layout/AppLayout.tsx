import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import DesktopSidebar from './DesktopSidebar';
import Footer from './Footer';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileBottomNav } from '../mobile/MobileBottomNav';
import { useLayoutActions, useLayoutChromeState } from '../../contexts/LayoutContext';
import { canRouteHideChrome, getRouteUiConfig } from '../../config/routes.config';
import { getPathWithoutLang } from '../../utils/pathname';
import { GlobalModalContainer } from '../modals/GlobalModalContainer';
import { ProfileSetupModalTrigger } from '../modals/ProfileSetupModalTrigger';
import { GlobalCommandPalette } from '../common/GlobalCommandPalette';
import { ContentSkeleton } from '../common';
import { matchesMediaQuery } from '../../utils/mediaQuery';
import { DesktopHeader } from './DesktopHeader';
import { useIsMobile } from '../../hooks/useIsMobile';

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
  const isMobileViewport = useIsMobile();

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
  const shouldShowFooter = !isMobileViewport && !footerHidden && routeUiConfig.hasFooter;
  const allowRouteMotion = shouldAnimateRoutes();
  // Desktop padding / max-width must never apply on the mobile viewport, where
  // pages render their own full-bleed mobile layouts.
  const shouldUseDesktopPadding =
    !isMobileViewport &&
    routeUiConfig.hasDesktopSidebar &&
    routeUiConfig.useDesktopContainerPadding;
  const shouldUseDesktopMaxWidth =
    !isMobileViewport &&
    routeUiConfig.hasDesktopSidebar &&
    routeUiConfig.useDesktopMaxWidth;
  const mainOverflowClass = routeUiConfig.lockMainScroll
    ? 'overflow-y-auto lg:overflow-hidden'
    : 'overflow-y-auto';
  const routeShellClass = routeUiConfig.lockMainScroll
    ? 'h-full min-h-0 flex w-full min-w-0 flex-col'
    : 'min-h-full flex w-full min-w-0 flex-col';
  const routeContentClass = routeUiConfig.lockMainScroll
    ? 'flex-1 min-h-0 w-full min-w-0'
    : 'flex-1 w-full min-w-0';
  const mainBackgroundStyle = undefined;
  const mobileShellStyle = isMobileViewport
    ? {
        background: '#FBF8F3',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden' as const,
      }
    : undefined;
  const mainStyle = isMobileViewport
    ? {
        ...(mobileShellStyle || {}),
        ...(mainBackgroundStyle || {}),
        ...(shouldShowMobileNav
          ? {
              height: 'calc(100dvh - var(--mobile-bottom-nav-offset))',
              maxHeight: 'calc(100dvh - var(--mobile-bottom-nav-offset))',
            }
          : {}),
      }
    : mainBackgroundStyle;

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-k-bg font-sans text-k-ink">
      {routeUiConfig.hasDesktopSidebar && !isMobileViewport && <DesktopSidebar />}
      <main
        className={`flex-1 flex flex-col h-screen h-[100dvh] ${mainOverflowClass} relative scroll-smooth`}
        style={mainStyle}
      >
        <ProfileSetupModalTrigger pathWithoutLang={pathWithoutLang} />
        <GlobalModalContainer />
        <GlobalCommandPalette />
        {shouldShowMobileHeader && (
          <MobileHeader routeUiConfig={routeUiConfig} pathWithoutLang={pathWithoutLang} />
        )}
        {routeUiConfig.hasDesktopSidebar && !isMobileViewport && (
          <DesktopHeader />
        )}

        <div
          data-mobile-page-mode={routeUiConfig.mobilePageMode}
          data-mobile-bottom-nav-safe={shouldShowMobileNav ? 'true' : undefined}
          className={`${routeShellClass} ${shouldUseDesktopPadding ? 'p-[28px]' : 'p-0'}`}
          style={mobileShellStyle}
        >
          {allowRouteMotion ? (
            <LayoutGroup id="app-route-layout">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={location.pathname}
                  className={`${routeContentClass} ${shouldUseDesktopMaxWidth ? 'max-w-[1400px] mx-auto' : ''}`}
                  style={mobileShellStyle}
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
              style={mobileShellStyle}
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
      {shouldShowMobileNav && <MobileBottomNav />}
    </div>
  );
}
