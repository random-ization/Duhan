import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

const navigateMock = vi.fn();

vi.mock('../../src/hooks/useLocalizedNavigate', () => ({
  useLocalizedNavigate: () => navigateMock,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
  }),
}));

import { MobileBottomNav } from '../../src/components/mobile/MobileBottomNav';

const renderNav = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<MobileBottomNav />} />
      </Routes>
    </MemoryRouter>
  );

describe('MobileBottomNav tab state', () => {
  it('marks practice tab active on review routes', () => {
    renderNav('/review');
    const practiceButton = screen.getByRole('button', { name: /practice/i });
    expect(practiceButton).toHaveAttribute('data-active', 'true');
  });

  it('marks practice tab active on notebook routes', () => {
    renderNav('/notebook');
    const practiceButton = screen.getByRole('button', { name: /practice/i });
    expect(practiceButton).toHaveAttribute('data-active', 'true');
  });

  it('keeps practice tab inactive on media routes', () => {
    renderNav('/videos');
    const practiceButton = screen.getByRole('button', { name: /practice/i });
    expect(practiceButton).toHaveAttribute('data-active', 'false');
  });

  it('uses learning label and marks learn tab active on course routes', () => {
    renderNav('/course/ysk-1/vocab');
    const learnButton = screen.getByRole('button', { name: /learning/i });
    expect(learnButton).toHaveAttribute('data-active', 'true');
  });

  it('keeps only the visible pill interactive so the transparent shell does not block page taps', () => {
    const { container } = renderNav('/dashboard');
    const nav = container.querySelector('nav');
    const pill = nav?.firstElementChild;

    expect(nav).toHaveClass('pointer-events-none');
    expect(nav).toHaveClass('bottom-[calc(env(safe-area-inset-bottom)+16px)]');
    expect(pill).toHaveClass('pointer-events-auto');
  });
});
