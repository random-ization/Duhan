import type { HTMLAttributes, ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { markdownRenderSpy } = vi.hoisted(() => ({
  markdownRenderSpy: vi.fn(),
}));

import type { GrammarPointData } from '../../src/types';

vi.mock('convex/react', () => ({
  useAction: () => vi.fn(),
  useMutation: () => vi.fn().mockResolvedValue({ status: 'LEARNING', proficiency: 50 }),
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

vi.mock('react-markdown', () => ({
  default: ({ children }: { children?: ReactNode }) => {
    const flattenText = (node: ReactNode): string => {
      if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
      }
      if (Array.isArray(node)) {
        return node.map(flattenText).join('');
      }
      return '';
    };
    markdownRenderSpy();
    return <div data-testid="markdown-reader">{flattenText(children)}</div>;
  },
}));

import MobileGrammarDetailSheet from '../../src/components/mobile/MobileGrammarDetailSheet';

describe('MobileGrammarDetailSheet input performance', () => {
  const grammar: GrammarPointData = {
    id: 'grammar-mobile-performance-1',
    title: '~(으)ㄹ까 봐',
    titleEn: '~(eu)lkkabwa',
    summaryEn: 'Used when you do something in anticipation or concern.',
    type: 'ENDING',
    level: 'TOPIK 2',
    explanationEn: '## Explanation\n\nA longer explanation body.',
    examples: [
      {
        kr: '비가 올까 봐 우산을 가져왔어요.',
        en: 'I brought an umbrella in case it rains.',
      },
    ],
    quizItems: [
      {
        prompt: { en: 'Fill in the ending for a sentence about worry.' },
        answer: { en: '-(으)ㄹ까 봐' },
      },
    ],
    status: 'LEARNING',
    proficiency: 40,
  };

  beforeEach(() => {
    markdownRenderSpy.mockClear();
  });

  it('does not rerender the markdown reader on each practice keystroke', () => {
    render(
      <MobileGrammarDetailSheet
        grammar={grammar}
        onClose={vi.fn()}
        onProficiencyUpdate={vi.fn()}
        instituteId="topik-2"
      />
    );

    const initialMarkdownRenderCount = markdownRenderSpy.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText('Use ~(eu)lkkabwa in a sentence'), {
      target: { value: 'a' },
    });

    expect(markdownRenderSpy).toHaveBeenCalledTimes(initialMarkdownRenderCount);
  });
});
