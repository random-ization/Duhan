import React from 'react';
import { useGlobalModal } from '../../contexts/GlobalModalContext';
import { ProfileSetupModal } from './ProfileSetupModal';

export function GlobalModalContainer() {
  const { isOpen, hideModal } = useGlobalModal();

  return (
    <>
      <ProfileSetupModal isOpen={isOpen('profile-setup')} onClose={() => hideModal('profile-setup')} />
    </>
  );
}
