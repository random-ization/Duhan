import { useGlobalModal } from '../../contexts/GlobalModalContext';
import { ProfileSetupModal } from './ProfileSetupModal';
import { AchievementModal } from '../gamification/AchievementModal';

export function GlobalModalContainer() {
  const { isOpen, hideModal } = useGlobalModal();

  return (
    <>
      <ProfileSetupModal
        isOpen={isOpen('profile-setup')}
        onClose={() => hideModal('profile-setup')}
      />
      <AchievementModal />
    </>
  );
}
