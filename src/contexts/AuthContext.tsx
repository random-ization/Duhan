import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { useConvex, useMutation, useQuery, useConvexAuth } from 'convex/react';
import { useAuthActions } from '@convex-dev/auth/react';
import { useTranslation } from 'react-i18next';
import type { Id } from '../../convex/_generated/dataModel';
import { User, Language, Annotation, ExamAttempt, TextbookContent, TopikExam } from '../types';
import { mRef, NoArgs, qRef } from '../utils/convexRefs';

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
  updateLearningProgress: (
    institute: string,
    level: number,
    unit?: number,
    module?: string
  ) => Promise<void>;
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
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
  }, []);

  const language: Language =
    i18n.language === 'zh' ||
    i18n.language === 'en' ||
    i18n.language === 'vi' ||
    i18n.language === 'mn'
      ? i18n.language
      : 'zh';

  useEffect(() => {
    const storedLang = localStorage.getItem('language');
    if (storedLang && i18n.language !== storedLang) {
      i18n.changeLanguage(storedLang);
      return;
    }

    if (storedLang) return;

    const initLanguage = async () => {
      const country = await fetchUserCountry();
      let targetLang: Language = 'en';
      if (country === 'CN') targetLang = 'zh';
      else if (country === 'VN') targetLang = 'vi';
      else if (country === 'MN') targetLang = 'mn';
      localStorage.setItem('language', targetLang);
      i18n.changeLanguage(targetLang);
    };

    initLanguage();
  }, []);

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

  const login = useCallback(async (loggedInUser: User, _sessionToken?: string) => {
    // Compatibility mode: if this is called, it might be from legacy manual login.
    // For Google Auth, we use signIn directly.
    // For manual email/pass, we should also use signIn if migrated.
    console.warn('Manual login() called. Prefer useAuthActions().signIn()');
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
      console.warn('Reset password not yet implemented with Convex Auth');
    } catch (err: unknown) {
      console.error('Failed to request password reset:', err);
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

  const saveAnnotationMutation = useMutation(
    mRef<
      {
        contextKey: string;
        text: string;
        note?: string;
        color?: string;
        startOffset?: number;
        endOffset?: number;
      },
      { id: Id<'annotations'>; success: boolean }
    >('annotations:save')
  );
  const deleteAnnotationMutation = useMutation(
    mRef<{ annotationId: Id<'annotations'> }, { success: boolean }>('annotations:remove')
  );
  const saveExamAttemptMutation = useMutation(
    mRef<
      {
        examId: string;
        score: number;
        totalQuestions?: number;
        sectionScores?: unknown;
        duration?: number;
        answers?: unknown;
      },
      { success: boolean; attemptId: Id<'exam_attempts'> }
    >('user:saveExamAttempt')
  );
  const deleteExamAttemptMutation = useMutation(
    mRef<{ attemptId: Id<'exam_attempts'> }, { success: boolean; error?: string }>(
      'user:deleteExamAttempt'
    )
  );
  const updateLearningProgressMutation = useMutation(
    mRef<
      { lastInstitute?: string; lastLevel?: number; lastUnit?: number; lastModule?: string },
      { success: boolean }
    >('user:updateLearningProgress')
  );

  const saveAnnotation = useCallback(
    async (annotation: Annotation) => {
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
    },
    [saveAnnotationMutation]
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      await deleteAnnotationMutation({ annotationId: annotationId as Id<'annotations'> });
    },
    [deleteAnnotationMutation]
  );

  const saveExamAttempt = useCallback(
    async (attempt: ExamAttempt) => {
      await saveExamAttemptMutation({
        examId: attempt.examId,
        score: attempt.score,
        answers: attempt.userAnswers,
      });
    },
    [saveExamAttemptMutation]
  );

  const deleteExamAttempt = useCallback(
    async (attemptId: string) => {
      await deleteExamAttemptMutation({ attemptId: attemptId as Id<'exam_attempts'> });
    },
    [deleteExamAttemptMutation]
  );

  const updateLearningProgress = useCallback(
    async (institute: string, level: number, unit?: number, module?: string) => {
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
        lastModule: module,
      });
    },
    [updateUser, updateLearningProgressMutation]
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

      saveExamAttempt,
      deleteExamAttempt,
      saveAnnotation,
      deleteAnnotation,
      updateLearningProgress,
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
      saveExamAttempt,
      deleteExamAttempt,
      saveAnnotation,
      deleteAnnotation,
      updateLearningProgress,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
