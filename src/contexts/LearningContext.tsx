import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import { LearningModuleType, VocabularyItem, Mistake } from '../types';
import { useAuth } from './AuthContext';

type CustomList = VocabularyItem[] | Mistake[];
type ListType = 'SAVED' | 'MISTAKES';

interface LearningSelectionState {
  selectedInstitute: string;
  selectedLevel: number;
}

interface LearningSessionState {
  activeModule: LearningModuleType | null;
  activeCustomList: CustomList | null;
  activeListType: ListType | null;
}

interface LearningActions {
  setSelectedInstitute: (id: string) => void;
  setSelectedLevel: (level: number) => void;
  setActiveModule: (module: LearningModuleType | null) => void;
  setActiveCustomList: (list: CustomList | null) => void;
  setActiveListType: (type: ListType | null) => void;
}

export interface LearningContextType
  extends LearningSelectionState, LearningSessionState, LearningActions {}

const LearningSelectionStateContext = createContext<LearningSelectionState | undefined>(undefined);
const LearningSessionStateContext = createContext<LearningSessionState | undefined>(undefined);
const LearningActionsContext = createContext<LearningActions | undefined>(undefined);

export const useLearningSelection = () => {
  const context = useContext(LearningSelectionStateContext);
  if (!context) {
    throw new Error('useLearningSelection must be used within LearningProvider');
  }
  return context;
};

export const useLearningSession = () => {
  const context = useContext(LearningSessionStateContext);
  if (!context) {
    throw new Error('useLearningSession must be used within LearningProvider');
  }
  return context;
};

export const useLearningActions = () => {
  const context = useContext(LearningActionsContext);
  if (!context) {
    throw new Error('useLearningActions must be used within LearningProvider');
  }
  return context;
};

export const useLearning = () => {
  const selection = useLearningSelection();
  const session = useLearningSession();
  const actions = useLearningActions();
  return useMemo<LearningContextType>(
    () => ({ ...selection, ...session, ...actions }),
    [selection, session, actions]
  );
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
  const actions = useMemo<LearningActions>(
    () => ({
      setSelectedInstitute,
      setSelectedLevel,
      setActiveModule,
      setActiveCustomList,
      setActiveListType,
    }),
    [setSelectedInstitute, setSelectedLevel]
  );

  const selectionState = useMemo<LearningSelectionState>(
    () => ({
      selectedInstitute,
      selectedLevel,
    }),
    [selectedInstitute, selectedLevel]
  );

  const sessionState = useMemo<LearningSessionState>(
    () => ({
      activeModule,
      activeCustomList,
      activeListType,
    }),
    [activeModule, activeCustomList, activeListType]
  );

  return (
    <LearningActionsContext.Provider value={actions}>
      <LearningSelectionStateContext.Provider value={selectionState}>
        <LearningSessionStateContext.Provider value={sessionState}>
          {children}
        </LearningSessionStateContext.Provider>
      </LearningSelectionStateContext.Provider>
    </LearningActionsContext.Provider>
  );
};
