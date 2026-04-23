import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalModal } from '../../contexts/GlobalModalContext';
import { safeGetSessionStorageItem } from '../../utils/browserStorage';
import { matchesMediaQuery } from '../../utils/mediaQuery';

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
    if (typeof window !== 'undefined' && matchesMediaQuery('(max-width: 767px)')) return;

    const dismissed =
      typeof window !== 'undefined' &&
      safeGetSessionStorageItem(PROFILE_PROMPT_DISMISS_KEY) === '1';
    if (dismissed) {
      shownRef.current = true;
      return;
    }

    const nameMissing = !user.name?.trim();
    if (!nameMissing) return;

    shownRef.current = true;
    showModal('profile-setup');
  }, [isOpen, isProfileRoute, showModal, user]);

  return null;
}
