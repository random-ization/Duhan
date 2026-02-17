import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import DesktopSidebar from './DesktopSidebar';
import Footer from './Footer';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileBottomNav } from '../mobile/MobileBottomNav';
import { MobilePwaInstallPrompt } from '../mobile/MobilePwaInstallPrompt';
import { useLayout } from '../../contexts/LayoutContext';
import { canRouteHideChrome, getRouteUiConfig } from '../../config/routes.config';
import { getPathWithoutLang } from '../../utils/pathname';
import { GlobalModalContainer } from '../modals/GlobalModalContainer';
import { ProfileSetupModalTrigger } from '../modals/ProfileSetupModalTrigger';
import { GlobalCommandPalette } from '../common/GlobalCommandPalette';

export default function AppLayout() {
  const location = useLocation();
  const { sidebarHidden, setSidebarHidden, footerHidden } = useLayout();
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const routeUiConfig = getRouteUiConfig(pathWithoutLang);

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

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-background overflow-hidden font-sans">
      {routeUiConfig.hasDesktopSidebar && <DesktopSidebar />}
      <main
        className="flex-1 h-screen h-[100dvh] overflow-y-auto relative scroll-smooth"
        style={{
          backgroundImage: 'radial-gradient(hsl(var(--border)) 1.5px, transparent 1.5px)',
          backgroundSize: '24px 24px',
        }}
      >
        <ProfileSetupModalTrigger pathWithoutLang={pathWithoutLang} />
        <GlobalModalContainer />
        <GlobalCommandPalette />
        {shouldShowMobileHeader && (
          <MobileHeader routeUiConfig={routeUiConfig} pathWithoutLang={pathWithoutLang} />
        )}

        <div
          className={`min-h-full flex flex-col ${routeUiConfig.hasDesktopSidebar ? 'p-4 sm:p-6 md:p-10' : 'p-0'}`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location.pathname}
              className={`flex-1 w-full ${routeUiConfig.hasDesktopSidebar ? 'max-w-[1400px] mx-auto' : ''}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
          {shouldShowFooter && <Footer />}
        </div>
        {shouldShowMobileNav && (
          <div className="h-[calc(env(safe-area-inset-bottom)+112px)] md:h-0" />
        )}
      </main>
      {shouldShowMobileNav && <MobilePwaInstallPrompt />}
      {shouldShowMobileNav && <MobileBottomNav />}
    </div>
  );
}
