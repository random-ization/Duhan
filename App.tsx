import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import UpgradePrompt from './components/UpgradePrompt';
import { AppRoutes } from './routes';
import { useAuth } from './contexts/AuthContext';
import { useLearning } from './contexts/LearningContext';
import { Loading } from './components/common/Loading';

function App() {
  const { user, loading, logout, language, setLanguage, canAccessContent, updateLearningProgress } =
    useAuth();
  const {
    selectedInstitute,
    selectedLevel,
    setActiveModule,
    setActiveCustomList,
    setActiveListType,
  } = useLearning();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Track learning progress when user changes institute/level
  useEffect(() => {
    if (user && selectedInstitute && selectedLevel) {
      updateLearningProgress(selectedInstitute, selectedLevel);
    }
  }, [selectedInstitute, selectedLevel, user, updateLearningProgress]);

  if (loading) return <Loading fullScreen size="lg" text="Loading..." />;

  // Determine current page from URL path
  const currentPage = location.pathname.split('/')[1] || 'auth';

  const handleNavigate = (page: string) => {
    // Clear module state when navigating away from module page
    if (page !== 'module') {
      setActiveModule(null);
      setActiveCustomList(null);
      setActiveListType(null);
    }
    navigate(`/${page}`);
  };

  return (
    <>
      <Layout
        user={user}
        onLogout={logout}
        currentPage={currentPage}
        onNavigate={handleNavigate}
        language={language}
        onLanguageChange={setLanguage}
      >
        <AppRoutes
          canAccessContent={canAccessContent}
          onShowUpgradePrompt={() => setShowUpgradePrompt(true)}
        />
      </Layout>

      <UpgradePrompt
        isOpen={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        language={language}
        contentType="textbook"
      />
    </>
  );
}

export default App;
