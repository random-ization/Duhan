import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MobileGrammarView from '../../src/components/mobile/MobileGrammarView';
import type { GrammarPointData } from '../../src/types';

const navigateMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', async () => {
  const actual = await vi.importActual<typeof import('react-i18next')>('react-i18next');
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
      i18n: { language: 'en' },
    }),
  };
});

vi.mock('../../src/components/mobile/MobileUnitChips', () => ({
  default: () => <div data-testid="unit-chips" />,
}));

vi.mock('../../src/components/mobile/MobileGrammarFeed', () => ({
  default: () => <div data-testid="grammar-feed" />,
}));

vi.mock('../../src/components/mobile/MobileGrammarDetailSheet', () => ({
  default: () => <div data-testid="grammar-detail-sheet" />,
}));

const grammarPoint: GrammarPointData = {
  id: 'grammar-1',
  title: '아/어 보다',
  summary: 'test summary',
  type: 'ENDING',
  explanation: 'test explanation',
  examples: [{ kr: '가 보다', cn: '试着去' }],
};

describe('MobileGrammarView', () => {
  beforeEach(() => {
    navigateMock.mockReset();
  });

  it('renders the search input and calls onSearchChange when typing', async () => {
    const onSearchChange = vi.fn();
    render(
      <MemoryRouter>
        <MobileGrammarView
          selectedUnit={1}
          totalUnits={3}
          onSelectUnit={vi.fn()}
          grammarPoints={[grammarPoint]}
          searchQuery=""
          onSearchChange={onSearchChange}
          selectedGrammar={null}
          onSelectGrammar={vi.fn()}
          onToggleStatus={vi.fn()}
          isLoading={false}
          onProficiencyUpdate={vi.fn()}
          instituteId="topik-2"
        />
      </MemoryRouter>
    );

    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'test query' } });
    expect(onSearchChange).toHaveBeenCalledWith('test query');
  });
});
