import React from 'react';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import DesktopVideoLibraryPage from './DesktopVideoLibraryPage';

export default function VideoLibraryPage() {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <Navigate to="/media?tab=videos" replace />;
  }

  return <DesktopVideoLibraryPage />;
}
