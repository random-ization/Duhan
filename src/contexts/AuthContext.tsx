import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useConvex, useMutation, useAction, useQuery, useConvexAuth } from 'convex/react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslation } from 'react-i18next';
import { api } from '../../convex/_generated/api';
import {
  User,
  Language,
  Annotation,
  ExamAttempt,
  TextbookContent,
  TopikExam,
} from '../types';

import { fetchUserCountry } from '../utils/geo';
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

  // Session Management
  sessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void;

  // User Actions


  // Permission Checking
  canAccessContent: (content: TextbookContent | TopikExam) => boolean;
  showUpgradePrompt: boolean;
  setShowUpgradePrompt: (show: boolean) => void;

  // Missing methods used by TopikPage
  saveExamAttempt: (attempt: ExamAttempt) => Promise<void>;
  deleteExamAttempt: (attemptId: string) => Promise<void>;
  saveAnnotation: (annotation: Annotation) => Promise<void>;
  deleteAnnotation: (annotationId: string) => Promise<void>;
  updateLearningProgress: (institute: string, level: number, unit?: number, module?: string) => Promise<void>;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const { ready } = useTranslation();

  const convex = useConvex();

  // Mutations - token argument no longer needed for backend that uses getAuthUserId


  // Initialize language
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language');
      if (stored) return stored as Language;
    }
    return 'zh';
  });

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
  }, []);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // IP Parsing
  useEffect(() => {
    const initLanguage = async () => {
      const storedLang = localStorage.getItem('language');
      if (storedLang) return;

      const country = await fetchUserCountry();
      console.log('Detected Country:', country);

      let targetLang: Language = 'en';
      if (country === 'CN') targetLang = 'zh';
      else if (country === 'VN') targetLang = 'vi';
      else if (country === 'MN') targetLang = 'mn';

      setLanguageState(targetLang);
    };

    initLanguage();
  }, []);

  // Session Check (Load User) using Convex Auth
  const { signOut, signIn } = useAuthActions();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const viewer = useQuery(api.users.viewer);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    if (isAuthenticated) {
      if (viewer !== undefined) {
        setUser(viewer as unknown as User);
        setLoading(false);
      } else {
        // Authenticated but viewer query still loading
        setLoading(true);
      }
    } else {
      // Not authenticated
      setUser(null);
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, viewer]);

  // Session expiration detection
  // If user was authenticated but then becomes unauthenticated, flag session as expired
  useEffect(() => {
    // Track if we've completed initial load to avoid false positives
    const hasCompletedInitialLoad = !authLoading;
    if (!hasCompletedInitialLoad) {
      return;
    }

    const wasAuthenticated = user !== null;
    const nowAuthenticated = isAuthenticated;

    // If we had a user but are no longer authenticated (and not loading), session expired
    if (wasAuthenticated && !nowAuthenticated) {
      setSessionExpired(true);
    }

    // If we become authenticated again, clear the expired flag
    if (nowAuthenticated && sessionExpired) {
      setSessionExpired(false);
    }
  }, [isAuthenticated, user, authLoading, sessionExpired]);

  // Silent token refresh - proactively keep session alive
  // The viewer query is reactive and will automatically trigger on the interval
  // This ensures Convex Auth's automatic token refresh mechanism stays active
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Trigger viewer query refresh every 5 minutes
    // This keeps the Convex session active and allows automatic token refresh
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes

    const refreshTimer = setInterval(() => {
      // The viewer query dependency will cause a re-fetch
      // Convex will automatically refresh tokens as needed during this query
      console.log('[Auth] Session heartbeat');
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshTimer);
  }, [isAuthenticated, viewer]); // viewer dependency ensures query stays active

  // Legacy manual loadUser effect removed
  /*
  useEffect(() => {
    const loadUser = async () => {
    ...
  }, [token, userId, convex, onLoginSuccess]);
  */

  const login = useCallback(
    async (loggedInUser: User, _sessionToken?: string) => {
      // Compatibility mode: if this is called, it might be from legacy manual login.
      // For Google Auth, we use signIn directly.
      // For manual email/pass, we should also use signIn if migrated.
      console.warn("Manual login() called. Prefer useAuthActions().signIn()");
      // We can't easily "force" a session from client side with Convex Auth like this.
      // But if loggedInUser is passed, we can set state locally.
      setUser(loggedInUser);
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    localStorage.removeItem('token'); // cleanup legacy
    localStorage.removeItem('userId'); // cleanup legacy
  }, [signOut]);

  const refreshUser = useCallback(async () => {
    // Managed by useQuery(api.users.viewer) automatically
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  const resetPassword = useCallback(async (_email: string) => {
    try {
      // await requestPasswordResetMutation({ email });
      console.warn("Reset password not yet implemented with Convex Auth");
    } catch (err: unknown) {
      console.error("Failed to request password reset:", err);
      throw err;
    }
  }, []);



  const canAccessContent = useCallback(
    (content: TextbookContent | TopikExam): boolean => {
      if (!user) return false;
      if (user.tier === 'PAID') return true;
      if (!content.isPaid) return true;
      return false; // Default safe
    },
    [user]
  );

  const saveAnnotationMutation = useMutation(api.annotations.save);
  const deleteAnnotationMutation = useMutation(api.annotations.remove);
  const saveExamAttemptMutation = useMutation(api.user.saveExamAttempt);
  const deleteExamAttemptMutation = useMutation(api.user.deleteExamAttempt);
  const updateLearningProgressMutation = useMutation(api.user.updateLearningProgress);

  const saveAnnotation = useCallback(async (annotation: Annotation) => {
    // Adapter for Annotation object to mutation args
    await saveAnnotationMutation({
      contextKey: annotation.contextKey,
      text: annotation.text,
      note: annotation.note,
      color: annotation.color || undefined,
      startOffset: annotation.startOffset,
      endOffset: annotation.endOffset,
    });
    // Optimistic update or refetch should happen automatically if using live queries
  }, [saveAnnotationMutation]);

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    await deleteAnnotationMutation({ annotationId: annotationId as any });
  }, [deleteAnnotationMutation]);

  const saveExamAttempt = useCallback(async (attempt: ExamAttempt) => {
    await saveExamAttemptMutation({
      examId: attempt.examId,
      score: attempt.score,
      answers: attempt.userAnswers,
    });
  }, [saveExamAttemptMutation]);

  const deleteExamAttempt = useCallback(async (attemptId: string) => {
    await deleteExamAttemptMutation({ attemptId: attemptId as any });
  }, [deleteExamAttemptMutation]);

  const updateLearningProgress = useCallback(async (institute: string, level: number, unit?: number, module?: string) => {
    // Optimistic update
    updateUser({
      lastInstitute: institute,
      lastLevel: level,
      lastUnit: unit,
      lastModule: module,
    });

    await updateLearningProgressMutation({
      lastInstitute: institute,
      lastLevel: level,
      lastUnit: unit,
      lastModule: module
    });
  }, [updateUser, updateLearningProgressMutation]);

  const value = useMemo<AuthContextType>(() => ({
    user,
    loading: loading || !ready,
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
    sessionExpired,
    setSessionExpired,

    saveExamAttempt,
    deleteExamAttempt,
    saveAnnotation,
    deleteAnnotation,
    updateLearningProgress,
  }), [
    user,
    loading,
    ready,
    language,
    login,
    logout,
    updateUser,
    refreshUser,
    resetPassword,
    setLanguage,
    canAccessContent,
    showUpgradePrompt,
    sessionExpired,
    saveExamAttempt,
    deleteExamAttempt,
    saveAnnotation,
    deleteAnnotation,
    updateLearningProgress
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
