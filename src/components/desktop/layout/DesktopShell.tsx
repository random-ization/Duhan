import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { Suspense } from 'react';
import { getPathWithoutLang } from '../../../utils/pathname';
import { getRouteUiConfig } from '../../../config/routes.config';
import { GlobalModalContainer } from '../../modals/GlobalModalContainer';
import { ProfileSetupModalTrigger } from '../../modals/ProfileSetupModalTrigger';
import { GlobalCommandPalette } from '../../common/GlobalCommandPalette';
import { ContentSkeleton } from '../../common';
import { matchesMediaQuery } from '../../../utils/mediaQuery';
import DesktopSidebar from '../../layout/DesktopSidebar';
import DesktopTopbar from './DesktopTopbar';
import clsx from 'clsx';

export default function DesktopShell() {
  const location = useLocation();
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const routeUiConfig = getRouteUiConfig(pathWithoutLang);
  
  const mainBackgroundStyle = routeUiConfig.usePatternBackground
    ? {
        backgroundImage: 'radial-gradient(hsl(var(--border)) 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }
    : {
        backgroundColor: '#FBF8F3',
      };

  const shouldUseDesktopPadding = routeUiConfig.useDesktopContainerPadding;
  const shouldUseDesktopMaxWidth = routeUiConfig.useDesktopMaxWidth;
  
  const routeShellClass = routeUiConfig.lockMainScroll
    ? 'h-full min-h-0 flex w-full min-w-0 flex-col'
    : 'min-h-full flex w-full min-w-0 flex-col';
    
  const routeContentClass = routeUiConfig.lockMainScroll
    ? 'flex-1 min-h-0 w-full min-w-0 overflow-y-auto'
    : 'flex-1 w-full min-w-0';

  const allowRouteMotion = !matchesMediaQuery('(prefers-reduced-motion: reduce)');

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-k-bg font-k-sans">
      <DesktopSidebar />
      <div className="flex-1 flex flex-col h-screen h-[100dvh] overflow-hidden">
        <DesktopTopbar />
        <main
          className={clsx('flex-1 overflow-y-auto scroll-smooth')}
          style={mainBackgroundStyle}
        >
          <ProfileSetupModalTrigger pathWithoutLang={pathWithoutLang} />
          <GlobalModalContainer />
          <GlobalCommandPalette />
          
          <div
            className={clsx(
              routeShellClass,
              shouldUseDesktopPadding ? 'p-6 lg:p-8' : 'p-0'
            )}
          >
            {allowRouteMotion ? (
              <LayoutGroup id="desktop-route-layout">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={location.pathname}
                    className={clsx(
                      routeContentClass,
                      shouldUseDesktopMaxWidth ? 'max-w-[1400px] mx-auto' : ''
                    )}
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
                className={clsx(
                  routeContentClass,
                  shouldUseDesktopMaxWidth ? 'max-w-[1400px] mx-auto' : ''
                )}
              >
                <Suspense fallback={<ContentSkeleton />}>
                  <Outlet />
                </Suspense>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}