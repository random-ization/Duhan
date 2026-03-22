import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import GrammarDirectorySidebar from '../../src/components/grammar/GrammarDirectorySidebar';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    i18n: { language: 'en' },
  }),
}));

describe('GrammarDirectorySidebar', () => {
  const items = [
    {
      id: 'g1',
      title: '~할 것이다',
      summary: 'future intent',
      unitId: 1,
      status: 'MASTERED',
    },
    {
      id: 'g2',
      title: '~하기에',
      summary: 'because',
      unitId: 1,
      status: 'LEARNING',
    },
    {
      id: 'g3',
      title: '~하는 것 같다',
      summary: 'seems like',
      unitId: 1,
      status: 'NEW',
    },
  ];

  it('shows aggregated progress and status indicators', () => {
    render(
      <GrammarDirectorySidebar
        courseGrammars={items}
        searchQuery=""
        onSearchChange={() => undefined}
        selectedGrammarId="g2"
        onSelectGrammar={() => undefined}
      />
    );

    expect(screen.getByText('Total progress')).toBeInTheDocument();
    expect(screen.getAllByText('1/3').length).toBeGreaterThan(0);
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();

    const selected = screen.getByText('~하기에').closest('button');
    expect(selected?.className).toContain('bg-blue-50');
  });

  it('filters grammar list by search query', () => {
    const onSearchChange = vi.fn();
    render(
      <GrammarDirectorySidebar
        courseGrammars={items}
        searchQuery=""
        onSearchChange={onSearchChange}
        selectedGrammarId={undefined}
        onSelectGrammar={() => undefined}
      />
    );

    fireEvent.change(screen.getByPlaceholderText('grammarModule.searchPlaceholder'), {
      target: { value: '하기에' },
    });
    expect(onSearchChange).toHaveBeenCalledWith('하기에');
  });

  it('calls select callback with grammar id and unit id', () => {
    const onSelectGrammar = vi.fn();
    render(
      <GrammarDirectorySidebar
        courseGrammars={items}
        searchQuery=""
        onSearchChange={() => undefined}
        selectedGrammarId={undefined}
        onSelectGrammar={onSelectGrammar}
      />
    );

    fireEvent.click(screen.getByText('~할 것이다'));
    expect(onSelectGrammar).toHaveBeenCalledWith('g1', 1);
  });
});
