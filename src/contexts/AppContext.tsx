import React from 'react';
import { useUserActions } from '../hooks/useUserActions';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { useAuth, AuthProvider } from './AuthContext';
import { useLearning, LearningProvider } from './LearningContext';
import { useData, DataProvider } from './DataContext';
import { useLayout, LayoutProvider } from './LayoutContext';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AuthProvider>
      <DataProvider>
        <LayoutProvider>
          <LearningProvider>{children}</LearningProvider>
        </LayoutProvider>
      </DataProvider>
    </AuthProvider>
  );
};

// Backward compatibility hook that combines all three contexts
export const useApp = () => {
  const auth = useAuth();
  const learning = useLearning();
  const data = useData();
  const layout = useLayout();
  const userActions = useUserActions();
  const { logActivity } = useActivityLogger();

  return {
    // Auth context
    user: auth.user,
    loading: auth.loading,
    login: auth.login,
    logout: auth.logout,
    updateUser: auth.updateUser,
    refreshUser: auth.refreshUser,
    resetPassword: auth.resetPassword,
    language: auth.language,
    setLanguage: auth.setLanguage,
    canAccessContent: auth.canAccessContent,
    showUpgradePrompt: auth.showUpgradePrompt,
    setShowUpgradePrompt: auth.setShowUpgradePrompt,

    // Data Actions (Moved from Auth)
    saveWord: userActions.saveWord,
    recordMistake: userActions.recordMistake,
    clearMistakes: userActions.clearMistakes,
    saveAnnotation: userActions.saveAnnotation,
    saveExamAttempt: userActions.saveExamAttempt,
    deleteExamAttempt: userActions.deleteExamAttempt,
    updateLearningProgress: userActions.updateLearningProgress,
    logActivity: logActivity,

    // Learning context
    selectedInstitute: learning.selectedInstitute,
    setSelectedInstitute: learning.setSelectedInstitute,
    selectedLevel: learning.selectedLevel,
    setSelectedLevel: learning.setSelectedLevel,
    activeModule: learning.activeModule,
    setActiveModule: learning.setActiveModule,
    activeCustomList: learning.activeCustomList,
    setActiveCustomList: learning.setActiveCustomList,
    activeListType: learning.activeListType,
    setActiveListType: learning.setActiveListType,

    // Data context
    institutes: data.institutes,
    topikExams: data.topikExams,

    // Layout context
    isEditing: layout.isEditing,
    toggleEditMode: layout.toggleEditMode,
    cardOrder: layout.cardOrder,
    updateCardOrder: layout.updateCardOrder,
    resetLayout: layout.resetLayout,
    isMobileMenuOpen: layout.isMobileMenuOpen,
    toggleMobileMenu: layout.toggleMobileMenu,
    sidebarHidden: layout.sidebarHidden,
    setSidebarHidden: layout.setSidebarHidden,
  };
};
