import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { useConvex, useQuery, useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useTranslation } from 'react-i18next';
import { User, Language, TextbookContent, TopikExam } from '../types';
import { NoArgs, qRef } from '../utils/convexRefs';
import { logger } from '../utils/logger';

import i18n from '../utils/i18next-config';

interface AuthContextType {
  // User State
  user: User | null;
  loading: boolean;
  language: Language;

  // Auth Actions
  login: (user: User, token?: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  resetPassword: (email: string) => Promise<void>; // Added

  // User Actions

  // Permission Checking
  canAccessContent: (content: TextbookContent | TopikExam) => boolean;
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
  onLoginSuccess?: () => void;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { ready } = useTranslation();
  const [userOverride, setUserOverride] = useState<Partial<User> | null>(null);

  // useConvex hook kept for potential future use
  useConvex();

  // Mutations - token argument no longer needed for backend that uses getAuthUserId

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    localStorage.setItem('preferredLanguage', lang);
    document.documentElement.lang = lang;
    i18n.changeLanguage(lang);
  }, []);

  const language: Language =
    i18n.language === 'zh' ||
    i18n.language === 'en' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn'
      ? i18n.language
      : 'en';

  // Session Check (Load User) using Convex Auth
  const { signOut } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(qRef<NoArgs, User | null>('users:viewer'));
  const loading = !ready || authLoading || (isAuthenticated && viewer === undefined);

  const user = useMemo<User | null>(() => {
    if (!isAuthenticated) return null;
    if (viewer === undefined) return null;
    if (!viewer) return null;
    return { ...viewer, ...(userOverride ?? {}) };
  }, [isAuthenticated, viewer, userOverride]);

  // Legacy manual loadUser effect removed
  /*
  useEffect(() => {
    const loadUser = async () => {
    ...
  }, [token, userId, convex, onLoginSuccess]);
  */

  const login = useCallback(async (loggedInUser: User, _sessionToken?: string) => {
    // Compatibility mode: if this is called, it might be from legacy manual login.
    // For Google Auth, we use signIn directly.
    // For manual email/pass, we should also use signIn if migrated.
    logger.warn('Manual login() called. Prefer useAuthActions().signIn()');

    // Validate user object
    if (!loggedInUser || typeof loggedInUser !== 'object') {
      throw new Error('Invalid user object provided');
    }

    // Required fields validation
    const requiredFields = ['email', 'name'];
    for (const field of requiredFields) {
      if (!loggedInUser[field as keyof User]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // We can't easily "force" a session from client side with Convex Auth like this.
    // But if loggedInUser is passed, we can set state locally.
    setUserOverride(loggedInUser);
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUserOverride(null);
    localStorage.removeItem('token'); // cleanup legacy
    localStorage.removeItem('userId'); // cleanup legacy
  }, [signOut]);

  const refreshUser = useCallback(async () => {
    // Managed by useQuery(api.users.viewer) automatically
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUserOverride(prev => ({ ...(prev ?? {}), ...updates }));
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    try {
      // await requestPasswordResetMutation({ email });
      logger.warn('Reset password not yet implemented with Convex Auth');
    } catch (err: unknown) {
      logger.error('Failed to request password reset:', err);
      throw err;
    }
  }, []);

  const canAccessContent = useCallback(
    (content: TextbookContent | TopikExam): boolean => {
      if (!user) return false;
      if (user.tier === 'PAID' || user.tier === 'PREMIUM' || !!user.subscriptionType) return true;
      if (!content.isPaid) return true;
      return false; // Default safe
    },
    [user]
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
      resetPassword,
      setLanguage,

      canAccessContent,
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
      resetPassword,
      setLanguage,
      canAccessContent,
      showUpgradePrompt,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
