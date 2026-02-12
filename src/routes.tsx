import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ContentSkeleton } from './components/common';
import { LanguageRouter, DEFAULT_LANGUAGE, isValidLanguage } from './components/LanguageRouter';

// Lazy load pages for code splitting
import AppLayout from './components/layout/AppLayout';
const Landing = lazy(() => import('./pages/Landing'));
const CoursesOverview = lazy(() => import('./pages/CoursesOverview'));
const PracticeHubPage = lazy(() => import('./pages/PracticeHubPage'));
const MediaHubPage = lazy(() => import('./pages/MediaHubPage'));
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
const PricingDetailsPage = lazy(() => import('./pages/PricingDetailsPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const MobilePreviewPage = lazy(() => import('./pages/MobilePreviewPage'));
const DictionarySearchPage = lazy(() => import('./pages/DictionarySearchPage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));
const VocabBookPage = lazy(() => import('./pages/VocabBookPage'));
const VocabBookImmersivePage = lazy(() => import('./pages/VocabBookImmersivePage'));
const VocabBookListenPage = lazy(() => import('./pages/VocabBookListenPage'));
const VocabBookDictationPage = lazy(() => import('./pages/VocabBookDictationPage'));
const VocabBookSpellingPage = lazy(() => import('./pages/VocabBookSpellingPage'));
const VocabBookExportPdfPage = lazy(() => import('./pages/VocabBookExportPdfPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage.tsx'));

// Podcast Pages
const PodcastDashboard = lazy(() => import('./pages/PodcastDashboard'));
const PodcastSearchPage = lazy(() => import('./pages/PodcastSearchPage'));
const PodcastChannelPage = lazy(() => import('./pages/PodcastChannelPage'));
const PodcastPlayerPage = lazy(() => import('./pages/PodcastPlayerPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));

// Video Pages
const VideoLibraryPage = lazy(() => import('./pages/VideoLibraryPage'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'));

// Typing
const TypingPage = lazy(() => import('./pages/TypingPage'));

import { TextbookContent, TopikExam } from './types';

// Loading fallback component with skeleton screen
const PageLoader = () => <ContentSkeleton />;

const RedirectToDefaultLanguage: React.FC = () => {
  const location = useLocation();
  return (
    <Navigate
      to={{
        pathname: `/${DEFAULT_LANGUAGE}${location.pathname}`,
        search: location.search,
        hash: location.hash,
      }}
      replace
    />
  );
};

interface AppRoutesProps {
  canAccessContent: (content: TextbookContent | TopikExam) => boolean;
  onShowUpgradePrompt: () => void;
}

// Inner routes component that uses language from URL params
const LanguageAwareRoutes: React.FC<AppRoutesProps> = ({
  canAccessContent,
  onShowUpgradePrompt,
}) => {
  const { lang } = useParams<{ lang: string }>();
  const { language: authLanguage } = useAuth();
  const { t } = useTranslation();

  // Use URL language if valid, otherwise fall back to auth context language
  const language = lang && isValidLanguage(lang) ? lang : authLanguage;

  return (
    <ErrorBoundary moduleName={t('common.appName', 'Duhan')} language={language}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* === 公开路由 (无需登录) === */}
          <Route index element={<Landing />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="register" element={<AuthPage />} />
          <Route path="auth" element={<AuthPage />} /> {/* Google OAuth callback */}
          <Route path="verify-email" element={<VerifyEmailPage />} />
          <Route path="forgot-password" element={<ForgotPasswordPage />} />
          <Route path="reset-password" element={<ResetPasswordPage />} />
          <Route
            path="terms"
            element={<LegalDocumentPage language={language} documentType="terms" />}
          />
          <Route
            path="privacy"
            element={<LegalDocumentPage language={language} documentType="privacy" />}
          />
          <Route
            path="refund"
            element={<LegalDocumentPage language={language} documentType="refund" />}
          />
          <Route path="pricing" element={<SubscriptionPage />} />
          <Route path="pricing/details" element={<PricingDetailsPage />} />
          <Route path="payment/success" element={<PaymentSuccessPage />} />
          <Route path="preview/mobile" element={<MobilePreviewPage />} />
          {/* === 管理员登录页 (公开) === */}
          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="profile" element={<ProfilePage language={language} />} />
              <Route
                path="dashboard"
                element={
                  <DashboardPage
                    _canAccessContent={canAccessContent}
                    _onShowUpgradePrompt={onShowUpgradePrompt}
                  />
                }
              />
              <Route path="dashboard/course" element={<CourseDashboard />} />
              <Route path="dashboard/:moduleParam" element={<ModulePage />} />
              {/* Courses (教材选择) */}
              <Route path="courses" element={<CoursesOverview />} />
              <Route path="practice" element={<PracticeHubPage />} />
              <Route path="media" element={<MediaHubPage />} />
              <Route path="course/:instituteId" element={<CourseDashboard />} />
              <Route path="course/:instituteId/vocab" element={<VocabModulePage />} />
              <Route path="course/:instituteId/grammar" element={<GrammarModulePage />} />
              <Route path="course/:instituteId/:moduleParam" element={<ModulePage />} />
              <Route
                path="topik"
                element={
                  <TopikPage
                    canAccessContent={canAccessContent}
                    onShowUpgradePrompt={onShowUpgradePrompt}
                  />
                }
              />
              <Route
                path="topik/history"
                element={
                  <TopikPage
                    canAccessContent={canAccessContent}
                    onShowUpgradePrompt={onShowUpgradePrompt}
                  />
                }
              />
              <Route
                path="topik/:examId"
                element={
                  <TopikPage
                    canAccessContent={canAccessContent}
                    onShowUpgradePrompt={onShowUpgradePrompt}
                  />
                }
              />
              <Route
                path="topik/:examId/:view"
                element={
                  <TopikPage
                    canAccessContent={canAccessContent}
                    onShowUpgradePrompt={onShowUpgradePrompt}
                  />
                }
              />
              <Route path="notebook" element={<NotebookPage />} />
              <Route path="vocab-book" element={<VocabBookPage />} />
              <Route path="vocab-book/immerse" element={<VocabBookImmersivePage />} />
              <Route path="vocab-book/listen" element={<VocabBookListenPage />} />
              <Route path="vocab-book/dictation" element={<VocabBookDictationPage />} />
              <Route path="vocab-book/spelling" element={<VocabBookSpellingPage />} />
              <Route path="vocab-book/export-pdf" element={<VocabBookExportPdfPage />} />

              {/* Podcast Learning */}
              <Route path="podcasts" element={<PodcastDashboard />} />
              <Route path="podcasts/subscriptions" element={<PodcastDashboard />} />
              <Route path="podcasts/search" element={<PodcastSearchPage />} />
              <Route path="podcasts/channel" element={<PodcastChannelPage />} />
              <Route path="podcasts/player" element={<PodcastPlayerPage />} />
              <Route path="podcasts/history" element={<HistoryPage />} />

              {/* Video Learning */}
              <Route path="videos" element={<VideoLibraryPage />} />
              <Route path="video/:id" element={<VideoPlayerPage />} />

              {/* Typing Practice */}
              <Route path="typing" element={<TypingPage />} />
              <Route path="dictionary/search" element={<DictionarySearchPage />} />
            </Route>
          </Route>
          {/* === 管理员路由 (独立页面，需要 Admin 权限) === */}
          <Route
            element={
              <ProtectedRoute
                requireAdmin={true}
                redirectTo={`/${lang || DEFAULT_LANGUAGE}/admin/login`}
              />
            }
          >
            <Route path="admin" element={<AdminPage />} />
            <Route path="admin/:tab" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

export const AppRoutes: React.FC<AppRoutesProps> = ({ canAccessContent, onShowUpgradePrompt }) => {
  const location = useLocation();
  return (
    <Routes>
      {/* Redirect root to default language */}
      <Route
        path="/"
        element={
          <Navigate
            to={{ pathname: `/${DEFAULT_LANGUAGE}`, search: location.search, hash: location.hash }}
            replace
          />
        }
      />

      {/* Language-prefixed routes */}
      <Route
        path="/:lang/*"
        element={
          <LanguageRouter>
            <LanguageAwareRoutes
              canAccessContent={canAccessContent}
              onShowUpgradePrompt={onShowUpgradePrompt}
            />
          </LanguageRouter>
        }
      />

      <Route path="*" element={<RedirectToDefaultLanguage />} />
    </Routes>
  );
};
