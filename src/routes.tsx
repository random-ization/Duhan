import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { getLabels } from './utils/i18n';
import { ContentSkeleton } from './components/common';

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
const AdminPage = lazy(() => import('./features/admin/AdminPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));
const VocabBookPage = lazy(() => import('./pages/VocabBookPage'));

// Podcast Pages
const PodcastDashboard = lazy(() => import('./pages/PodcastDashboard'));
const PodcastSearchPage = lazy(() => import('./pages/PodcastSearchPage'));
const PodcastChannelPage = lazy(() => import('./pages/PodcastChannelPage'));
const PodcastPlayerPage = lazy(() => import('./pages/PodcastPlayerPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

// Video Pages
const VideoLibraryPage = lazy(() => import('./pages/VideoLibraryPage'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'));

import { TextbookContent, TopikExam } from './types';

// Loading fallback component with skeleton screen
const PageLoader = ({ labels: _labels }: { labels: any }) => (
  <ContentSkeleton />
);

interface AppRoutesProps {
  canAccessContent: (content: TextbookContent | TopikExam) => boolean;
  onShowUpgradePrompt: () => void;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const { language } = useAuth();
  const labels = getLabels(language);

  return (
    <ErrorBoundary moduleName={labels.common?.appName || "Duhan"} language={language}>
      <Suspense fallback={<PageLoader labels={labels} />}>
        <Routes>
          {/* === 公开路由 (无需登录) === */}
          <Route path="/" element={<Landing />} />
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
          <Route path="/payment/success" element={<PaymentSuccessPage />} />

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
              <Route path="/vocab-book" element={<VocabBookPage />} />

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
    </ErrorBoundary>
  );
};
