/**
 * Convex-backed auth provider.
 *
 * This is the original `AuthProvider` that calls `useConvexAuth()`,
 * `useQuery`, `useMutation`, `useAction`, and `useAuthActions()` to
 * drive a live, server-synced auth session. It is ONLY imported from
 * the lazy `AuthedAppProviders` subtree, so none of the Convex React
 * SDK ships in any pre-auth chunk.
 *
 * Public routes use `PublicAuthProvider` from `./authContextCore`
 * instead, which supplies a stub "signed-out visitor" value and has
 * zero Convex imports.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useAction, useConvexAuth, useMutation, useQuery } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';

import { User } from '../types';
import { ENTITLEMENTS, NoArgs, aRef, mRef, qRef } from '../utils/convexRefs';
import { logger } from '../utils/logger';
import { normalizeLanguage } from '../utils/languageUtils';
import { clearDashboardUpgradeBannerSession } from '../utils/upgradeReminder';
import { safeRemoveLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';
import {
  canAccessLegacyContent,
  canAccessTopikExam,
  type ViewerAccessSnapshot,
} from '../utils/entitlements';
import i18n from '../utils/i18next-config';

import { AuthContext, type AuthContextType } from './authContextCore';
import type { Language, TextbookContent, TopikExam } from '../types';

interface ConvexBoundAuthProviderProps {
  children: ReactNode;
}

export const ConvexBoundAuthProvider: React.FC<ConvexBoundAuthProviderProps> = ({ children }) => {
  // Mutations - token argument no longer needed for backend that uses getAuthUserId

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const updateProfileMutation = useMutation(
    mRef<{ name?: string; avatar?: string }, void>('auth:updateProfile')
  );
  const updateUserSettings = useMutation(
    mRef<{ displayLanguage?: Language }, unknown>('userSettings:updateSettings')
  );
  const reconcileCustomerAccess = useAction(
    aRef<
      { userEmail: string; userId?: string },
      { reconciled: boolean; source: 'subscription' | 'order' | null; plan: string | null }
    >('lemonsqueezy:reconcileCustomerAccess')
  );

  const setLanguage = useCallback((lang: Language) => {
    safeSetLocalStorageItem('preferredLanguage', lang);
    safeSetLocalStorageItem('preferredLanguageSource', 'user');
    document.documentElement.lang = lang;
    void updateUserSettings({ displayLanguage: lang }).catch(() => {
      // Keep local language changes responsive if the user settings sync fails.
    });
    i18n.changeLanguage(lang);
  }, [updateUserSettings]);

  const language: Language = normalizeLanguage(i18n.language);

  // Session Check (Load User) using Convex Auth
  const { signOut } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(qRef<NoArgs, User | null>('users:viewer'), isAuthenticated ? {} : 'skip');
  const viewerAccessQuery = useQuery(ENTITLEMENTS.viewerAccess, isAuthenticated ? {} : 'skip');
  const attemptedSessionRepairRef = useRef(false);
  const attemptedBillingRepairRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      attemptedSessionRepairRef.current = false;
      attemptedBillingRepairRef.current.clear();
      return;
    }

    // Session exists but viewer doc is missing; repair once by signing out stale session.
    if (viewer === null && !attemptedSessionRepairRef.current) {
      attemptedSessionRepairRef.current = true;
      void signOut().catch(error => {
        logger.warn('Session repair signOut failed', error);
      });
    }
  }, [authLoading, isAuthenticated, viewer, signOut]);

  const loading =
    authLoading || (isAuthenticated && (viewerAccessQuery === undefined || viewer === undefined));

  const user = useMemo<User | null>(() => {
    if (!isAuthenticated) return null;
    if (viewer === undefined) return null;
    if (!viewer) return null;
    const baseWithId = viewer as User & { _id?: string; id?: string };
    const resolvedId = baseWithId.id ?? baseWithId._id;
    return resolvedId ? { ...baseWithId, id: resolvedId } : baseWithId;
  }, [isAuthenticated, viewer]);

  const viewerAccess = useMemo<ViewerAccessSnapshot | null>(() => {
    if (!isAuthenticated || viewerAccessQuery === undefined) {
      return null;
    }
    return viewerAccessQuery;
  }, [isAuthenticated, viewerAccessQuery]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email || !user.id) {
      return;
    }
    if (viewerAccessQuery === undefined || viewerAccessQuery?.isPremium) {
      return;
    }

    const attemptKey = `${user.id}:${user.email}`;
    if (attemptedBillingRepairRef.current.has(attemptKey)) {
      return;
    }
    attemptedBillingRepairRef.current.add(attemptKey);

    void reconcileCustomerAccess({
      userEmail: user.email,
      userId: user.id,
    }).catch(error => {
      logger.warn('Subscription reconciliation failed after sign-in', error);
      attemptedBillingRepairRef.current.delete(attemptKey);
    });
  }, [isAuthenticated, reconcileCustomerAccess, user?.email, user?.id, viewerAccessQuery]);

  const login = useCallback(async (_loggedInUser: User, _sessionToken?: string) => {
    logger.error(
      'Deprecated AuthContext.login() was called. Use useAuthActions().signIn() instead.'
    );
    throw new Error('DEPRECATED_LOGIN_FLOW');
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    clearDashboardUpgradeBannerSession();
    safeRemoveLocalStorageItem('token'); // cleanup legacy
    safeRemoveLocalStorageItem('userId'); // cleanup legacy
  }, [signOut]);

  const refreshUser = useCallback(async () => {
    // Managed by useQuery(api.users.viewer) automatically
  }, []);

  const updateUser = useCallback(
    async (updates: Partial<User>) => {
      const profileUpdates: { name?: string; avatar?: string } = {};
      if (typeof updates.name === 'string') profileUpdates.name = updates.name;
      if (typeof updates.avatar === 'string') profileUpdates.avatar = updates.avatar;

      if (Object.keys(profileUpdates).length === 0) return;
      await updateProfileMutation(profileUpdates);
    },
    [updateProfileMutation]
  );

  const canAccessContent = useCallback(
    (content: TextbookContent | TopikExam): boolean => {
      if ('accessLevel' in content) {
        return canAccessTopikExam(content, viewerAccess);
      }
      return canAccessLegacyContent(content, viewerAccess);
    },
    [viewerAccess]
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      language,
      login,
      logout,
      updateUser,
      refreshUser,
      setLanguage,
      canAccessContent,
      viewerAccess,
      showUpgradePrompt,
      setShowUpgradePrompt,
    }),
    [
      user,
      loading,
      language,
      login,
      logout,
      updateUser,
      refreshUser,
      setLanguage,
      canAccessContent,
      viewerAccess,
      showUpgradePrompt,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default ConvexBoundAuthProvider;
