import React, { Suspense, lazy, useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLearningActions, useLearningSelection } from '../contexts/LearningContext';
import { useLayoutActions, useLayoutDashboardState } from '../contexts/LayoutContext';
import { useData } from '../contexts/DataContext';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { VOCAB, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTTS } from '../hooks/useTTS';
import { ContentSkeleton } from '../components/common';
import { trackEvent } from '../utils/analytics';
import { useUpgradeFlow } from '../hooks/useUpgradeFlow';
import {
  DASHBOARD_UPGRADE_BANNER_INTERVAL_MS,
  dismissDashboardUpgradeBanner,
  shouldShowDashboardUpgradeBanner,
} from '../utils/upgradeReminder';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../utils/browserStorage';
import {
  buildLearningModulePath,
  resolveLearningEntryTarget,
  TOPIK_GRAMMAR_COURSE_ID,
} from '../utils/learningFlow';

const LazyMobileDashboard = lazy(() =>
  import('../components/mobile/MobileDashboard').then(module => ({
    default: module.MobileDashboard,
  }))
);

const DesktopDashboardPage = lazy(() => import('./desktop/DesktopDashboardPage'));

const LazyEditableDashboardGrid = lazy(() =>
  import('../components/dashboard/EditableDashboardGrid').then(module => ({
    default: module.EditableDashboardGrid,
  }))
);



interface DailyPhraseData {
  id: string;
  korean: string;
  romanization: string;
  translation: string;
}

const ASSETS = {
  tigerAvif: '/emojis/Tiger_Face.avif',
} as const;

type DashboardTranslateFn = ReturnType<typeof useTranslation>['t'];



type DashboardUserLite = {
  lastUnit?: number;
  name?: string | null;
  tier?: string | null;
  subscriptionType?: string | null;
} | null;

type DashboardCourseProgress = {
  completedUnits: number[];
  totalUnits: number;
  progressPercent: number;
  lastUnitIndex?: number;
} | null;

type DashboardInstitute = { id: string; name: string; coverUrl?: string };

type DashboardProgressStats = {
  currentUnit: number;
  progressPercent: number;
};

type LearningEntranceModule = 'grammar' | 'vocabulary' | 'listening' | 'reading';

type LearningEntranceCard = {
  id: LearningEntranceModule;
  badge: string;
  title: string;
  subtitle: string;
  icon: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  ctaClass: string;
  ringClass: string;
};

function buildLearningEntranceCards(t: DashboardTranslateFn): LearningEntranceCard[] {
  return [
    {
      id: 'grammar',
      badge: 'GRAMMAR',
      title: t('courseDashboard.modules.grammar', { defaultValue: 'Grammar' }),
      subtitle: t('dashboard.learningFlow.grammar', {
        defaultValue: 'Pattern explanations and sentence structures',
      }),
      icon: '⚡️',
      bgClass: 'bg-violet-50/80 dark:bg-violet-400/10',
      borderClass: 'border-violet-200 dark:border-violet-300/30',
      badgeClass: 'bg-violet-500 text-white',
      ctaClass: 'text-violet-600 dark:text-violet-200',
      ringClass: 'border-violet-200/80 dark:border-violet-300/25',
    },
    {
      id: 'vocabulary',
      badge: 'VOCABULARY',
      title: t('courseDashboard.modules.vocabulary', { defaultValue: 'Vocabulary' }),
      subtitle: t('dashboard.learningFlow.vocabulary', {
        defaultValue: 'Word mastery with active recall practice',
      }),
      icon: '🧩',
      bgClass: 'bg-emerald-50/80 dark:bg-emerald-400/10',
      borderClass: 'border-emerald-200 dark:border-emerald-300/30',
      badgeClass: 'bg-emerald-500 text-white',
      ctaClass: 'text-emerald-600 dark:text-emerald-200',
      ringClass: 'border-emerald-200/80 dark:border-emerald-300/25',
    },
    {
      id: 'listening',
      badge: 'LISTENING',
      title: t('courseDashboard.modules.listening', { defaultValue: 'Listening' }),
      subtitle: t('dashboard.learningFlow.listening', {
        defaultValue: 'Audio comprehension with real-world Korean',
      }),
      icon: '🎧',
      bgClass: 'bg-amber-50/80 dark:bg-amber-400/10',
      borderClass: 'border-amber-200 dark:border-amber-300/30',
      badgeClass: 'bg-amber-500 text-white',
      ctaClass: 'text-amber-600 dark:text-amber-200',
      ringClass: 'border-amber-200/80 dark:border-amber-300/25',
    },
    {
      id: 'reading',
      badge: 'READING',
      title: t('courseDashboard.modules.reading', { defaultValue: 'Reading' }),
      subtitle: t('dashboard.learningFlow.reading', {
        defaultValue: 'Articles and text drills for reading fluency',
      }),
      icon: '📘',
      bgClass: 'bg-blue-50/80 dark:bg-blue-400/10',
      borderClass: 'border-blue-300 dark:border-blue-300/30',
      badgeClass: 'bg-blue-500 text-white',
      ctaClass: 'text-blue-600 dark:text-blue-200',
      ringClass: 'border-blue-200/80 dark:border-blue-300/25',
    },
  ];
}

function getGreetingMessage(t: DashboardTranslateFn) {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting.morning', { defaultValue: 'Good morning' });
  if (hour < 18) return t('dashboard.greeting.afternoon', { defaultValue: 'Good afternoon' });
  return t('dashboard.greeting.evening', { defaultValue: 'Good evening' });
}



function resolveDashboardLanguage(language: string | null | undefined) {
  if (language) return language;
  return 'en';
}



function getVocabBookCountArgs(user: DashboardUserLite) {
  if (!user) return 'skip' as const;
  return { includeMastered: true, savedByUserOnly: true };
}

function getCourseProgressArgs(user: DashboardUserLite, selectedInstitute: string | null) {
  if (!user || !selectedInstitute) return 'skip' as const;
  return { courseId: selectedInstitute };
}

function getProgressStats(
  courseProgress: DashboardCourseProgress | undefined,
  user: DashboardUserLite
): DashboardProgressStats {
  const completedUnits = courseProgress?.completedUnits ?? [];
  const totalUnits = courseProgress?.totalUnits || 10;
  const inferredUnit =
    completedUnits.length > 0 ? Math.min(Math.max(...completedUnits) + 1, totalUnits) : 1;
  const currentUnit = courseProgress?.lastUnitIndex || user?.lastUnit || inferredUnit;
  const progressPercent =
    courseProgress?.progressPercent ?? Math.min(100, Math.round((currentUnit / totalUnits) * 100));
  return { currentUnit, progressPercent };
}

function resolveInstituteName(
  selectedInstitute: string | null,
  institutes: DashboardInstitute[] | undefined,
  institutesLoading: boolean,
  t: DashboardTranslateFn
) {
  if (!selectedInstitute) return t('dashboard.textbook.label', { defaultValue: 'Textbook' });
  if (institutesLoading) return t('common.loading', { defaultValue: 'Loading...' });
  const institute = institutes?.find(item => item.id === selectedInstitute);
  if (institute) return institute.name;
  return selectedInstitute;
}

function getSavedWordsCount(vocabBookCount: { count: number } | null | undefined) {
  if (!vocabBookCount) return 0;
  return vocabBookCount.count;
}

function getLearnerName(user: DashboardUserLite) {
  const firstName = user?.name?.split(' ')[0];
  if (firstName) return firstName;
  return 'Learner';
}

function getDashboardGridClassName(isEditing: boolean) {
  if (isEditing) {
    return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(220px,auto)] transition-all scale-[0.98] rounded-3xl bg-muted p-4 ring-4 ring-primary/20';
  }
  return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(220px,auto)] transition-all';
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TIGER_PRELOAD_SELECTOR = 'link[data-dashboard-tiger-preload="true"]';



function DashboardPage() {
  const { user, language, viewerAccess } = useAuth();
  const { speak, isLoading: isSpeaking } = useTTS();
  const [lowPriorityQueriesReady, setLowPriorityQueriesReady] = useState(
    () => typeof globalThis.window === 'undefined'
  );
  const dailyPhrase = useQuery(
    qRef<{ language: string }, DailyPhraseData | null>('vocab:getDailyPhrase'),
    lowPriorityQueriesReady
      ? {
        language: resolveDashboardLanguage(language),
      }
      : 'skip'
  );
  const isMobile = useIsMobile();
  const { startUpgradeFlow, authLoading: upgradeFlowLoading } = useUpgradeFlow();
  const { t } = useTranslation();
  const { selectedInstitute, selectedLevel, recentMaterials } = useLearningSelection();
  const { setSelectedInstitute, setSelectedLevel } = useLearningActions();
  const { isEditing, cardOrder } = useLayoutDashboardState();
  const { updateCardOrder } = useLayoutActions();
  const { institutes, isLoading: institutesLoading } = useData(); // Get institutes data
  const navigate = useLocalizedNavigate();
  const [searchParams] = useSearchParams();
  const [upgradeBannerRefreshKey, setUpgradeBannerRefreshKey] = useState(0);
  const dashboardView = searchParams.get('view'); // 'practice' or null (default = learn)

  const dashboardLanguage = resolveDashboardLanguage(language);
  const enableDesktopKsoftDashboard = import.meta.env.VITE_ENABLE_DESKTOP_KSOFT_DASHBOARD === '1';

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') {
      return;
    }

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const idleWindow = globalThis.window as IdleWindow;
    let timerId: number | null = null;
    let idleId: number | null = null;

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(() => setLowPriorityQueriesReady(true), {
        timeout: 1200,
      });
    } else {
      timerId = globalThis.window.setTimeout(() => setLowPriorityQueriesReady(true), 500);
    }

    return () => {
      if (idleId !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleId);
      }
      if (timerId !== null) {
        globalThis.window.clearTimeout(timerId);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined' || isMobile) {
      return;
    }

    const existingLink = document.head.querySelector<HTMLLinkElement>(TIGER_PRELOAD_SELECTOR);
    if (existingLink) {
      return;
    }

    const preloadLink = document.createElement('link');
    preloadLink.rel = 'preload';
    preloadLink.as = 'image';
    preloadLink.type = 'image/avif';
    preloadLink.href = ASSETS.tigerAvif;
    preloadLink.setAttribute('data-dashboard-tiger-preload', 'true');
    document.head.appendChild(preloadLink);

    return () => {
      if (preloadLink.parentNode === document.head) {
        document.head.removeChild(preloadLink);
      }
    };
  }, [isMobile]);

  useEffect(() => {
    if (dashboardView !== 'practice') return;
    navigate('/courses', { replace: true });
  }, [dashboardView, navigate]);

  useEffect(() => {
    if (!user?.id) return;
    const signupAt = user.joinDate ?? user.createdAt;
    if (!signupAt) return;

    const daysSinceSignup = Math.floor((Date.now() - signupAt) / ONE_DAY_MS);
    if (daysSinceSignup < 1) return;
    if (typeof globalThis.window === 'undefined') return;

    const dedupeKey = `duhan:retention:day1:${user.id}`;
    if (safeGetLocalStorageItem(dedupeKey) === '1') return;

    trackEvent('day1_retention', {
      language: dashboardLanguage,
      userTier: user.tier || 'UNKNOWN',
      daysSinceSignup,
    });
    safeSetLocalStorageItem(dedupeKey, '1');
  }, [dashboardLanguage, user?.createdAt, user?.id, user?.joinDate, user?.tier]);

  useEffect(() => {
    if (!user?.id || viewerAccess?.isPremium) {
      return;
    }

    const intervalId = globalThis.window.setInterval(
      () => setUpgradeBannerRefreshKey(current => current + 1),
      Math.min(DASHBOARD_UPGRADE_BANNER_INTERVAL_MS, 60_000)
    );

    return () => {
      globalThis.window.clearInterval(intervalId);
    };
  }, [user, viewerAccess?.isPremium]);

  const isPremiumUser = Boolean(viewerAccess?.isPremium);
  const showUpgradeBanner = Boolean(
    user?.id &&
    !isPremiumUser &&
    upgradeBannerRefreshKey >= 0 &&
    shouldShowDashboardUpgradeBanner(user.id)
  );

  // Card groups

  const vocabBookCount = useQuery(
    qRef<{ includeMastered?: boolean; savedByUserOnly?: boolean }, { count: number }>(
      'vocab:getVocabBookCount'
    ),
    getVocabBookCountArgs(user)
  );
  const reviewSummary = useQuery(
    VOCAB.getReviewSummary,
    user && lowPriorityQueriesReady ? {} : 'skip'
  );
  const dueReviews = reviewSummary?.dueNow ?? 0;
  const courseProgress = useQuery(
    qRef<
      { courseId: string },
      {
        completedUnits: number[];
        totalUnits: number;
        progressPercent: number;
        lastUnitIndex?: number;
      } | null
    >('progress:getCourseProgress'),
    dashboardView === 'practice' ? 'skip' : getCourseProgressArgs(user, selectedInstitute)
  );

  const savedWordsCount = getSavedWordsCount(vocabBookCount);
  const { currentUnit, progressPercent } = useMemo(
    () => getProgressStats(courseProgress, user),
    [courseProgress, user]
  );

  // Lookup institute name
  const instituteName = useMemo(
    () =>
      resolveInstituteName(
        selectedInstitute,
        institutes as DashboardInstitute[] | undefined,
        institutesLoading,
        t
      ),
    [selectedInstitute, institutes, institutesLoading, t]
  );
  const isInstituteNameLoading = Boolean(selectedInstitute) && institutesLoading;
  const greeting = getGreetingMessage(t);
  const learnerName = getLearnerName(user);
  const gridClassName = getDashboardGridClassName(isEditing);
  const learningEntranceCards = buildLearningEntranceCards(t);
  const learningEntryTarget = useMemo(
    () =>
      resolveLearningEntryTarget({
        institutes,
        selectedInstitute,
        selectedLevel,
        userLastInstitute: user?.lastInstitute,
      }),
    [institutes, selectedInstitute, selectedLevel, user?.lastInstitute]
  );
  const grammarEntryTarget = useMemo(
    () =>
      resolveLearningEntryTarget({
        institutes,
        selectedInstitute: recentMaterials.grammar?.instituteId ?? TOPIK_GRAMMAR_COURSE_ID,
        selectedLevel: recentMaterials.grammar?.level,
        userLastInstitute: null,
      }),
    [institutes, recentMaterials]
  );
  const currentMaterialMeta = useMemo(() => {
    const allInstitutes = institutes as DashboardInstitute[] | undefined;
    if (!allInstitutes || allInstitutes.length === 0) {
      return { name: instituteName, coverUrl: undefined as string | undefined };
    }

    if (learningEntryTarget?.instituteId) {
      const targetInstitute = allInstitutes.find(
        item => item.id === learningEntryTarget.instituteId
      );
      if (targetInstitute) {
        return {
          name: targetInstitute.name,
          coverUrl: targetInstitute.coverUrl,
        };
      }
    }

    return { name: instituteName, coverUrl: undefined as string | undefined };
  }, [institutes, instituteName, learningEntryTarget]);
  const onSpeakDailyPhrase = useCallback(() => {
    if (dailyPhrase?.korean) {
      speak(dailyPhrase.korean);
    }
  }, [dailyPhrase, speak]);


  if (isMobile) {
    return (
      <Suspense fallback={<ContentSkeleton />}>
        <LazyMobileDashboard
          learningEntryTarget={learningEntryTarget}
          institutes={institutes}
          institutesLoading={institutesLoading}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ContentSkeleton />}>
      <DesktopDashboardPage
        navigate={navigate}
        t={t}
        user={user}
        dashboardLanguage={dashboardLanguage}
        enableDesktopKsoftDashboard={enableDesktopKsoftDashboard}
        greeting={greeting}
        learnerName={learnerName}
        isPremiumUser={isPremiumUser}
        showUpgradeBanner={showUpgradeBanner}
        upgradeBannerRefreshKey={upgradeBannerRefreshKey}
        setUpgradeBannerRefreshKey={setUpgradeBannerRefreshKey}
        startUpgradeFlow={startUpgradeFlow}
        upgradeFlowLoading={upgradeFlowLoading}
        dashboardView={dashboardView}
        dueReviews={dueReviews}
        reviewSummary={reviewSummary}
        currentMaterialMeta={currentMaterialMeta}
        learningEntranceCards={learningEntranceCards}
        learningEntryTarget={learningEntryTarget}
        grammarEntryTarget={grammarEntryTarget}
        setSelectedInstitute={setSelectedInstitute}
        setSelectedLevel={setSelectedLevel}
        isEditing={isEditing}
        cardOrder={cardOrder}
        updateCardOrder={updateCardOrder}
        gridClassName={gridClassName}
        dailyPhrase={dailyPhrase}
        isSpeaking={isSpeaking}
        onSpeakDailyPhrase={onSpeakDailyPhrase}
        isInstituteNameLoading={isInstituteNameLoading}
        instituteName={instituteName}
        selectedLevel={selectedLevel}
        currentUnit={currentUnit}
        progressPercent={progressPercent}
        savedWordsCount={savedWordsCount}
        trackEvent={trackEvent}
        safeSetLocalStorageItem={safeSetLocalStorageItem}
        dismissDashboardUpgradeBanner={dismissDashboardUpgradeBanner}
        getDashboardGridClassName={getDashboardGridClassName}
      />
    </Suspense>
  );
}

export default React.memo(DashboardPage);
