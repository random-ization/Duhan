import React from 'react';
import { useIsMobile } from '../hooks/useIsMobile';
import DesktopAuthPage from './DesktopAuthPage';
import { MobileAuthPage } from '../components/mobile/MobileAuthPage';

export default function AuthPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <MobileAuthPage />;
  }

  return <DesktopAuthPage />;
}
