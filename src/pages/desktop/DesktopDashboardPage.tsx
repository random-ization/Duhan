import React, { Suspense, lazy } from 'react';
import { ChevronRight, BookOpen, FileText } from 'lucide-react';
import { Button, Skeleton } from '../../components/ui';
import { BentoCard } from '../../components/dashboard/BentoCard';
import { DesktopNotificationsBell } from '../../components/desktop/DesktopNotificationsBell';
import { DesktopKsoftDashboardRail } from '../../components/desktop/DesktopKsoftDashboardRail';
import DictionarySearchDropdown from '../../components/dashboard/DictionarySearchDropdown';
import { ReviewWordsCard } from '../../features/vocab/components/ReviewWordsCard';
import LearnerSummaryCard from '../../components/dashboard/LearnerSummaryCard';
import type { EditableDashboardGridItem } from '../../components/dashboard/EditableDashboardGrid';
import { buildLearningModulePath } from '../../utils/learningFlow';

const LazyEditableDashboardGrid = lazy(() =>
  import('../../components/dashboard/EditableDashboardGrid').then(module => ({
    default: module.EditableDashboardGrid,
  }))
);

interface DailyPhraseData {
  id: string;
  korean: string;
  romanization: string;
  translation: string;
}

interface DashboardCardContext {
  t: any;
  isSpeaking: boolean;
  dailyPhrase: DailyPhraseData | null | undefined;
  onSpeakDailyPhrase: () => void;
  isInstituteNameLoading: boolean;
  instituteName: string;
  selectedLevel?: number | string | null;
  currentUnit: number;
  progressPercent: number;
  savedWordsCount: number;
}

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

interface DesktopDashboardPageProps {
  navigate: (path: string) => void;
  t: any;
  user: any;
  dashboardLanguage: string;
  enableDesktopKsoftDashboard: boolean;
  greeting: string;
  learnerName: string;
  isPremiumUser: boolean;
  showUpgradeBanner: boolean;
  upgradeBannerRefreshKey: number;
  setUpgradeBannerRefreshKey: React.Dispatch<React.SetStateAction<number>>;
  startUpgradeFlow: (opts: any) => void;
  upgradeFlowLoading: boolean;
  dashboardView: string | null;
  dueReviews: number;
  reviewSummary: any;
  currentMaterialMeta: { name: string; coverUrl?: string };
  learningEntranceCards: LearningEntranceCard[];
  learningEntryTarget: any;
  grammarEntryTarget: any;
  setSelectedInstitute: (id: string) => void;
  setSelectedLevel: any;
  isEditing: boolean;
  cardOrder: string[];
  updateCardOrder: (order: string[]) => void;
  gridClassName: string;
  dailyPhrase: DailyPhraseData | null | undefined;
  isSpeaking: boolean;
  onSpeakDailyPhrase: () => void;
  isInstituteNameLoading: boolean;
  instituteName: string;
  selectedLevel?: number | string | null;
  currentUnit: number;
  progressPercent: number;
  savedWordsCount: number;
  trackEvent: any;
  safeSetLocalStorageItem: (key: string, value: string) => void;
  dismissDashboardUpgradeBanner: (id: string) => void;
  getDashboardGridClassName: (isEditing: boolean) => string;
}

const ASSETS = {
  wave: '/emojis/Waving_Hand.webp',
  tigerWebp: '/emojis/Tiger_Face.webp',
  tigerPng: '/emojis/Tiger_Face.png',
  books: '/emojis/Books.png',
  book: '/emojis/Open_Book.png',
  tv: '/emojis/Television.png',
  headphone: '/emojis/Headphone.png',
  memo: '/emojis/Spiral_Calendar.webp',
  typing: '/emojis/keyboard_icon_3d_1769658200654.webp',
  vocabBook: '/emojis/flashcards_icon_3d_1769658215552.webp',
} as const;

const TigerCard: React.FC<
  Pick<DashboardCardContext, 't' | 'isSpeaking' | 'dailyPhrase' | 'onSpeakDailyPhrase'>
> = ({ t, isSpeaking, dailyPhrase, onSpeakDailyPhrase }) => (
  <BentoCard
    onClickPath={undefined}
    bgClass="bg-[#FFF4C7] dark:bg-amber-400/10"
    borderClass="border-[#FFE3A3] dark:border-amber-300/20"
    className="h-full flex flex-col justify-between"
  >
    <button
      type="button"
      onClick={onSpeakDailyPhrase}
      disabled={isSpeaking}
      className={`absolute top-2 right-2 w-24 h-24 hover:scale-110 transition active:scale-95 z-20 ${
        isSpeaking ? 'animate-pulse opacity-70' : ''
      }`}
      aria-label={t('dashboard.alt.speakPhrase', { defaultValue: 'Speak daily phrase' })}
    >
      <picture>
        <source srcSet={ASSETS.tigerWebp} type="image/webp" />
        <img
          src={ASSETS.tigerPng}
          className="w-full h-full object-contain pointer-events-none"
          alt={t('dashboard.alt.tigerCoach', { defaultValue: 'Tiger coach' })}
        />
      </picture>
    </button>
    <div className="relative z-10 mt-4 bg-card border-2 border-foreground px-4 py-3 rounded-2xl shadow-sm transform -rotate-2 group-hover:rotate-0 transition min-w-[200px]">
      {dailyPhrase ? (
        <div className="flex flex-col gap-1 text-center">
          <p className="font-bold text-foreground text-lg leading-tight">{dailyPhrase.korean}</p>
          {dailyPhrase.romanization && (
            <p className="text-[11px] text-muted-foreground/70 italic">
              {dailyPhrase.romanization}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            {dailyPhrase.translation}
          </p>
        </div>
      ) : (
        <div className="space-y-2 py-1">
          <Skeleton className="h-5 w-40 mx-auto bg-muted/20" />
          <Skeleton className="h-3 w-32 mx-auto bg-muted/20" />
        </div>
      )}
    </div>
  </BentoCard>
);

const TextbookCard: React.FC<
  Pick<
    DashboardCardContext,
    | 't'
    | 'isInstituteNameLoading'
    | 'instituteName'
    | 'selectedLevel'
    | 'currentUnit'
    | 'progressPercent'
  >
> = ({ t, isInstituteNameLoading, instituteName, selectedLevel, currentUnit, progressPercent }) => (
  <BentoCard
    onClickPath="/courses"
    bgClass="bg-sky-50 dark:bg-sky-400/10"
    borderClass="border-sky-200 dark:border-sky-300/20"
    className="h-full"
  >
    <div className="relative z-10 h-full flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <h3 className="font-black text-2xl text-foreground leading-tight">
          {isInstituteNameLoading ? (
            <span className="inline-flex flex-col gap-2">
              <Skeleton className="h-7 w-44 bg-blue-200/60 dark:bg-blue-300/20" />
              <Skeleton className="h-5 w-24 bg-blue-200/45 dark:bg-blue-300/15" />
            </span>
          ) : (
            <>
              {instituteName}
              <br />
              {selectedLevel
                ? t('dashboard.textbook.level', { defaultValue: 'Level {level}' }).replace(
                    '{level}',
                    String(selectedLevel)
                  )
                : t('dashboard.textbook.selectLevel', { defaultValue: 'Select Level' })}
            </>
          )}
        </h3>
        <div className="bg-card dark:bg-blue-400/14 border-2 border-blue-200 dark:border-blue-300/25 text-blue-600 dark:text-blue-200 px-2 py-1 rounded-lg text-xs font-bold">
          {t('dashboard.textbook.inProgress', { defaultValue: 'In Progress' })}
        </div>
      </div>
      <div className="mt-4">
        <div className="flex justify-between text-xs font-bold text-blue-400 dark:text-blue-200 mb-1">
          <span>
            {t('dashboard.textbook.chapter', { defaultValue: 'Chapter {unit}' }).replace(
              '{unit}',
              String(currentUnit)
            )}
          </span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full bg-card dark:bg-blue-400/14 h-3 rounded-full border-2 border-blue-100 dark:border-blue-300/20 overflow-hidden">
          <div
            className="bg-blue-500 dark:bg-blue-300/75 h-full border-r-2 border-blue-600 dark:border-blue-300/40"
            style={{ width: `${progressPercent}% ` }}
          ></div>
        </div>
      </div>
    </div>
    <img
      src={ASSETS.book}
      className="absolute -right-4 -bottom-4 w-28 h-28 opacity-90 group-hover:scale-110 group-hover:rotate-6 transition duration-300"
      alt=""
    />
  </BentoCard>
);

function renderDashboardCard(id: string, context: DashboardCardContext) {
  const {
    t,
    isSpeaking,
    dailyPhrase,
    onSpeakDailyPhrase,
    isInstituteNameLoading,
    instituteName,
    selectedLevel,
    currentUnit,
    progressPercent,
    savedWordsCount,
  } = context;
  switch (id) {
    case 'tiger':
      return (
        <TigerCard
          t={t}
          isSpeaking={isSpeaking}
          dailyPhrase={dailyPhrase}
          onSpeakDailyPhrase={onSpeakDailyPhrase}
        />
      );
    case 'textbook':
      return (
        <TextbookCard
          t={t}
          isInstituteNameLoading={isInstituteNameLoading}
          instituteName={instituteName}
          selectedLevel={selectedLevel}
          currentUnit={currentUnit}
          progressPercent={progressPercent}
        />
      );
    case 'reading':
      return (
        <BentoCard
          onClickPath="/reading"
          bgClass="bg-cyan-50 dark:bg-cyan-400/10"
          borderClass="border-cyan-200 dark:border-cyan-300/20"
          className="h-full"
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="inline-block bg-cyan-500 dark:bg-cyan-400/30 text-white dark:text-cyan-100 text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">
                {t('reading', { defaultValue: 'Reading' })}
              </div>
              <h3 className="font-black text-xl text-foreground leading-tight">
                {t('dashboard.readingHub.title', { defaultValue: 'Reading Discovery' })}
              </h3>
              <p className="text-muted-foreground font-bold text-sm mt-1">
                {t('dashboard.readingHub.subtitle', {
                  defaultValue: 'Korean reading feed and annotation tools',
                })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-card/90 dark:bg-cyan-400/12 px-2 py-1 rounded text-[10px] font-bold text-cyan-700 dark:text-cyan-200 border border-cyan-100 dark:border-cyan-300/20">
                {t('dashboard.readingHub.tagNews', { defaultValue: 'News' })}
              </div>
              <div className="bg-card/90 dark:bg-cyan-400/12 px-2 py-1 rounded text-[10px] font-bold text-cyan-700 dark:text-cyan-200 border border-cyan-100 dark:border-cyan-300/20">
                {t('dashboard.readingHub.tagArticles', { defaultValue: 'Article' })}
              </div>
            </div>
          </div>
          <img
            src={ASSETS.books}
            className="absolute -right-2 -bottom-2 w-24 h-24 group-hover:scale-110 group-hover:rotate-6 transition duration-300"
            alt=""
          />
        </BentoCard>
      );
    case 'youtube':
      return (
        <BentoCard
          onClickPath="/videos"
          bgClass="bg-rose-50 dark:bg-rose-400/10"
          borderClass="border-rose-200 dark:border-rose-300/20"
          className="h-full"
        >
          <div className="relative z-10">
            <h3 className="font-black text-2xl text-foreground whitespace-pre-wrap">
              {t('dashboard.video.cardTitle', { defaultValue: 'Immersion\nVideo' })}
            </h3>
            <div className="mt-2 inline-block bg-red-500 dark:bg-red-400/30 text-white dark:text-red-100 px-3 py-1 rounded-lg text-xs font-bold border-2 border-red-700 dark:border-red-300/30 shadow-sm">
              {t('dashboard.video.new', { defaultValue: 'New Updates' })}
            </div>
          </div>
          <img
            src={ASSETS.tv}
            className="absolute -right-4 -bottom-4 w-28 h-28 group-hover:scale-110 group-hover:rotate-3 transition duration-300"
            alt=""
          />
        </BentoCard>
      );
    case 'podcast':
      return (
        <BentoCard
          onClickPath="/podcasts"
          bgClass="bg-violet-100 dark:bg-violet-400/12"
          borderClass="border-violet-200 dark:border-violet-300/20"
          className="h-full"
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="inline-block bg-violet-500 dark:bg-violet-400/30 text-white dark:text-violet-100 border-2 border-violet-400 dark:border-violet-300/25 text-[10px] font-black px-2 py-0.5 rounded-md uppercase transform -rotate-2">
                {t('dashboard.podcast.label', { defaultValue: 'Podcast' })}
              </div>
              <h3 className="font-bold text-lg mt-2 leading-tight text-foreground">
                {t('dashboard.podcast.title', { defaultValue: 'Latest Podcast' })}
                <br />
                {t('dashboard.podcast.subtitle', { defaultValue: 'Iyagi Series' })}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 h-3 items-end">
                <div className="w-1 bg-violet-500 dark:bg-violet-300/75 h-full animate-pulse"></div>
                <div className="w-1 bg-violet-500 dark:bg-violet-300/75 h-2/3 animate-pulse"></div>
                <div className="w-1 bg-violet-500 dark:bg-violet-300/75 h-full animate-pulse"></div>
              </div>
              <span className="text-xs font-mono text-violet-600 dark:text-violet-200 font-bold">
                {t('dashboard.podcast.listen', { defaultValue: 'Listen Now' })}
              </span>
            </div>
          </div>
          <img
            src={ASSETS.headphone}
            className="absolute -right-2 -bottom-2 w-24 h-24 group-hover:scale-110 group-hover:-rotate-12 transition duration-300"
            alt=""
          />
        </BentoCard>
      );
    case 'vocab':
      return (
        <BentoCard
          onClickPath="/vocab-book"
          bgClass="bg-indigo-50 dark:bg-indigo-400/10"
          borderClass="border-indigo-200 dark:border-indigo-300/20"
          className="h-full"
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="inline-block bg-indigo-500 dark:bg-indigo-400/30 text-white dark:text-indigo-100 text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">
                {t('dashboard.vocab.label', { defaultValue: 'Vocab Book' })}
              </div>
              <h3 className="font-black text-xl text-foreground leading-tight">
                {t('dashboard.vocab.title', { defaultValue: 'My Vocab' })}
              </h3>
              <p className="text-muted-foreground font-bold text-sm mt-1">
                {t('dashboard.vocab.subtitle', { defaultValue: 'Saved words and definitions' })}
              </p>
            </div>
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-200 font-bold text-sm">
              {t('dashboard.vocab.count', { defaultValue: '{count} Words' }).replace(
                '{count}',
                String(savedWordsCount)
              )}
            </div>
          </div>
          <img
            src={ASSETS.vocabBook}
            className="absolute -right-2 -bottom-2 w-24 h-24 group-hover:scale-110 group-hover:rotate-12 transition duration-300"
            alt=""
          />
        </BentoCard>
      );
    case 'notes':
      return (
        <BentoCard
          onClickPath="/notebook"
          bgClass="bg-orange-50 dark:bg-orange-400/10"
          borderClass="border-orange-200 dark:border-orange-300/20"
          className="h-full"
        >
          <div className="absolute -right-4 -bottom-4 opacity-10">
            <FileText size={80} className="text-amber-600 dark:text-amber-300/70 rotate-12" />
          </div>
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="inline-block bg-amber-500 dark:bg-amber-400/30 text-white dark:text-amber-100 text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">
                {t('dashboard.notes.label', { defaultValue: 'Notebook' })}
              </div>
              <h3 className="font-black text-xl text-foreground leading-tight">
                {t('dashboard.notes.title', { defaultValue: 'Study Notes' })}
              </h3>
              <p className="text-muted-foreground font-bold text-sm mt-1">
                {t('dashboard.notes.subtitle', { defaultValue: 'Mistakes and memos' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-400/14 flex items-center justify-center text-[9px] font-bold text-red-600 dark:text-red-200">
                {t('dashboard.notes.mistake', { defaultValue: 'Err' })}
              </div>
              <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-400/14 flex items-center justify-center text-[9px] font-bold text-emerald-600 dark:text-emerald-200">
                {t('dashboard.notes.memo', { defaultValue: 'Mem' })}
              </div>
            </div>
          </div>
          <img
            src={ASSETS.memo}
            className="absolute -right-2 -bottom-2 w-24 h-24 group-hover:scale-110 group-hover:rotate-6 transition duration-300"
            alt=""
          />
        </BentoCard>
      );
    case 'typing':
      return (
        <BentoCard
          onClickPath="/typing"
          bgClass="bg-emerald-50 dark:bg-emerald-400/10"
          borderClass="border-emerald-200 dark:border-emerald-300/20"
          className="h-full"
        >
          <div className="relative z-10 h-full flex flex-col justify-between">
            <div>
              <div className="inline-block bg-emerald-500 dark:bg-emerald-400/30 text-white dark:text-emerald-100 text-[10px] font-black px-2 py-0.5 rounded-md uppercase mb-2">
                {t('typing.label', { defaultValue: 'Typing' })}
              </div>
              <h3 className="font-black text-xl text-foreground leading-tight">
                {t('typing.title', { defaultValue: 'Typing' })}
              </h3>
              <p className="text-muted-foreground font-bold text-sm mt-1">
                {t('typing.subtitle', { defaultValue: 'Practice' })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-card/80 dark:bg-emerald-400/12 px-2 py-1 rounded text-[10px] font-bold text-emerald-600 dark:text-emerald-200 border border-emerald-100 dark:border-emerald-300/20">
                {t('typing.unit', { defaultValue: 'WPM' })}
              </div>
            </div>
          </div>
          <img
            src={ASSETS.typing}
            className="absolute -right-2 -bottom-2 w-24 h-24 group-hover:scale-110 group-hover:-rotate-12 transition duration-300"
            alt=""
          />
        </BentoCard>
      );
    default:
      return null;
  }
}

function getCardStyleForId(id: string) {
  if (id === 'tiger') {
    return 'md:col-span-1 md:row-span-2';
  }
  return 'md:col-span-1';
}

export const DesktopDashboardPage: React.FC<DesktopDashboardPageProps> = ({
  navigate,
  t,
  user,
  dashboardLanguage,
  enableDesktopKsoftDashboard,
  greeting,
  learnerName,
  isPremiumUser,
  showUpgradeBanner,
  upgradeBannerRefreshKey,
  setUpgradeBannerRefreshKey,
  startUpgradeFlow,
  upgradeFlowLoading,
  dashboardView,
  dueReviews,
  reviewSummary,
  currentMaterialMeta,
  learningEntranceCards,
  learningEntryTarget,
  grammarEntryTarget,
  setSelectedInstitute,
  setSelectedLevel,
  isEditing,
  cardOrder,
  updateCardOrder,
  gridClassName,
  dailyPhrase,
  isSpeaking,
  onSpeakDailyPhrase,
  isInstituteNameLoading,
  instituteName,
  selectedLevel,
  currentUnit,
  progressPercent,
  savedWordsCount,
  trackEvent,
  safeSetLocalStorageItem,
  dismissDashboardUpgradeBanner,
  getDashboardGridClassName,
}) => {
  const cardContext: DashboardCardContext = {
    t,
    isSpeaking,
    dailyPhrase,
    onSpeakDailyPhrase,
    isInstituteNameLoading,
    instituteName,
    selectedLevel,
    currentUnit,
    progressPercent,
    savedWordsCount,
  };

  const dashboardGridItems = cardOrder.map(id => ({
    id,
    className: getCardStyleForId(id),
    content: renderDashboardCard(id, cardContext),
  }));

  const renderStaticDashboardGrid = (className: string) => (
    <div className={className}>
      {dashboardGridItems.map(item => (
        <div key={item.id} className={item.className}>
          {item.content}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className={`space-y-6 md:space-y-10 pb-10 md:pb-20 ${
        enableDesktopKsoftDashboard ? 'xl:pr-[360px]' : ''
      }`}
    >
      {enableDesktopKsoftDashboard ? (
        <DesktopKsoftDashboardRail language={dashboardLanguage} />
      ) : null}

      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="relative pl-0 md:pl-4">
          <img
            src={ASSETS.wave}
            className="absolute -top-6 -left-4 md:-left-10 w-10 h-10 md:w-14 md:h-14 animate-float"
            alt=""
          />
          <h1 className="text-3xl md:text-4xl md:text-5xl font-black font-display text-foreground tracking-tight mb-2">
            {greeting},{' '}
            <span className="text-primary dark:text-primary-foreground relative inline-block">
              {learnerName}
              <svg
                className="absolute -bottom-1 left-0 -z-10 h-3 w-full text-primary/25 dark:text-primary/30"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
              >
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="text-muted-foreground font-bold mt-1">
            {t('dashboard.subtitle', { defaultValue: "Ready to beat today's boss?" })}
          </p>
        </div>

        <div className="flex flex-wrap gap-3 md:gap-4 items-center">
          <DesktopNotificationsBell enabled />
          <DictionarySearchDropdown />

          {isPremiumUser && (
            <Button
              onClick={() => navigate('/pricing/details')}
              variant="ghost"
              size="auto"
              className="bg-gradient-to-r from-amber-400 to-yellow-500 dark:from-amber-400/70 dark:to-yellow-400/70 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm border border-amber-500 dark:border-amber-300/35 hover:scale-110 transition cursor-pointer"
            >
              <span className="text-lg">👑</span>
              <span className="text-sm font-bold text-white">
                {t('dashboard.premiumBadge', { defaultValue: 'Premium' })}
              </span>
            </Button>
          )}
        </div>
      </header>

      {!isPremiumUser && user && showUpgradeBanner ? (
        <section className="rounded-[2rem] border-2 border-slate-900 bg-gradient-to-r from-[#FFF4C7] via-[#FFE3A3] to-[#FFD369] p-6 shadow-pop">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-black uppercase tracking-[0.2em] text-slate-900">
                {t('dashboard.upgradeBanner.badge', { defaultValue: 'Premium' })}
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-900">
                {t('dashboard.upgradeBanner.title', {
                  defaultValue: 'Keep learning with the full DuHan experience',
                })}
              </h3>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                {t('dashboard.upgradeBanner.description', {
                  defaultValue:
                    'Unlock textbooks, full TOPIK mock exams, and AI study tools with the account you are using now: {{email}}',
                  email: user.email,
                })}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() =>
                  startUpgradeFlow({
                    plan: 'ANNUAL',
                    source: 'dashboard_banner',
                    returnTo: '/dashboard',
                  })
                }
                loading={upgradeFlowLoading}
                loadingText={t('common.loading', { defaultValue: 'Loading...' })}
                disabled={upgradeFlowLoading}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white"
              >
                {t('dashboard.upgradeBanner.primaryCta', {
                  defaultValue: 'View recommended plan',
                })}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  dismissDashboardUpgradeBanner(user.id);
                  setUpgradeBannerRefreshKey(current => current + 1);
                }}
                className="rounded-2xl border-2 border-slate-900 bg-white px-5 py-3 text-sm text-slate-900"
              >
                {t('dashboard.upgradeBanner.dismissCta', {
                  defaultValue: 'Maybe later',
                })}
              </Button>
            </div>
          </div>
        </section>
      ) : null}

      {dashboardView !== 'practice' && <LearnerSummaryCard />}

      {dashboardView === 'practice' && (
        <div className="mb-6">
          <ReviewWordsCard
            dueCount={dueReviews}
            recommendedCount={reviewSummary?.recommendedToday ?? dueReviews}
          />
        </div>
      )}

      {dashboardView !== 'practice' && (
        <div className="rounded-2xl border border-slate-200 bg-card/85 px-4 py-3 md:px-5 md:py-4 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-card px-3 py-2">
              <div className="h-10 w-8 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                {currentMaterialMeta.coverUrl ? (
                  <img
                    src={currentMaterialMeta.coverUrl}
                    alt={currentMaterialMeta.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500">
                    <BookOpen className="h-4 w-4" />
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                  {t('dashboard.textbook.default', { defaultValue: 'Textbook' })}
                </p>
                <div className="relative max-w-[260px]">
                  <p
                    className="truncate pr-6 text-sm font-black text-foreground"
                    title={t('dashboard.learningFlow.currentMaterial', {
                      defaultValue: 'Current textbook: {{name}}',
                      name: currentMaterialMeta.name,
                    })}
                  >
                    {currentMaterialMeta.name}
                  </p>
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-card to-transparent"
                  />
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/courses')}
              className="w-fit rounded-lg border-slate-300 px-3 font-bold"
            >
              {t('learningFlow.actions.switchMaterial', { defaultValue: 'Switch textbook' })}
            </Button>
          </div>
        </div>
      )}

      {dashboardView !== 'practice' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[minmax(220px,auto)]">
          {learningEntranceCards.map(card => {
            const entryTarget = card.id === 'grammar' ? grammarEntryTarget : learningEntryTarget;

            return (
              <BentoCard
                key={card.id}
                onClick={() => {
                  trackEvent('dashboard_learning_module_selected', {
                    language: dashboardLanguage,
                    module: card.id,
                    entryPoint: 'dashboard_desktop',
                  });
                  safeSetLocalStorageItem('duhan:learning_flow:last_module', card.id);
                  if (entryTarget) {
                    setSelectedInstitute(entryTarget.instituteId);
                    setSelectedLevel(entryTarget.level);
                  }
                }}
                onClickPath={
                  entryTarget
                    ? buildLearningModulePath(card.id, entryTarget.instituteId)
                    : '/courses'
                }
                bgClass={card.bgClass}
                borderClass={card.borderClass}
                className="h-full min-h-[220px]"
              >
                <div className="relative z-10 flex h-full flex-col justify-between gap-4">
                  <div>
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-[11px] font-black uppercase tracking-wide ${card.badgeClass}`}
                    >
                      {card.badge}
                    </span>
                    <h3 className="mt-3 text-2xl font-black leading-tight text-foreground">
                      {card.title}
                    </h3>
                    <p className="mt-2 max-w-[92%] text-sm font-semibold leading-snug text-muted-foreground">
                      {card.subtitle}
                    </p>
                  </div>

                  <div
                    className={`inline-flex items-center gap-1 text-base md:text-lg font-black ${card.ctaClass}`}
                  >
                    <span>
                      {t('dashboard.learningFlow.cta', { defaultValue: 'Choose materials' })}
                    </span>
                    <ChevronRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </div>

                <div
                  className={`absolute -bottom-6 -right-6 h-24 w-24 rounded-full border-[3px] bg-card/65 backdrop-blur-[1px] transition-transform duration-300 group-hover:scale-110 ${card.ringClass}`}
                />
                <span className="absolute bottom-4 right-4 text-4xl leading-none transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-6">
                  {card.icon}
                </span>
              </BentoCard>
            );
          })}
        </div>
      )}

      {isEditing ? (
        <Suspense fallback={renderStaticDashboardGrid(getDashboardGridClassName(true))}>
          <LazyEditableDashboardGrid
            items={dashboardGridItems}
            cardOrder={cardOrder}
            gridClassName={gridClassName}
            onUpdateCardOrder={updateCardOrder}
          />
        </Suspense>
      ) : (
        renderStaticDashboardGrid(gridClassName)
      )}
    </div>
  );
};

export default DesktopDashboardPage;
