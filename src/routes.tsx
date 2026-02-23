import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ContentSkeleton } from './components/common';
import {
  LanguageRouter,
  DEFAULT_LANGUAGE,
  detectLanguage,
  isValidLanguage,
} from './components/LanguageRouter';

// Lazy load pages for code splitting
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const Landing = lazy(() => import('./pages/Landing'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const PricingDetailsPage = lazy(() => import('./pages/PricingDetailsPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const MobilePreviewPage = lazy(() => import('./pages/MobilePreviewPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CourseDashboard = lazy(() => import('./pages/CourseDashboard'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const CoursesOverview = lazy(() => import('./pages/CoursesOverview'));
const PracticeHubPage = lazy(() => import('./pages/PracticeHubPage'));
const ReviewDashboardPage = lazy(() => import('./pages/ReviewDashboardPage'));
const ReviewQuizPage = lazy(() => import('./pages/ReviewQuizPage'));
const MediaHubPage = lazy(() => import('./pages/MediaHubPage'));
const ReadingDiscoveryPage = lazy(() => import('./pages/ReadingDiscoveryPage'));
const ReadingArticlePage = lazy(() => import('./pages/ReadingArticlePage'));
const VocabModulePage = lazy(() => import('./pages/VocabModulePage'));
const GrammarModulePage = lazy(() => import('./pages/GrammarModulePage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));
const TypingPage = lazy(() => import('./pages/TypingPage'));
const DictionarySearchPage = lazy(() => import('./pages/DictionarySearchPage'));

const VocabBookPage = lazy(() => import('./pages/VocabBookPage'));
const VocabBookImmersivePage = lazy(() => import('./pages/VocabBookImmersivePage'));
const VocabBookListenPage = lazy(() => import('./pages/VocabBookListenPage'));
const VocabBookDictationPage = lazy(() => import('./pages/VocabBookDictationPage'));
const VocabBookSpellingPage = lazy(() => import('./pages/VocabBookSpellingPage'));
const VocabBookExportPdfPage = lazy(() => import('./pages/VocabBookExportPdfPage'));

const TopikPage = lazy(() => import('./pages/TopikPage'));
const TopikWritingPage = lazy(() => import('./pages/TopikWritingPage'));
const PodcastDashboard = lazy(() => import('./pages/PodcastDashboard'));
const PodcastSearchPage = lazy(() => import('./pages/PodcastSearchPage'));
const PodcastChannelPage = lazy(() => import('./pages/PodcastChannelPage'));
const PodcastPlayerPage = lazy(() => import('./pages/PodcastPlayerPage'));
const HistoryPage = lazy(() => import('./pages/HistoryPage'));
const VideoLibraryPage = lazy(() => import('./pages/VideoLibraryPage'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'));

const AdminPage = lazy(() => import('./features/admin/AdminPage'));

// Loading fallback component with skeleton screen
const PageLoader = () => <ContentSkeleton />;
const withPageLoader = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const RedirectToDetectedLanguage: React.FC<{ keepPathname?: boolean }> = ({
  keepPathname = true,
}) => {
  const location = useLocation();
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    detectLanguage().then(detectedLang => {
      if (cancelled) return;
      const nextPathname = keepPathname ? location.pathname : '/';
      const normalizedPath = nextPathname === '/' ? '' : nextPathname;
      setTarget(`/${detectedLang}${normalizedPath}${location.search}${location.hash}`);
    });
    return () => {
      cancelled = true;
    };
  }, [keepPathname, location.pathname, location.search, location.hash]);

  if (!target) {
    return <ContentSkeleton />;
  }

  return <Navigate to={target} replace />;
};

// Inner routes component that uses language from URL params
const LanguageAwareRoutes: React.FC = () => {
  const { lang } = useParams<{ lang: string }>();
  const { language: authLanguage } = useAuth();
  const { t } = useTranslation();

  // Use URL language if valid, otherwise fall back to auth context language
  const language = lang && isValidLanguage(lang) ? lang : authLanguage;

  return (
    <ErrorBoundary moduleName={t('common.appName', 'Duhan')} language={language}>
      <Routes>
        {/* === Public routes (no login required) === */}
        <Route index element={withPageLoader(<Landing />)} />
        <Route path="login" element={withPageLoader(<AuthPage />)} />
        <Route path="register" element={withPageLoader(<AuthPage />)} />
        <Route path="auth" element={withPageLoader(<AuthPage />)} /> {/* Google OAuth callback */}
        <Route path="verify-email" element={withPageLoader(<VerifyEmailPage />)} />
        <Route path="forgot-password" element={withPageLoader(<ForgotPasswordPage />)} />
        <Route path="reset-password" element={withPageLoader(<ResetPasswordPage />)} />
        <Route
          path="terms"
          element={withPageLoader(<LegalDocumentPage language={language} documentType="terms" />)}
        />
        <Route
          path="privacy"
          element={withPageLoader(<LegalDocumentPage language={language} documentType="privacy" />)}
        />
        <Route
          path="refund"
          element={withPageLoader(<LegalDocumentPage language={language} documentType="refund" />)}
        />
        <Route path="pricing" element={withPageLoader(<SubscriptionPage />)} />
        <Route path="pricing/details" element={withPageLoader(<PricingDetailsPage />)} />
        <Route path="payment/success" element={withPageLoader(<PaymentSuccessPage />)} />
        <Route path="preview/mobile" element={withPageLoader(<MobilePreviewPage />)} />
        {/* === Admin login page (public) === */}
        <Route path="admin/login" element={withPageLoader(<AdminLoginPage />)} />
        <Route element={<ProtectedRoute />}>
          <Route element={withPageLoader(<AppLayout />)}>
            <Route path="profile" element={<ProfilePage language={language} />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dashboard/course" element={<CourseDashboard />} />
            <Route path="dashboard/:moduleParam" element={<ModulePage />} />
            {/* Courses */}
            <Route path="courses" element={<CoursesOverview />} />
            <Route path="practice" element={<PracticeHubPage />} />
            <Route path="review" element={<ReviewDashboardPage />} />
            <Route path="review/quiz" element={<ReviewQuizPage />} />
            <Route path="media" element={<MediaHubPage />} />
            <Route path="reading" element={<ReadingDiscoveryPage />} />
            <Route path="reading/:articleId" element={<ReadingArticlePage />} />
            <Route path="course/:instituteId" element={<CourseDashboard />} />
            <Route path="course/:instituteId/vocab" element={<VocabModulePage />} />
            <Route path="course/:instituteId/grammar" element={<GrammarModulePage />} />
            <Route path="course/:instituteId/:moduleParam" element={<ModulePage />} />
            <Route path="topik" element={<TopikPage />} />
            <Route path="topik/history" element={<TopikPage />} />
            <Route path="topik/writing/:examId" element={<TopikWritingPage />} />
            <Route path="topik/:examId" element={<TopikPage />} />
            <Route path="topik/:examId/:view" element={<TopikPage />} />
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
        {/* === Admin routes (standalone pages, Admin permission required) === */}
        <Route
          element={
            <ProtectedRoute
              requireAdmin={true}
              redirectTo={`/${lang || DEFAULT_LANGUAGE}/admin/login`}
            />
          }
        >
          <Route path="admin" element={withPageLoader(<AdminPage />)} />
          <Route path="admin/:tab" element={withPageLoader(<AdminPage />)} />
        </Route>
        <Route path="*" element={withPageLoader(<NotFoundPage />)} />
      </Routes>
    </ErrorBoundary>
  );
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Redirect root to detected language */}
      <Route path="/" element={<RedirectToDetectedLanguage keepPathname={false} />} />

      {/* Language-prefixed routes */}
      <Route
        path="/:lang/*"
        element={
          <LanguageRouter>
            <LanguageAwareRoutes />
          </LanguageRouter>
        }
      />

      <Route path="*" element={<RedirectToDetectedLanguage />} />
    </Routes>
  );
};
