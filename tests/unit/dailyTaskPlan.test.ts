import { describe, expect, it } from 'vitest';
import type { QueryCtx } from '../../convex/_generated/server';
import type { Id } from '../../convex/_generated/dataModel';
import type { DailyTaskBuildSignals } from '../../convex/dailyTask/shared';
import { buildDailyTaskPlan, resolveDailyTaskPath } from '../../convex/dailyTask/shared';
import type { LearnerStatsDto } from '../../convex/learningStats';
import type { GoalProfileDto } from '../../convex/onboarding';

type QueryChain = {
  withIndex: () => QueryChain;
  collect: () => Promise<unknown[]>;
};

const emptyLearnerStats: LearnerStatsDto = {
  streak: 0,
  weeklyActivity: [],
  todayMinutes: 0,
  dailyGoal: 20,
  dailyProgress: 0,
  todayActivities: {
    wordsLearned: 0,
    reviewsCompleted: 0,
    grammarStudied: 0,
    listeningMinutes: 0,
    typingSessions: 0,
  },
  courseProgress: [],
  currentProgress: null,
  totalWordsLearned: 0,
  totalGrammarLearned: 0,
  wordsToReview: 0,
  vocabStats: {
    total: 0,
    dueReviews: 0,
    unlearned: 0,
    mastered: 0,
  },
  grammarStats: {
    total: 0,
    mastered: 0,
  },
  reviewStats: {
    totalReviews: 0,
    correctReviews: 0,
    accuracy: 0,
    currentStreak: 0,
  },
  moduleBreakdown: [],
  recentSessions: [],
  totalMinutes: 0,
  todayWordsStudied: 0,
  todayGrammarStudied: 0,
};

const baseSignals: DailyTaskBuildSignals = {
  language: 'zh',
  reviewSummary: {
    total: 0,
    dueTotal: 0,
    dueNow: 0,
    unlearned: 0,
    mastered: 0,
    learning: 0,
    recommendedToday: 0,
  },
  dueNoteCount: 0,
  dueSentenceCount: 0,
  dueGrammarCount: 0,
  writingWeaknesses: [],
  weakGrammarPatterns: [],
  weakVocabCategories: [],
  noteReviewDoneToday: 0,
};

const topikProfile: GoalProfileDto = {
  id: 'profile_1',
  userId: 'user_1',
  preferredLanguage: 'zh',
  currentLevel: 'TOPIK II',
  targetLevel: 'TOPIK 5',
  targetExam: 'TOPIK II',
  dailyMinutes: 30,
  studyFocus: ['TOPIK 写作'],
  diagnosisSummary: '写作助词和连接表达需要加强。',
  createdAt: 1710000000000,
  updatedAt: 1710000000000,
};

function createFakeCtx(): QueryCtx {
  const queryChain: QueryChain = {
    withIndex: () => queryChain,
    collect: async () => [],
  };
  const fakeCtx = {
    runQuery: async (): Promise<LearnerStatsDto> => emptyLearnerStats,
    db: {
      query: () => queryChain,
    },
  };
  return fakeCtx as unknown as QueryCtx;
}

describe('buildDailyTaskPlan', () => {
  it('keeps canonical daily task paths actionable for today flow', () => {
    expect(resolveDailyTaskPath('vocab_20')).toBe('/review/quiz?mode=full');
    expect(resolveDailyTaskPath('sentence_review')).toBe('/review/quiz?mode=sentences');
    expect(resolveDailyTaskPath('grammar_review')).toBe('/review/quiz?mode=grammar');
  });

  it('routes due vocabulary daily tasks directly into the review quiz', async () => {
    const plan = await buildDailyTaskPlan({
      ctx: createFakeCtx(),
      userId: 'user_1' as unknown as Id<'users'>,
      now: new Date('1970-01-01T12:00:00.000Z').getTime(),
      language: 'zh',
      profile: null,
      signals: {
        ...baseSignals,
        reviewSummary: {
          ...baseSignals.reviewSummary,
          dueNow: 20,
          dueTotal: 20,
          recommendedToday: 20,
        },
      },
    });

    const vocabTask = plan.tasks.find(task => task.kind === 'vocab_20');

    expect(vocabTask?.title).toBe('复习 20 个到期单词');
    expect(vocabTask?.linkPath).toBe('/review/quiz?mode=full');
  });

  it('promotes due saved sentence and grammar review counts into actionable tasks', async () => {
    const plan = await buildDailyTaskPlan({
      ctx: createFakeCtx(),
      userId: 'user_1' as unknown as Id<'users'>,
      now: new Date('1970-01-01T12:00:00.000Z').getTime(),
      language: 'zh',
      profile: null,
      signals: {
        ...baseSignals,
        dueSentenceCount: 4,
        dueGrammarCount: 2,
      },
    });

    const sentenceTask = plan.tasks.find(task => task.kind === 'sentence_review');
    const grammarTask = plan.tasks.find(task => task.kind === 'grammar_review');

    expect(sentenceTask?.title).toBe('复习 3 条保存句子');
    expect(sentenceTask?.linkPath).toBe('/review/quiz?mode=sentences');
    expect(sentenceTask?.assetType).toBe('saved_sentence');
    expect(grammarTask?.title).toBe('复习 2 个保存语法');
    expect(grammarTask?.linkPath).toBe('/review/quiz?mode=grammar');
    expect(grammarTask?.assetType).toBe('saved_grammar');
  });

  it('turns TOPIK writing weakness signals into a focused writing-coach task', async () => {
    const plan = await buildDailyTaskPlan({
      ctx: createFakeCtx(),
      userId: 'user_1' as unknown as Id<'users'>,
      now: new Date('1970-01-01T12:00:00.000Z').getTime(),
      language: 'zh',
      profile: topikProfile,
      signals: {
        ...baseSignals,
        writingWeaknesses: [
          {
            kagasType: 'JOSA_ERR',
            labelKo: '조사 오류',
            labelZh: '助词错误',
            legacyCategory: 'GRAMMAR',
            count: 5,
            highSeverityCount: 2,
            recentExample: {
              originalText: '학교를 갑니다',
              correctedText: '학교에 갑니다',
              explanationZh: '移动方向要用 에。',
            },
          },
        ],
      },
    });

    const topikTask = plan.tasks.find(task => task.assetType === 'topik_weakness');

    expect(topikTask?.title).toBe('TOPIK 写作弱点修复 · 助词错误');
    expect(topikTask?.linkPath).toBe('/topik/writing-coach');
    expect(topikTask?.assetRefId).toBe('JOSA_ERR');
  });

  it('preserves manually scheduled TOPIK rewrite tasks in regenerated daily plans', async () => {
    const plan = await buildDailyTaskPlan({
      ctx: createFakeCtx(),
      userId: 'user_1' as unknown as Id<'users'>,
      now: new Date('1970-01-01T12:00:00.000Z').getTime(),
      language: 'zh',
      profile: topikProfile,
      persistedPlan: {
        id: 'plan_1',
        date: '1970-01-01',
        status: 'ready',
        tasks: [
          {
            taskId: 'topik-rewrite:attempt_3',
            kind: 'topik_rewrite',
            title: '同题重写 · Q53',
            description: '下一次重写焦点：结论句要明确回应图表变化。',
            targetCount: 1,
            currentCount: 0,
            completed: false,
            linkPath: '/topik/writing-coach',
            assetType: 'topik_rewrite',
            assetRefId: 'attempt_3',
            metadata: {
              manual: true,
              taskType: '53',
            },
          },
        ],
        generatedAt: 1710000000000,
      },
      signals: baseSignals,
    });

    const rewriteTask = plan.tasks.find(task => task.assetType === 'topik_rewrite');

    expect(rewriteTask?.title).toBe('同题重写 · Q53');
    expect(rewriteTask?.assetRefId).toBe('attempt_3');
  });
});
