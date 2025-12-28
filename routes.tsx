import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Lazy load pages for code splitting
import AppLayout from './components/layout/AppLayout';
const Landing = lazy(() => import('./pages/Landing'));
const CoursesOverview = lazy(() => import('./pages/CoursesOverview'));
const AuthPage = lazy(() => import('./pages/AuthPage'));

const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CourseDashboard = lazy(() => import('./pages/CourseDashboard'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const VocabModulePage = lazy(() => import('./pages/VocabModulePage'));
const GrammarModulePage = lazy(() => import('./pages/GrammarModulePage'));
const TopikPage = lazy(() => import('./pages/TopikPage'));
const AdminPage = lazy(() => import('./src/features/admin/AdminPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));

// Podcast Pages
const PodcastDashboard = lazy(() => import('./pages/PodcastDashboard'));
const PodcastSearchPage = lazy(() => import('./pages/PodcastSearchPage'));
const PodcastChannelPage = lazy(() => import('./pages/PodcastChannelPage'));
const PodcastPlayerPage = lazy(() => import('./pages/PodcastPlayerPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

// Video Pages
const VideoLibraryPage = lazy(() => import('./src/pages/VideoLibraryPage'));
const VideoPlayerPage = lazy(() => import('./src/pages/VideoPlayerPage'));

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
        <Route path="/auth" element={<AuthPage />} /> {/* Google OAuth callback */}
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
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
        <Route path="/pricing" element={<SubscriptionPage />} />

        {/* === 管理员登录页 (公开) === */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
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
            <Route path="/dashboard/course" element={<CourseDashboard />} />
            <Route path="/dashboard/:moduleParam" element={<ModulePage />} />
            {/* Courses (教材选择) */}
            <Route path="/courses" element={<CoursesOverview />} />
            <Route path="/course/:instituteId" element={<CourseDashboard />} />
            <Route path="/course/:instituteId/vocab" element={<VocabModulePage />} />
            <Route path="/course/:instituteId/grammar" element={<GrammarModulePage />} />
            <Route path="/course/:instituteId/:moduleParam" element={<ModulePage />} />
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

            {/* Podcast Learning */}
            <Route path="/podcasts" element={<PodcastDashboard />} />
            <Route path="/podcasts/search" element={<PodcastSearchPage />} />
            <Route path="/podcasts/channel" element={<PodcastChannelPage />} />
            <Route path="/podcasts/player" element={<PodcastPlayerPage />} />
            <Route path="/podcasts/history" element={<HistoryPage />} />

            {/* Video Learning */}
            <Route path="/videos" element={<VideoLibraryPage />} />
            <Route path="/video/:id" element={<VideoPlayerPage />} />
          </Route>
        </Route>

        {/* === 管理员路由 (独立页面，需要 Admin 权限) === */}
        <Route element={<ProtectedRoute requireAdmin={true} redirectTo="/admin/login" />}>
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/:tab" element={<AdminPage />} />
        </Route>

        {/* 404 或未知路径重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
};
