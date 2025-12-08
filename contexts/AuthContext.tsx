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
  Annotation,
  ExamAttempt,
  TextbookContent,
  TopikExam,
} from '../types';
import { api } from '../services/api';

interface AuthContextType {
  // User State
  user: User | null;
  loading: boolean;
  language: Language;

  // Auth Actions
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLanguage: (lang: Language) => void;

  // User Actions
  saveWord: (vocabItem: VocabularyItem | string, meaning?: string) => Promise<void>;
  recordMistake: (word: VocabularyItem) => Promise<void>;
  clearMistakes: () => void;
  saveAnnotation: (annotation: Annotation) => Promise<void>;
  saveExamAttempt: (attempt: ExamAttempt) => Promise<void>;
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
  const [language, setLanguage] = useState<Language>('zh');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

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

      const updatedSavedWords = [...user.savedWords, newItem];
      setUser({ ...user, savedWords: updatedSavedWords });

      try {
        await api.saveWord(newItem);
      } catch (e) {
        console.error('Failed to save word', e);
      }
    },
    [user]
  );

  const recordMistake = useCallback(
    async (word: VocabularyItem) => {
      if (!user) return;
      const updatedMistakes = [...user.mistakes, word];
      setUser({ ...user, mistakes: updatedMistakes });
      try {
        await api.saveMistake(word);
      } catch (e) {
        console.error(e);
      }
    },
    [user]
  );

  const clearMistakes = useCallback(() => {
    if (user && window.confirm('Are you sure?')) {
      setUser({ ...user, mistakes: [] });
    }
  }, [user]);

  const saveAnnotation = useCallback(
    async (annotation: Annotation) => {
      if (!user) return;

      let updatedAnnotations = [...(user.annotations || [])];
      const index = updatedAnnotations.findIndex(a => a.id === annotation.id);

      if (index !== -1) {
        if (!annotation.color && !annotation.note) {
          updatedAnnotations.splice(index, 1);
        } else {
          updatedAnnotations[index] = annotation;
        }
      } else {
        updatedAnnotations.push(annotation);
      }

      setUser({ ...user, annotations: updatedAnnotations });
      try {
        await api.saveAnnotation(annotation);
      } catch (e) {
        console.error(e);
      }
    },
    [user]
  );

  const saveExamAttempt = useCallback(
    async (attempt: ExamAttempt) => {
      if (!user) return;
      const updatedHistory = [...(user.examHistory || []), attempt];
      setUser({ ...user, examHistory: updatedHistory });
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
    [user]
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
      if (!user) return;
      try {
        await api.updateLearningProgress({
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module,
        });
        setUser({
          ...user,
          lastInstitute: institute,
          lastLevel: level,
          lastUnit: unit,
          lastModule: module,
        });
      } catch (e) {
        console.error('Failed to update learning progress', e);
      }
    },
    [user]
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
    setLanguage,
    saveWord,
    recordMistake,
    clearMistakes,
    saveAnnotation,
    saveExamAttempt,
    logActivity,
    updateLearningProgress,
    canAccessContent,
    showUpgradePrompt,
    setShowUpgradePrompt,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
