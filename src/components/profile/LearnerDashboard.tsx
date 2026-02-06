import React, { lazy, Suspense } from 'react';
import { useQuery } from 'convex/react';
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
import { Button } from '../ui/button';

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
  const statsData = useQuery(qRef<NoArgs, LearnerStats | null>('userStats:getStats'));
  const loading = statsData === undefined;
  const stats = statsData ?? null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-zinc-400">
        <p>无法加载学习数据</p>
      </div>
    );
  }

  const progressPercent = Math.min(100, (stats.todayMinutes / stats.dailyGoal) * 100);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Streak */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border-2 border-zinc-900 rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center mb-3">
            <Flame className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-zinc-900">{stats.streak}</div>
          <div className="text-sm text-zinc-600 font-medium">连续打卡天数</div>
        </div>

        {/* Words Learned */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-zinc-900 rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-zinc-900">{stats.totalWordsLearned}</div>
          <div className="text-sm text-zinc-600 font-medium">已学词汇</div>
        </div>

        {/* Grammar Learned */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-zinc-900 rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center mb-3">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-zinc-900">{stats.totalGrammarLearned}</div>
          <div className="text-sm text-zinc-600 font-medium">已学语法</div>
        </div>

        {/* Today's Progress */}
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-2 border-zinc-900 rounded-xl p-5 shadow-[3px_3px_0px_0px_#18181B]">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-3xl font-black text-zinc-900">{stats.todayMinutes}</div>
          <div className="text-sm text-zinc-600 font-medium">今日学习(分钟)</div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Chart (2/3) */}
        <div className="lg:col-span-2 bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
          <h3 className="font-black text-lg mb-4">📊 本周学习时长</h3>
          <Suspense fallback={<div className="h-[220px]" />}>
            <WeeklyActivityChart data={stats.weeklyActivity} />
          </Suspense>
        </div>

        {/* Continue Learning Card (1/3) */}
        <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B] flex flex-col">
          <h3 className="font-black text-lg mb-4">🚀 继续学习</h3>

          {stats.currentProgress ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="text-lg font-bold text-zinc-900 mb-1">
                  {stats.currentProgress.instituteName}
                </div>
                <div className="text-sm text-zinc-500 mb-4">
                  第 {stats.currentProgress.unit} 课 · {getModuleName(stats.currentProgress.module)}
                </div>
              </div>
              <Button
                type="button"
                size="auto"
                className="w-full py-3 bg-lime-300 border-2 border-zinc-900 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-lime-400 shadow-[2px_2px_0px_0px_#18181B] active:translate-y-0.5 active:shadow-none transition-all"
              >
                继续学习 <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
              <Target className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">开始你的第一节课吧！</p>
            </div>
          )}
        </div>
      </div>

      {/* Daily Goal Progress */}
      <div className="bg-white border-2 border-zinc-900 rounded-xl p-6 shadow-[4px_4px_0px_0px_#18181B]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-black text-lg">🎯 今日目标</h3>
          <span className="text-sm text-zinc-500">
            {stats.todayMinutes} / {stats.dailyGoal} 分钟
          </span>
        </div>
        <div className="h-4 bg-zinc-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-lime-400 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent >= 100 && (
          <div className="mt-3 text-center text-emerald-600 font-bold">
            ✨ 恭喜！今日目标已完成！
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
              <div className="font-bold text-yellow-900">有 {stats.wordsToReview} 个单词待复习</div>
              <div className="text-sm text-yellow-700">趁热打铁，巩固记忆！</div>
            </div>
          </div>
          <Button
            type="button"
            size="auto"
            className="px-4 py-2 bg-yellow-400 text-yellow-900 font-bold rounded-lg hover:bg-yellow-500 transition-colors"
          >
            去复习
          </Button>
        </div>
      )}
    </div>
  );
};

const getModuleName = (module: string) => {
  switch (module) {
    case 'vocab':
      return '词汇';
    case 'reading':
      return '阅读';
    case 'grammar':
      return '语法';
    default:
      return module;
  }
};

export default LearnerDashboard;
