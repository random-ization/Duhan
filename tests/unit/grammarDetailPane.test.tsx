import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GrammarDetailPane from '../../src/components/grammar/GrammarDetailPane';
import type { GrammarPointData } from '../../src/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));

describe('GrammarDetailPane reader rendering', () => {
  const markdownGrammar: GrammarPointData = {
    id: 'g1',
    title: '~하는 것 같다',
    titleEn: '~(it) seems',
    summary: 'summary',
    summaryEn: '(guessing / supposition)',
    type: 'ENDING',
    level: 'TOPIK 2',
    explanation: `
# Korean Grammar Point: ~(it) seems [it seems] (guessing / supposition)

This is a quoted learning tip.

## Core
> This is a quoted learning tip.

### Structure

\`\`\`
[stem] + -기에
\`\`\`

| Form | Meaning |
| --- | --- |
| -기에 | because |
`,
    explanationEn: `
# Korean Grammar Point: ~(it) seems [it seems] (guessing / supposition)

This is a quoted learning tip.

## Core
> This is a quoted learning tip.

### Structure

\`\`\`
[stem] + -기에
\`\`\`

| Form | Meaning |
| --- | --- |
| -기에 | because |
`,
    examples: [],
    construction: {},
    conjugationRules: {},
    sections: undefined,
    quizItems: [],
    status: 'LEARNING',
    proficiency: 50,
  };

  const fallbackGrammar: GrammarPointData = {
    id: 'g2',
    title: '~하기에',
    titleEn: '~because of',
    summary: '因为',
    summaryEn: 'because / due to',
    type: 'CONNECTIVE',
    level: 'TOPIK 3',
    explanation: '',
    explanationEn: '',
    examples: [
      {
        kr: '늦었기에 바로 택시를 탔어요.',
        cn: '因为迟到了，所以马上打车了。',
        en: 'Because I was late, I took a taxi right away.',
      },
    ],
    construction: {
      'Verb stem': '-기에',
    },
    conjugationRules: {},
    sections: undefined,
    quizItems: [
      {
        prompt: { en: 'Fill in the connector.' },
        answer: { en: '-기에' },
      },
    ],
    customNoteEn: 'Use this more often in written or formal speech.',
    status: 'LEARNING',
    proficiency: 50,
  };

  it('renders a standardized hero, de-duplicates the first markdown h1, and styles markdown blocks', () => {
    render(<GrammarDetailPane grammar={markdownGrammar} hasNext={false} hasPrev={false} />);

    expect(screen.getByTestId('grammar-reader-hero')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1, name: '~(it) seems' })).toHaveLength(1);

    const quote = screen
      .getAllByText('This is a quoted learning tip.')
      .find(node => node.closest('blockquote'))
      ?.closest('blockquote');
    expect(quote).toBeInTheDocument();
    expect(quote?.className).toContain('border-l-4');

    const tableCell = screen.getByText('-기에');
    const tableContainer = tableCell.closest('table')?.parentElement;
    expect(tableContainer).toBeInTheDocument();
    expect(tableContainer?.className).toContain('rounded-2xl');

    const codeBlock = screen.getByText('[stem] + -기에').closest('pre');
    expect(codeBlock).toBeInTheDocument();
    expect(codeBlock?.className).toContain('bg-gradient-to-br');
  });

  it('keeps legacy structured sections but renders them in the new reader shell', () => {
    render(<GrammarDetailPane grammar={fallbackGrammar} hasNext hasPrev />);

    expect(screen.getByTestId('grammar-reader-hero')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Conjugation rules' })
    ).toBeInTheDocument();
    expect(screen.getByText('Usage examples')).toBeInTheDocument();
    expect(screen.getByText('Practice quizzes')).toBeInTheDocument();
    expect(screen.getByText('Instructor note')).toBeInTheDocument();
    expect(screen.getByText('Because I was late, I took a taxi right away.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
  });
});
