import React, { Suspense, lazy, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import { ContentSkeleton } from './components/common';
import { useGlobalSettings } from './hooks/useGlobalSettings';
import {
  LanguageRouter,
  DEFAULT_LANGUAGE,
  detectLanguage,
  isValidLanguage,
  normalizeLocalizedPathname,
} from './components/LanguageRouter';

// Lazy load pages for code splitting
const AppLayout = lazy(() => import('./components/layout/AppLayout'));
const ProtectedRoute = lazy(() =>
  import('./components/ProtectedRoute').then(m => ({ default: m.ProtectedRoute }))
);
const Landing = lazy(() => import('./pages/Landing'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const LegalDocumentPage = lazy(() => import('./pages/LegalDocumentPage'));
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage'));
const PricingDetailsPage = lazy(() => import('./pages/PricingDetailsPage'));
const TopikFeaturePage = lazy(() => import('./pages/features/TopikFeaturePage'));
const VocabFeaturePage = lazy(() => import('./pages/features/VocabFeaturePage'));
const ListeningFeaturePage = lazy(() => import('./pages/features/ListeningFeaturePage'));
const ReadingFeaturePage = lazy(() => import('./pages/features/ReadingFeaturePage'));
const LearnHubPage = lazy(() => import('./pages/LearnHubPage'));
const LearnGuidePage = lazy(() => import('./pages/LearnGuidePage'));
const HelpCenterPage = lazy(() => import('./pages/HelpCenterPage'));
const PaymentSuccessPage = lazy(() => import('./pages/PaymentSuccessPage'));
const AdminLoginPage = lazy(() => import('./pages/AdminLoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage'));
const ModulePage = lazy(() => import('./pages/ModulePage'));
const CoursesOverview = lazy(() => import('./pages/CoursesOverview'));
const PracticeHubPage = lazy(() => import('./pages/PracticeHubPage'));
const ReviewQuizPage = lazy(() => import('./pages/ReviewQuizPage'));
const MediaHubPage = lazy(() => import('./pages/MediaHubPage'));
const ReadingDiscoveryPage = lazy(() => import('./pages/ReadingDiscoveryPage'));
const ReadingArticlePage = lazy(() => import('./pages/ReadingArticlePage'));
const PictureBookReaderPage = lazy(() => import('./pages/PictureBookReaderPage'));
const EpubReaderPage = lazy(() => import('./pages/EpubReaderPage'));
const EpubUploadPage = lazy(() => import('./pages/EpubUploadPage'));
const VocabModulePage = lazy(() => import('./pages/VocabModulePage'));
const GrammarModulePage = lazy(() => import('./pages/GrammarModulePage'));
const GrammarHubPage = lazy(() => import('./pages/GrammarHubPage'));
const NotebookPage = lazy(() => import('./pages/NotebookPage'));
const TypingPage = lazy(() => import('./pages/TypingPage'));
const DictionarySearchPage = lazy(() => import('./pages/DictionarySearchPage'));
const CommunityAddPage = lazy(() => import('./pages/CommunityAddPage'));
const DesktopCommunityPage = lazy(() => import('./pages/desktop/DesktopCommunityPage'));
const MobileCommunityPage = lazy(() => import('./components/mobile/MobileCommunityPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const DesktopQAListPage = lazy(() => import('./pages/desktop/DesktopQAListPage'));
const DesktopQADetailPage = lazy(() => import('./pages/desktop/DesktopQADetailPage'));
const DesktopAskQuestionPage = lazy(() => import('./pages/desktop/DesktopAskQuestionPage'));
const MobileQAListPage = lazy(() => import('./components/mobile/MobileQAListPage'));
const MobileQADetailPage = lazy(() => import('./components/mobile/MobileQADetailPage'));
const MobileAskQuestionPage = lazy(() => import('./components/mobile/MobileAskQuestionPage'));
const DesktopCommunityProfilePage = lazy(
  () => import('./pages/desktop/DesktopCommunityProfilePage')
);
const MobileCommunityProfilePage = lazy(
  () => import('./components/mobile/MobileCommunityProfilePage')
);

import { useIsMobile } from './hooks/useIsMobile';

const VocabBookPage = lazy(() => import('./pages/VocabBookPage'));
const VocabBookPracticePage = lazy(() => import('./pages/VocabBookPracticePage'));
const VocabBookExportPdfPage = lazy(() => import('./pages/VocabBookExportPdfPage'));

const TopikPage = lazy(() => import('./pages/TopikPage'));
const TopikWritingPage = lazy(() => import('./pages/TopikWritingPage'));
const PodcastHubPage = lazy(() => import('./pages/PodcastHubPage'));
const PodcastSearchPage = lazy(() => import('./pages/PodcastSearchPage'));
const PodcastChannelPage = lazy(() => import('./pages/PodcastChannelPage'));
const PodcastPlayerPageRoute = lazy(() => import('./pages/PodcastPlayerPageRoute'));
const VideoLibraryPage = lazy(() => import('./pages/VideoLibraryPage'));
const VideoPlayerPage = lazy(() => import('./pages/VideoPlayerPage'));
const TopikWritingCoachPage = lazy(() => import('./pages/learning/TopikWritingCoachPage'));
const TextImportPage = lazy(() => import('./pages/learning/TextImportPage'));
const SentenceLearningPage = lazy(() => import('./pages/learning/SentenceLearningPage'));
const AssetQualityReviewPage = lazy(() => import('./pages/learning/AssetQualityReviewPage'));
const SpeakingCoachPage = lazy(() => import('./pages/learning/SpeakingCoachPage'));
const WeeklyReportPage = lazy(() => import('./pages/dashboard/WeeklyReportPage'));
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'));

const AdminPage = lazy(() => import('./features/admin/AdminPage'));

// Loading fallback component with skeleton screen
const PageLoader = () => <ContentSkeleton />;
const withPageLoader = (element: React.ReactNode) => (
  <Suspense fallback={<PageLoader />}>{element}</Suspense>
);

const LocalizedAliasRoute: React.FC<{
  language: string;
  target: string;
  extraSearchParams?: Readonly<Record<string, string>>;
}> = ({ language, target, extraSearchParams }) => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  for (const [key, value] of Object.entries(extraSearchParams ?? {})) {
    searchParams.set(key, value);
  }
  const search = searchParams.toString();
  const searchSuffix = search ? `?${search}` : '';

  return <Navigate to={`/${language}${target}${searchSuffix}${location.hash}`} replace />;
};

const RedirectToDetectedLanguage: React.FC<{ keepPathname?: boolean }> = ({
  keepPathname = true,
}) => {
  const location = useLocation();
  const [target, setTarget] = useState<string | null>(null);
  const { storedSettings, isLoading: globalSettingsLoading } = useGlobalSettings();

  useEffect(() => {
    if (globalSettingsLoading) return;
    let cancelled = false;
    Promise.resolve(storedSettings?.displayLanguage ?? detectLanguage()).then(detectedLang => {
      if (cancelled) return;
      const nextPathname = keepPathname ? normalizeLocalizedPathname(location.pathname) : '/';
      const normalizedPath = nextPathname === '/' ? '' : nextPathname;
      setTarget(`/${detectedLang}${normalizedPath}${location.search}${location.hash}`);
    });
    return () => {
      cancelled = true;
    };
  }, [
    globalSettingsLoading,
    keepPathname,
    location.pathname,
    location.search,
    location.hash,
    storedSettings?.displayLanguage,
  ]);

  if (!target) {
    return <ContentSkeleton />;
  }

  return <Navigate to={target} replace />;
};

const CommunityPageRoute = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileCommunityPage /> : <DesktopCommunityPage />;
};

const QAListRoute = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileQAListPage /> : <DesktopQAListPage />;
};

const QADetailRoute = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileQADetailPage /> : <DesktopQADetailPage />;
};

const AskQuestionRoute = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileAskQuestionPage /> : <DesktopAskQuestionPage />;
};

const CommunityUserProfileRoute = () => {
  const isMobile = useIsMobile();
  return isMobile ? <MobileCommunityProfilePage /> : <DesktopCommunityProfilePage />;
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
        <Route path="landing" element={<LocalizedAliasRoute language={language} target="" />} />
        <Route path="login" element={withPageLoader(<AuthPage />)} />
        <Route path="register" element={withPageLoader(<AuthPage />)} />
        <Route path="auth" element={withPageLoader(<AuthPage />)} /> {/* Google OAuth callback */}
        <Route path="auth/verify-email" element={withPageLoader(<VerifyEmailPage />)} />
        <Route path="auth/forgot-password" element={withPageLoader(<ForgotPasswordPage />)} />
        <Route path="auth/reset-password" element={withPageLoader(<ResetPasswordPage />)} />
        <Route
          path="verify-email"
          element={<LocalizedAliasRoute language={language} target="/auth/verify-email" />}
        />
        <Route
          path="forgot-password"
          element={<LocalizedAliasRoute language={language} target="/auth/forgot-password" />}
        />
        <Route
          path="reset-password"
          element={<LocalizedAliasRoute language={language} target="/auth/reset-password" />}
        />
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
        <Route
          path="subscription"
          element={<LocalizedAliasRoute language={language} target="/pricing" />}
        />
        <Route path="pricing/details" element={withPageLoader(<PricingDetailsPage />)} />
        <Route
          path="subscription/details"
          element={<LocalizedAliasRoute language={language} target="/pricing/details" />}
        />
        <Route path="learn" element={withPageLoader(<LearnHubPage />)} />
        <Route path="learn/:guideSlug" element={withPageLoader(<LearnGuidePage />)} />
        <Route path="help" element={withPageLoader(<HelpCenterPage />)} />
        <Route path="payment/success" element={withPageLoader(<PaymentSuccessPage />)} />
        <Route path="features/topik" element={withPageLoader(<TopikFeaturePage />)} />
        <Route path="features/vocab" element={withPageLoader(<VocabFeaturePage />)} />
        <Route path="features/listening" element={withPageLoader(<ListeningFeaturePage />)} />
        <Route path="features/reading" element={withPageLoader(<ReadingFeaturePage />)} />
        {/* === Admin login page (public) === */}
        <Route path="admin/login" element={withPageLoader(<AdminLoginPage />)} />
        <Route element={withPageLoader(<ProtectedRoute />)}>
          {/* Onboarding - outside AppLayout (full-screen wizard) */}
          <Route path="onboarding" element={withPageLoader(<OnboardingPage />)} />
          <Route element={withPageLoader(<AppLayout />)}>
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="profile/*" element={<ProfilePage language={language} />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="dashboard/course" element={<CourseDetailPage />} />
            <Route path="dashboard/weekly-report" element={<WeeklyReportPage />} />
            <Route path="dashboard/:moduleParam" element={<ModulePage />} />
            {/* Courses */}
            <Route path="courses" element={<CoursesOverview />} />
            <Route path="grammar" element={<GrammarHubPage />} />
            <Route
              path="practice"
              element={<LocalizedAliasRoute language={language} target="/courses" />}
            />
            <Route path="review" element={<PracticeHubPage />} />
            <Route path="review/quiz" element={<ReviewQuizPage />} />
            <Route path="media" element={<MediaHubPage />} />
            <Route path="reading" element={<ReadingDiscoveryPage />} />
            <Route path="reading/upload" element={<EpubUploadPage />} />
            <Route path="reading/books/:slug" element={<PictureBookReaderPage />} />
            <Route path="reading/library/:slug" element={<EpubReaderPage />} />
            <Route path="reading/:articleId" element={<ReadingArticlePage />} />
            <Route path="course/:instituteId" element={<CourseDetailPage />} />
            <Route path="course/:instituteId/vocab" element={<VocabModulePage />} />
            <Route path="course/:instituteId/grammar" element={<GrammarModulePage />} />
            <Route path="course/:instituteId/:moduleParam" element={<ModulePage />} />
            <Route path="topik" element={<TopikPage />} />
            <Route
              path="topik/history"
              element={
                <LocalizedAliasRoute
                  language={language}
                  target="/topik"
                  extraSearchParams={{ view: 'history' }}
                />
              }
            />
            <Route path="topik/writing-coach" element={<TopikWritingCoachPage />} />
            <Route path="topik/writing/:examId" element={<TopikWritingPage />} />
            <Route path="topik/:examId" element={<TopikPage />} />
            <Route path="topik/:examId/:view" element={<TopikPage />} />
            <Route path="learning/text-import" element={<TextImportPage />} />
            <Route path="learning/sentence/:sentenceId" element={<SentenceLearningPage />} />
            <Route path="learning/asset-quality" element={<AssetQualityReviewPage />} />
            <Route path="speaking" element={<SpeakingCoachPage />} />
            <Route path="notebook" element={<NotebookPage />} />
            <Route path="vocab-book" element={<VocabBookPage />} />
            <Route
              path="vocabbook"
              element={<LocalizedAliasRoute language={language} target="/vocab-book" />}
            />
            <Route path="vocab-book/practice" element={<VocabBookPracticePage />} />
            <Route path="vocab-book/export-pdf" element={<VocabBookExportPdfPage />} />

            {/* Podcast Learning */}
            <Route path="podcasts" element={<PodcastHubPage />} />
            <Route
              path="podcasts/subscriptions"
              element={<LocalizedAliasRoute language={language} target="/podcasts" />}
            />
            <Route path="podcasts/search" element={<PodcastSearchPage />} />
            <Route path="podcasts/channel" element={<PodcastChannelPage />} />
            <Route path="podcasts/player" element={<PodcastPlayerPageRoute />} />
            <Route
              path="podcasts/history"
              element={<LocalizedAliasRoute language={language} target="/podcasts" />}
            />

            {/* Video Learning */}
            <Route path="videos" element={<VideoLibraryPage />} />
            <Route path="video/:id" element={<VideoPlayerPage />} />

            {/* Typing Practice */}
            <Route path="typing" element={<TypingPage />} />
            <Route path="dictionary/search" element={<DictionarySearchPage />} />
            <Route path="community" element={<CommunityPageRoute />} />
            <Route path="community/add" element={<CommunityAddPage />} />
            <Route path="community/qa" element={<QAListRoute />} />
            <Route path="community/qa/ask" element={<AskQuestionRoute />} />
            <Route path="community/qa/:questionId" element={<QADetailRoute />} />
            <Route path="community/u/:userId" element={<CommunityUserProfileRoute />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route
              path="history"
              element={<LocalizedAliasRoute language={language} target="/podcasts" />}
            />
          </Route>
        </Route>
        {/* === Admin routes (standalone pages, Admin permission required) === */}
        <Route
          element={withPageLoader(
            <ProtectedRoute
              requireAdmin={true}
              redirectTo={`/${lang || DEFAULT_LANGUAGE}/admin/login`}
            />
          )}
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
