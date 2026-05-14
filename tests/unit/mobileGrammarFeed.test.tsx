import type { HTMLAttributes, ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import MobileGrammarFeed from '../../src/components/mobile/MobileGrammarFeed';
import type { GrammarPointData } from '../../src/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? '已完成',
    i18n: { language: 'zh' },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      layout: _layout,
      ...props
    }: HTMLAttributes<HTMLDivElement> & { layout?: boolean }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

const makeGrammarPoint = (overrides: Partial<GrammarPointData>): GrammarPointData => ({
  id: overrides.id ?? 'grammar-1',
  title: overrides.title ?? '아/어 보다',
  summary: overrides.summary ?? 'summary',
  type: overrides.type ?? 'ENDING',
  explanation: overrides.explanation ?? '',
  examples: overrides.examples ?? [],
  status: overrides.status,
  ...overrides,
});

describe('MobileGrammarFeed', () => {
  it('shows a completed badge for mastered grammar points', () => {
    render(
      <MobileGrammarFeed
        grammarPoints={[
          makeGrammarPoint({ id: 'grammar-mastered', title: '完成语法', status: 'MASTERED' }),
          makeGrammarPoint({ id: 'grammar-learning', title: '进行中语法', status: 'LEARNING' }),
        ]}
        onSelect={vi.fn()}
        onToggleStatus={vi.fn()}
        isLoading={false}
      />
    );

    expect(screen.getByText('已完成')).toBeInTheDocument();
    expect(screen.getByText('完成语法')).toBeInTheDocument();
    expect(screen.getByText('进行中语法')).toBeInTheDocument();
  });
});
