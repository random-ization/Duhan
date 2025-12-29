import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
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
import { api } from '../services/api';
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

  // Initialize language from localStorage synchronously to avoid formatting flash
  // This satisfies the requirement: Manual selection > Default
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('language');
      if (stored) return stored as Language;
    }
    return 'zh'; // Default fallback before IP check
  });

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Persistence wrapper for setLanguage
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
    i18n.changeLanguage(lang);
  }, []);

  // Sync i18n on mount/change
  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
  }, [language]);

  // IP Parsing & Initial Language Load
  useEffect(() => {
    const initLanguage = async () => {
      // 1. Check LocalStorage - if exists, we already used it in useState initials
      const storedLang = localStorage.getItem('language');
      if (storedLang) {
        return; // User has manual preference, skip IP check entirely
      }

      // 2. Check IP (Only if no manual preference)
      const country = await fetchUserCountry();
      console.log('Detected Country:', country);

      let targetLang: Language = 'en'; // Default fallback for IP detection
      if (country === 'CN') targetLang = 'zh';
      else if (country === 'VN') targetLang = 'vi';
      else if (country === 'MN') targetLang = 'mn';

      setLanguageState(targetLang);
      // We do NOT save auto-detected language to localStorage automatically
      // to allow future IP checks if the user travels, unless they manually select.
    };

    initLanguage();
  }, []);

  // Initial Session Check
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
          if (onLoginSuccess) {
            onLoginSuccess();
          }
        } catch (e) {
          console.error('Session expired or invalid');
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkSession();
  }, [onLoginSuccess]);

  const login = useCallback(
    (loggedInUser: User) => {
      setUser(loggedInUser);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    },
    [onLoginSuccess]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const data = await api.getMe();
      setUser(data.user);
    } catch (e) {
      console.error('Failed to refresh user:', e);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  const saveWord = useCallback(
    async (vocabItem: VocabularyItem | string, meaning?: string) => {
      if (!user) return;

      let newItem: VocabularyItem;
      if (typeof vocabItem === 'string' && meaning) {
        newItem = {
          korean: vocabItem,
          english: meaning,
          exampleSentence: '',
          exampleTranslation: '',
        };
      } else {
        newItem = vocabItem as VocabularyItem;
      }

      // Use functional update to prevent race conditions
      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, savedWords: [...prev.savedWords, newItem] };
      });

      try {
        await api.saveWord(newItem);
      } catch (e) {
        console.error('Failed to save word', e);
      }
    },
    []
  );

  const recordMistake = useCallback(
    async (word: Mistake | VocabularyItem) => {
      // Convert VocabularyItem to Mistake format if needed
      const mistake: Mistake = 'id' in word
        ? word as Mistake
        : {
          id: `mistake-${Date.now()}`,
          korean: word.korean,
          english: word.english,
          createdAt: Date.now(),
        };

      // Use functional update to prevent race conditions
      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, mistakes: [...prev.mistakes, mistake] };
      });
      try {
        await api.saveMistake(word);
      } catch (e) {
        console.error(e);
      }
    },
    []
  );

  const clearMistakes = useCallback(() => {
    if (window.confirm('Are you sure?')) {
      setUser(prev => prev ? { ...prev, mistakes: [] } : prev);
    }
  }, []);

  const saveAnnotation = useCallback(
    async (annotation: Annotation) => {
      // Use functional update to avoid stale state (race conditions)
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
        await api.saveAnnotation(annotation);
      } catch (apiError) {
        console.error('Failed to save annotation to server:', apiError);
        // Ideally rollback here, but for now we prioritized UI responsiveness
      }
    },
    []
  );

  const saveExamAttempt = useCallback(
    async (attempt: ExamAttempt) => {
      // Use functional update to prevent race conditions
      setUser(prev => {
        if (!prev) return prev;
        return { ...prev, examHistory: [...(prev.examHistory || []), attempt] };
      });
      try {
        await api.saveExamAttempt(attempt);
        // Log exam activity
        await api.logActivity('EXAM', undefined, 1, {
          examId: attempt.examId,
          score: attempt.score,
        });
      } catch (e) {
        console.error(e);
      }
    },
    []
  );

  const deleteExamAttempt = useCallback(
    async (attemptId: string) => {
      // Optimistic update
      setUser(prev => {
        if (!prev) return prev;
        const updatedHistory = (prev.examHistory || []).filter(h => h.id !== attemptId);
        return { ...prev, examHistory: updatedHistory };
      });

      try {
        await api.deleteExamAttempt(attemptId);
      } catch (e) {
        console.error('Failed to delete exam attempt', e);
        // Maybe revert? unlikely to fail if UI up to date
      }
    },
    []
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
        await api.logActivity(activityType, duration, itemsStudied, metadata);
      } catch (e) {
        console.error('Failed to log activity', e);
      }
    },
    [user]
  );

  const updateLearningProgress = useCallback(
    async (institute: string, level: number, unit?: number, module?: string) => {
      try {
        await api.updateLearningProgress({
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module,
        });
        // Use functional update to prevent race conditions
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
    []
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
