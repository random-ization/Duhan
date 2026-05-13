import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuestionCard } from '../../src/components/qa/QuestionCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

describe('QuestionCard', () => {
  it('opens the author profile without triggering the question open callback', () => {
    const onClick = vi.fn();
    const onAuthorClick = vi.fn();

    render(
      <QuestionCard
        question={{
          _id: 'question_1',
          title: 'How do I use 은/는 correctly?',
          content: 'I keep mixing topic and subject particles.',
          topicSlug: 'grammar',
          answerCount: 2,
          voteScore: 4,
          viewCount: 21,
          hasAcceptedAnswer: false,
          isEdited: false,
          createdAt: Date.now(),
          author: {
            _id: 'user_1',
            name: 'Minji',
            avatar: null,
          },
        }}
        onClick={onClick}
        onAuthorClick={onAuthorClick}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /view minji's profile/i }));

    expect(onAuthorClick).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
