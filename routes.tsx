import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
const Landing = lazy(() => import('./pages/Landing'));
const CoursesOverview = lazy(() => import('./pages/CoursesOverview'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const TopikPage = lazy(() => import('./pages/TopikPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage'));
const ExamSessionContainer = lazy(() => import('./src/features/exam/ExamSessionContainer'));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <div className="text-slate-500 font-medium">Loading...</div>
    </div>
  </div>
);

interface AppRoutesProps {
  canAccessContent: (content: any) => boolean;
  onShowUpgradePrompt: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { language } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* === 公开路由 (无需登录) === */}
        <Route path="/" element={<Landing language={language} />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/courses" element={<CoursesOverview language={language} />} />
        <Route
          path="/terms"
          element={<LegalDocumentPage language={language} documentType="terms" />}
        />
        <Route
          path="/privacy"
          element={<LegalDocumentPage language={language} documentType="privacy" />}
        />
        <Route
          path="/refund"
          element={<LegalDocumentPage language={language} documentType="refund" />}
        />

        {/* === 受保护路由 (需要登录) === */}
        <Route element={<ProtectedRoute />}>
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
          <Route path="/dashboard/:moduleParam" element={<ModulePage />} />
          <Route
            path="/topik"
            element={
              <TopikPage
                canAccessContent={canAccessContent}
                onShowUpgradePrompt={onShowUpgradePrompt}
              />
            }
          />
          <Route
            path="/topik/exam/:examId"
            element={<ExamSessionContainer />}
          />
        </Route>

        {/* === 管理员路由 (需要 Admin 权限) === */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="/admin" element={<AdminPage />} />
        </Route>

        {/* 404 或未知路径重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
