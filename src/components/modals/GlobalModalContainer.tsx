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
        <Suspense fallback={<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"><div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" /></div>}>
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
