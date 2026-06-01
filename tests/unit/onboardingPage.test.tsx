import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();
const submitGoalsMock = vi.fn();
const submitDiagnosisResultMock = vi.fn();
const generateTodayPlanMock = vi.fn();
const useQueryMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    i18n: { language: 'zh' },
  }),
}));

vi.mock('convex/server', () => ({
  getFunctionName: (ref: { _name?: string }) => ref._name ?? '',
}));

vi.mock('../../convex/_generated/api', () => ({
  api: {
    onboarding: {
      submitGoals: { _name: 'onboarding:submitGoals' },
      submitDiagnosisResult: { _name: 'onboarding:submitDiagnosisResult' },
      getDiagnosisQuestions: { _name: 'onboarding:getDiagnosisQuestions' },
    },
    dailyTask: {
      generateTodayPlan: { _name: 'dailyTask:generateTodayPlan' },
    },
  },
}));

vi.mock('convex/react', () => ({
  useMutation: (ref: { _name?: string }) => {
    if (ref._name === 'onboarding:submitDiagnosisResult') return submitDiagnosisResultMock;
    if (ref._name === 'dailyTask:generateTodayPlan') return generateTodayPlanMock;
    return submitGoalsMock;
  },
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

const { default: OnboardingPage } = await import('../../src/pages/OnboardingPage');

describe('OnboardingPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    submitGoalsMock.mockReset();
    submitDiagnosisResultMock.mockReset();
    generateTodayPlanMock.mockReset();
    useQueryMock.mockReset();

    submitGoalsMock.mockResolvedValue({ status: 'created' });
    submitDiagnosisResultMock.mockResolvedValue({
      recommendedCurrentLevel: 'TOPIK 2',
      suggestedDailyMinutes: 30,
    });
    generateTodayPlanMock.mockResolvedValue({ tasks: [] });
    useQueryMock.mockReturnValue([
      {
        id: 'reading_confidence',
        prompt: '看到中短篇韩语内容时，你通常能理解到什么程度？',
        helpText: '按你最近一周的真实感受作答。',
        options: [
          { id: 'needs_translation', label: '大多需要翻译辅助', score: 1 },
          { id: 'keyword_only', label: '能抓住关键词和大意', score: 2 },
        ],
      },
      {
        id: 'listening_confidence',
        prompt: '听播客、课程或短视频时，你现在的听力状态更接近哪一项？',
        options: [
          { id: 'word_by_word', label: '只能零散听懂单词', score: 1 },
          { id: 'main_flow', label: '能跟住主要内容', score: 2 },
        ],
      },
      {
        id: 'study_consistency',
        prompt: '过去两周里，你平均每周能稳定学习几天？',
        options: [
          { id: 'one_or_two', label: '1-2 天', score: 1 },
          { id: 'three_or_four', label: '3-4 天', score: 2 },
        ],
      },
    ]);
  });

  it('submits learner goals and backend diagnosis answers before entering the dashboard', async () => {
    render(<OnboardingPage />);

    fireEvent.click(screen.getByText('TOPIK 考试'));
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

    expect(
      await screen.findByText('看到中短篇韩语内容时，你通常能理解到什么程度？')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText('能抓住关键词和大意'));
    fireEvent.click(screen.getByText('能跟住主要内容'));
    fireEvent.click(screen.getByText('3-4 天'));
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));
    fireEvent.click(screen.getByRole('button', { name: /生成今日学习计划/ }));

    await waitFor(() => {
      expect(submitGoalsMock).toHaveBeenCalledWith({
        studyFocus: ['TOPIK'],
        dailyMinutes: 30,
        preferredLanguage: 'zh',
      });
    });

    expect(submitDiagnosisResultMock).toHaveBeenCalledWith({
      language: 'zh',
      answers: [
        { questionId: 'reading_confidence', optionId: 'keyword_only' },
        { questionId: 'listening_confidence', optionId: 'main_flow' },
        { questionId: 'study_consistency', optionId: 'three_or_four' },
      ],
    });
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });
});
