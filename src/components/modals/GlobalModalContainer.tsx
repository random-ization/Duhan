import { Suspense, lazy } from 'react';
import { useGlobalModal } from '../../contexts/GlobalModalContext';
import { AchievementModal } from '../gamification/AchievementModal';

const LazyProfileSetupModal = lazy(() =>
  import('./ProfileSetupModal').then(m => ({ default: m.ProfileSetupModal }))
);

export function GlobalModalContainer() {
  const { isOpen, hideModal } = useGlobalModal();
  const profileSetupOpen = isOpen('profile-setup');

  return (
    <>
      {profileSetupOpen ? (
        <Suspense fallback={null}>
          <LazyProfileSetupModal
            isOpen={profileSetupOpen}
            onClose={() => hideModal('profile-setup')}
          />
        </Suspense>
      ) : null}
      <AchievementModal />
    </>
  );
}
