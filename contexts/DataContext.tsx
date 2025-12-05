import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { Institute, TextbookContextMap, TopikExam, TextbookContent } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [textbookContexts, setTextbookContexts] = useState<TextbookContextMap>({});
  const [topikExams, setTopikExams] = useState<TopikExam[]>([]);

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

  // Fetch data when user logs in
  useEffect(() => {
    if (user) {
      fetchInitialData();
    }
  }, [user, fetchInitialData]);

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

  const value: DataContextType = {
    institutes,
    textbookContexts,
    topikExams,
    fetchInitialData,
    addInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
