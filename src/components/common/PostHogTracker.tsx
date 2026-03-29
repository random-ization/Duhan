import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  capturePostHogPageview,
  identifyPostHogUser,
  initPostHog,
  isPostHogEnabled,
  resetPostHogUser,
} from '../../utils/posthog';

export function PostHogTracker() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const identifiedUserIdRef = useRef<string | null>(null);
  const lastPageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isPostHogEnabled()) return;
    initPostHog();
  }, []);

  useEffect(() => {
    if (!isPostHogEnabled() || loading) return;

    const currentUser = user;
    const nextUserId = currentUser?.id || null;
    if (nextUserId) {
      if (identifiedUserIdRef.current === nextUserId) return;
      identifyPostHogUser(nextUserId, {
        email: currentUser?.email || null,
        name: currentUser?.name || null,
        role: currentUser?.role || 'STUDENT',
        tier: currentUser?.tier || 'FREE',
        subscriptionType: currentUser?.subscriptionType || null,
        accountStatus: currentUser?.accountStatus || 'ACTIVE',
        kycStatus: currentUser?.kycStatus || 'NONE',
      });
      identifiedUserIdRef.current = nextUserId;
      return;
    }

    if (identifiedUserIdRef.current !== null) {
      resetPostHogUser();
      identifiedUserIdRef.current = null;
    }
  }, [loading, user]);

  useEffect(() => {
    if (!isPostHogEnabled()) return;

    const pageKey = `${location.pathname}${location.search}${location.hash}`;
    if (lastPageKeyRef.current === pageKey) return;

    const url = `${globalThis.location.origin}${pageKey}`;
    capturePostHogPageview({
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      url,
    });
    lastPageKeyRef.current = pageKey;
  }, [location.hash, location.pathname, location.search]);

  return null;
}
