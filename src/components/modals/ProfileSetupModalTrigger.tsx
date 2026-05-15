import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { useGlobalModal } from '../../contexts/GlobalModalContext';
import { safeGetSessionStorageItem } from '../../utils/browserStorage';
import { matchesMediaQuery } from '../../utils/mediaQuery';
import { ONBOARDING } from '../../utils/convexRefs';

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

  // Query the onboarding state to decide whether to trigger the modal.
  // Falls back to name-missing check while the query is loading.
  const onboardingState = useQuery(ONBOARDING.getState, user ? {} : 'skip');

  useEffect(() => {
    if (!user) return;
    if (isProfileRoute) return;
    if (shownRef.current) return;
    if (isOpen('profile-setup')) return;

    // Don't show on small mobile viewports (bottom sheet / full page preferred)
    if (typeof window !== 'undefined' && matchesMediaQuery('(max-width: 767px)')) return;

    const dismissed =
      typeof window !== 'undefined' &&
      safeGetSessionStorageItem(PROFILE_PROMPT_DISMISS_KEY) === '1';
    if (dismissed) {
      shownRef.current = true;
      return;
    }

    // A user "has a profile" if they have a name that isn't just their email address,
    // OR if they have already completed the core onboarding (goals/diagnosis).
    const hasRealName = user.name && !user.name.includes('@');
    const hasCompletedOnboarding = onboardingState?.hasCompletedOnboarding;

    if (hasRealName || hasCompletedOnboarding) {
      shownRef.current = true;
      return;
    }

    // Wait for onboarding state as a secondary signal
    if (onboardingState === undefined) return;

    // If the backend says we shouldn't trigger onboarding, we should also be careful
    // about nagging for a profile name if they've already passed that stage.
    if (!onboardingState.shouldTrigger && hasCompletedOnboarding) {
      shownRef.current = true;
      return;
    }

    shownRef.current = true;
    showModal('profile-setup');
  }, [isOpen, isProfileRoute, showModal, user, onboardingState]);

  return null;
}
