import { useMemo } from 'react';
import { useQuery } from 'convex/react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bookmark,
  Brain,
  Ghost,
  Search,
  TrendingUp,
  Target,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import type { VocabActivityHeatmapCellDto } from '../../../convex/vocab';
import { useAuth } from '../../contexts/AuthContext';
import { useLearningSelection } from '../../contexts/LearningContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { INSTITUTES, NoArgs, qRef, VOCAB } from '../../utils/convexRefs';
import { getLocalizedContent } from '../../utils/languageUtils';

interface MobileVocabDashboardProps {
  readonly savedWordsCount: number;
  readonly onOpenSavedWords: () => void;
  readonly onOpenMistakes: () => void;
}

type DashboardCopy = {
  pageTitle: string;
  trackingLabel: string;
  fsrsLabel: string;
  masteredWords: string;
  retentionLabel: string;
  retentionWindow: string;
  retentionEmpty: string;
  currentLearning: string;
  currentCourseFallback: string;
  currentCourseMetaFallback: string;
  currentCourseEmptyTitle: string;
  currentCourseEmptyDescription: string;
  currentCourseButton: string;
  pickCourseButton: string;
  todayTask: string;
  dueNow: string;
  newWords: string;
  learningWords: string;
  reviewWords: string;
  savedWords: string;
  mistakes: string;
  mistakesEmpty: string;
  monthlyHeatmap: string;
  legendLess: string;
  legendMore: string;
  wordsUnit: string;
};

type LocalizedInstitute = {
  id?: string;
  name?: string;
  nameEn?: string;
  nameZh?: string;
  nameVi?: string;
  nameMn?: string;
  displayLevel?: string;
  publisher?: string;
};

const NOISE_BACKGROUND =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E\")";

const EMPTY_LEARNER_STATS: LearnerStatsDto = {
  streak: 0,
  todayMinutes: 0,
  dailyGoal: 30,
  dailyProgress: 0,
  weeklyActivity: [],
  todayActivities: {
    wordsLearned: 0,
    readingsCompleted: 0,
    listeningsCompleted: 0,
    examsCompleted: 0,
  },
  courseProgress: [],
  currentProgress: null,
  totalWordsLearned: 0,
  totalGrammarLearned: 0,
  wordsToReview: 0,
  vocabStats: { total: 0, dueReviews: 0, mastered: 0 },
  grammarStats: { total: 0, mastered: 0 },
  reviewStats: { dueNow: 0, dueSoon: 0, savedWords: 0 },
  moduleBreakdown: [],
  recentSessions: [],
  totalMinutes: 0,
  todayWordsStudied: 0,
  todayGrammarStudied: 0,
};

const getCopy = (language: string): DashboardCopy => {
  if (language.startsWith('zh')) {
    return {
      pageTitle: '词汇中枢',
      trackingLabel: '数据追踪',
      fsrsLabel: 'FSRS 引擎运行中',
      masteredWords: '已掌握词汇',
      retentionLabel: '近30天回忆准确率',
      retentionWindow: '30天',
      retentionEmpty: '暂无足够复习数据',
      currentLearning: '当前学习',
      currentCourseFallback: '当前课程词汇',
      currentCourseMetaFallback: '课程词汇进度',
      currentCourseEmptyTitle: '开始你的课程词汇',
      currentCourseEmptyDescription: '先进入一门课程词汇页，系统会在这里接续你的进度。',
      currentCourseButton: '继续学习',
      pickCourseButton: '去选择课程',
      todayTask: '今日任务',
      dueNow: '词待复习',
      newWords: '新词',
      learningWords: '学习中',
      reviewWords: '复习',
      savedWords: '生词本',
      mistakes: '易错池',
      mistakesEmpty: '需强化突破',
      monthlyHeatmap: '本月活跃热力',
      legendLess: '少',
      legendMore: '多',
      wordsUnit: '词汇',
    };
  }

  return {
    pageTitle: 'Vocab Hub',
    trackingLabel: 'Tracking',
    fsrsLabel: 'FSRS active',
    masteredWords: 'Mastered words',
    retentionLabel: '30-day recall accuracy',
    retentionWindow: '30d',
    retentionEmpty: 'No review data yet',
    currentLearning: 'Current learning',
    currentCourseFallback: 'Current vocab course',
    currentCourseMetaFallback: 'Course vocabulary progress',
    currentCourseEmptyTitle: 'Start a vocab course',
    currentCourseEmptyDescription:
      'Open any course vocabulary module once and this hub will keep the thread here.',
    currentCourseButton: 'Continue learning',
    pickCourseButton: 'Choose a course',
    todayTask: 'Today',
    dueNow: 'due',
    newWords: 'New',
    learningWords: 'Learning',
    reviewWords: 'Review',
    savedWords: 'Saved words',
    mistakes: 'Mistakes',
    mistakesEmpty: 'Needs reinforcement',
    monthlyHeatmap: 'Monthly activity',
    legendLess: 'Less',
    legendMore: 'More',
    wordsUnit: 'words',
  };
};

const isVocabularyLastModule = (value: string | undefined) => {
  const normalized = value?.trim().toUpperCase();
  return (
    normalized === 'VOCAB' ||
    normalized === 'VOCABULARY' ||
    normalized === 'FLASHCARD' ||
    normalized === 'LEARN' ||
    normalized === 'TEST'
  );
};

const getCurrentCourseId = ({
  recentCourseId,
  userLastModule,
  userLastInstitute,
}: {
  recentCourseId: string | undefined;
  userLastModule: string | undefined;
  userLastInstitute: string | undefined;
}) => {
  if (recentCourseId && recentCourseId.trim()) {
    return recentCourseId.trim();
  }

  if (isVocabularyLastModule(userLastModule) && userLastInstitute && userLastInstitute.trim()) {
    return userLastInstitute.trim();
  }

  return '';
};

const getHeatmapCellClassName = (cell: VocabActivityHeatmapCellDto) => {
  const base =
    'aspect-square w-full rounded-[4px] transition-all duration-300 border border-transparent';

  if (cell.intensity === 0) {
    return `${base} bg-transparent border-dashed border-slate-300`;
  }
  if (cell.intensity === 1) {
    return `${base} bg-emerald-100`;
  }
  if (cell.intensity === 2) {
    return `${base} bg-emerald-200`;
  }
  if (cell.intensity === 3) {
    return `${base} bg-emerald-400`;
  }
  return `${base} bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)]`;
};

const getLocalizedCourseName = (course: LocalizedInstitute, language: string, fallback: string) =>
  getLocalizedContent(course, 'name', language) || course.name || fallback;

const buildProgressRing = (progressPercent: number) => {
  const bounded = Math.max(0, Math.min(100, progressPercent));
  return `${bounded}, 100`;
};

export const MobileVocabDashboard = ({
  savedWordsCount,
  onOpenSavedWords,
  onOpenMistakes,
}: MobileVocabDashboardProps) => {
  const navigate = useLocalizedNavigate();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { recentMaterials } = useLearningSelection();
  const language = i18n.resolvedLanguage || i18n.language || 'en';
  const copy = getCopy(language);

  const learnerStats =
    useQuery(qRef<NoArgs, LearnerStatsDto>('userStats:getStats')) ?? EMPTY_LEARNER_STATS;
  const dashboardInsights = useQuery(VOCAB.getDashboardInsights, {});
  const institutes = useQuery(INSTITUTES.getAll, {});
  const mistakes = useQuery(
    qRef<{ limit?: number }, Array<{ id: string }>>('user:getMistakes'),
    user ? { limit: 500 } : 'skip'
  );

  const currentCourseId = useMemo(
    () =>
      getCurrentCourseId({
        recentCourseId: recentMaterials.vocabulary?.instituteId,
        userLastModule: user?.lastModule,
        userLastInstitute: user?.lastInstitute,
      }),
    [recentMaterials.vocabulary?.instituteId, user?.lastInstitute, user?.lastModule]
  );

  const currentCourseStats = useQuery(
    VOCAB.getStats,
    currentCourseId ? { courseId: currentCourseId } : 'skip'
  );
  const currentCourseSummary = useQuery(
    VOCAB.getReviewSummary,
    currentCourseId ? { courseId: currentCourseId } : 'skip'
  );

  const currentCourse = useMemo(
    () => institutes?.find(course => course.id === currentCourseId),
    [currentCourseId, institutes]
  );

  const currentCourseTitle = currentCourse
    ? getLocalizedCourseName(currentCourse, language, copy.currentCourseFallback)
    : copy.currentCourseFallback;
  const currentCourseBadge =
    currentCourse?.displayLevel || currentCourse?.publisher || copy.currentCourseFallback;
  const currentCourseMeta =
    currentCourse?.publisher || currentCourse?.displayLevel || copy.currentCourseMetaFallback;
  const currentCourseProgress = currentCourseStats?.total
    ? Math.round((currentCourseStats.mastered / currentCourseStats.total) * 100)
    : 0;
  const hasCurrentCourse = Boolean(currentCourseId) && (currentCourseStats?.total ?? 0) > 0;
  const currentCoursePath = hasCurrentCourse ? `/course/${currentCourseId}/vocab` : '/courses';
  const retentionRate = dashboardInsights?.retentionRate30d ?? null;
  const heatmap = dashboardInsights?.heatmap ?? [];
  const mistakeCount = mistakes?.length ?? 0;

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#E6E7E9] pb-mobile-nav text-slate-900"
      style={{
        backgroundImage: NOISE_BACKGROUND,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "PingFang SC", "Hiragino Sans GB", "SF Pro Display", sans-serif',
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/40 bg-[rgba(230,231,233,0.85)] px-5 pb-4 pt-[calc(env(safe-area-inset-top)+16px)] backdrop-blur-[24px]">
        <button
          type="button"
          onClick={handleBack}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-white bg-white/50 shadow-sm transition-transform active:scale-90"
          aria-label={t('common.back', { defaultValue: 'Back' })}
        >
          <ArrowLeft className="h-4 w-4 text-slate-600" />
        </button>
        <h1 className="text-[15px] font-black tracking-widest text-slate-800">{copy.pageTitle}</h1>
        <button
          type="button"
          onClick={onOpenSavedWords}
          className="flex h-10 w-10 items-center justify-center text-slate-500 transition-transform active:scale-90"
          aria-label={t('common.search', { defaultValue: 'Search' })}
        >
          <Search className="h-4 w-4" />
        </button>
      </header>

      <main className="space-y-8 px-5 pt-6">
        <section>
          <div className="mb-4 flex items-center justify-between px-1">
            <h2 className="text-[11px] font-black tracking-[0.2em] text-slate-500">
              {copy.trackingLabel}
            </h2>
            <div className="flex items-center space-x-1.5 opacity-70">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                {copy.fsrsLabel}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-2xl p-4 text-white transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(145deg, #7A8D9A 0%, #61717A 100%)',
                boxShadow:
                  '0 12px 24px -8px rgba(97, 113, 122, 0.3), inset 0 1px 1px rgba(255,255,255,0.15)',
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <Brain className="h-4 w-4 text-white/50" />
                <TrendingUp className="h-3 w-3 text-emerald-300" />
              </div>
              <p className="mb-0.5 text-3xl font-black tracking-tight">
                {learnerStats.totalWordsLearned.toLocaleString()}
              </p>
              <p className="text-[10px] font-medium tracking-widest text-white/70">
                {copy.masteredWords}
              </p>
            </div>

            <div
              className="rounded-2xl p-4 text-white transition-transform active:scale-[0.98]"
              style={{
                background: 'linear-gradient(145deg, #8B8589 0%, #706B6F 100%)',
                boxShadow:
                  '0 12px 24px -8px rgba(112, 107, 111, 0.28), inset 0 1px 1px rgba(255,255,255,0.15)',
              }}
            >
              <div className="mb-3 flex items-center justify-between">
                <Target className="h-4 w-4 text-white/50" />
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-black text-white/80 border border-white/10">
                  {copy.retentionWindow}
                </span>
              </div>
              <p className="mb-0.5 text-3xl font-black tracking-tight">
                {retentionRate == null ? copy.retentionEmpty : `${retentionRate}%`}
              </p>
              <p className="text-[10px] font-medium tracking-widest text-white/70">
                {copy.retentionLabel}
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="mb-4 px-1 text-[11px] font-black tracking-[0.2em] text-slate-500">
            {copy.currentLearning}
          </h2>

          <div
            className="relative overflow-hidden p-5 transition-transform duration-300 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #F8F9FA 0%, #EAEBEF 100%)',
              boxShadow:
                '-8px 0 16px -8px rgba(0,0,0,0.1), 0 12px 24px -8px rgba(0,0,0,0.12), inset 2px 0 0 0 rgba(255,255,255,0.8), inset 4px 0 0 0 rgba(0,0,0,0.05)',
              borderRadius: '6px 16px 16px 6px',
              border: '1px solid rgba(0,0,0,0.04)',
            }}
          >
            <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-32 bg-gradient-to-l from-white/40 to-transparent" />
            <div className="pointer-events-none absolute bottom-0 left-[12px] top-0 w-px bg-black/5" />

            {hasCurrentCourse ? (
              <>
                <div className="relative z-10 mb-6 flex items-start justify-between">
                  <div className="pr-4">
                    <span className="mb-2 inline-block rounded-[4px] bg-slate-800 px-2 py-1 text-[9px] font-black tracking-widest text-white shadow-sm">
                      {currentCourseBadge}
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      {currentCourseTitle}
                    </h3>
                    <p className="mt-1 text-[10px] font-bold tracking-wider text-slate-500">
                      {currentCourseMeta}
                    </p>
                  </div>

                  <div className="relative flex h-12 w-12 items-center justify-center">
                    <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-slate-200"
                        strokeDasharray="100, 100"
                      />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="text-slate-800"
                        strokeDasharray={buildProgressRing(currentCourseProgress)}
                      />
                    </svg>
                    <span className="absolute text-[10px] font-black text-slate-800">
                      {currentCourseProgress}%
                    </span>
                  </div>
                </div>

                <div className="relative z-10 mb-4 rounded-xl border border-white bg-white/60 p-4 shadow-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-black tracking-widest text-slate-800">
                      {copy.todayTask}
                    </span>
                    <span className="text-[11px] font-black text-rose-600">
                      {currentCourseSummary?.dueNow ?? 0} {copy.dueNow}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[9px] font-bold text-slate-400">
                    <div className="flex items-center space-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                      <span>
                        {copy.newWords} {currentCourseSummary?.unlearned ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span>
                        {copy.learningWords} {currentCourseSummary?.learning ?? 0}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>
                        {copy.reviewWords} {currentCourseSummary?.dueNow ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(currentCoursePath)}
                  className="relative z-10 w-full rounded-xl bg-slate-900 py-3.5 text-[12px] font-black tracking-widest text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition-colors hover:bg-slate-800"
                >
                  {copy.currentCourseButton}
                </button>
              </>
            ) : (
              <div className="relative z-10">
                <div className="mb-6 flex items-start justify-between">
                  <div className="pr-4">
                    <span className="mb-2 inline-block rounded-[4px] bg-slate-800 px-2 py-1 text-[9px] font-black tracking-widest text-white shadow-sm">
                      {copy.currentLearning}
                    </span>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      {copy.currentCourseEmptyTitle}
                    </h3>
                    <p className="mt-2 text-[11px] font-bold leading-relaxed text-slate-500">
                      {copy.currentCourseEmptyDescription}
                    </p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/70 text-slate-700 shadow-sm">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate('/courses')}
                  className="w-full rounded-xl bg-slate-900 py-3.5 text-[12px] font-black tracking-widest text-white shadow-[0_8px_16px_rgba(0,0,0,0.2)] transition-colors hover:bg-slate-800"
                >
                  {copy.pickCourseButton}
                </button>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={onOpenSavedWords}
              className="flex items-center space-x-3 rounded-2xl border border-slate-200/50 bg-white p-4 text-left shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-transform active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500">
                <Bookmark className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[12px] font-black text-slate-800">{copy.savedWords}</h3>
                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                  {savedWordsCount} {copy.wordsUnit}
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={onOpenMistakes}
              className="flex items-center space-x-3 rounded-2xl border border-slate-200/50 bg-white p-4 text-left shadow-[0_4px_12px_rgba(0,0,0,0.03)] transition-transform active:scale-[0.98]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-500">
                <Ghost className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-[12px] font-black text-slate-800">{copy.mistakes}</h3>
                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                  {mistakeCount > 0 ? `${mistakeCount} ${copy.wordsUnit}` : copy.mistakesEmpty}
                </p>
              </div>
            </button>
          </div>
        </section>

        <section className="pb-10">
          <h2 className="mb-4 px-1 text-[11px] font-black tracking-[0.2em] text-slate-500">
            {copy.monthlyHeatmap}
          </h2>
          <div className="rounded-[1.5rem] border border-slate-200/50 bg-white p-5 shadow-[0_4px_16px_rgba(0,0,0,0.02)]">
            <div className="grid grid-cols-7 gap-1.5">
              {heatmap.map(cell => (
                <div
                  key={cell.date}
                  className={`${getHeatmapCellClassName(cell)} ${cell.isToday ? 'ring-1 ring-slate-800/70 ring-offset-1 ring-offset-white' : ''}`}
                  aria-label={`${cell.date}: ${cell.count}`}
                  title={`${cell.date}: ${cell.count}`}
                />
              ))}
            </div>
            <div className="mt-3 flex items-center justify-between px-1">
              <span className="text-[9px] font-bold tracking-widest text-slate-400">
                {copy.legendLess}
              </span>
              <div className="flex space-x-1">
                <div className="h-2 w-2 rounded-sm bg-slate-100" />
                <div className="h-2 w-2 rounded-sm bg-emerald-100" />
                <div className="h-2 w-2 rounded-sm bg-emerald-200" />
                <div className="h-2 w-2 rounded-sm bg-emerald-400" />
                <div className="h-2 w-2 rounded-sm bg-emerald-500" />
              </div>
              <span className="text-[9px] font-bold tracking-widest text-slate-400">
                {copy.legendMore}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
