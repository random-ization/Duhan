import React from 'react';
import type { Language } from '../types';
import { MobileProfilePage } from '../components/mobile/MobileProfilePage';
import { useIsMobile } from '../hooks/useIsMobile';

import { DesktopProfilePage } from './desktop/DesktopProfilePage';

interface ProfileProps {
  language: Language;
}

const ProfilePage: React.FC<ProfileProps> = () => {
  const isMobile = useIsMobile();
  
  if (!isMobile) {
    return <DesktopProfilePage />;
  }
  
  return <MobileProfilePage />;
};

export default ProfilePage;
