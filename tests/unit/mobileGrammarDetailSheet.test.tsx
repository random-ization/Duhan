import type { HTMLAttributes } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MobileGrammarDetailSheet from '../../src/components/mobile/MobileGrammarDetailSheet';
import type { GrammarPointData } from '../../src/types';

const checkActionMock = vi.fn();
const updateStatusMock = vi.fn().mockResolvedValue({ status: 'LEARNING', proficiency: 50 });

vi.mock('convex/react', () => ({
  useAction: () => checkActionMock,
  useMutation: () => updateStatusMock,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string; title?: string }) =>
      options?.defaultValue ?? options?.title ?? key,
    i18n: { language: 'en' },
  }),
}));

describe('MobileGrammarDetailSheet', () => {
  const grammar: GrammarPointData = {
    id: 'grammar-mobile-1',
    title: '~(으)ㄹ까 봐',
    titleEn: '~(eu)lkkabwa',
    summary: '担心会发生，所以提前准备。',
    summaryEn: 'Used when you do something in anticipation or concern.',
    type: 'ENDING',
    level: 'TOPIK 2',
    explanation: '',
    explanationEn: '',
    sections: {
      introduction: { en: 'This pattern expresses concern about a possible outcome.' },
      core: { en: 'Attach it to a verb stem when the following action is preventative.' },
    },
    construction: {
      'Verb stem': '-(으)ㄹ까 봐',
    },
    examples: [
      {
        kr: '비가 올까 봐 우산을 가져왔어요.',
        cn: '怕下雨，所以带了伞。',
        en: 'I brought an umbrella in case it rains.',
      },
    ],
    quizItems: [
      {
        prompt: { en: 'Fill in the ending for a sentence about worry.' },
        answer: { en: '-(으)ㄹ까 봐' },
      },
    ],
    customNoteEn: 'Often appears when the second clause is a preparation.',
    sourceMeta: {
      sourceType: 'hanabira_markdown_korean',
      sourcePath: 'markdown_grammar_korean/sample.md',
      importedAt: 1_710_000_000_000,
    },
    status: 'LEARNING',
    proficiency: 40,
  };

  beforeEach(() => {
    window.localStorage.clear();
    checkActionMock.mockReset();
    updateStatusMock.mockClear();
  });

  it('rebuilds the reader body from structured sections when localized markdown is empty', () => {
    render(
      <MobileGrammarDetailSheet
        grammar={grammar}
        onClose={vi.fn()}
        onProficiencyUpdate={vi.fn()}
        instituteId="topik-2"
      />
    );

    expect(screen.getByTestId('mobile-grammar-reader-shell')).toBeInTheDocument();
    expect(screen.getByText('Introduction')).toBeInTheDocument();
    expect(screen.getByText('Core Usage')).toBeInTheDocument();
    expect(
      screen.getByText('This pattern expresses concern about a possible outcome.')
    ).toBeInTheDocument();
    expect(screen.getByText('hanabira_markdown_korean')).toBeInTheDocument();
    expect(screen.getByText('markdown_grammar_korean/sample.md')).toBeInTheDocument();
  });

  it('masks example translations and quiz answers in red eye mode and allows tap reveal', () => {
    render(
      <MobileGrammarDetailSheet
        grammar={grammar}
        onClose={vi.fn()}
        onProficiencyUpdate={vi.fn()}
        instituteId="topik-2"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Red eye mode' }));

    expect(screen.getByTestId('mobile-grammar-reader-shell')).toHaveAttribute('data-red-eye', 'on');

    const exampleMask = screen
      .getByTestId('mobile-grammar-example-translation-0')
      .querySelector<HTMLElement>('[data-grammar-mask="translation"]');
    const answerMask = screen
      .getByTestId('mobile-grammar-quiz-answer-0')
      .querySelector<HTMLElement>('[data-grammar-mask="answer"]');

    expect(exampleMask).not.toBeNull();
    expect(answerMask).not.toBeNull();
    expect(exampleMask?.style.filter).toBe('blur(7px)');
    expect(answerMask?.style.filter).toBe('blur(7px)');
    expect(window.localStorage.getItem('grammar_mobile_red_eye')).toBe('1');

    if (!exampleMask) {
      throw new Error('Expected example translation mask');
    }

    fireEvent.click(exampleMask);
    expect(exampleMask.style.filter).toBe('none');
  });

  it('supports mobile reader font scale switching and persists the selected scale', () => {
    render(
      <MobileGrammarDetailSheet
        grammar={grammar}
        onClose={vi.fn()}
        onProficiencyUpdate={vi.fn()}
        instituteId="topik-2"
      />
    );

    const readerShell = screen.getByTestId('mobile-grammar-reader-shell');
    expect(readerShell).toHaveAttribute('data-font-scale', 'comfortable');

    fireEvent.click(screen.getByRole('button', { name: 'Font size: Relaxed' }));

    expect(readerShell).toHaveAttribute('data-font-scale', 'relaxed');
    expect(window.localStorage.getItem('grammar_mobile_reader_font_scale')).toBe('relaxed');
  });
});
