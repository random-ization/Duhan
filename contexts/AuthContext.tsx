import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useConvex, useMutation, useAction } from 'convex/react';
import { api as convexApi } from '../convex/_generated/api';
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
// Remove import { api } from '../services/api';
import { fetchUserCountry } from '../utils/geo';
import i18n from '../utils/i18next-config';

interface AuthContextType {
  // User State
  user: User | null;
  loading: boolean;
  language: Language;

  // Auth Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  setLanguage: (lang: Language) => void;

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

  const convex = useConvex();

  // Mutations
  const saveSavedWordMutation = useMutation(convexApi.user.saveSavedWord);
  const saveMistakeMutation = useMutation(convexApi.user.saveMistake);
  const saveAnnotationMutation = useMutation(convexApi.annotations.save);
  const saveExamAttemptMutation = useMutation(convexApi.user.saveExamAttempt);
  const deleteExamAttemptMutation = useMutation(convexApi.user.deleteExamAttempt);
  const logActivityMutation = useMutation(convexApi.user.logActivity);
  const updateLearningProgressMutation = useMutation(convexApi.user.updateLearningProgress);

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

  // Session Check (Load User)
  useEffect(() => {
    const loadUser = async () => {
      // Prioritize userId (Convex ID or legacy ID)
      // Fallback to token if userId missing (legacy flow migration)
      let currentUserId = userId;

      if (!currentUserId) {
        // If we have a token but no userId, we can't do much with Convex directly without an auth function that takes token.
        // Assuming user needs to re-login if migrating from Express to Convex completely.
        const token = localStorage.getItem('token');
        if (token && !currentUserId) {
          console.warn("Legacy token found but no userId. User needs to re-login.");
          setLoading(false);
          return;
        }
      }

      if (currentUserId) {
        try {
          const userData = await convex.query(convexApi.auth.getMe, { userId: currentUserId });
          if (userData) {
            setUser(userData as unknown as User); // Assert type compatibility
            if (onLoginSuccess) onLoginSuccess();
          } else {
            // UserId invalid
            localStorage.removeItem('userId');
            setUserId(null);
          }
        } catch (e) {
          console.error('Failed to load user:', e);
        }
      }
      setLoading(false);
    };
    loadUser();
  }, [userId, convex, onLoginSuccess]);

  const login = useCallback(
    (loggedInUser: User) => {
      setUser(loggedInUser);
      // Ensure we store the ID for next page load
      localStorage.setItem('userId', loggedInUser.id);
      setUserId(loggedInUser.id);

      if (onLoginSuccess) {
        onLoginSuccess();
      }
    },
    [onLoginSuccess]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    setUserId(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!userId) return;
    try {
      const userData = await convex.query(convexApi.auth.getMe, { userId });
      if (userData) {
        setUser(userData as unknown as User);
      }
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  }, [userId, convex]);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  const saveWord = useCallback(
    async (vocabItem: VocabularyItem | string, meaning?: string) => {
      if (!user) return;

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

      try {
        await saveSavedWordMutation({
          userId: user.id,
          korean,
          english,
          exampleSentence: newItem.exampleSentence,
          exampleTranslation: newItem.exampleTranslation
        });
      } catch (e) {
        console.error('Failed to save word', e);
      }
    },
    [user, saveSavedWordMutation]
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

      try {
        await saveMistakeMutation({
          userId: user.id,
          korean,
          english,
          wordId: wordId,
          context: 'Web App'
        });
      } catch (e) {
        console.error(e);
      }
    },
    [user, saveMistakeMutation]
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

      try {
        await saveAnnotationMutation({
          userId: user.id,
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
      try {
        await saveExamAttemptMutation({
          userId: user.id,
          examId: attempt.examId,
          score: attempt.score,
          totalQuestions: attempt.maxScore, // Mapping maxScore to totalQuestions for now
          sectionScores: attempt.userAnswers
        });
        await logActivityMutation({
          userId: user.id,
          activityType: 'EXAM',
          duration: undefined,
          itemsStudied: 1,
          metadata: { examId: attempt.examId, score: attempt.score }
        });
      } catch (e) {
        console.error(e);
      }
    },
    [user, saveExamAttemptMutation, logActivityMutation]
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
          userId: user.id,
          activityType,
          duration,
          itemsStudied,
          metadata
        });
      } catch (e) {
        console.error('Failed to log activity', e);
      }
    },
    [user, logActivityMutation]
  );

  const updateLearningProgress = useCallback(
    async (institute: string, level: number, unit?: number, module?: string) => {
      if (!user) return;
      try {
        await updateLearningProgressMutation({
          userId: user.id,
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module
        });
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
      } catch (e) {
        console.error('Failed to update learning progress', e);
      }
    },
    [user, updateLearningProgressMutation]
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
