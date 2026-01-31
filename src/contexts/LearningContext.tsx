import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import { LearningModuleType, VocabularyItem, Mistake } from '../types';
import { useAuth } from './AuthContext';

type CustomList = VocabularyItem[] | Mistake[];
type ListType = 'SAVED' | 'MISTAKES';

interface LearningContextType {
  // Learning Position
  selectedInstitute: string;
  setSelectedInstitute: (id: string) => void;
  selectedLevel: number;
  setSelectedLevel: (level: number) => void;
  activeModule: LearningModuleType | null;
  setActiveModule: (module: LearningModuleType | null) => void;

  // Custom List State (for saved words / mistakes review)
  activeCustomList: CustomList | null;
  setActiveCustomList: (list: CustomList | null) => void;
  activeListType: ListType | null;
  setActiveListType: (type: ListType | null) => void;
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
  const [selectedInstituteOverride, setSelectedInstituteOverride] = useState<string | null>(null);
  const [selectedLevelOverride, setSelectedLevelOverride] = useState<number | null>(null);
  const [activeModule, setActiveModule] = useState<LearningModuleType | null>(null);
  const [activeCustomList, setActiveCustomList] = useState<CustomList | null>(null);
  const [activeListType, setActiveListType] = useState<ListType | null>(null);

  const selectedInstitute = selectedInstituteOverride ?? user?.lastInstitute ?? '';
  const selectedLevel = selectedLevelOverride ?? user?.lastLevel ?? 0;

  const setSelectedInstitute = useCallback((id: string) => setSelectedInstituteOverride(id), []);
  const setSelectedLevel = useCallback((level: number) => setSelectedLevelOverride(level), []);

  // OPTIMIZATION: Use useMemo to stabilize context value and prevent unnecessary re-renders
  const value = useMemo<LearningContextType>(
    () => ({
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
    }),
    [
      selectedInstitute,
      setSelectedInstitute,
      selectedLevel,
      setSelectedLevel,
      activeModule,
      activeCustomList,
      activeListType,
    ]
  );

  return <LearningContext.Provider value={value}>{children}</LearningContext.Provider>;
};
