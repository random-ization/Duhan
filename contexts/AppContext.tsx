import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  User,
  Language,
  Institute,
  TextbookContextMap,
  TopikExam,
  VocabularyItem,
  Annotation,
  ExamAttempt,
  LearningModuleType,
  TextbookContent,
} from '../types';
import { api } from '../services/api';

interface AppContextType {
  // User State
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;

  // Language & Navigation
  language: Language;
  setLanguage: (lang: Language) => void;
  page: string;
  setPage: (page: string) => void;

  // Learning State
  selectedInstitute: string;
  setSelectedInstitute: (id: string) => void;
  selectedLevel: number;
  setSelectedLevel: (level: number) => void;
  activeModule: LearningModuleType | null;
  setActiveModule: (module: LearningModuleType | null) => void;

  // Custom List State
  activeCustomList: VocabularyItem[] | null;
  setActiveCustomList: (list: VocabularyItem[] | null) => void;
  activeListType: 'SAVED' | 'MISTAKES' | null;
  setActiveListType: (type: 'SAVED' | 'MISTAKES' | null) => void;

  // Data
  institutes: Institute[];
  textbookContexts: TextbookContextMap;
  topikExams: TopikExam[];

  // Data Actions
  fetchInitialData: () => Promise<void>;
  addInstitute: (name: string) => Promise<void>;
  deleteInstitute: (id: string) => void;
  saveTextbookContext: (key: string, content: TextbookContent) => Promise<void>;
  saveTopikExam: (exam: TopikExam) => Promise<void>;
  deleteTopikExam: (id: string) => Promise<void>;

  // User Actions
  saveWord: (vocabItem: VocabularyItem | string, meaning?: string) => Promise<void>;
  recordMistake: (word: VocabularyItem) => Promise<void>;
  clearMistakes: () => void;
  saveAnnotation: (annotation: Annotation) => Promise<void>;
  saveExamAttempt: (attempt: ExamAttempt) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  // User State
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Language & Navigation
  const [language, setLanguage] = useState<Language>('zh');
  const [page, setPage] = useState('auth');

  // Learning State
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [activeModule, setActiveModule] = useState<LearningModuleType | null>(null);

  // Custom List State
  const [activeCustomList, setActiveCustomList] = useState<VocabularyItem[] | null>(null);
  const [activeListType, setActiveListType] = useState<'SAVED' | 'MISTAKES' | null>(null);

  // Data from Backend
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [textbookContexts, setTextbookContexts] = useState<TextbookContextMap>({});
  const [topikExams, setTopikExams] = useState<TopikExam[]>([]);

  // Initial Session Check
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const data = await api.getMe();
          setUser(data.user);
          setPage('home');
          await fetchInitialData();
        } catch (e) {
          console.error('Session expired or invalid');
          localStorage.removeItem('token');
          setPage('auth');
        }
      } else {
        setPage('auth');
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  // Fetch Data Helper
  const fetchInitialData = useCallback(async () => {
    try {
      const [insts, content, exams] = await Promise.all([
        api.getInstitutes(),
        api.getTextbookContent(),
        api.getTopikExams(),
      ]);
      setInstitutes(insts);
      setTextbookContexts(content);
      setTopikExams(exams);
    } catch (e) {
      console.error('Failed to load app data', e);
    }
  }, []);

  // Auth Actions
  const login = useCallback(
    (loggedInUser: User) => {
      setUser(loggedInUser);
      setPage('home');
      fetchInitialData();
    },
    [fetchInitialData]
  );

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setUser(null);
    setPage('auth');
    setSelectedInstitute('');
    setSelectedLevel(0);
    setActiveModule(null);
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  // User Actions
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

      let updatedAnnotations = [...user.annotations];
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
      } catch (e) {
        console.error(e);
      }
    },
    [user]
  );

  // Admin/Data Actions
  const addInstitute = useCallback(
    async (name: string) => {
      try {
        const newInst = await api.createInstitute({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          levels: [1, 2, 3, 4, 5, 6],
        });
        setInstitutes([...institutes, newInst]);
      } catch (e) {
        alert('Failed to create institute');
      }
    },
    [institutes]
  );

  const deleteInstitute = useCallback(
    (id: string) => {
      setInstitutes(institutes.filter(i => i.id !== id));
    },
    [institutes]
  );

  const saveTextbookContext = useCallback(async (key: string, content: TextbookContent) => {
    try {
      const saved = await api.saveTextbookContent(key, content);
      setTextbookContexts(prev => ({ ...prev, [saved.key]: saved }));
    } catch (e) {
      alert('Failed to save content');
    }
  }, []);

  const saveTopikExam = useCallback(
    async (exam: TopikExam) => {
      try {
        const saved = await api.saveTopikExam(exam);
        const exists = topikExams.find(e => e.id === saved.id);
        if (exists) {
          setTopikExams(topikExams.map(e => (e.id === saved.id ? saved : e)));
        } else {
          setTopikExams([saved, ...topikExams]);
        }
      } catch (e) {
        alert('Failed to save exam');
      }
    },
    [topikExams]
  );

  const deleteTopikExam = useCallback(
    async (id: string) => {
      try {
        await api.deleteTopikExam(id);
        setTopikExams(topikExams.filter(e => e.id !== id));
      } catch (e) {
        alert('Failed to delete exam');
      }
    },
    [topikExams]
  );

  const value: AppContextType = {
    user,
    loading,
    login,
    logout,
    updateUser,
    language,
    setLanguage,
    page,
    setPage,
    selectedInstitute,
    setSelectedInstitute,
    selectedLevel,
    setSelectedLevel,
    activeModule,
    setActiveModule,
    activeCustomList,
    setActiveCustomList,
    activeListType,
    setActiveListType,
    institutes,
    textbookContexts,
    topikExams,
    fetchInitialData,
    addInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
    saveWord,
    recordMistake,
    clearMistakes,
    saveAnnotation,
    saveExamAttempt,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
