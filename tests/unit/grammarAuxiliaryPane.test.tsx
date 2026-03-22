import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GrammarAuxiliaryPane from '../../src/components/grammar/GrammarAuxiliaryPane';
import type { GrammarPointData } from '../../src/types';

const useActionMock = vi.fn();
const tMock = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key;

vi.mock('convex/react', () => ({
  useAction: (ref: unknown) => useActionMock(ref),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: { language: 'zh' },
  }),
}));

describe('GrammarAuxiliaryPane', () => {
  const grammar: GrammarPointData = {
    id: 'g1',
    title: '~하기에',
    summary: '因为、由于',
    explanation: '表示理由或根据。',
    type: 'CONNECTIVE',
    examples: [],
    construction: {},
    conjugationRules: {},
    status: 'LEARNING',
    proficiency: 40,
  };

  it('sends user message and appends assistant reply', async () => {
    const actionMock = vi.fn(async () => ({ success: true, reply: '这是 AI 回答。' }));
    useActionMock.mockReturnValue(actionMock);

    render(<GrammarAuxiliaryPane grammar={grammar} />);

    expect(screen.getByText(/Hi, I am your AI grammar tutor/i)).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Ask a question and press Enter...'), {
      target: { value: '请给我一个例句' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Ask a question and press Enter...'), {
      key: 'Enter',
    });

    await waitFor(() => {
      expect(screen.getByText('请给我一个例句')).toBeInTheDocument();
      expect(screen.getByText('这是 AI 回答。')).toBeInTheDocument();
    });
  });
});
