import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { getPathWithoutLang } from '../../utils/pathname';
import { getRouteUiConfig } from '../../config/routes.config';
import { matchesMediaQuery } from '../../utils/mediaQuery';
import { GlobalModalContainer } from '../modals/GlobalModalContainer';
import { ProfileSetupModalTrigger } from '../modals/ProfileSetupModalTrigger';
import { GlobalCommandPalette } from '../common/GlobalCommandPalette';
import { ContentSkeleton } from '../common';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileBottomNav } from '../mobile/MobileBottomNav';


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

function MobileLayout() {
  const location = useLocation();
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const routeUiConfig = getRouteUiConfig(pathWithoutLang);
  
  const mainBackgroundStyle = {
    backgroundColor: '#FBF8F3',
  };
  
  const mobileShellStyle = {
    background: '#FBF8F3',
    width: '100%',
    maxWidth: '100vw',
    overflowX: 'hidden' as const,
  };
  
  const routeShellClass = routeUiConfig.lockMainScroll
    ? 'h-full min-h-0 flex w-full min-w-0 flex-col'
    : 'min-h-full flex w-full min-w-0 flex-col';
  
  const routeContentClass = routeUiConfig.lockMainScroll
    ? 'flex-1 min-h-0 w-full min-w-0'
    : 'flex-1 w-full min-w-0';
  
  const shouldUseDesktopPadding = routeUiConfig.useDesktopContainerPadding;
  const shouldUseDesktopMaxWidth = routeUiConfig.useDesktopMaxWidth;
  const allowRouteMotion = shouldAnimateRoutes();
  
  const shouldShowMobileHeader = routeUiConfig.hasHeader;
  const shouldShowMobileNav = routeUiConfig.hasBottomNav;
  
  const mainStyle = {
    ...mobileShellStyle,
    ...mainBackgroundStyle,
    ...(shouldShowMobileNav
      ? {
          height: 'calc(100dvh - var(--mobile-bottom-nav-offset))',
          maxHeight: 'calc(100dvh - var(--mobile-bottom-nav-offset))',
        }
      : {}),
  };

  return (
    <main
      className="flex-1 h-screen h-[100dvh] overflow-y-auto relative scroll-smooth"
      style={mainStyle}
    >
      <ProfileSetupModalTrigger pathWithoutLang={pathWithoutLang} />
      <GlobalModalContainer />
      <GlobalCommandPalette />
      {shouldShowMobileHeader && (
        <MobileHeader routeUiConfig={routeUiConfig} pathWithoutLang={pathWithoutLang} />
      )}

      <div
        data-mobile-page-mode={routeUiConfig.mobilePageMode}
        data-mobile-bottom-nav-safe={shouldShowMobileNav ? 'true' : undefined}
        className={`${routeShellClass} ${shouldUseDesktopPadding ? 'p-4 sm:p-6 md:p-10' : 'p-0'}`}
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
      </div>
      {shouldShowMobileNav && (
        <div className="h-[var(--mobile-bottom-nav-offset)] md:h-0 flex-shrink-0" />
      )}
      {shouldShowMobileNav && <MobileBottomNav />}
    </main>
  );
}

export default function ResponsiveLayout() {
  // DesktopShell has been removed; AppLayout is now the primary layout.
  // This component is kept for backwards compatibility but should not be used.
  return <MobileLayout />;
}