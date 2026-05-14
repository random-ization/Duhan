import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Id } from '../../convex/_generated/dataModel';
import {
  WritingExamSession,
  type WritingQuestion,
} from '../../src/components/topik/WritingExamSession';

const { saveDraftMock, submitSessionMock, useMutationMock } = vi.hoisted(() => ({
  saveDraftMock: vi.fn(async () => ({ saved: true })),
  submitSessionMock: vi.fn(async () => undefined),
  useMutationMock: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useMutation: useMutationMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; count?: number; num?: number }) => {
      if (options?.defaultValue) {
        if (typeof options.count === 'number') {
          return options.defaultValue.replace('{{count}}', String(options.count));
        }
        if (typeof options.num === 'number') {
          return options.defaultValue.replace('{{num}}', String(options.num));
        }
        return options.defaultValue;
      }
      return key;
    },
    i18n: { language: 'zh' },
  }),
}));

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

const questions: WritingQuestion[] = [
  {
    _id: 'q51',
    number: 51,
    questionType: 'FILL_BLANK',
    instruction: 'Fill both blanks using the chart.',
    contextBox: 'Context box content',
    image: undefined,
    score: 10,
  },
  {
    _id: 'q52',
    number: 52,
    questionType: 'FILL_BLANK',
    instruction: 'Fill the prompt.',
    score: 10,
  },
  {
    _id: 'q53',
    number: 53,
    questionType: 'GRAPH_ESSAY',
    instruction: 'Write about the graph.',
    score: 30,
  },
  {
    _id: 'q54',
    number: 54,
    questionType: 'OPINION_ESSAY',
    instruction: 'Write an opinion essay.',
    score: 50,
  },
];

describe('WritingExamSession desktop B1 layout', () => {
  beforeEach(() => {
    saveDraftMock.mockClear();
    submitSessionMock.mockClear();
    useMutationMock.mockReset();
    useMutationMock.mockReturnValueOnce(saveDraftMock).mockReturnValueOnce(submitSessionMock);
  });

  it('renders the desktop exam shell with read-only supervision panels', () => {
    render(
      <WritingExamSession
        sessionId={'session_1' as Id<'topik_writing_sessions'>}
        examId="writing-1"
        endTime={Date.now() + 50 * 60 * 1000}
        questions={questions}
        initialAnswers={{}}
      />
    );

    expect(screen.getByTestId('desktop-writing-layout')).toHaveClass(
      'xl:grid-cols-[minmax(0,1fr)_214px]'
    );
    expect(screen.getByText('Exam status')).toBeInTheDocument();
    expect(screen.getByText('Question navigator')).toBeInTheDocument();
    expect(screen.queryByText('Quick checks')).not.toBeInTheDocument();
    expect(
      screen.queryByText('A read-only supervision rail for time, progress, and control.')
    ).not.toBeInTheDocument();
  });

  it('uses a compact short-answer workspace without duplicated prompt metrics', () => {
    render(
      <WritingExamSession
        sessionId={'session_1' as Id<'topik_writing_sessions'>}
        examId="writing-1"
        endTime={Date.now() + 50 * 60 * 1000}
        questions={questions}
        initialAnswers={{}}
      />
    );

    expect(screen.getByTestId('desktop-answer-panel')).toBeInTheDocument();
    expect(screen.getByText('Answer area')).toBeInTheDocument();
    expect(screen.queryByText('Prompt on the left, answer on the right.')).not.toBeInTheDocument();
    expect(screen.queryByText('Prompt status')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Read the prompt on the left, then complete the two response slots without leaving the workspace.'
      )
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Answer progress')).not.toBeInTheDocument();
  });

  it('keeps long-form writing on a dedicated writing sheet', () => {
    render(
      <WritingExamSession
        sessionId={'session_1' as Id<'topik_writing_sessions'>}
        examId="writing-1"
        endTime={Date.now() + 50 * 60 * 1000}
        questions={questions}
        initialAnswers={{ 51: '㉠ answer\n㉡ answer' }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Question 53/i }));

    expect(screen.getByText('Writing sheet')).toBeInTheDocument();
    expect(screen.queryByText('Source on the left, draft on the sheet.')).not.toBeInTheDocument();
    expect(screen.queryByText('Response slots')).not.toBeInTheDocument();
    expect(screen.getByTestId('desktop-answer-panel')).toBeInTheDocument();
  });
});
