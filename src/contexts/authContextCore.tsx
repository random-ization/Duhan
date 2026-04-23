/**
 * Auth context core — zero Convex imports.
 *
 * Before this split, `AuthContext.tsx` imported `convex/react` and
 * `@convex-dev/auth/react` at the top level. Because ~70 components
 * across the app do `import { useAuth } from '../contexts/AuthContext'`,
 * every single one of them transitively pulled the entire Convex React
 * SDK (~25 kB gz) into the entry chunk — even on landing / login /
 * pricing pages that have no signed-in user.
 *
 * This module holds everything that public (pre-auth) code paths need:
 *
 *   1. The `AuthContextType` shape (re-exported by AuthContext.tsx).
 *   2. The React context object.
 *   3. The `useAuth()` hook.
 *   4. `PublicAuthProvider` — a Convex-free stub provider that supplies
 *      a "signed-out visitor" context value for public routes.
 *
 * The Convex-backed provider lives in `./ConvexBoundAuthProvider.tsx`
 * and is only imported from the lazy `AuthedAppProviders` subtree. That
 * way the Convex SDK stays out of every pre-auth chunk.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';

import { User, Language, TextbookContent, TopikExam } from '../types';
import { logger } from '../utils/logger';
import { normalizeLanguage } from '../utils/languageUtils';
import { safeSetLocalStorageItem } from '../utils/browserStorage';
import i18n from '../utils/i18next-config';
import type { ViewerAccessSnapshot } from '../utils/entitlements';

export interface AuthContextType {
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

  // Permission Checking
  canAccessContent: (content: TextbookContent | TopikExam) => boolean;
  viewerAccess: ViewerAccessSnapshot | null;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

/**
 * Stub auth provider for public (pre-auth) routes.
 *
 * Supplies a "always signed out" context value so that shared components
 * (language switcher, upgrade prompt, etc.) work on the landing page
 * without requiring any Convex subscription. Write-style methods are
 * no-op + warn so a wrongly-placed call is noisy in dev but never
 * crashes the page for a visitor.
 *
 * `setLanguage` IS wired up since visitors legitimately need to switch
 * languages on public pages; it only touches localStorage + i18n.
 */
export const PublicAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { i18n: i18nInstance } = useTranslation();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    safeSetLocalStorageItem('preferredLanguage', lang);
    safeSetLocalStorageItem('preferredLanguageSource', 'user');
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    void i18n.changeLanguage(lang);
  }, []);

  const warnUnauthed = useCallback((method: string) => {
    logger.warn(
      `AuthContext.${method}() called from a public route. ` +
        'Route the user through /login before invoking signed-in operations.'
    );
  }, []);

  const login = useCallback(async () => {
    warnUnauthed('login');
  }, [warnUnauthed]);
  const logout = useCallback(async () => {
    warnUnauthed('logout');
  }, [warnUnauthed]);
  const updateUser = useCallback(async () => {
    warnUnauthed('updateUser');
  }, [warnUnauthed]);
  const refreshUser = useCallback(async () => {
    warnUnauthed('refreshUser');
  }, [warnUnauthed]);

  const value = useMemo<AuthContextType>(
    () => ({
      user: null,
      loading: false,
      language: normalizeLanguage(i18nInstance.language),
      login,
      logout,
      updateUser,
      refreshUser,
      setLanguage,
      canAccessContent: () => false,
      viewerAccess: null,
      showUpgradePrompt,
      setShowUpgradePrompt,
    }),
    [
      i18nInstance.language,
      login,
      logout,
      updateUser,
      refreshUser,
      setLanguage,
      showUpgradePrompt,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
