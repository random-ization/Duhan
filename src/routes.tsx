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
const loadPublicDomain = () => import('./pages/domains/public.domain');
const loadCoreAppDomain = () => import('./pages/domains/core-app.domain');
const loadCourseFlowDomain = () => import('./pages/domains/course-flow.domain');
const loadMediaDomain = () => import('./pages/domains/media.domain');
const loadVocabBookDomain = () => import('./pages/domains/vocab-book.domain');
const loadTopikDomain = () => import('./pages/domains/topik.domain');
const loadAdminDomain = () => import('./pages/domains/admin.domain');
const TopikWritingPage = lazy(() => import('./pages/TopikWritingPage'));

const Landing = lazy(() => loadPublicDomain().then(m => ({ default: m.LandingPage })));
const AuthPage = lazy(() => loadPublicDomain().then(m => ({ default: m.AuthPage })));
const VerifyEmailPage = lazy(() => loadPublicDomain().then(m => ({ default: m.VerifyEmailPage })));
const ForgotPasswordPage = lazy(() =>
  loadPublicDomain().then(m => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() => loadPublicDomain().then(m => ({ default: m.ResetPasswordPage })));
const LegalDocumentPage = lazy(() =>
  loadPublicDomain().then(m => ({ default: m.LegalDocumentPage }))
);
const SubscriptionPage = lazy(() =>
  loadPublicDomain().then(m => ({ default: m.SubscriptionPage }))
);
const PricingDetailsPage = lazy(() =>
  loadPublicDomain().then(m => ({ default: m.PricingDetailsPage }))
);
const PaymentSuccessPage = lazy(() =>
  loadPublicDomain().then(m => ({ default: m.PaymentSuccessPage }))
);
const MobilePreviewPage = lazy(() =>
  loadPublicDomain().then(m => ({ default: m.MobilePreviewPage }))
);
const AdminLoginPage = lazy(() => loadPublicDomain().then(m => ({ default: m.AdminLoginPage })));
const NotFoundPage = lazy(() => loadPublicDomain().then(m => ({ default: m.NotFoundPage })));

const ProfilePage = lazy(() => loadCoreAppDomain().then(m => ({ default: m.ProfilePage })));
const DashboardPage = lazy(() => loadCoreAppDomain().then(m => ({ default: m.DashboardPage })));
const CourseDashboard = lazy(() =>
  loadCourseFlowDomain().then(m => ({ default: m.CourseDashboardPage }))
);
const ModulePage = lazy(() => loadCourseFlowDomain().then(m => ({ default: m.ModulePage })));
const CoursesOverview = lazy(() =>
  loadCourseFlowDomain().then(m => ({ default: m.CoursesOverviewPage }))
);
const PracticeHubPage = lazy(() =>
  loadCoreAppDomain().then(m => ({ default: m.PracticeHubPage }))
);
const ReviewDashboardPage = lazy(() =>
  import('./pages/ReviewDashboardPage').then(m => ({ default: m.default }))
);
const ReviewQuizPage = lazy(() =>
  import('./pages/ReviewQuizPage').then(m => ({ default: m.default }))
);
const MediaHubPage = lazy(() => loadCoreAppDomain().then(m => ({ default: m.MediaHubPage })));
const ReadingDiscoveryPage = lazy(() =>
  loadCoreAppDomain().then(m => ({ default: m.ReadingDiscoveryPage }))
);
const ReadingArticlePage = lazy(() =>
  loadCoreAppDomain().then(m => ({ default: m.ReadingArticlePage }))
);
const VocabModulePage = lazy(() =>
  loadCourseFlowDomain().then(m => ({ default: m.VocabModulePage }))
);
const GrammarModulePage = lazy(() =>
  loadCourseFlowDomain().then(m => ({ default: m.GrammarModulePage }))
);
const NotebookPage = lazy(() => loadCoreAppDomain().then(m => ({ default: m.NotebookPage })));
const TypingPage = lazy(() => loadCoreAppDomain().then(m => ({ default: m.TypingPage })));
const DictionarySearchPage = lazy(() =>
  loadCoreAppDomain().then(m => ({ default: m.DictionarySearchPage }))
);

const VocabBookPage = lazy(() =>
  loadVocabBookDomain().then(m => ({ default: m.VocabBookPage }))
);
const VocabBookImmersivePage = lazy(() =>
  loadVocabBookDomain().then(m => ({ default: m.VocabBookImmersivePage }))
);
const VocabBookListenPage = lazy(() =>
  loadVocabBookDomain().then(m => ({ default: m.VocabBookListenPage }))
);
const VocabBookDictationPage = lazy(() =>
  loadVocabBookDomain().then(m => ({ default: m.VocabBookDictationPage }))
);
const VocabBookSpellingPage = lazy(() =>
  loadVocabBookDomain().then(m => ({ default: m.VocabBookSpellingPage }))
);
const VocabBookExportPdfPage = lazy(() =>
  loadVocabBookDomain().then(m => ({ default: m.VocabBookExportPdfPage }))
);

const TopikPage = lazy(() => loadTopikDomain().then(m => ({ default: m.TopikPage })));

const PodcastDashboard = lazy(() =>
  loadMediaDomain().then(m => ({ default: m.PodcastDashboardPage }))
);
const PodcastSearchPage = lazy(() =>
  loadMediaDomain().then(m => ({ default: m.PodcastSearchPage }))
);
const PodcastChannelPage = lazy(() =>
  loadMediaDomain().then(m => ({ default: m.PodcastChannelPage }))
);
const PodcastPlayerPage = lazy(() =>
  loadMediaDomain().then(m => ({ default: m.PodcastPlayerPage }))
);
const HistoryPage = lazy(() => loadMediaDomain().then(m => ({ default: m.HistoryPage })));
const VideoLibraryPage = lazy(() =>
  loadMediaDomain().then(m => ({ default: m.VideoLibraryPage }))
);
const VideoPlayerPage = lazy(() =>
  loadMediaDomain().then(m => ({ default: m.VideoPlayerPage }))
);

const AdminPage = lazy(() => loadAdminDomain().then(m => ({ default: m.AdminPage })));

// Loading fallback component with skeleton screen
const PageLoader = () => <ContentSkeleton />;
const withPageLoader = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

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
          <Route element={<AppLayout />}>
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
            <LanguageAwareRoutes />
          </LanguageRouter>
        }
      />

      <Route path="*" element={<RedirectToDefaultLanguage />} />
    </Routes>
  );
};
