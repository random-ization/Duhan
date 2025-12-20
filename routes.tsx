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
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));

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
  const { language, setLanguage } = useAuth();

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* === 公开路由 (无需登录) === */}
        <Route path="/" element={<Landing language={language} onLanguageChange={setLanguage} />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/courses" element={<CoursesOverview />} />
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

        <Route element={<ProtectedRoute />}>
          <Route path="/pricing" element={<SubscriptionPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/profile" element={<ProfilePage language={language} />} />
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
            path="/topik/history"
            element={
              <TopikPage
                canAccessContent={canAccessContent}
                onShowUpgradePrompt={onShowUpgradePrompt}
              />
            }
          />
          <Route
            path="/topik/:examId"
            element={
              <TopikPage
                canAccessContent={canAccessContent}
                onShowUpgradePrompt={onShowUpgradePrompt}
              />
            }
          />
          <Route
            path="/topik/:examId/:view"
            element={
              <TopikPage
                canAccessContent={canAccessContent}
                onShowUpgradePrompt={onShowUpgradePrompt}
              />
            }
          />
          <Route path="/notebook" element={<NotebookPage />} />
        </Route>

        {/* === 管理员路由 (需要 Admin 权限) === */}
        <Route element={<ProtectedRoute requireAdmin={true} />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/:tab" element={<AdminPage />} />
        </Route>

        {/* 404 或未知路径重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
