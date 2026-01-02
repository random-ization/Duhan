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
  fetchTextbookContentData: (key: string) => Promise<TextbookContent | null>;
  addInstitute: (name: string, levels?: LevelConfig[], options?: { coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string }) => Promise<void>;
  updateInstitute: (id: string, updates: { name?: string; coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string }) => Promise<void>;
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

  // Fetch single textbook content data from S3 proxy (with cache controls)
  const fetchTextbookContentData = useCallback(async (key: string): Promise<TextbookContent | null> => {
    try {
      // First check if we have cached content with all fields
      const cached = textbookContexts[key];
      if (cached && cached.vocabularyList) {
        return cached as TextbookContent;
      }

      // Fetch fresh data from proxy endpoint
      const data = await api.getTextbookContentData(key);
      if (data) {
        // Update local cache
        setTextbookContexts(prev => ({ ...prev, [key]: data }));
        return data as TextbookContent;
      }
      return null;
    } catch (e) {
      console.error(`Failed to fetch content for ${key}`, e);
      return null;
    }
  }, [textbookContexts]);

  // Fetch data when user logs in
  // IMPORTANT: Only depend on user.id to prevent infinite loops
  // (user object reference changes on every render, but user.id is stable)
  const userId = user?.id;
  useEffect(() => {
    if (userId) {
      fetchInitialData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);  // Only re-fetch when user ID changes, not on every render

  const addInstitute = useCallback(
    async (name: string, levels?: LevelConfig[], options?: { coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string }) => {
      try {
        // Use provided levels or default to 6 levels with 10 units each
        const levelConfig = levels || Array.from({ length: 6 }, (_, i) => ({ level: i + 1, units: 10 }));

        // Generate ID including volume to allow same-name different-volume textbooks
        let baseId = name.toLowerCase().replace(/\s+/g, '-');
        if (options?.volume) {
          baseId += `-${options.volume}`;
        }

        const newInst = await api.createInstitute({
          id: baseId,
          name,
          levels: levelConfig,
          coverUrl: options?.coverUrl || null,
          themeColor: options?.themeColor || null,
          publisher: options?.publisher || null,
          displayLevel: options?.displayLevel || null,
          volume: options?.volume || null,
        });
        setInstitutes([...institutes, newInst]);
      } catch (e) {
        alert('Failed to create institute');
      }
    },
    [institutes]
  );

  const updateInstitute = useCallback(
    async (id: string, updates: { name?: string; coverUrl?: string; themeColor?: string; publisher?: string; displayLevel?: string; volume?: string }) => {
      try {
        const updated = await api.updateInstitute(id, updates);
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
      } catch (e: any) {
        console.error('[DataContext] Failed to save exam:', e);
        // 显示详细错误信息
        let errorMsg = 'Failed to save exam';
        if (e.raw?.details) {
          // Zod validation errors
          if (Array.isArray(e.raw.details)) {
            errorMsg = e.raw.details.map((d: any) => `${d.path?.join('.')}: ${d.message}`).join('\n');
          } else {
            errorMsg = JSON.stringify(e.raw.details);
          }
        } else if (e.message) {
          errorMsg = e.message;
        }
        alert(`保存失败:\n${errorMsg}`);
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
    fetchTextbookContentData,
    addInstitute,
    updateInstitute,
    deleteInstitute,
    saveTextbookContext,
    saveTopikExam,
    deleteTopikExam,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
