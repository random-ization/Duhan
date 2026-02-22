import React, { lazy, Suspense } from 'react';
import { useQuery } from 'convex/react';
import { useTranslation } from 'react-i18next';
import {
  Flame,
  BookOpen,
  GraduationCap,
  Clock,
  Target,
  Loader2,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { Button } from '../ui';

const WeeklyActivityChart = lazy(() => import('./WeeklyActivityChart'));

interface LearnerStats {
  streak: number;
  todayMinutes: number;
  dailyGoal: number;
  wordsToReview: number;
  totalWordsLearned: number;
  totalGrammarLearned: number;
  weeklyActivity: { day: string; minutes: number }[];
  currentProgress: {
    instituteName: string;
    level: number;
    unit: number;
    module: string;
  } | null;
}

export const LearnerDashboard: React.FC = () => {
  const { t } = useTranslation();
  const statsData = useQuery(qRef<NoArgs, LearnerStats | null>('userStats:getStats'));
  const loading = statsData === undefined;
  const stats = statsData ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>{t('learnerDashboard.loadError', { defaultValue: 'Failed to load learning data' })}</p>
      </div>
    );
  }

  const progressPercent = Math.min(100, (stats.todayMinutes / stats.dailyGoal) * 100);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-foreground rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-foreground">{stats.streak}</div>
          <div className="text-sm text-muted-foreground font-medium">
            {t('learnerDashboard.streakDays', { defaultValue: 'Streak Days' })}
          </div>
        </div>

        {/* Words Learned */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-foreground rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-foreground">{stats.totalWordsLearned}</div>
          <div className="text-sm text-muted-foreground font-medium">
            {t('learnerDashboard.wordsLearned', { defaultValue: 'Words Learned' })}
          </div>
        </div>

        {/* Grammar Learned */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-foreground rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-foreground">{stats.totalGrammarLearned}</div>
          <div className="text-sm text-muted-foreground font-medium">
            {t('learnerDashboard.grammarLearned', { defaultValue: 'Grammar Learned' })}
          </div>
        </div>

        {/* Today's Progress */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-foreground rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-foreground">{stats.todayMinutes}</div>
          <div className="text-sm text-muted-foreground font-medium">
            {t('learnerDashboard.todayMinutes', { defaultValue: 'Today (minutes)' })}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart (2/3) */}
        <div className="lg:col-span-2 bg-card border-2 border-foreground rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
          <h3 className="font-black text-lg mb-4">
            📊 {t('learnerDashboard.weeklyStudy', { defaultValue: 'Weekly Study Time' })}
          </h3>
          <Suspense fallback={<div className="h-[220px]" />}>
            <WeeklyActivityChart data={stats.weeklyActivity} />
          </Suspense>
        </div>

        {/* Continue Learning Card (1/3) */}
        <div className="bg-card border-2 border-foreground rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] flex flex-col">
          <h3 className="font-black text-lg mb-4">
            🚀 {t('learnerDashboard.continueLearning', { defaultValue: 'Continue Learning' })}
          </h3>

          {stats.currentProgress ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="text-lg font-bold text-foreground mb-1">
                  {stats.currentProgress.instituteName}
                </div>
                <div className="text-sm text-muted-foreground mb-4">
                  {t('learnerDashboard.unitProgress', {
                    defaultValue: 'Unit {{unit}} · {{module}}',
                    unit: stats.currentProgress.unit,
                    module: getModuleName(stats.currentProgress.module, t),
                  })}
                </div>
              </div>
              <Button
                type="button"
                size="auto"
                className="w-full py-3 bg-lime-300 border-2 border-foreground rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
              >
                {t('learnerDashboard.continueButton', { defaultValue: 'Continue' })}{' '}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <Target className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">
                {t('learnerDashboard.startFirstLesson', {
                  defaultValue: 'Start your first lesson!',
                })}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="bg-card border-2 border-foreground rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-lg">
            🎯 {t('learnerDashboard.dailyGoal', { defaultValue: 'Daily Goal' })}
          </h3>
          <span className="text-sm text-muted-foreground">
            {stats.todayMinutes} / {stats.dailyGoal}{' '}
            {t('learnerDashboard.minutesUnit', { defaultValue: 'min' })}
          </span>
        </div>
        <div className="h-4 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent >= 100 && (
          <div className="mt-3 text-center text-emerald-600 font-bold">
            ✨ {t('learnerDashboard.goalCompleted', { defaultValue: 'Goal completed today!' })}
          </div>
        )}
      </div>

      {/* Words to Review */}
      {stats.wordsToReview > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-yellow-900" />
            </div>
            <div>
              <div className="font-bold text-yellow-900">
                {t('learnerDashboard.reviewWords', {
                  defaultValue: '{{count}} words are waiting for review',
                  count: stats.wordsToReview,
                })}
              </div>
              <div className="text-sm text-yellow-700">
                {t('learnerDashboard.reviewHint', {
                  defaultValue: 'Keep momentum and lock in your memory.',
                })}
              </div>
            </div>
          </div>
          <Button
            type="button"
            size="auto"
            className="px-4 py-2 bg-yellow-400 text-yellow-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            {t('learnerDashboard.reviewNow', { defaultValue: 'Review now' })}
          </Button>
        </div>
      )}
    </div>
  );
};

const getModuleName = (
  module: string,
  t: (key: string, options?: Record<string, unknown>) => string
) => {
  switch (module) {
    case 'vocab':
      return t('learnerDashboard.module.vocab', { defaultValue: 'Vocabulary' });
    case 'reading':
      return t('learnerDashboard.module.reading', { defaultValue: 'Reading' });
    case 'grammar':
      return t('learnerDashboard.module.grammar', { defaultValue: 'Grammar' });
    default:
      return module;
  }
};

export default LearnerDashboard;
