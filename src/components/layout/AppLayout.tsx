import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { isValidLanguage } from '../LanguageRouter';
import { MobileHeader } from '../mobile/MobileHeader';
import { MobileBottomNav } from '../mobile/MobileBottomNav';

export default function AppLayout() {
  const location = useLocation();

  // Hide footer on these pages and their sub-pages
  const hideFooterPaths = [
    '/courses',
    '/podcasts',
    '/videos',
    '/topik',
    '/dashboard/',
    '/notebook',
    '/vocabbook',
  ];
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathWithoutLang =
    pathSegments[0] && isValidLanguage(pathSegments[0])
      ? `/${pathSegments.slice(1).join('/')}`
      : location.pathname;
  const shouldHideFooter = hideFooterPaths.some(path => pathWithoutLang.startsWith(path));
  const hideMobileHeaderPaths = ['/video/', '/podcasts/player'];
  const hideMobileNavPaths = ['/video/', '/podcasts/player'];
  const shouldHideMobileHeader = hideMobileHeaderPaths.some(path =>
    pathWithoutLang.startsWith(path)
  );
  const shouldHideMobileNav = hideMobileNavPaths.some(path => pathWithoutLang.startsWith(path));

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-background overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 h-screen h-[100dvh] overflow-y-auto relative scroll-smooth">
        {!shouldHideMobileHeader && <MobileHeader />}

        <div className="min-h-full flex flex-col p-4 sm:p-6 md:p-10">
          <div className="flex-1 w-full max-w-[1400px] mx-auto">
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
