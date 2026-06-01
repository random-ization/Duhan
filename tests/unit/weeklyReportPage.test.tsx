import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WeeklyReportData } from '../../convex/weeklyReport';
import { WEAK_POINTS, WEEKLY_REPORT } from '../../src/utils/convexRefs';

const navigateMock = vi.fn();
const applyWeeklyFocusMock = vi.fn();
const useQueryMock = vi.fn();
const useMutationMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user_1', email: 'test@example.com' },
  }),
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('convex/react', () => ({
  useMutation: (...args: unknown[]) => useMutationMock(...args),
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

const { default: WeeklyReportPage } = await import('../../src/pages/dashboard/WeeklyReportPage');

function buildReport(overrides: Partial<WeeklyReportData>): WeeklyReportData {
  return {
    weekStart: 1710000000000,
    weekEnd: 1710604800000,
    stats: {
      totalMinutes: 120,
      sessionsCount: 6,
      wordsMastered: 20,
      grammarMastered: 6,
      writingAttemptsCount: 0,
      avgWritingScore: 0,
    },
    moduleBreakdown: {
      内容导入: 60,
      复习: 60,
    },
    weakPoints: {
      errorTypeFrequency: {},
      kagasRanked: [],
      topMistakes: [],
    },
    assetSummary: {
      wordsSaved: 9,
      sentencesSaved: 4,
      grammarSaved: 2,
      sentenceReviewDue: 3,
      grammarReviewDue: 1,
    },
    suggestions: {
      focusSuggestion: '优先复习本周保存的句子。',
      nextWeekGoal: '每天完成 2 句句子复习。',
    },
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <WeeklyReportPage />
    </MemoryRouter>
  );
}

describe('WeeklyReportPage', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    applyWeeklyFocusMock.mockReset();
    useQueryMock.mockReset();
    useMutationMock.mockReset();

    applyWeeklyFocusMock.mockResolvedValue({ success: false, message: 'not needed' });
    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === WEEKLY_REPORT.applyWeeklyFocusToTodayPlan) return applyWeeklyFocusMock;
      return vi.fn();
    });

    const currentReport = buildReport({});
    const previousReport = buildReport({
      weekStart: 1709395200000,
      weekEnd: 1709999999999,
      stats: {
        totalMinutes: 90,
        sessionsCount: 4,
        wordsMastered: 15,
        grammarMastered: 8,
        writingAttemptsCount: 0,
        avgWritingScore: 0,
      },
      assetSummary: {
        wordsSaved: 5,
        sentencesSaved: 2,
        grammarSaved: 1,
        sentenceReviewDue: 1,
        grammarReviewDue: 1,
      },
    });

    useQueryMock.mockImplementation((ref: unknown, args: unknown) => {
      if (ref === WEEKLY_REPORT.getWeeklyReport) {
        const weekOffset = (args as { weekOffset?: number }).weekOffset ?? 0;
        return weekOffset === 0 ? currentReport : previousReport;
      }
      if (
        ref === WEAK_POINTS.getWeakGrammarPatterns ||
        ref === WEAK_POINTS.getWeakVocabCategories
      ) {
        return [];
      }
      return undefined;
    });
  });

  it('frames the weekly report route as the learning feedback hub', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: '学习反馈' })).toBeInTheDocument();
    expect(screen.getByText('周报 · 能力画像 · 复习资产')).toBeInTheDocument();
    expect(screen.getByText('周报概览')).toBeInTheDocument();
    expect(screen.getByText('能力画像')).toBeInTheDocument();
    expect(screen.getByText('复习资产')).toBeInTheDocument();
  });

  it('turns feedback sections into executable review actions', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '复练句子资产' }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/review/quiz?mode=sentences&returnTo=%2Fdashboard%2Fweekly-report'
    );

    fireEvent.click(screen.getByRole('button', { name: '复练语法资产' }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/review/quiz?mode=grammar&returnTo=%2Fdashboard%2Fweekly-report'
    );

    fireEvent.click(screen.getByRole('button', { name: '修正写作弱点' }));
    expect(navigateMock).toHaveBeenCalledWith(
      '/topik/writing-coach?returnTo=%2Fdashboard%2Fweekly-report'
    );
  });

  it('shows cross-week feedback and a next-week action cue', async () => {
    renderPage();

    const feedbackTitle = await screen.findByText('跨周反馈');
    const feedbackPanel = feedbackTitle.closest('section');
    if (!(feedbackPanel instanceof HTMLElement)) {
      throw new Error('Cross-week feedback panel was not rendered');
    }
    const feedbackView = within(feedbackPanel);

    expect(feedbackView.getByText('学习时长 +30 分钟')).toBeInTheDocument();
    expect(feedbackView.getByText('词汇 +5')).toBeInTheDocument();
    expect(feedbackView.getByText('语法 -2')).toBeInTheDocument();
    expect(feedbackView.getByText('资产沉淀 +7')).toBeInTheDocument();
    expect(feedbackView.getByText('下周优先：完成 3 句句子复习')).toBeInTheDocument();
  });
});
