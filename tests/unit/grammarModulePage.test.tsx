import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { GRAMMARS, INSTITUTES } from '../../src/utils/convexRefs';

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useActionMock = vi.fn();
const tMock = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key;

const clearContextualSidebarMock = vi.fn();

vi.mock('convex/react', () => ({
  useQuery: (ref: unknown, args: unknown) => useQueryMock(ref, args),
  useMutation: (ref: unknown) => useMutationMock(ref),
  useAction: (ref: unknown) => useActionMock(ref),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: tMock,
    i18n: { language: 'zh' },
  }),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { _id: 'u1' },
    language: 'zh',
  }),
}));

vi.mock('../../src/hooks/useIsMobile', () => ({
  useIsMobile: () => false,
}));

vi.mock('../../src/contexts/LayoutContext', () => ({
  useLayoutActions: () => ({
    clearContextualSidebar: clearContextualSidebarMock,
  }),
}));

const updateStatusMock = vi.fn(async () => ({ status: 'MASTERED', proficiency: 100 }));
const updateLearningProgressMock = vi.fn(async () => ({}));
const askGrammarTutorMock = vi.fn(async () => ({ success: true, reply: 'ok' }));

const grammarList = [
  {
    id: 'g1',
    title: '~하기에',
    summary: '因为',
    unitId: 1,
    status: 'LEARNING',
  },
];

const unitGrammar = [
  {
    id: 'g1',
    title: '~하기에',
    titleEn: '~기에',
    titleZh: '~하기에',
    titleVi: undefined,
    titleMn: undefined,
    level: 'TOPIK 2',
    type: 'CONNECTIVE',
    summary: '因为',
    summaryEn: 'because',
    summaryVi: undefined,
    summaryMn: undefined,
    explanation: '表示理由。',
    explanationEn: 'Used to express reasons.',
    explanationVi: undefined,
    explanationMn: undefined,
    sections: undefined,
    quizItems: [],
    sourceMeta: undefined,
    examples: [],
    conjugationRules: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    customNote: undefined,
    customNoteEn: undefined,
    customNoteVi: undefined,
    customNoteMn: undefined,
    unitId: 1,
    status: 'LEARNING',
    proficiency: 40,
  },
];

const { default: GrammarModulePage } = await import('../../src/pages/GrammarModulePage');

const LocationProbe = () => {
  const location = useLocation();
  return <div data-testid="current-location">{`${location.pathname}${location.search}`}</div>;
};

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/course/course-1/grammar']}>
      <Routes>
        <Route path="/course/:instituteId/grammar" element={<GrammarModulePage />} />
        <Route path="/:lang/courses" element={<LocationProbe />} />
      </Routes>
    </MemoryRouter>
  );

describe('GrammarModulePage AI panel persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();

    useActionMock.mockReturnValue(askGrammarTutorMock);

    useMutationMock.mockImplementation((ref: unknown) => {
      if (ref === GRAMMARS.updateStatus) return updateStatusMock;
      return updateLearningProgressMock;
    });

    useQueryMock.mockImplementation((ref: unknown, _args: unknown) => {
      if (ref === INSTITUTES.get) return { id: 'course-1', name: 'Course 1' };
      if (ref === GRAMMARS.getByCourse) return grammarList;
      if (ref === GRAMMARS.getUnitGrammar) return unitGrammar;
      return undefined;
    });
  });

  it('defaults to open AI panel when no localStorage preference', async () => {
    renderPage();

    expect(screen.getByText('AI Grammar Tutor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide AI/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(window.localStorage.getItem('grammar_ai_panel_open')).toBe('1');
    });
  });

  it('respects closed preference and persists when reopened', async () => {
    window.localStorage.setItem('grammar_ai_panel_open', '0');
    renderPage();

    expect(screen.queryByText('AI Grammar Tutor')).not.toBeInTheDocument();
    const showButton = screen.getByRole('button', { name: /Show AI/i });
    fireEvent.click(showButton);

    await waitFor(() => {
      expect(screen.getByText('AI Grammar Tutor')).toBeInTheDocument();
      expect(window.localStorage.getItem('grammar_ai_panel_open')).toBe('1');
    });
  });

  it('renders safely when localStorage access is blocked', () => {
    const originalLocalStorage = window.localStorage;

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn(() => {
          throw new DOMException('Blocked', 'SecurityError');
        }),
        setItem: vi.fn(() => {
          throw new DOMException('Blocked', 'SecurityError');
        }),
      },
    });

    renderPage();

    expect(screen.getByText('AI Grammar Tutor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hide AI/i })).toBeInTheDocument();

    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  it('routes desktop switch textbook to the course library', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Switch textbook' }));

    expect(screen.getByTestId('current-location')).toHaveTextContent('/en/courses');
  });
});
