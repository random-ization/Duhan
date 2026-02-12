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

export default function CourseDashboard() {
  const navigate = useLocalizedNavigate();
  const isMobile = useIsMobile();
  const { instituteId } = useParams<{ instituteId: string }>();
  const { t } = useTranslation();
  const { user, language } = useAuth();
  const convex = useConvex();

  // Use same Convex query as CoursesOverview for consistency
  type Institute = {
    id: string;
    name?: string;
    publisher?: string;
    displayLevel?: string;
    coverUrl?: string;
    totalUnits?: number;
  };
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
  const grammarPoints = grammarList || [];
  const vocabStats = vocabData || { total: 0, mastered: 0 };

  // Find current course by ID
  const course = institutes?.find(i => i.id === instituteId);
  const courseName =
    (course && getLocalizedContent(course, 'name', language)) ||
    course?.name ||
    t('courseDashboard.defaultCourseName');
  const displayLevel = course?.displayLevel || t('courseDashboard.defaultDisplayLevel');
  const coverUrl = course?.coverUrl;
  const coverTransitionName = getCourseCoverTransitionName(instituteId);
  const totalUnits = course?.totalUnits || 10;
  const completedUnits = courseProgress?.completedUnits ?? [];
  const completedCount = courseProgress?.completedCount ?? completedUnits.length;
  const unitTotal = courseProgress?.totalUnits || totalUnits;
  const unitProgress = unitTotal > 0 ? (completedCount / unitTotal) * 100 : 0;
  const lastUnitIndex =
    courseProgress?.lastUnitIndex ??
    (completedUnits.length > 0 ? Math.min(Math.max(...completedUnits) + 1, unitTotal) : undefined);

  // Calculate overall progress
  const grammarMastered = grammarPoints.filter(g => g.status === 'MASTERED').length;
  const grammarTotal = grammarPoints.length;
  const vocabProgress = vocabStats.total > 0 ? (vocabStats.mastered / vocabStats.total) * 100 : 0;
  const grammarProgress = grammarTotal > 0 ? (grammarMastered / grammarTotal) * 100 : 0;
  const progressParts = [vocabProgress, grammarProgress, unitProgress];
  const overallProgress = Math.round(
    progressParts.reduce((sum, value) => sum + value, 0) / progressParts.length
  );

  if (isMobile && instituteId) {
    return (
      <MobileCourseDashboard
        courseName={courseName || ''}
        instituteId={instituteId}
        overallProgress={overallProgress}
        currentUnit={lastUnitIndex || 1}
        totalUnits={unitTotal}
      />
    );
  }

  // Module definitions with routes and progress data
  const modules = [
    {
      id: 'vocabulary',
      label: t('courseDashboard.modules.vocabulary'),
      subtitle: 'VOCABULARY',
      emoji: '🧩',
      stripeColor: 'bg-green-400',
      iconBg: 'bg-green-50',
      iconBorder: 'border-green-200',
      hoverBg: 'bg-green-400/90',
      progressLabel: t('courseDashboard.progress.totalWords'),
      progressValue: loadingVocab ? '...' : `${vocabStats.total}`,
      progressColor: 'bg-green-400',
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
      stripeColor: 'bg-purple-400',
      iconBg: 'bg-purple-50',
      iconBorder: 'border-purple-200',
      hoverBg: 'bg-purple-400/90',
      progressLabel: t('courseDashboard.progress.grammarPoints'),
      progressValue: loadingGrammar ? '...' : `${grammarPoints.length}`,
      progressColor: 'bg-purple-400',
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
      stripeColor: 'bg-blue-400',
      iconBg: 'bg-blue-50',
      iconBorder: 'border-blue-200',
      hoverBg: 'bg-blue-400/90',
      progressLabel: t('courseDashboard.progress.units'),
      progressValue:
        unitTotal > 0
          ? `${completedCount}/${unitTotal}`
          : t('courseDashboard.lessonCount', { count: totalUnits }),
      progressColor: 'bg-blue-400',
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
      stripeColor: 'bg-[#FEE500]',
      iconBg: 'bg-yellow-50',
      iconBorder: 'border-yellow-200',
      hoverBg: 'bg-[#FEE500]/90',
      progressLabel: t('courseDashboard.progress.units'),
      progressValue:
        unitTotal > 0
          ? `${completedCount}/${unitTotal}`
          : t('courseDashboard.lessonCount', { count: totalUnits }),
      progressColor: 'bg-[#FEE500]',
      progressWidth: `${Math.min(unitProgress, 100)}%`,
      hoverText: 'LISTEN',
      hoverRotate: 'group-hover:-translate-y-1',
      path: `/course/${instituteId}/listening`,
    },
  ];

  return (
    <div
      className="min-h-screen pb-20"
      style={{
        backgroundColor: '#F0F4F8',
        backgroundImage: 'radial-gradient(#cbd5e1 1.5px, transparent 1.5px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div className="w-full max-w-[1400px] mx-auto p-6 md:p-10">
        {/* Header */}
        <header className="mb-10">
          {/* Back Button */}
          <button
            onClick={() => navigate('/courses')}
            className="mb-6 flex items-center gap-2 font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <span className="bg-white border-2 border-slate-300 rounded-full w-8 h-8 flex items-center justify-center shadow-sm">
              ←
            </span>
            {t('courseDashboard.backToShelf')}
          </button>

          {/* Header Card */}
          <div className="flex flex-col md:flex-row gap-8 items-center bg-white p-6 rounded-[2rem] border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            {/* Yellow Circle Decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-[#FEE500] rounded-full border-4 border-black z-0" />

            {/* Cover Image */}
            <div
              className="w-32 h-40 md:w-36 md:h-48 bg-slate-100 border-2 border-slate-900 rounded-2xl flex-shrink-0 relative z-10 shadow-sm -rotate-2 overflow-hidden"
              style={{ viewTransitionName: coverTransitionName } as CSSProperties}
            >
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={courseName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-indigo-50">
                  <BookMarked className="w-12 h-12 text-indigo-300" />
                </div>
              )}
            </div>

            {/* Course Info */}
            <div className="flex-1 text-center md:text-left z-10">
              <h1 className="font-display text-4xl font-black text-slate-900 mb-2 tracking-tight">
                {courseName || t('loading')}
                <span className="text-xs text-slate-400 font-normal ml-2">ID: {instituteId}</span>
              </h1>
              <p className="text-slate-500 font-medium flex items-center gap-2">
                <span>{course?.publisher}</span>
                {t('courseDashboard.courseMeta', { level: displayLevel, totalUnits })}
              </p>
              {lastUnitIndex ? (
                <p className="text-xs text-slate-400 font-semibold mt-1">
                  {t('courseDashboard.recentUnit', {
                    defaultValue: '最近学习：第 {unit} 课',
                    unit: lastUnitIndex,
                  })}
                </p>
              ) : null}

              {/* Progress Bar */}
              <div className="max-w-md mx-auto md:mx-0">
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span>{t('courseDashboard.overallProgress')}</span>
                  <span>{overallProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-4 rounded-full border-2 border-slate-900 overflow-hidden relative">
                  <div
                    className="bg-[#FEE500] h-full border-r-2 border-slate-900"
                    style={{ width: `${overallProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Training Modules Section */}
        <h2 className="text-3xl font-black mb-6 flex items-center gap-2">
          <span>🚀</span> {t('courseDashboard.trainingModules')}
        </h2>

        {/* 4-Grid Modules */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-16">
          {modules.map(m => (
            <button
              key={m.id}
              onClick={() => navigate(m.path)}
              className="group h-[320px] bg-white rounded-[2rem] border-4 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col overflow-hidden relative transition-all duration-200 hover:-translate-y-1.5 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-left"
            >
              {/* Top Color Stripe */}
              <div className={`h-3 w-full ${m.stripeColor} border-b-4 border-slate-900`} />

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col items-center text-center relative z-10">
                {/* Icon */}
                <div
                  className={`w-20 h-20 ${m.iconBg} rounded-2xl border-2 ${m.iconBorder} flex items-center justify-center mb-4 ${m.hoverRotate} transition-transform`}
                >
                  <span className="text-4xl">{m.emoji}</span>
                </div>

                {/* Labels */}
                <h3 className="font-black text-2xl mb-1">{m.label}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
                  {m.subtitle}
                </p>

                {/* Progress Footer */}
                <div className="mt-auto w-full">
                  <div className="text-xs text-slate-500 font-bold mb-1 flex justify-between">
                    <span>{m.progressLabel}</span>
                    <span>{m.progressValue}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full border border-slate-200">
                    <div
                      className={`${m.progressColor} h-full rounded-full`}
                      style={{ width: m.progressWidth }}
                    />
                  </div>
                </div>
              </div>

              {/* Hover Overlay */}
              <div
                className={`absolute inset-0 ${m.hoverBg} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 backdrop-blur-sm`}
              >
                <span className="text-white font-black text-xl tracking-widest border-4 border-white px-4 py-1 rounded-xl">
                  {m.hoverText}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Grammar Section */}
        <div className="border-t-2 border-slate-200 pt-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-1">
                {t('courseDashboard.grammarTitle')}
              </h3>
              <p className="text-slate-500 text-sm font-bold">
                {t('courseDashboard.grammarSubtitle')}
              </p>
            </div>
            <button className="text-sm font-bold text-slate-400 hover:text-slate-900 flex items-center gap-1">
              {t('courseDashboard.viewAll')} <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory">
            {loadingGrammar &&
              // Loading skeleton
              ['sk1', 'sk2', 'sk3', 'sk4'].map(id => (
                <div
                  key={id}
                  className="snap-start flex-shrink-0 w-64 bg-white border-2 border-slate-200 rounded-xl p-5 animate-pulse"
                >
                  <div className="h-8 bg-slate-100 rounded mb-2 w-32"></div>
                  <div className="h-4 bg-slate-100 rounded mb-1 w-24"></div>
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                </div>
              ))}

            {!loadingGrammar && grammarPoints.length === 0 && (
              <div className="text-slate-400 text-sm py-4">{t('courseDashboard.noGrammar')}</div>
            )}

            {!loadingGrammar &&
              grammarPoints.length > 0 &&
              grammarPoints.map(gp => (
                <div
                  key={gp.id}
                  className="snap-start flex-shrink-0 w-64 bg-white border-2 border-slate-200 rounded-xl p-5 hover:border-purple-500 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all group cursor-pointer relative overflow-hidden"
                >
                  {/* Unit Label */}
                  <div className="absolute top-0 right-0 bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                    UNIT {String(gp.unitId).padStart(2, '0')}
                  </div>

                  {/* Pattern (title) */}
                  <div className="text-purple-600 font-black text-2xl mb-2">{gp.title}</div>

                  {/* Summary */}
                  <div className="text-slate-800 font-bold text-sm mb-1">{gp.summary}</div>

                  {/* Status & Arrow */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    {gp.status === 'MASTERED' && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">
                        {t('courseDashboard.status.mastered')}
                      </span>
                    )}
                    {gp.status === 'LEARNING' && (
                      <span className="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                        {t('courseDashboard.status.learning')}
                      </span>
                    )}
                    {gp.status !== 'MASTERED' && gp.status !== 'LEARNING' && (
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        {t('courseDashboard.status.notStarted')}
                      </span>
                    )}
                    <span className="text-slate-300 group-hover:text-purple-600 transition-colors">
                      →
                    </span>
                  </div>
                </div>
              ))}

            {/* More Arrow Card */}
            {grammarPoints.length > 0 && (
              <button
                onClick={() => navigate(`/course/${instituteId}/grammar`)}
                className="snap-start flex-shrink-0 w-24 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center hover:bg-slate-100 hover:border-slate-400"
              >
                <span className="text-2xl text-slate-300">➜</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Custom scrollbar hide styles */}
      <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
    </div>
  );
}
