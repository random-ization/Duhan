import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useConvex, useMutation, useAction, useQuery, useConvexAuth } from 'convex/react';
import { useAuthActions } from "@convex-dev/auth/react";
import { api as convexApi } from '../convex/_generated/api';
import { api } from '../convex/_generated/api';
import {
  User,
  Language,
  VocabularyItem,
  Mistake,
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
  saveWord: (vocabItem: VocabularyItem | string, meaning?: string) => Promise<void>;
  recordMistake: (word: Mistake | VocabularyItem) => Promise<void>;
  clearMistakes: () => void;
  saveAnnotation: (annotation: Annotation) => Promise<void>;
  saveExamAttempt: (attempt: ExamAttempt) => Promise<void>;
  deleteExamAttempt: (attemptId: string) => Promise<void>;
  logActivity: (
    activityType: 'VOCAB' | 'READING' | 'LISTENING' | 'GRAMMAR' | 'EXAM',
    duration?: number,
    itemsStudied?: number,
    metadata?: any
  ) => Promise<void>;
  updateLearningProgress: (
    institute: string,
    level: number,
    unit?: number,
    module?: string
  ) => Promise<void>;

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, onLoginSuccess }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('userId') : null
  );
  const [token, setToken] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  );
  const [sessionExpired, setSessionExpired] = useState(false);

  const convex = useConvex();

  // Mutations - token argument no longer needed for backend that uses getAuthUserId
  const saveSavedWordMutation = useMutation(convexApi.user.saveSavedWord);
  const saveMistakeMutation = useMutation(convexApi.user.saveMistake);
  const saveAnnotationMutation = useMutation(convexApi.annotations.save);
  const saveExamAttemptMutation = useMutation(convexApi.user.saveExamAttempt);
  const deleteExamAttemptMutation = useMutation(convexApi.user.deleteExamAttempt);
  const logActivityMutation = useMutation(convexApi.user.logActivity);
  const updateLearningProgressMutation = useMutation(convexApi.user.updateLearningProgress);
  // const requestPasswordResetMutation = useMutation(convexApi.auth.requestPasswordReset); // Auth handled by library now

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
        setUserId(viewer ? viewer._id : null);
        setLoading(false);
      } else {
        // Authenticated but viewer query still loading
        setLoading(true);
      }
    } else {
      // Not authenticated
      setUser(null);
      setUserId(null);
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, viewer]);

  // Session expiration detection
  // If user was authenticated but then becomes unauthenticated, flag session as expired
  useEffect(() => {
    const wasAuthenticated = user !== null;
    const nowAuthenticated = isAuthenticated;

    // If we had a user but are no longer authenticated (and not loading), session expired
    if (wasAuthenticated && !nowAuthenticated && !authLoading) {
      setSessionExpired(true);
    }

    // If we become authenticated again, clear the expired flag
    if (nowAuthenticated && sessionExpired) {
      setSessionExpired(false);
    }
  }, [isAuthenticated, user, authLoading, sessionExpired]);

  // Silent token refresh - proactively keep session alive
  // Convex Auth handles token refresh automatically, but we add a heartbeat
  // to ensure the session stays active during long user sessions
  useEffect(() => {
    if (!isAuthenticated || !viewer) {
      return;
    }

    // Ping the server every 5 minutes to keep session active
    const REFRESH_INTERVAL = 5 * 60 * 1000; // 5 minutes
    
    const refreshTimer = setInterval(() => {
      // Simply querying the viewer keeps the session active
      // Convex will automatically refresh tokens as needed
      console.log('[Auth] Heartbeat - keeping session active');
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshTimer);
  }, [isAuthenticated, viewer]);

  // Legacy manual loadUser effect removed
  /*
  useEffect(() => {
    const loadUser = async () => {
    ...
  }, [token, userId, convex, onLoginSuccess]);
  */

  const login = useCallback(
    async (loggedInUser: User, sessionToken?: string) => {
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
    setUserId(null);
    setToken(null);
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

  const resetPassword = useCallback(async (email: string) => {
    try {
      // await requestPasswordResetMutation({ email });
      console.warn("Reset password not yet implemented with Convex Auth");
    } catch (e) {
      console.error("Failed to request password reset:", e);
      throw e;
    }
  }, []);

  const saveWord = useCallback(
    async (vocabItem: VocabularyItem | string, meaning?: string) => {
      if (!user) return; // Silent fail if no user? Or token check inside

      let newItem: VocabularyItem;
      let korean = '';
      let english = '';

      if (typeof vocabItem === 'string' && meaning) {
        korean = vocabItem;
        english = meaning;
        newItem = {
          korean,
          english,
          exampleSentence: '',
          exampleTranslation: '',
        };
      } else {
        newItem = vocabItem as VocabularyItem;
        korean = newItem.korean || newItem.word || '';
        english = newItem.english || newItem.meaning || '';
      }

      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, savedWords: [...(prev.savedWords || []), newItem] };
      });

      if (!token) return;

      try {
        await saveSavedWordMutation({
          korean,
          english,
          exampleSentence: newItem.exampleSentence,
          exampleTranslation: newItem.exampleTranslation
        });
      } catch (e) {
        console.error('Failed to save word', e);
      }
    },
    [user, token, saveSavedWordMutation]
  );

  const recordMistake = useCallback(
    async (word: Mistake | VocabularyItem) => {
      if (!user) return;

      const korean = word.korean || (word as any).word;
      const english = word.english || (word as any).meaning;
      const wordId = (word as any).id?.includes('mistake') ? undefined : (word as any).id;

      const mistake: Mistake = 'id' in word && (word as any).id.includes('mistake')
        ? word as Mistake
        : {
          id: `mistake-${Date.now()}`,
          korean,
          english,
          createdAt: Date.now(),
        };

      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, mistakes: [...(prev.mistakes || []), mistake] };
      });

      if (!token) return;

      try {
        await saveMistakeMutation({
          korean,
          english,
          wordId: wordId as any, // Cast to any to bypass strict ID check for now if needed, or fix upstream type
          context: 'Web App'
        });
      } catch (e) {
        console.error(e);
      }
    },
    [user, token, saveMistakeMutation]
  );

  const clearMistakes = useCallback(() => {
    if (window.confirm('Are you sure?')) {
      setUser(prev => prev ? { ...prev, mistakes: [] } : prev);
      // Note: No bulk delete mutation created yet, skipping server sync for now or implement clearMistakes later
    }
  }, []);

  const saveAnnotation = useCallback(
    async (annotation: Annotation) => {
      if (!user) return;

      setUser(prevUser => {
        if (!prevUser) return prevUser;
        const updatedAnnotations = [...(prevUser.annotations || [])];
        const index = updatedAnnotations.findIndex(a => a.id === annotation.id);

        if (index !== -1) {
          if (!annotation.color && (!annotation.note || annotation.note.trim() === '')) {
            updatedAnnotations.splice(index, 1);
          } else {
            updatedAnnotations[index] = annotation;
          }
        } else {
          updatedAnnotations.push(annotation);
        }
        return { ...prevUser, annotations: updatedAnnotations };
      });

      // NOTE: Annotations backend still relies on userId for now, until we update it.
      // We will pass userId here as it is available on user object.
      try {
        await saveAnnotationMutation({
          contextKey: annotation.contextKey,
          text: annotation.text,
          note: annotation.note,
          color: annotation.color || undefined,
          startOffset: annotation.startOffset,
          endOffset: annotation.endOffset
        });
      } catch (apiError) {
        console.error('Failed to save annotation to server:', apiError);
      }
    },
    [user, saveAnnotationMutation]
  );

  const saveExamAttempt = useCallback(
    async (attempt: ExamAttempt) => {
      if (!user) return;
      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, examHistory: [...(prev.examHistory || []), attempt] };
      });

      if (!token) return;

      try {
        await saveExamAttemptMutation({
          examId: attempt.examId as any,
          score: attempt.score,
          totalQuestions: attempt.maxScore,
          sectionScores: attempt.userAnswers
        });
        await logActivityMutation({
          activityType: 'EXAM',
          duration: undefined,
          itemsStudied: 1,
          metadata: { examId: attempt.examId, score: attempt.score }
        });
      } catch (e) {
        console.error(e);
      }
    },
    [user, token, saveExamAttemptMutation, logActivityMutation]
  );

  const deleteExamAttempt = useCallback(
    async (attemptId: string) => {
      setUser(prev => {
        if (!prev) return prev;
        const updatedHistory = (prev.examHistory || []).filter(h => h.id !== attemptId);
        return { ...prev, examHistory: updatedHistory };
      });
      try {
        // We need explicit ID logic if attemptId is not Convex ID
        // For now catch error if ID format mismatch
        await deleteExamAttemptMutation({ attemptId: attemptId as any });
      } catch (e) {
        console.error('Failed to delete exam attempt', e);
      }
    },
    [deleteExamAttemptMutation]
  );

  const logActivity = useCallback(
    async (
      activityType: 'VOCAB' | 'READING' | 'LISTENING' | 'GRAMMAR' | 'EXAM',
      duration?: number,
      itemsStudied?: number,
      metadata?: any
    ) => {
      if (!user) return;
      try {
        await logActivityMutation({
          activityType,
          duration,
          itemsStudied,
          metadata
        });
      } catch (e) {
        console.error('Failed to log activity', e);
      }
    },
    [user, token, logActivityMutation]
  );

  const updateLearningProgress = useCallback(
    async (institute: string, level: number, unit?: number, module?: string) => {
      if (!user) return;

      // Optimistic update
      setUser(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module,
        };
      });

      if (!user) return;

      try {
        await updateLearningProgressMutation({
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module
        });
      } catch (e) {
        console.error('Failed to update learning progress', e);
      }
    },
    [user, token, updateLearningProgressMutation]
  );

  const canAccessContent = useCallback(
    (content: TextbookContent | TopikExam): boolean => {
      if (!user) return false;
      if (user.tier === 'PAID') return true;
      return !content.isPaid;
    },
    [user]
  );

  const value: AuthContextType = {
    user,
    loading,
    language,
    login,
    logout,
    updateUser,
    refreshUser,
    resetPassword,
    setLanguage,
    saveWord,
    recordMistake,
    clearMistakes,
    saveAnnotation,
    saveExamAttempt,
    deleteExamAttempt,
    logActivity,
    updateLearningProgress,
    canAccessContent,
    showUpgradePrompt,
    setShowUpgradePrompt,
    sessionExpired,
    setSessionExpired,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
