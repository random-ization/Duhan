import { StrictMode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TestCardFill10 from '../../src/features/vocab/components/test/TestCardFill10';

describe('TestCardFill10', () => {
  it('pairs items once per click path in strict mode and submits the expected mapping', () => {
    const onSubmit = vi.fn();

    render(
      <StrictMode>
        <TestCardFill10
          language="en"
          items={[
            { wordId: 'word-1', pair: { korean: '하나', native: 'one' } },
            { wordId: 'word-2', pair: { korean: '둘', native: 'two' } },
          ]}
          initialDirection="KR_TO_NATIVE"
          onSubmit={onSubmit}
        />
      </StrictMode>
    );

    fireEvent.click(screen.getByRole('button', { name: /하나/i }));
    fireEvent.click(screen.getByRole('button', { name: /one/i }));

    expect(
      screen.getAllByText((_content, element) => element?.textContent === '已连线 1/2').length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /둘/i }));
    fireEvent.click(screen.getByRole('button', { name: /two/i }));

    expect(
      screen.getAllByText((_content, element) => element?.textContent === '已连线 2/2').length
    ).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /下一题/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(['word-1', 'word-2'], 'KR_TO_NATIVE');
  });
});
