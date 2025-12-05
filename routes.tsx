import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import ModulePage from './pages/ModulePage';
import TopikPage from './pages/TopikPage';
import AdminPage from './pages/AdminPage';

interface AppRoutesProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
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
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
