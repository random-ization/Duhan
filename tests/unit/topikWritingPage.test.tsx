import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import { api } from '../../convex/_generated/api';
import { TOPIK } from '../../src/utils/convexRefs';

const navigateMock = vi.fn();
const startUpgradeFlowMock = vi.fn();
const notifyErrorMock = vi.fn();
const startSessionMock = vi.fn<
  (args: { examId: Id<'topik_exams'> }) => Promise<{
    sessionId: Id<'topik_writing_sessions'>;
    endTime: number;
    answers: Record<string, string>;
  }>
>();
const tMock = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key;
const useQueryMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
  useCurrentLanguage: () => 'zh',
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'user_1' },
  }),
}));

vi.mock('../../src/hooks/useUpgradeFlow', () => ({
  useUpgradeFlow: () => ({
    startUpgradeFlow: startUpgradeFlowMock,
  }),
}));

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
  }),
}));

vi.mock('../../src/utils/notify', () => ({
  notify: {
    error: (message: string) => notifyErrorMock(message),
    success: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('convex/react', () => ({
  useMutation: () => startSessionMock,
  useQuery: (...args: unknown[]) => useQueryMock(...args),
}));

vi.mock('../../src/components/topik/WritingExamSession', () => ({
  WritingExamSession: ({
    sessionId,
    questions,
  }: {
    sessionId: string;
    questions: Array<{ number: number }>;
  }) => (
    <div>
      <div>mock-writing-session</div>
      <div>{sessionId}</div>
      <div>{questions.map(question => question.number).join(',')}</div>
    </div>
  ),
}));

vi.mock('../../src/components/topik/WritingEvaluationReport', () => ({
  WritingEvaluationReport: () => <div>mock-writing-report</div>,
}));

const { default: TopikWritingPage } = await import('../../src/pages/TopikWritingPage');

function renderPage(path = '/topik/writing/writing-1') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/topik/writing/:examId" element={<TopikWritingPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('TopikWritingPage desktop flow', () => {
  beforeEach(() => {
    navigateMock.mockReset();
    startUpgradeFlowMock.mockReset();
    notifyErrorMock.mockReset();
    startSessionMock.mockReset();
    useQueryMock.mockReset();

    startSessionMock.mockResolvedValue({
      sessionId: 'session_1' as Id<'topik_writing_sessions'>,
      endTime: Date.now() + 60_000,
      answers: { '53': 'draft' },
    });

    useQueryMock.mockImplementation((ref: unknown, args: unknown) => {
      if (ref === TOPIK.getExamById) {
        if ((args as { examId?: string } | undefined)?.examId === 'writing-1') {
          return {
            id: 'writing-1',
            _id: 'exam_doc_1',
            type: 'WRITING',
            title: 'TOPIK II 写作 1',
            description: 'desc',
          };
        }
        if ((args as { examId?: string } | undefined)?.examId === 'missing-exam') {
          return null;
        }
      }

      if (
        ref === api.topikWriting.getWritingQuestions &&
        (args as { examId?: string } | undefined)?.examId === 'exam_doc_1'
      ) {
        return [
          {
            _id: 'question_53',
            number: 53,
            questionType: 'GRAPH_ESSAY',
            score: 30,
            instruction: 'Write about the chart.',
            contextBox: 'Chart context',
            image: null,
            modelAnswer: null,
          },
        ];
      }

      return undefined;
    });
  });

  it('renders the real writing exam session on desktop after starting a session', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('mock-writing-session')).toBeInTheDocument();
    });

    expect(screen.getByText('session_1')).toBeInTheDocument();
    expect(screen.getByText('51,52,53,54')).toBeInTheDocument();
    expect(notifyErrorMock).not.toHaveBeenCalled();
  });

  it('does not stay on the loading screen when the exam id is invalid', async () => {
    renderPage('/topik/writing/missing-exam');

    await waitFor(() => {
      expect(notifyErrorMock).toHaveBeenCalledWith('Unable to find this writing exam.');
    });

    expect(navigateMock).toHaveBeenCalledWith('/topik');
    expect(screen.queryByText('Preparing writing exam...')).not.toBeInTheDocument();
  });
});
