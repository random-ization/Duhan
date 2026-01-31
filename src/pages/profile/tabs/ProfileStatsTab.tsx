import React from 'react';
import type { ExamAttempt } from '../../../types';

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
            color: 'text-orange-500',
            bg: 'bg-orange-50',
          },
          {
            label: labels.wordsLearned,
            value: savedWordsCount,
            color: 'text-emerald-500',
            bg: 'bg-emerald-50',
          },
          {
            label: labels.examsTaken,
            value: examsTaken,
            color: 'text-purple-500',
            bg: 'bg-purple-50',
          },
          {
            label: labels.averageScore,
            value: `${averageScore}%`,
            color: 'text-blue-500',
            bg: 'bg-blue-50',
          },
        ].map((stat) => (
          <div key={stat.label} className={`p-4 rounded-2xl ${stat.bg} border border-transparent`}>
            <div className={`text-2xl font-black ${stat.color} mb-1`}>{stat.value}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <h3 className="text-lg font-bold text-slate-800 mb-4">
        {labels.profile?.recentActivity || 'Recent Activity'}
      </h3>
      <div className="space-y-3">
        {examHistory.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-100 border-dashed text-slate-400">
            {labels.profile?.noActivity || 'No activity yet. Start a test to see your progress!'}
          </div>
        ) : (
          examHistory.slice(0, 5).map((exam) => (
            <div
              key={exam.timestamp}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div>
                <div className="font-bold text-slate-800">{exam.examTitle}</div>
                <div className="text-xs text-slate-500">
                  {new Date(exam.timestamp).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div
                  className={`font-bold text-lg ${
                    exam.score / exam.maxScore >= 0.6 ? 'text-green-600' : 'text-slate-600'
                  }`}
                >
                  {Math.round((exam.score / exam.maxScore) * 100)}%
                </div>
                <div className="text-xs text-slate-400">
                  {exam.score}/{exam.maxScore}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
