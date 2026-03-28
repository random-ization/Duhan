import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
  useEffect,
  useRef,
} from 'react';
import { useQuery, useConvexAuth, useMutation } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { User, Language, TextbookContent, TopikExam } from '../types';
import { ENTITLEMENTS, NoArgs, mRef, qRef } from '../utils/convexRefs';
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

interface AuthContextType {
  // User State
  user: User | null;
  loading: boolean;
  language: Language;

  // Auth Actions
  login: (user: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
  setLanguage: (lang: Language) => void;

  // User Actions

  // Permission Checking
  canAccessContent: (content: TextbookContent | TopikExam) => boolean;
  viewerAccess: ViewerAccessSnapshot | null;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Mutations - token argument no longer needed for backend that uses getAuthUserId

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const updateProfileMutation = useMutation(
    mRef<{ name?: string; avatar?: string }, void>('auth:updateProfile')
  );

  const setLanguage = useCallback((lang: Language) => {
    safeSetLocalStorageItem('preferredLanguage', lang);
    safeSetLocalStorageItem('preferredLanguageSource', 'user');
    document.documentElement.lang = lang;
    i18n.changeLanguage(lang);
  }, []);

  const language: Language = normalizeLanguage(i18n.language);

  // Session Check (Load User) using Convex Auth
  const { signOut } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(qRef<NoArgs, User | null>('users:viewer'), isAuthenticated ? {} : 'skip');
  const viewerAccessQuery = useQuery(ENTITLEMENTS.viewerAccess, {});
  const attemptedSessionRepairRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      attemptedSessionRepairRef.current = false;
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
    authLoading || viewerAccessQuery === undefined || (isAuthenticated && viewer === undefined);

  const user = useMemo<User | null>(() => {
    if (!isAuthenticated) return null;
    if (viewer === undefined) return null;
    if (!viewer) return null;
    const baseWithId = viewer as User & { _id?: string; id?: string };
    const resolvedId = baseWithId.id ?? baseWithId._id;
    return resolvedId ? { ...baseWithId, id: resolvedId } : baseWithId;
  }, [isAuthenticated, viewer]);

  const viewerAccess = useMemo<ViewerAccessSnapshot | null>(
    () => (viewerAccessQuery === undefined ? null : viewerAccessQuery),
    [viewerAccessQuery]
  );

  // Legacy manual loadUser effect removed
  /*
  useEffect(() => {
    const loadUser = async () => {
    ...
  }, [token, userId, convex, onLoginSuccess]);
  */

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
