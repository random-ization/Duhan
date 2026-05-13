import React from 'react';
import { Navigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { useCurrentLanguage } from '../hooks/useLocalizedNavigate';
import { localizeInternalPath } from '../utils/localizedRouting';
import DesktopVideoLibraryPage from './DesktopVideoLibraryPage';

export default function VideoLibraryPage() {
  const isMobile = useIsMobile();
  const currentLanguage = useCurrentLanguage();

  if (isMobile) {
    return <Navigate to={localizeInternalPath('/media?tab=videos', currentLanguage)} replace />;
  }

  return <DesktopVideoLibraryPage />;
}
