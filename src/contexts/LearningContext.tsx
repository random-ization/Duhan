import React, { createContext, useContext, useState, useMemo, ReactNode, useCallback } from 'react';
import { LearningModuleType, VocabularyItem, Mistake } from '../types';
import { useAuth } from './AuthContext';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';
import type { LearningFlowModule, LearningMaterialSelection } from '../utils/learningFlow';

type CustomList = VocabularyItem[] | Mistake[];
type ListType = 'SAVED' | 'MISTAKES';
type LearningMaterialMap = Partial<Record<LearningFlowModule, LearningMaterialSelection>>;
const RECENT_MATERIALS_STORAGE_KEY = 'duhan:learning:recent-materials:v1';

interface LearningSelectionState {
  selectedInstitute: string;
  selectedLevel: number;
  recentMaterials: LearningMaterialMap;
}

interface LearningSessionState {
  activeModule: LearningModuleType | null;
  activeCustomList: CustomList | null;
  activeListType: ListType | null;
}

interface LearningActions {
  setSelectedInstitute: (id: string) => void;
  setSelectedLevel: (level: number) => void;
  setRecentMaterial: (module: LearningFlowModule, material: LearningMaterialSelection) => void;
  getRecentMaterial: (module: LearningFlowModule) => LearningMaterialSelection | null;
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

export const useOptionalLearningActions = () => useContext(LearningActionsContext);

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
  const [recentMaterials, setRecentMaterials] = useState<LearningMaterialMap>(() => {
    const raw = safeGetLocalStorageItem(RECENT_MATERIALS_STORAGE_KEY);
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw) as LearningMaterialMap;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  });
  const [activeModule, setActiveModule] = useState<LearningModuleType | null>(null);
  const [activeCustomList, setActiveCustomList] = useState<CustomList | null>(null);
  const [activeListType, setActiveListType] = useState<ListType | null>(null);

  const selectedInstitute = selectedInstituteOverride ?? user?.lastInstitute ?? '';
  const selectedLevel = selectedLevelOverride ?? user?.lastLevel ?? 0;

  const setSelectedInstitute = useCallback((id: string) => setSelectedInstituteOverride(id), []);
  const setSelectedLevel = useCallback((level: number) => setSelectedLevelOverride(level), []);
  const setRecentMaterial = useCallback(
    (module: LearningFlowModule, material: LearningMaterialSelection) => {
      setRecentMaterials(prev => {
        const next = {
          ...prev,
          [module]: {
            ...material,
            updatedAt: material.updatedAt ?? Date.now(),
          },
        };
        safeSetLocalStorageItem(RECENT_MATERIALS_STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );
  const getRecentMaterial = useCallback(
    (module: LearningFlowModule) => recentMaterials[module] ?? null,
    [recentMaterials]
  );
  const actions = useMemo<LearningActions>(
    () => ({
      setSelectedInstitute,
      setSelectedLevel,
      setRecentMaterial,
      getRecentMaterial,
      setActiveModule,
      setActiveCustomList,
      setActiveListType,
    }),
    [getRecentMaterial, setRecentMaterial, setSelectedInstitute, setSelectedLevel]
  );

  const selectionState = useMemo<LearningSelectionState>(
    () => ({
      selectedInstitute,
      selectedLevel,
      recentMaterials,
    }),
    [recentMaterials, selectedInstitute, selectedLevel]
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
