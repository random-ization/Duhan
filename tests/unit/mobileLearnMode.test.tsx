import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MobileLearnMode } from '../../src/components/mobile/MobileLearnMode';

const speakMock = vi.fn(async () => true);

vi.mock('../../src/hooks/useTTS', () => ({
  useTTS: () => ({
    speak: speakMock,
  }),
}));

describe('MobileLearnMode', () => {
  beforeEach(() => {
    speakMock.mockClear();
  });

  it('scores the next card against the next card options instead of stale options', () => {
    const onFsrsReview = vi.fn();

    render(
      <MobileLearnMode
        words={[
          { id: 'word-1', korean: '하나', english: 'one' },
          { id: 'word-2', korean: '둘', english: 'two' },
        ]}
        onFsrsReview={onFsrsReview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /one/i }));
    fireEvent.click(screen.getByRole('button', { name: /下一个/i }));
    fireEvent.click(screen.getByRole('button', { name: /two/i }));

    expect(onFsrsReview).toHaveBeenNthCalledWith(1, 'word-1', true);
    expect(onFsrsReview).toHaveBeenNthCalledWith(2, 'word-2', true);
  });
});
