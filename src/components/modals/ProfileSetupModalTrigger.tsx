import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalModal } from '../../contexts/GlobalModalContext';

const PROFILE_PROMPT_DISMISS_KEY = 'profile_setup_prompt_dismissed';

interface ProfileSetupModalTriggerProps {
  pathWithoutLang: string;
}

export function ProfileSetupModalTrigger({
  pathWithoutLang,
}: Readonly<ProfileSetupModalTriggerProps>) {
  const { user } = useAuth();
  const { isOpen, showModal } = useGlobalModal();
  const shownRef = useRef(false);
  const isProfileRoute = pathWithoutLang === '/profile' || pathWithoutLang.startsWith('/profile/');

  useEffect(() => {
    if (!user) return;
    if (isProfileRoute) return;
    if (shownRef.current) return;
    if (isOpen('profile-setup')) return;

    const dismissed =
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem(PROFILE_PROMPT_DISMISS_KEY) === '1';
    if (dismissed) {
      shownRef.current = true;
      return;
    }

    const nameMissing = !user.name?.trim();
    const avatarMissing = !user.avatar;
    if (!nameMissing && !avatarMissing) return;

    shownRef.current = true;
    showModal('profile-setup');
  }, [isOpen, isProfileRoute, showModal, user]);

  return null;
}
