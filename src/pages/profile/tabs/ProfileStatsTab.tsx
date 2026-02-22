import React from 'react';
import type { ExamAttempt } from '../../../types';
import { AchievementGallery } from '../../../components/profile/AchievementGallery';

export const ProfileStatsTab: React.FC<{
  labels: Record<string, any>;
  dayStreak: number;
  savedWordsCount: number;
  examsTaken: number;
  averageScore: number;
  examHistory: ExamAttempt[];
}> = ({ labels, dayStreak, savedWordsCount, examsTaken, averageScore, examHistory }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: labels.dayStreak,
            value: dayStreak,
            color: 'text-orange-500 dark:text-orange-200',
            bg: 'bg-orange-50 dark:bg-orange-400/12',
          },
          {
            label: labels.wordsLearned,
            value: savedWordsCount,
            color: 'text-emerald-500 dark:text-emerald-200',
            bg: 'bg-emerald-50 dark:bg-emerald-400/12',
          },
          {
            label: labels.examsTaken,
            value: examsTaken,
            color: 'text-purple-500 dark:text-purple-200',
            bg: 'bg-purple-50 dark:bg-purple-400/12',
          },
          {
            label: labels.averageScore,
            value: `${averageScore}%`,
            color: 'text-blue-500 dark:text-blue-200',
            bg: 'bg-blue-50 dark:bg-blue-400/12',
          },
        ].map(stat => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.bg} border border-transparent`}>
            <div className={`text-2xl font-black ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-muted-foreground mb-4">
        {labels.profile?.recentActivity || 'Recent Activity'}
      </h3>
      <div className="space-y-3">
        {examHistory.length === 0 ? (
          <div className="text-center py-12 bg-muted rounded-2xl border border-border border-dashed text-muted-foreground">
            {labels.profile?.noActivity || 'No activity yet. Start a test to see your progress!'}
          </div>
        ) : (
          examHistory.slice(0, 5).map(exam => (
            <div
              key={exam.timestamp}
              className="flex items-center justify-between p-4 bg-muted rounded-xl border border-border"
            >
              <div>
                <div className="font-bold text-muted-foreground">{exam.examTitle}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(exam.timestamp).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold text-lg ${exam.score / exam.maxScore >= 0.6
                    ? 'text-green-600 dark:text-emerald-200'
                    : 'text-muted-foreground'
                    }`}
                >
                  {Math.round((exam.score / exam.maxScore) * 100)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  {exam.score}/{exam.maxScore}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ── Achievement Gallery ──────────────────────── */}
      <h2 className="font-heading text-2xl font-bold mb-4 mt-8">
        {labels.profile?.achievementGallery || 'Achievement Gallery'}
      </h2>
      <AchievementGallery />
    </div>
  );
};
