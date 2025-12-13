import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { Institute, TextbookContextMap, TopikExam, TextbookContent, LevelConfig } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface DataContextType {
  // Data
  institutes: Institute[];
  textbookContexts: TextbookContextMap;
  topikExams: TopikExam[];

  // Data Actions
  fetchInitialData: () => Promise<void>;
  addInstitute: (name: string, levels?: LevelConfig[]) => Promise<void>;
  updateInstitute: (id: string, name: string) => Promise<void>;
  deleteInstitute: (id: string) => Promise<void>;
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
    async (name: string, levels?: LevelConfig[]) => {
      try {
        // Use provided levels or default to 6 levels with 10 units each
        const levelConfig = levels || Array.from({ length: 6 }, (_, i) => ({ level: i + 1, units: 10 }));
        const newInst = await api.createInstitute({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name,
          levels: levelConfig,
        });
        setInstitutes([...institutes, newInst]);
      } catch (e) {
        alert('Failed to create institute');
      }
    },
    [institutes]
  );

  const updateInstitute = useCallback(
    async (id: string, name: string) => {
      try {
        const updated = await api.updateInstitute(id, name);
        setInstitutes(institutes.map(i => (i.id === id ? updated : i)));
      } catch (e) {
        alert('Failed to update institute');
      }
    },
    [institutes]
  );

  const deleteInstitute = useCallback(
    async (id: string) => {
      try {
        await api.deleteInstitute(id);
        setInstitutes(institutes.filter(i => i.id !== id));
      } catch (e) {
        alert('Failed to delete institute');
      }
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
        // 保存考试（后端会自动上传 questions 到 S3）
        const saved = await api.saveTopikExam(exam);

        // 后端返回完整的 questions + questionsUrl
        // 更新本地状态
        const exists = topikExams.find(e => e.id === saved.id);
        if (exists) {
          setTopikExams(topikExams.map(e => (e.id === saved.id ? saved : e)));
        } else {
          setTopikExams([saved, ...topikExams]);
        }

        console.log(`[DataContext] Exam saved, questionsUrl: ${saved.questionsUrl}`);
      } catch (e) {
        console.error('[DataContext] Failed to save exam:', e);
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
    updateInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
