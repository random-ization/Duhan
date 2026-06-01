import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { getFunctionName } from 'convex/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DAILY_TASK, TOPIK_COACH } from '../../src/utils/convexRefs';

const useActionMock = vi.fn();
const useMutationMock = vi.fn();
const useQueryMock = vi.fn();
const scheduleTopikRewriteTaskMock = vi.fn();
const updateTaskCompletionMock = vi.fn();
const evaluateWritingMock = vi.fn();
const saveAttemptMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('convex/react', () => ({
  useAction: (ref: unknown) => useActionMock(ref),
  useMutation: (ref: unknown) => useMutationMock(ref),
  useQuery: (ref: unknown, args: unknown) => useQueryMock(ref, args),
}));

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'user-1' },
    language: 'zh',
  }),
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const { default: TopikWritingCoachPage } =
  await import('../../src/pages/learning/TopikWritingCoachPage');

describe('TopikWritingCoachPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    scheduleTopikRewriteTaskMock.mockResolvedValue({ tasks: [] });
    updateTaskCompletionMock.mockResolvedValue({ tasks: [] });
    evaluateWritingMock.mockResolvedValue({
      taskType: '53',
      estimatedScore: 25,
      scoreBand: 'Level 5',
      overallCommentZh: '结构更清楚。',
      strengths: ['图表趋势明确'],
      weaknesses: ['结论还可以更强'],
      errors: [],
      improvedVersion: '자료에 따르면 한국어 학습 시간이 증가했습니다.',
      usefulExpressions: [],
      recommendedReview: [],
      nextPracticeSuggestion: '继续强化结论句。',
      confidence: 0.9,
    });
    saveAttemptMock.mockResolvedValue({ success: true, attemptId: 'attempt_4' });
    window.history.replaceState({}, '', '/topik/writing-coach');
    useActionMock.mockReturnValue(evaluateWritingMock);
    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === DAILY_TASK.scheduleTopikRewriteTask) return scheduleTopikRewriteTaskMock;
      if (ref === DAILY_TASK.updateTaskCompletion) return updateTaskCompletionMock;
      return saveAttemptMock;
    });
    useQueryMock.mockImplementation((ref: unknown) => {
      if (ref === TOPIK_COACH.getScorePrediction) return null;
      if (ref === TOPIK_COACH.getImprovementPlan) return null;
      if (ref === TOPIK_COACH.getWeakPoints) {
        return [
          {
            code: 'JOSA_ERR',
            label: '조사 오류',
            labelZh: '助词错误',
            count: 4,
            highSeverityCount: 2,
            taskTypes: ['53', '54'],
            latestExplanation: '助词搭配不自然。',
          },
        ];
      }
      if (ref === TOPIK_COACH.getHotTopics) {
        return [
          {
            taskType: '53',
            promptPreview: '다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
            count: 6,
            avgScore: 22.5,
            totalScore: 135,
          },
        ];
      }
      if (ref === TOPIK_COACH.getWritingProgress) {
        return {
          attemptsAnalyzed: 3,
          averageScore: 21.3,
          latestScore: 24,
          bestScore: 24,
          scoreDelta: 6,
          trend: 'improving',
          timeline: [
            {
              attemptId: 'attempt_1',
              taskType: '53',
              promptPreview: '다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
              estimatedScore: 18,
              normalizedScore: 60,
              createdAt: 1710000000000,
            },
            {
              attemptId: 'attempt_2',
              taskType: '53',
              promptPreview: '다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
              estimatedScore: 22,
              normalizedScore: 73.3,
              createdAt: 1710086400000,
            },
            {
              attemptId: 'attempt_3',
              taskType: '53',
              promptPreview: '다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
              estimatedScore: 24,
              normalizedScore: 80,
              createdAt: 1710172800000,
            },
          ],
          rewriteComparisons: [
            {
              promptKey: '53:다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
              taskType: '53',
              promptPreview: '다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
              attemptCount: 3,
              firstScore: 18,
              latestScore: 24,
              bestScore: 24,
              scoreDelta: 6,
              lastAttemptAt: 1710172800000,
              firstAttempt: {
                attemptId: 'attempt_1',
                userAnswer: '한국어 학습 시간은 증가했습니다. 이유는 재미있습니다.',
                estimatedScore: 18,
                createdAt: 1710000000000,
              },
              latestAttempt: {
                attemptId: 'attempt_3',
                userAnswer:
                  '자료에 따르면 한국어 학습 시간은 꾸준히 증가했으며, 온라인 수업의 영향이 컸습니다.',
                estimatedScore: 24,
                feedbackSummary: '근거 제시가 좋아졌지만 결론 연결이 약합니다.',
                improvedVersion:
                  '자료에 따르면 한국어 학습 시간은 꾸준히 증가했으며, 이는 온라인 수업 확대와 관련이 있습니다.',
                createdAt: 1710172800000,
              },
              revisionFocus: ['结论句要明确回应图表变化。', '用 연결 표현 连接原因和结果。'],
              revisionGoals: [
                {
                  goalId: 'attempt_3:0',
                  title: '结论呼应',
                  target: '结尾句必须总结图表变化，并回应题目要求。',
                  source: 'weakness',
                },
                {
                  goalId: 'attempt_3:1',
                  title: '连接表达',
                  target: '至少加入 2 个原因/结果连接表达。',
                  source: 'weakness',
                },
              ],
              retryHistory: [
                {
                  attemptId: 'attempt_1',
                  estimatedScore: 18,
                  createdAt: 1710000000000,
                },
                {
                  attemptId: 'attempt_2',
                  estimatedScore: 22,
                  createdAt: 1710086400000,
                },
                {
                  attemptId: 'attempt_3',
                  estimatedScore: 24,
                  createdAt: 1710172800000,
                },
              ],
            },
          ],
        };
      }
      if (ref === TOPIK_COACH.getMistakeBook) {
        return {
          totalErrors: 4,
          categories: [
            {
              type: 'JOSA_ERR',
              count: 4,
              severityCounts: { LOW: 1, MEDIUM: 1, HIGH: 2 },
              recentExamples: [
                {
                  original: '학교를 갑니다',
                  corrected: '학교에 갑니다',
                  explanation: '移动方向要用 에。',
                  createdAt: 1710000000000,
                },
              ],
              label: '조사 오류',
              labelZh: '助词错误',
              category: 'GRAMMAR',
            },
          ],
        };
      }
      return null;
    });
  });

  it('shows a return CTA when opened from learning feedback', async () => {
    window.history.replaceState(
      {},
      '',
      '/topik/writing-coach?returnTo=%2Fdashboard%2Fweekly-report'
    );

    render(<TopikWritingCoachPage />);

    fireEvent.click(await screen.findByRole('button', { name: '回到学习反馈' }));
    expect(navigateMock).toHaveBeenCalledWith('/dashboard/weekly-report');
  });

  it('renders grouped mistake-book categories from the Convex result object', async () => {
    render(<TopikWritingCoachPage />);

    fireEvent.click(screen.getByRole('button', { name: '错题本' }));

    expect((await screen.findAllByText('助词错误')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('4 次').length).toBeGreaterThan(0);
    expect(screen.getByText('移动方向要用 에。')).toBeInTheDocument();
  });

  it('renders a prompt bank that can start a retryable writing practice', async () => {
    render(<TopikWritingCoachPage />);

    expect(await screen.findByText('推荐题库')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Q53 · 6 次练习/ }));

    expect(
      screen.getByDisplayValue('다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.')
    ).toBeInTheDocument();
  });

  it('renders score trend and same-prompt rewrite comparisons', async () => {
    render(<TopikWritingCoachPage />);

    fireEvent.click(screen.getByRole('button', { name: '分数预测' }));

    expect(await screen.findByText('写作趋势')).toBeInTheDocument();
    expect(screen.getByText('最近 3 次平均 21.3 分')).toBeInTheDocument();
    expect(screen.getAllByText('+6 分').length).toBeGreaterThan(0);
    expect(screen.getByText('同题重写对比')).toBeInTheDocument();
    expect(screen.getByText('首次 18 → 最新 24')).toBeInTheDocument();
  });

  it('renders before-and-after text comparison with retry coaching', async () => {
    render(<TopikWritingCoachPage />);

    fireEvent.click(screen.getByRole('button', { name: '分数预测' }));

    expect(await screen.findByText('修订前后文本')).toBeInTheDocument();
    expect(screen.getByText('首次稿')).toBeInTheDocument();
    expect(screen.getByText('最近稿')).toBeInTheDocument();
    expect(
      screen.getByText('한국어 학습 시간은 증가했습니다. 이유는 재미있습니다.')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        '자료에 따르면 한국어 학습 시간은 꾸준히 증가했으며, 온라인 수업의 영향이 컸습니다.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('下一次重写焦点')).toBeInTheDocument();
    expect(screen.getByText('结论句要明确回应图表变化。')).toBeInTheDocument();
    expect(screen.getByText('用 연결 표현 连接原因和结果。')).toBeInTheDocument();
  });

  it('renders multi-day same-prompt retry history', async () => {
    render(<TopikWritingCoachPage />);

    fireEvent.click(screen.getByRole('button', { name: '分数预测' }));

    expect(await screen.findByText('多日复练历史')).toBeInTheDocument();
    expect(screen.getByText('3 次复练')).toBeInTheDocument();
    expect(screen.getByText('第 1 次 · 18 分')).toBeInTheDocument();
    expect(screen.getByText('第 2 次 · 22 分')).toBeInTheDocument();
    expect(screen.getByText('第 3 次 · 24 分')).toBeInTheDocument();
  });

  it('renders explicit revision goals for the next rewrite', async () => {
    render(<TopikWritingCoachPage />);

    fireEvent.click(screen.getByRole('button', { name: '分数预测' }));

    expect(await screen.findByText('明确修订目标')).toBeInTheDocument();
    expect(screen.getByText('目标 1 · 结论呼应')).toBeInTheDocument();
    expect(screen.getByText('结尾句必须总结图表变化，并回应题目要求。')).toBeInTheDocument();
    expect(screen.getByText('目标 2 · 连接表达')).toBeInTheDocument();
    expect(screen.getByText('至少加入 2 个原因/结果连接表达。')).toBeInTheDocument();
  });

  it('schedules a same-prompt rewrite into today tasks', async () => {
    render(<TopikWritingCoachPage />);

    fireEvent.click(screen.getByRole('button', { name: '分数预测' }));
    fireEvent.click(await screen.findByRole('button', { name: /加入今日复练/ }));

    expect(scheduleTopikRewriteTaskMock).toHaveBeenCalledWith({
      taskType: '53',
      promptPreview: '다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.',
      latestAttemptId: 'attempt_3',
      revisionFocus: ['结论句要明确回应图表变化。', '用 연결 표현 连接原因和结果。'],
    });
  });

  it('marks the scheduled TOPIK rewrite task complete after submitting from today task', async () => {
    window.history.replaceState(
      {},
      '',
      '/topik/writing-coach?rewriteTaskId=topik-rewrite%3Aattempt_3'
    );
    render(<TopikWritingCoachPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Q53 · 6 次练习/ }));
    fireEvent.change(screen.getByPlaceholderText('在这里输入你的韩语作文内容...'), {
      target: {
        value: '자료에 따르면 한국어 학습 시간이 꾸준히 증가했습니다.',
      },
    });
    fireEvent.click(screen.getByRole('button', { name: /开始 AI 评估/ }));

    await waitFor(() => {
      expect(updateTaskCompletionMock).toHaveBeenCalledWith({
        taskId: 'topik-rewrite:attempt_3',
        completed: true,
        currentCount: 1,
      });
    });
  });

  it('prefills the retry form when opened from a scheduled rewrite task', async () => {
    window.history.replaceState(
      {},
      '',
      '/topik/writing-coach?rewriteTaskId=topik-rewrite%3Aattempt_3'
    );
    render(<TopikWritingCoachPage />);

    expect(
      await screen.findByDisplayValue('다음 표를 보고 한국어 학습 시간의 변화를 설명하십시오.')
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue(
        '자료에 따르면 한국어 학습 시간은 꾸준히 증가했으며, 온라인 수업의 영향이 컸습니다.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Q53 · 图表作文')).toBeInTheDocument();
  });

  it('points TOPIK coach refs at the public nested Convex module', () => {
    expect(getFunctionName(TOPIK_COACH.getScorePrediction)).toBe(
      'topikCoach/index:getScorePrediction'
    );
    expect(getFunctionName(TOPIK_COACH.getImprovementPlan)).toBe(
      'topikCoach/index:getImprovementPlan'
    );
    expect(getFunctionName(TOPIK_COACH.getMistakeBook)).toBe('topikCoach/index:getMistakeBook');
    expect(getFunctionName(TOPIK_COACH.getWeakPoints)).toBe('topikCoach/index:getWeakPoints');
    expect(getFunctionName(TOPIK_COACH.getWritingProgress)).toBe(
      'topikCoach/index:getWritingProgress'
    );
    expect(getFunctionName(TOPIK_COACH.predictScore)).toBe('topikCoach/index:predictScore');
    expect(getFunctionName(TOPIK_COACH.generateImprovementPlan)).toBe(
      'topikCoach/index:generateImprovementPlan'
    );
    expect(getFunctionName(DAILY_TASK.scheduleTopikRewriteTask)).toBe(
      'dailyTask:scheduleTopikRewriteTask'
    );
  });
});
