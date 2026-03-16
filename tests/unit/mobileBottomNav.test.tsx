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

describe('MobileBottomNav practice active state', () => {
  it('marks practice tab active on review routes', () => {
    renderNav('/review');
    const practiceButton = screen.getByRole('button', { name: /practice/i });
    expect(practiceButton.className).toContain('outline-indigo-500');
  });

  it('marks practice tab active on notebook routes', () => {
    renderNav('/notebook');
    const practiceButton = screen.getByRole('button', { name: /practice/i });
    expect(practiceButton.className).toContain('outline-indigo-500');
  });

  it('keeps practice tab inactive on media routes', () => {
    renderNav('/videos');
    const practiceButton = screen.getByRole('button', { name: /practice/i });
    expect(practiceButton.className).not.toContain('outline-indigo-500');
  });
});
