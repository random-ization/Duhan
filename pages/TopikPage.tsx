import React from 'react';
import { Navigate } from 'react-router-dom';
import TopikModule from '../components/topik';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';

interface TopikPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const TopikPage: React.FC<TopikPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user, language, saveExamAttempt, saveAnnotation, deleteExamAttempt } = useAuth();
  const { topikExams } = useData();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <TopikModule
      exams={topikExams}
      language={language}
      history={user.examHistory || []}
      onSaveHistory={saveExamAttempt}
      annotations={user.annotations || []}
      onSaveAnnotation={saveAnnotation}
      canAccessContent={canAccessContent}
      onShowUpgradePrompt={onShowUpgradePrompt}
      onDeleteHistory={deleteExamAttempt}
    />
  );
};

export default TopikPage;

