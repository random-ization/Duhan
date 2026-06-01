import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';

import { GRAMMARS, INSTITUTES } from '../../src/utils/convexRefs';

const useQueryMock = vi.fn();
const useMutationMock = vi.fn();
const useActionMock = vi.fn();
const tMock = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key;

const clearContextualSidebarMock = vi.fn();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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
const askGrammarTutorMock = vi.fn(async () => ({
  success: true,
  reply: '你的句子 **语法正确**。\n\n1. **语义清晰**：表达自然。',
}));

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

    useQueryMock.mockImplementation((ref: unknown, args: unknown) => {
      if (ref === INSTITUTES.get || (isRecord(args) && args.id === 'course-1')) {
        return { id: 'course-1', name: 'Course 1' };
      }
      if (
        ref === GRAMMARS.getByCourse ||
        (isRecord(args) && args.courseId === 'course-1' && !('unitId' in args))
      ) {
        return grammarList;
      }
      if (ref === GRAMMARS.getUnitGrammar || (isRecord(args) && args.unitId === 1)) {
        return unitGrammar;
      }
      return undefined;
    });
  });

  it('renders the floating AI grammar practice entry', async () => {
    renderPage();

    expect(await screen.findByRole('button', { name: '打开 AI 语法练习' })).toBeInTheDocument();
  });

  it('renders AI grammar practice markdown as formatted text', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: '打开 AI 语法练习' }));
    fireEvent.change(screen.getByPlaceholderText('输入韩语句子，按 Ctrl/⌘ + Enter 发送'), {
      target: { value: '내일은 비가 올 텐데 우산을 가져가세요.' },
    });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));

    const dialog = await screen.findByRole('dialog', { name: 'AI 语法练习' });
    expect(await screen.findByText('语法正确')).toBeInTheDocument();
    expect(dialog).not.toHaveTextContent('**');
  });

  it('routes desktop switch textbook to the course library', async () => {
    renderPage();

    // In DesktopGrammarModulePage, the back button is the first one with a ChevronLeft
    const buttons = await screen.findAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(screen.getByTestId('current-location')).toHaveTextContent('/en/courses');
  });
});
