import React from 'react';
import { useQuery } from 'convex/react';
import { Flame, Clock, BookOpen, Target } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getLabels } from '../../utils/i18n';
import { Skeleton } from '../../components/common';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { BentoCard } from './BentoCard';

interface LearnerSummaryCardProps {
  className?: string;
}

export const LearnerSummaryCard: React.FC<LearnerSummaryCardProps> = ({ className = '' }) => {
  const { language } = useAuth();
  const labels = getLabels(language);
  // Convex Integration
  type UserStats = {
    streak: number;
    dailyMinutes: number;
    dailyGoal: number;
    vocabStats: { dueReviews: number };
  };
  const userStats = useQuery(qRef<NoArgs, UserStats>('userStats:getStats'));

  // Derived values
  const loading = userStats === undefined;
  const stats = userStats
    ? {
      streak: userStats.streak,
      dailyMinutes: userStats.dailyMinutes,
      dailyGoal: userStats.dailyGoal,
      dueReviews: userStats.vocabStats.dueReviews,
    }
    : null;

  // Legacy fetch removed


  if (loading) {
    return (
      <BentoCard
        bgClass="bg-gradient-to-br from-indigo-500 to-purple-600"
        borderClass="border-indigo-400/60"
        className={`text-white h-40 flex items-center justify-center ${className}`}
      >
        <div className="animate-pulse space-y-3 w-full">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-20 bg-indigo-400" />
            <Skeleton className="h-8 w-8 rounded-lg bg-indigo-400" />
          </div>
          <Skeleton className="h-8 w-24 bg-indigo-400" />
          <Skeleton className="h-4 w-full bg-indigo-400" />
        </div>
      </BentoCard>
    );
  }

  if (!stats) return null;

  const progressPercent = Math.min(100, (stats.dailyMinutes / (stats.dailyGoal || 1)) * 100);

  return (
    <BentoCard
      bgClass="bg-gradient-to-br from-indigo-500 to-purple-600"
      borderClass="border-indigo-400/60"
      className={`text-white shadow-lg ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">
          {labels.dashboard?.summary?.title || "Today's Overview"}
        </h3>
        <div className="flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
          <Flame className="w-4 h-4 text-orange-300" />
          <span className="font-bold">
            {(labels.dashboard?.summary?.streak || '{count} day streak').replace(
              '{count}',
              String(stats.streak)
            )}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1 opacity-80">
          <span>{labels.dashboard?.summary?.progress || "Today's Progress"}</span>
          <span>
            {stats.dailyMinutes} / {stats.dailyGoal} {labels.dashboard?.summary?.minutes || 'mins'}
          </span>
        </div>
        <div className="h-3 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-lime-300 to-emerald-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Clock className="w-4 h-4 opacity-70" />
            <span className="text-2xl font-black">{stats.dailyMinutes}</span>
          </div>
          <span className="text-xs opacity-70">{labels.dashboard?.summary?.minutes || 'mins'}</span>
        </div>
        <div className="text-center border-x border-white/20">
          <div className="flex items-center justify-center gap-1">
            <BookOpen className="w-4 h-4 opacity-70" />
            <span className="text-2xl font-black">{stats.dueReviews}</span>
          </div>
          <span className="text-xs opacity-70">{labels.dashboard?.summary?.due || 'Due'}</span>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <Target className="w-4 h-4 opacity-70" />
            <span className="text-2xl font-black">{Math.round(progressPercent)}%</span>
          </div>
          <span className="text-xs opacity-70">
            {labels.dashboard?.summary?.goalComplete || 'Goal'}
          </span>
        </div>
      </div>

      {progressPercent >= 100 && (
        <div className="mt-3 text-center bg-white/20 rounded-lg py-2 font-bold">
          {labels.dashboard?.summary?.completed || '✨ Goal Achieved!'}
        </div>
      )}
    </BentoCard>
  );
};

export default LearnerSummaryCard;
