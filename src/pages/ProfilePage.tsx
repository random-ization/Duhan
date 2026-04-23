import React from 'react';
import type { Language } from '../types';
import { MobileProfilePage } from '../components/mobile/MobileProfilePage';

interface ProfileProps {
  language: Language;
}

const ProfilePage: React.FC<ProfileProps> = () => {
  return <MobileProfilePage />;
};

export default ProfilePage;
