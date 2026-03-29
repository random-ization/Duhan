import type { LearningModule, NormalizedLastModule } from './analytics';

export type WeeklyActivityPoint = { day: string; minutes: number };

export type TodayActivities = {
  wordsLearned: number;
  readingsCompleted: number;
  listeningsCompleted: number;
  examsCompleted: number;
};

export type ReviewStatsDto = {
  dueNow: number;
  dueSoon: number;
  savedWords: number;
};

export type ModuleBreakdownPoint = {
  module: LearningModule;
  minutes: number;
  sessions: number;
};

export type RecentLearningSessionDto = {
  sessionId: string;
  module: LearningModule;
  eventName: string;
  courseId: string | null;
  unitId: number | null;
  contentId: string | null;
  durationSec: number;
  itemCount: number;
  score: number | null;
  accuracy: number | null;
  result: string | null;
  eventAt: number;
};

export type CurrentProgressDto = {
  instituteId: string | null;
  instituteName: string | null;
  level: number | null;
  unit: number | null;
  module: NormalizedLastModule | null;
};

export type LearnerStatsDto = {
  streak: number;
  weeklyActivity: WeeklyActivityPoint[];
  todayMinutes: number;
  dailyGoal: number;
  dailyProgress: number;
  todayActivities: TodayActivities;
  courseProgress: Array<{
    courseId: string;
    courseName: string;
    completedUnits: number;
    totalUnits: number;
    lastAccessAt: string;
  }>;
  currentProgress: CurrentProgressDto | null;
  totalWordsLearned: number;
  totalGrammarLearned: number;
  wordsToReview: number;
  vocabStats: {
    total: number;
    dueReviews: number;
    mastered: number;
  };
  grammarStats: {
    total: number;
    mastered: number;
  };
  reviewStats: ReviewStatsDto;
  moduleBreakdown: ModuleBreakdownPoint[];
  recentSessions: RecentLearningSessionDto[];
  totalMinutes: number;
  todayWordsStudied: number;
  todayGrammarStudied: number;
};
