import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useEffect,
} from 'react';
import { LearningModuleType, VocabularyItem } from '../types';
import { useAuth } from './AuthContext';

interface LearningContextType {
  // Learning Position
  selectedInstitute: string;
  setSelectedInstitute: (id: string) => void;
  selectedLevel: number;
  setSelectedLevel: (level: number) => void;
  activeModule: LearningModuleType | null;
  setActiveModule: (module: LearningModuleType | null) => void;

  // Custom List State (for saved words / mistakes review)
  activeCustomList: VocabularyItem[] | null;
  setActiveCustomList: (list: VocabularyItem[] | null) => void;
  activeListType: 'SAVED' | 'MISTAKES' | null;
  setActiveListType: (type: 'SAVED' | 'MISTAKES' | null) => void;
}

const LearningContext = createContext<LearningContextType | undefined>(undefined);

export const useLearning = () => {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error('useLearning must be used within LearningProvider');
  }
  return context;
};

interface LearningProviderProps {
  children: ReactNode;
}

export const LearningProvider: React.FC<LearningProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [selectedInstitute, setSelectedInstitute] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(0);
  const [activeModule, setActiveModule] = useState<LearningModuleType | null>(null);
  const [activeCustomList, setActiveCustomList] = useState<VocabularyItem[] | null>(null);
  const [activeListType, setActiveListType] = useState<'SAVED' | 'MISTAKES' | null>(null);

  // Resume learning from last position when user logs in
  useEffect(() => {
    if (user?.lastInstitute && user?.lastLevel) {
      setSelectedInstitute(user.lastInstitute);
      setSelectedLevel(user.lastLevel);
    }
  }, [user?.lastInstitute, user?.lastLevel]);

  const value: LearningContextType = {
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
  };

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
};
