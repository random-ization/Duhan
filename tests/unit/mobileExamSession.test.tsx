import { fireEvent, render, screen } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { TopikExam } from '../../src/types';

vi.mock('../../src/components/topik/QuestionRenderer', () => ({
  QuestionRenderer: () => <div>Question Renderer Stub</div>,
}));

const { MobileExamSession } = await import('../../src/components/mobile/MobileExamSession');

beforeAll(() => {
  if (!HTMLElement.prototype.scrollTo) {
    HTMLElement.prototype.scrollTo = vi.fn();
  }
});

const exam: TopikExam = {
  id: 'exam-1',
  title: 'TOPIK Mock',
  round: 99,
  type: 'READING',
  timeLimit: 60,
  questions: [
    {
      id: 1,
      number: 1,
      question: 'Question 1',
      passage: '<script>alert(1)</script><img src=x onerror="alert(2)" /><b>Safe Passage</b>',
      options: ['A', 'B', 'C', 'D'],
      correctAnswer: 0,
      score: 2,
    },
  ],
};

describe('MobileExamSession', () => {
  it('sanitizes passage content in the legacy bottom sheet', () => {
    const { container } = render(
      <MobileExamSession
        exam={exam}
        language="en"
        userAnswers={{}}
        timeLeft={600}
        onAnswerChange={() => {}}
        onSubmit={() => {}}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /show passage/i }));

    expect(screen.getByText('Safe Passage')).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror=');
  });
});
