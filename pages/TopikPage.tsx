import React from 'react';
import { Navigate } from 'react-router-dom';
import ExamListContainer from '../src/features/exam/ExamListContainer';
import { useAuth } from '../contexts/AuthContext';

interface TopikPageProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

const TopikPage: React.FC<TopikPageProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <ExamListContainer
      canAccessContent={canAccessContent}
      onShowUpgradePrompt={onShowUpgradePrompt}
    />
  );
};

export default TopikPage;

