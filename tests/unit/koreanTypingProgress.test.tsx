import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useKoreanTyping } from '../../src/features/typing/hooks/useKoreanTyping';

function TypingHarness({ target = '가나' }: { target?: string }) {
  const { inputRef, stats, phase, completedIndex } = useKoreanTyping(target, 'sentence');
  return (
    <>
      <input ref={inputRef} aria-label="typing" />
      <output data-testid="stats">{JSON.stringify({ ...stats, phase, completedIndex })}</output>
    </>
  );
}

const getStats = () => JSON.parse(screen.getByTestId('stats').textContent ?? '{}');

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Korean typing progress', () => {
  it('counts committed mistakes, without counting IME composition or backspace twice', () => {
    render(<TypingHarness />);
    const input = screen.getByLabelText('typing');
    fireEvent.compositionStart(input);
    fireEvent.input(input, { target: { value: 'ㄴ' } });
    expect(getStats().errorCount).toBe(0);
    fireEvent.compositionEnd(input, { target: { value: '나' } });
    fireEvent.input(input, { target: { value: '나' } });
    expect(getStats().errorCount).toBe(1);
    fireEvent.input(input, { target: { value: '' } });
    expect(getStats().errorCount).toBe(1);
    fireEvent.input(input, { target: { value: '가나' } });
    expect(getStats().accuracy).toBe(67);
  });

  it('includes the last character in final WPM', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    render(<TypingHarness target="가나다라마" />);
    const input = screen.getByLabelText('typing');
    fireEvent.input(input, { target: { value: '가' } });
    act(() => vi.advanceTimersByTime(60_000));
    fireEvent.input(input, { target: { value: '가나다라마' } });
    expect(getStats()).toMatchObject({ phase: 'finish', completedIndex: 5, wpm: 1 });
  });

  it('does not finish when a correct prefix has extra characters', () => {
    render(<TypingHarness />);
    fireEvent.input(screen.getByLabelText('typing'), { target: { value: '가나다' } });
    expect(getStats().phase).toBe('typing');
    expect(getStats().errorCount).toBe(1);
  });
});
