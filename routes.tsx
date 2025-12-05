import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import ModulePage from './pages/ModulePage';
import TopikPage from './pages/TopikPage';
import AdminPage from './pages/AdminPage';
import LegalDocumentPage from './pages/LegalDocumentPage';

interface AppRoutesProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { language } = useAuth();
  
  return (
    <Routes>
      <Route path="/" element={<AuthPage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route
        path="/dashboard"
        element={
          <DashboardPage
            canAccessContent={canAccessContent}
            onShowUpgradePrompt={onShowUpgradePrompt}
          />
        }
      />
      <Route path="/module" element={<ModulePage />} />
      <Route
        path="/topik"
        element={
          <TopikPage
            canAccessContent={canAccessContent}
            onShowUpgradePrompt={onShowUpgradePrompt}
          />
        }
      />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/terms" element={<LegalDocumentPage language={language} documentType="terms" />} />
      <Route path="/privacy" element={<LegalDocumentPage language={language} documentType="privacy" />} />
      <Route path="/refund" element={<LegalDocumentPage language={language} documentType="refund" />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
