import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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

  it('opens the search field from the header button and collapses it again when empty', async () => {
    const onSearchChange = vi.fn();
    const { container } = render(
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

    const input = container.querySelector<HTMLInputElement>('#mobile-grammar-search');
    const searchContainer = input?.parentElement?.parentElement;
    expect(input).not.toBeNull();
    expect(searchContainer).not.toBeNull();
    expect(searchContainer).toHaveStyle({ maxHeight: '0px' });

    fireEvent.click(screen.getByRole('button', { name: /search patterns or usages/i }));

    await waitFor(() => {
      expect(searchContainer).toHaveStyle({ maxHeight: '60px' });
      expect(document.activeElement).toBe(input);
    });

    if (!input) {
      throw new Error('Expected mobile grammar search input to exist');
    }

    fireEvent.blur(input);

    await waitFor(() => {
      expect(searchContainer).toHaveStyle({ maxHeight: '0px' });
    });
    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});
