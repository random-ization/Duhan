import { useEffect, useState, type CSSProperties } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronRight, BookMarked } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';
import { MobileCourseDashboard } from '../components/mobile/MobileCourseDashboard';
import { useConvex, useQuery } from 'convex/react';
import { NoArgs, qRef, GRAMMARS, VOCAB } from '../utils/convexRefs';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { useAuth } from '../contexts/AuthContext';
import { getLocalizedContent } from '../utils/languageUtils';
import { logger } from '../utils/logger';
import { getCourseCoverTransitionName } from '../utils/viewTransitions';
import { useTheme } from '../contexts/ThemeContext';
import { Button } from '../components/ui';
import { AppBreadcrumb } from '../components/common/AppBreadcrumb';
import type { Language } from '../types';

type Institute = {
  id: string;
  name?: string;
  publisher?: string;
  displayLevel?: string;
  coverUrl?: string;
  totalUnits?: number;
};

type GrammarPoint = {
  id: string;
  unitId: number | string;
  title: string;
  summary: string;
  status?: string;
};

type VocabStats = { total: number; mastered: number };

type CourseProgress = {
  completedUnits: number[];
  completedCount: number;
  totalUnits: number;
  progressPercent: number;
  lastUnitIndex?: number;
} | null;

type DashboardModule = {
  id: string;
  label: string;
  subtitle: string;
  emoji: string;
  stripeColor: string;
  iconBg: string;
  iconBorder: string;
  hoverBg: string;
  progressLabel: string;
  progressValue: string;
  progressColor: string;
  progressWidth: string;
  hoverText: string;
  hoverRotate: string;
  path: string;
};

const buildCourseMeta = ({
  course,
  instituteId,
  language,
  t,
}: {
  course?: Institute;
  instituteId?: string;
  language: Language;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => {
  const isYskCourse = instituteId === 'ysk-1';
  const coursePublisher =
    course?.publisher || (isYskCourse ? 'OER' : t('courseDashboard.defaultPublisher'));
  const courseName =
    (course && getLocalizedContent(course, 'name', language)) ||
    course?.name ||
    (isYskCourse ? 'You Speak Korean! 1' : t('courseDashboard.defaultCourseName'));
  const displayLevel =
    course?.displayLevel || (isYskCourse ? '1' : t('courseDashboard.defaultDisplayLevel'));
  const totalUnits = course?.totalUnits || (isYskCourse ? 12 : 10);
  return { isYskCourse, coursePublisher, courseName, displayLevel, totalUnits };
};

const buildProgressStats = ({
  grammarPoints,
  vocabStats,
  courseProgress,
  totalUnits,
}: {
  grammarPoints: GrammarPoint[];
  vocabStats: VocabStats;
  courseProgress: CourseProgress;
  totalUnits: number;
}) => {
  const completedUnits = courseProgress?.completedUnits ?? [];
  const completedCount = courseProgress?.completedCount ?? completedUnits.length;
  const unitTotal = courseProgress?.totalUnits || totalUnits;
  const unitProgress = unitTotal > 0 ? (completedCount / unitTotal) * 100 : 0;
  const lastUnitIndex =
    courseProgress?.lastUnitIndex ??
    (completedUnits.length > 0 ? Math.min(Math.max(...completedUnits) + 1, unitTotal) : undefined);

  const grammarMastered = grammarPoints.filter(g => g.status === 'MASTERED').length;
  const grammarTotal = grammarPoints.length;
  const vocabProgress = vocabStats.total > 0 ? (vocabStats.mastered / vocabStats.total) * 100 : 0;
  const grammarProgress = grammarTotal > 0 ? (grammarMastered / grammarTotal) * 100 : 0;
  const progressParts = [vocabProgress, grammarProgress, unitProgress];
  const overallProgress = Math.round(
    progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length
  );

  return {
    grammarMastered,
    completedCount,
    unitTotal,
    unitProgress,
    lastUnitIndex,
    overallProgress,
  };
};

const buildModules = ({
  t,
  instituteId,
  loadingVocab,
  vocabStats,
  loadingGrammar,
  grammarPoints,
  grammarMastered,
  unitTotal,
  completedCount,
  unitProgress,
  totalUnits,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  instituteId?: string;
  loadingVocab: boolean;
  vocabStats: VocabStats;
  loadingGrammar: boolean;
  grammarPoints: GrammarPoint[];
  grammarMastered: number;
  unitTotal: number;
  completedCount: number;
  unitProgress: number;
  totalUnits: number;
}): DashboardModule[] => {
  const unitProgressValue =
    unitTotal > 0
      ? `${completedCount}/${unitTotal}`
      : t('courseDashboard.lessonCount', { count: totalUnits });

  return [
    {
      id: 'vocabulary',
      label: t('courseDashboard.modules.vocabulary'),
      subtitle: 'VOCABULARY',
      emoji: '🧩',
      stripeColor: 'bg-green-400 dark:bg-green-500/70',
      iconBg: 'bg-green-50 dark:bg-green-500/15',
      iconBorder: 'border-green-200 dark:border-green-400/35',
      hoverBg: 'bg-green-400/90 dark:bg-green-500/55',
      progressLabel: t('courseDashboard.progress.totalWords'),
      progressValue: loadingVocab ? '...' : `${vocabStats.total}`,
      progressColor: 'bg-green-400 dark:bg-green-500/80',
      progressWidth:
        vocabStats.total > 0
          ? `${Math.min((vocabStats.mastered / vocabStats.total) * 100, 100)}%`
          : '0%',
      hoverText: 'START',
      hoverRotate: 'group-hover:rotate-12',
      path: `/course/${instituteId}/vocab`,
    },
    {
      id: 'grammar',
      label: t('courseDashboard.modules.grammar'),
      subtitle: 'GRAMMAR',
      emoji: '⚡️',
      stripeColor: 'bg-purple-400 dark:bg-purple-500/70',
      iconBg: 'bg-purple-50 dark:bg-purple-500/15',
      iconBorder: 'border-purple-200 dark:border-purple-400/35',
      hoverBg: 'bg-purple-400/90 dark:bg-purple-500/55',
      progressLabel: t('courseDashboard.progress.grammarPoints'),
      progressValue: loadingGrammar ? '...' : `${grammarPoints.length}`,
      progressColor: 'bg-purple-400 dark:bg-purple-500/80',
      progressWidth:
        grammarPoints.length > 0 ? `${(grammarMastered / grammarPoints.length) * 100}%` : '0%',
      hoverText: 'START',
      hoverRotate: 'group-hover:-rotate-12',
      path: `/course/${instituteId}/grammar`,
    },
    {
      id: 'reading',
      label: t('courseDashboard.modules.reading'),
      subtitle: 'READING',
      emoji: '📖',
      stripeColor: 'bg-blue-400 dark:bg-blue-500/70',
      iconBg: 'bg-blue-50 dark:bg-blue-500/15',
      iconBorder: 'border-blue-200 dark:border-blue-400/35',
      hoverBg: 'bg-blue-400/90 dark:bg-blue-500/55',
      progressLabel: t('courseDashboard.progress.units'),
      progressValue: unitProgressValue,
      progressColor: 'bg-blue-400 dark:bg-blue-500/80',
      progressWidth: `${Math.min(unitProgress, 100)}%`,
      hoverText: 'READ',
      hoverRotate: 'group-hover:scale-110',
      path: `/course/${instituteId}/reading`,
    },
    {
      id: 'listening',
      label: t('courseDashboard.modules.listening'),
      subtitle: 'LISTENING',
      emoji: '🎧',
      stripeColor: 'bg-[#FEE500] dark:bg-yellow-400/70',
      iconBg: 'bg-yellow-50 dark:bg-yellow-500/15',
      iconBorder: 'border-yellow-200 dark:border-yellow-400/35',
      hoverBg: 'bg-[#FEE500]/90 dark:bg-yellow-500/55',
      progressLabel: t('courseDashboard.progress.units'),
      progressValue: unitProgressValue,
      progressColor: 'bg-[#FEE500] dark:bg-yellow-400/80',
      progressWidth: `${Math.min(unitProgress, 100)}%`,
      hoverText: 'LISTEN',
      hoverRotate: 'group-hover:-translate-y-1',
      path: `/course/${instituteId}/listening`,
    },
  ];
};

const CourseHeaderCard = ({
  courseName,
  instituteId,
  coverUrl,
  isYskCourse,
  coverTransitionName,
  coursePublisher,
  displayLevel,
  totalUnits,
  lastUnitIndex,
  overallProgress,
  t,
}: {
  courseName: string;
  instituteId?: string;
  coverUrl?: string;
  isYskCourse: boolean;
  coverTransitionName: string;
  coursePublisher: string;
  displayLevel: string;
  totalUnits: number;
  lastUnitIndex?: number;
  overallProgress: number;
  t: (key: string, opts?: Record<string, unknown>) => string;
}) => (
  <div className="flex flex-col md:flex-row gap-8 items-center bg-card p-6 rounded-[2rem] border-2 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FEE500] dark:bg-yellow-400/35 rounded-full border-4 border-foreground dark:border-yellow-300/40 z-0" />

    <div
      className="w-32 h-40 md:w-36 md:h-48 bg-muted border-2 border-foreground rounded-2xl flex-shrink-0 relative z-10 shadow-sm -rotate-2 overflow-hidden"
      style={{ viewTransitionName: coverTransitionName } as CSSProperties}
    >
      {coverUrl ? (
        <img src={coverUrl} alt={courseName} className="w-full h-full object-cover rounded-xl" />
      ) : isYskCourse ? (
        <div className="w-full h-full flex items-center justify-center bg-amber-50 dark:bg-amber-500/15">
          <span className="text-xl font-black text-amber-700 dark:text-amber-200">YSK</span>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-indigo-50 dark:bg-indigo-500/15">
          <BookMarked className="w-12 h-12 text-indigo-300 dark:text-indigo-200/70" />
        </div>
      )}
    </div>

    <div className="flex-1 text-center md:text-left z-10">
      <h1 className="font-display text-4xl font-black text-foreground mb-2 tracking-tight">
        {courseName || t('loading')}
        <span className="text-xs text-muted-foreground font-normal ml-2">ID: {instituteId}</span>
      </h1>
      <p className="text-muted-foreground font-medium flex items-center gap-2">
        <span>{coursePublisher}</span>
        {t('courseDashboard.courseMeta', { level: displayLevel, totalUnits })}
      </p>
      {lastUnitIndex ? (
        <p className="text-xs text-muted-foreground font-semibold mt-1">
          {t('courseDashboard.recentUnit', {
            defaultValue: 'Recently studied: Unit {unit}',
            unit: lastUnitIndex,
          })}
        </p>
      ) : null}

      <div className="max-w-md mx-auto md:mx-0">
        <div className="flex justify-between text-xs font-bold mb-1">
          <span>{t('courseDashboard.overallProgress')}</span>
          <span>{overallProgress}%</span>
        </div>
        <div className="w-full bg-muted h-4 rounded-full border-2 border-foreground overflow-hidden relative">
          <div
            className="bg-[#FEE500] dark:bg-yellow-400/75 h-full border-r-2 border-foreground dark:border-yellow-300/40"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
    </div>
  </div>
);

const ModuleGrid = ({
  modules,
  navigate,
}: {
  modules: DashboardModule[];
  navigate: (to: string) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
    {modules.map(m => (
      <Button
        key={m.id}
        onClick={() => navigate(m.path)}
        variant="ghost"
        size="auto"
        className="group h-[320px] bg-card rounded-[2rem] border-4 border-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-left !justify-start !items-stretch !whitespace-normal"
      >
        <div className={`h-3 w-full ${m.stripeColor} border-b-4 border-foreground`} />

        <div className="p-6 flex-1 flex flex-col items-center text-center relative z-10">
          <div
            className={`w-20 h-20 ${m.iconBg} rounded-2xl border-2 ${m.iconBorder} flex items-center justify-center mb-4 ${m.hoverRotate} transition-transform`}
          >
            <span className="text-4xl">{m.emoji}</span>
          </div>

          <h3 className="font-black text-2xl mb-1">{m.label}</h3>
          <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-4">
            {m.subtitle}
          </p>

          <div className="mt-auto w-full">
            <div className="text-xs text-muted-foreground font-bold mb-1 flex justify-between">
              <span>{m.progressLabel}</span>
              <span>{m.progressValue}</span>
            </div>
            <div className="w-full bg-muted h-2 rounded-full border border-border">
              <div
                className={`${m.progressColor} h-full rounded-full`}
                style={{ width: m.progressWidth }}
              />
            </div>
          </div>
        </div>

        <div
          className={`absolute inset-0 ${m.hoverBg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm`}
        >
          <span className="text-white font-black text-xl tracking-widest border-4 border-white px-4 py-1 rounded-xl">
            {m.hoverText}
          </span>
        </div>
      </Button>
    ))}
  </div>
);

const grammarStatusBadge = (
  status: string | undefined,
  t: (key: string) => string
): { className: string; label: string } => {
  if (status === 'MASTERED') {
    return {
      className:
        'text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-200 px-2 py-0.5 rounded',
      label: t('courseDashboard.status.mastered'),
    };
  }
  if (status === 'LEARNING') {
    return {
      className:
        'text-[10px] font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-200 px-2 py-0.5 rounded',
      label: t('courseDashboard.status.learning'),
    };
  }
  return {
    className: 'text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded',
    label: t('courseDashboard.status.notStarted'),
  };
};

const GrammarSection = ({
  t,
  loadingGrammar,
  grammarPoints,
  instituteId,
  navigate,
}: {
  t: (key: string, opts?: Record<string, unknown>) => string;
  loadingGrammar: boolean;
  grammarPoints: GrammarPoint[];
  instituteId?: string;
  navigate: (to: string) => void;
}) => (
  <div className="border-t-2 border-border pt-10">
    <div className="flex justify-between items-end mb-6">
      <div>
        <h3 className="text-2xl font-black text-foreground mb-1">
          {t('courseDashboard.grammarTitle')}
        </h3>
        <p className="text-muted-foreground text-sm font-bold">
          {t('courseDashboard.grammarSubtitle')}
        </p>
      </div>
      <Button
        variant="ghost"
        size="auto"
        className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        {t('courseDashboard.viewAll')} <ChevronRight className="w-4 h-4" />
      </Button>
    </div>

    <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
      {loadingGrammar &&
        ['sk1', 'sk2', 'sk3', 'sk4'].map(id => (
          <div
            key={id}
            className="snap-start flex-shrink-0 w-64 bg-card border-2 border-border rounded-xl p-5 animate-pulse"
          >
            <div className="h-8 bg-muted rounded mb-2 w-32"></div>
            <div className="h-4 bg-muted rounded mb-1 w-24"></div>
            <div className="h-3 bg-muted rounded w-full"></div>
          </div>
        ))}

      {!loadingGrammar && grammarPoints.length === 0 && (
        <div className="text-muted-foreground text-sm py-4">{t('courseDashboard.noGrammar')}</div>
      )}

      {!loadingGrammar &&
        grammarPoints.length > 0 &&
        grammarPoints.map(gp => {
          const badge = grammarStatusBadge(gp.status, t);
          return (
            <div
              key={gp.id}
              className="snap-start flex-shrink-0 w-64 bg-card border-2 border-border rounded-xl p-5 hover:border-purple-500 dark:hover:border-purple-400/45 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(15,23,42,0.55)] transition-all group cursor-pointer relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-muted text-muted-foreground text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                UNIT {String(gp.unitId).padStart(2, '0')}
              </div>
              <div className="text-purple-600 dark:text-purple-300 font-black text-2xl mb-2">
                {gp.title}
              </div>
              <div className="text-muted-foreground font-bold text-sm mb-1">{gp.summary}</div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className={badge.className}>{badge.label}</span>
                <span className="text-muted-foreground group-hover:text-purple-600 dark:group-hover:text-purple-300 transition-colors">
                  →
                </span>
              </div>
            </div>
          );
        })}

      {grammarPoints.length > 0 && (
        <Button
          onClick={() => navigate(`/course/${instituteId}/grammar`)}
          variant="ghost"
          size="auto"
          className="snap-start flex-shrink-0 w-24 bg-muted border-2 border-dashed border-border rounded-xl flex items-center justify-center hover:bg-muted hover:border-border !shadow-none"
        >
          <span className="text-2xl text-muted-foreground">➜</span>
        </Button>
      )}
    </div>
  </div>
);

export default function CourseDashboard() {
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { t } = useTranslation();
  const { user, language } = useAuth();
  const { resolvedTheme } = useTheme();
  const convex = useConvex();

  const institutes = useQuery(qRef<NoArgs, Institute[]>('institutes:getAll'));

  // Convex Queries for Grammar and Vocab
  const grammarList = useQuery(
    GRAMMARS.getByCourse,
    instituteId ? { courseId: instituteId } : 'skip'
  );
  // Avoid `useQuery(VOCAB.getStats)` throwing and taking down the whole page.
  // This is a stats-only query; if it fails we can fall back to zeros.
  const [vocabStatsState, setVocabStatsState] = useState<{
    courseId: string;
    data: { total: number; mastered: number };
  } | null>(null);
  useEffect(() => {
    if (!instituteId) return;
    let cancelled = false;
    convex
      .query(VOCAB.getStats, { courseId: instituteId })
      .then(res => {
        if (cancelled) return;
        setVocabStatsState({ courseId: instituteId, data: res });
      })
      .catch(err => {
        if (cancelled) return;
        logger.error('[CourseDashboard] VOCAB.getStats failed', err);
        setVocabStatsState({ courseId: instituteId, data: { total: 0, mastered: 0 } });
      });
    return () => {
      cancelled = true;
    };
  }, [convex, instituteId]);
  const vocabData =
    vocabStatsState && vocabStatsState.courseId === instituteId ? vocabStatsState.data : undefined;
  const courseProgress = useQuery(
    qRef<
      { courseId: string },
      {
        completedUnits: number[];
        completedCount: number;
        totalUnits: number;
        progressPercent: number;
        lastUnitIndex?: number;
      } | null
    >('progress:getCourseProgress'),
    user && instituteId ? { courseId: instituteId } : 'skip'
  );

  // Loading states
  const loadingGrammar = grammarList === undefined;
  const loadingVocab = vocabData === undefined;

  // Derived Data
  const grammarPoints = (grammarList || []) as GrammarPoint[];
  const vocabStats = vocabData || { total: 0, mastered: 0 };

  // Find current course by ID
  const course = institutes?.find(i => i.id === instituteId);
  const { isYskCourse, coursePublisher, courseName, displayLevel, totalUnits } = buildCourseMeta({
    course,
    instituteId,
    language,
    t,
  });
  const coverUrl = course?.coverUrl;
  const coverTransitionName = getCourseCoverTransitionName(instituteId);
  const {
    grammarMastered,
    completedCount,
    unitTotal,
    unitProgress,
    lastUnitIndex,
    overallProgress,
  } = buildProgressStats({
    grammarPoints,
    vocabStats,
    courseProgress: courseProgress ?? null,
    totalUnits,
  });

  if (isMobile && instituteId) {
    return (
      <MobileCourseDashboard
        courseName={courseName || ''}
        instituteId={instituteId}
        overallProgress={overallProgress}
        currentUnit={lastUnitIndex || 1}
        totalUnits={unitTotal}
        publisher={coursePublisher}
        displayLevel={displayLevel}
        coverUrl={coverUrl}
      />
    );
  }

  const modules = buildModules({
    t,
    instituteId,
    loadingVocab,
    vocabStats,
    loadingGrammar,
    grammarPoints,
    grammarMastered,
    unitTotal,
    completedCount,
    unitProgress,
    totalUnits,
  });

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: resolvedTheme === 'dark' ? '#0b1220' : '#F0F4F8',
        backgroundImage:
          resolvedTheme === 'dark'
            ? 'radial-gradient(rgba(148,163,184,0.22) 1.5px, transparent 1.5px)'
            : 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="w-full max-w-[1400px] mx-auto p-6 md:p-10">
        {/* Header */}
        <header className="mb-10">
          <AppBreadcrumb
            className="mb-4"
            items={[
              {
                label: t('coursesOverview.pageTitle', { defaultValue: 'Courses' }),
                to: '/courses',
              },
              { label: courseName || instituteId || 'Course' },
            ]}
          />
          {/* Back Button */}
          <Button
            onClick={() => navigate('/courses')}
            variant="ghost"
            size="auto"
            className="mb-6 flex items-center gap-2 font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="bg-card border-2 border-border rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
              ←
            </span>
            {t('courseDashboard.backToShelf')}
          </Button>

          <CourseHeaderCard
            courseName={courseName}
            instituteId={instituteId}
            coverUrl={coverUrl}
            isYskCourse={isYskCourse}
            coverTransitionName={coverTransitionName}
            coursePublisher={coursePublisher}
            displayLevel={displayLevel}
            totalUnits={totalUnits}
            lastUnitIndex={lastUnitIndex}
            overallProgress={overallProgress}
            t={t}
          />
        </header>

        {/* Training Modules Section */}
        <h2 className="text-3xl font-black mb-6 flex items-center gap-2 text-foreground">
          <span>🚀</span> {t('courseDashboard.trainingModules')}
        </h2>

        <ModuleGrid modules={modules} navigate={navigate} />
        <GrammarSection
          t={t}
          loadingGrammar={loadingGrammar}
          grammarPoints={grammarPoints}
          instituteId={instituteId}
          navigate={navigate}
        />
      </div>

      {/* Custom scrollbar hide styles */}
      <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
    </div>
  );
}
