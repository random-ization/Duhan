import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { Institute, TextbookContextMap, TopikExam, TextbookContent, LevelConfig } from '../types';
import { api } from '../../convex/_generated/api';
import { useQuery, useMutation } from 'convex/react';
import toast from 'react-hot-toast';

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

  // Convex Interactions
  const institutesData = useQuery(api.institutes.getAll);
  const topikExamsData = useQuery(api.topik.getExams, {});

  // Mutations
  // const createInstitute = useMutation(api.institutes.create); 
  // const updateInstituteFn = useMutation(api.institutes.update);
  // const deleteInstituteFn = useMutation(api.institutes.delete);

  const saveTopikExamMutation = useMutation(api.topik.saveExam);
  const deleteTopikExamMutation = useMutation(api.topik.deleteExam);

  // Local state for textbook content (still managed manually or via S3 fetch)
  // TODO: Migrate textbook content fetching to Convex Actions if S3 is involved
  const [textbookContexts] = useState<TextbookContextMap>({});

  // Maps Convex data to legacy state shape
  const institutes = useMemo(() => {
    if (!institutesData) return [];
    return institutesData.map((inst: Institute) => ({
      ...inst,
      // Parse levels if it comes as string (legacy import artifact)
      levels: typeof inst.levels === 'string' ? (() => {
        try { return JSON.parse(inst.levels as unknown as string); }
        catch (e) { return []; }
      })() : inst.levels,
      id: inst.id || (inst as unknown as { _id: string })._id
    }));
  }, [institutesData]);

  const topikExams = useMemo(() => {
    if (!topikExamsData) return [];

    // Handle potential pagination wrapper if Convex types infer it
    const examsList = Array.isArray(topikExamsData) ? topikExamsData : (topikExamsData as unknown as { page?: unknown[] })?.page || [];

    return (examsList as unknown[]).map((e) => {
      const item = e as TopikExam;
      return {
        ...item,
        id: item.id || (item as unknown as { _id: string })._id,
        questions: [],
      };
    });
  }, [topikExamsData]);

  // Actions
  const fetchInitialData = useCallback(async () => {
    // No-op for Convex (reactive)
  }, []);

  const fetchTextbookContentData = useCallback(async (_key: string): Promise<TextbookContent | null> => {
    // TODO: Implement Convex action for textbook content if needed.
    // Legacy API has been removed.
    console.warn("fetchTextbookContentData not implemented in Convex yet.");
    return null;
  }, []);

  const addInstitute = useCallback(async (_name: string, _levels?: LevelConfig[], _options?: unknown) => {
    // Implementation pending admin migration check
    // For now, alert strictly
    alert("Please use the New Admin Panel for Institute management.");
  }, []);

  const updateInstitute = useCallback(async (_id: string, _updates: unknown) => {
    alert("Please use the New Admin Panel.");
  }, []);

  const deleteInstitute = useCallback(async (_id: string) => {
    alert("Please use the New Admin Panel.");
  }, []);

  const saveTextbookContext = useCallback(async (_key: string, _content: TextbookContent) => {
    alert("Please use the New Admin Panel.");
  }, []);

  const saveTopikExam = useCallback(async (exam: TopikExam) => {
    try {
      // Flatten questions if needed, but api.topik.saveExam expects { ...exam, questions: [...] }
      // We pass it directly.
      await saveTopikExamMutation({
        id: exam.id,
        title: exam.title,
        round: exam.round,
        type: exam.type,
        timeLimit: exam.timeLimit,
        questions: exam.questions.map(q => ({
          ...q,
          // Ensure optional fields are handled or stripped if Convex strict
          // schema requires specific types. Convex schema lines 419+ seems robust.
          // We might need to ensure 'id' is number.
          id: Number(q.id) || q.number || 0,
          correctAnswer: Number(q.correctAnswer),
          score: Number(q.score),
        })),
        // Optional fields
        description: exam.description,
        isPaid: exam.isPaid,
        paperType: exam.paperType,
        audioUrl: exam.audioUrl,
      });
      toast.success("Exam saved to database!");
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.error("Failed to save exam", e);
      toast.error("Failed to save: " + e.message);
    }
  }, [saveTopikExamMutation]);

  const deleteTopikExam = useCallback(async (id: string) => {
    try {
      await deleteTopikExamMutation({ examId: id });
      toast.success("Exam deleted");
    } catch (e) {
      console.error("Failed to delete exam", e);
      toast.error("Failed to delete");
    }
  }, [deleteTopikExamMutation]);

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
