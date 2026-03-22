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

describe('GrammarDetailPane markdown rendering', () => {
  const grammar: GrammarPointData = {
    id: 'g1',
    title: '~하는 것 같다',
    titleEn: '~(it) seems',
    summary: 'summary',
    summaryEn: 'summary',
    type: 'ENDING',
    explanation: `
## Core
> This is a quoted learning tip.

| Form | Meaning |
| --- | --- |
| -기에 | because |
`,
    explanationEn: `
## Core
> This is a quoted learning tip.

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

  it('renders blockquote as highlighted card and table with styled container', () => {
    render(<GrammarDetailPane grammar={grammar} hasNext={false} hasPrev={false} />);

    const quote = screen.getByText('This is a quoted learning tip.').closest('blockquote');
    expect(quote).toBeInTheDocument();
    expect(quote?.className).toContain('bg-blue-50/70');

    const tableCell = screen.getByText('-기에');
    const tableContainer = tableCell.closest('table')?.parentElement;
    expect(tableContainer).toBeInTheDocument();
    expect(tableContainer?.className).toContain('overflow-x-auto');
    expect(tableContainer?.className).toContain('rounded-xl');
  });
});
