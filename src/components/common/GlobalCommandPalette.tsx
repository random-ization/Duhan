import { Suspense, lazy, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { appendReturnToPath } from '../../utils/navigation';
import { getPathWithoutLang } from '../../utils/pathname';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../ui';
import { Input } from '../ui';
import { Button } from '../ui';

const loadGlobalCommandPaletteDialog = () => import('./GlobalCommandPaletteDialog');
const LazyGlobalCommandPaletteDialog = lazy(loadGlobalCommandPaletteDialog);

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function GlobalCommandPalette() {
  const location = useLocation();
  const { user } = useAuth();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPath = getPathWithoutLang(location.pathname);
  const open = openPath === currentPath;

  const items = useMemo<CommandItem[]>(
    () => [
      {
        id: 'dashboard',
        label: t('nav.dashboard', { defaultValue: 'Dashboard' }),
        description: t('dashboard.subtitle', { defaultValue: 'Overview and daily progress' }),
        path: '/dashboard',
        keywords: ['home', 'overview'],
      },
      {
        id: 'courses',
        label: t('coursesOverview.pageTitle', { defaultValue: 'Courses' }),
        description: t('coursesOverview.subtitle', { defaultValue: 'Browse your textbooks' }),
        path: '/courses',
        keywords: ['textbook', 'curriculum'],
      },
      {
        id: 'practice',
        label: t('nav.practice', { defaultValue: 'Practice' }),
        description: t('practiceHub.subtitle', { defaultValue: 'TOPIK, typing and vocab drills' }),
        path: '/review',
        keywords: ['topik', 'typing', 'vocab'],
      },
      {
        id: 'media',
        label: t('nav.media', { defaultValue: 'Media' }),
        description: t('mediaHub.subtitle', { defaultValue: 'Videos, podcasts and reading' }),
        path: '/media',
        keywords: ['video', 'podcast', 'reading'],
      },
      {
        id: 'reading',
        label: t('readingDiscovery.title', { defaultValue: 'Reading' }),
        description: t('readingDiscovery.subtitle', { defaultValue: 'Discover curated articles' }),
        path: '/reading',
        keywords: ['article', 'news'],
      },
      {
        id: 'videos',
        label: t('dashboard.video.title', { defaultValue: 'Videos' }),
        description: t('dashboard.video.subtitle', { defaultValue: 'Immersive video learning' }),
        path: '/videos',
        keywords: ['video', 'subtitle'],
      },
      {
        id: 'podcasts',
        label: t('dashboard.podcast.title', { defaultValue: 'Podcasts' }),
        description: t('dashboard.podcast.subtitle', {
          defaultValue: 'Listening practice episodes',
        }),
        path: '/podcasts',
        keywords: ['audio', 'listening'],
      },
      {
        id: 'topik',
        label: t('nav.topik', { defaultValue: 'TOPIK' }),
        description: t('dashboard.topik.realExam', { defaultValue: 'Mock exams and review flows' }),
        path: '/topik',
        keywords: ['exam', 'mock', 'reading', 'listening'],
      },
      {
        id: 'typing',
        label: t('sidebar.typing', { defaultValue: 'Typing' }),
        description: t('typing.subtitle', { defaultValue: 'Speed + accuracy drills' }),
        path: '/typing',
        keywords: ['keyboard', 'speed', 'wpm'],
      },
      {
        id: 'vocab-book',
        label: t('dashboard.vocab.title', { defaultValue: 'Vocab Book' }),
        description: t('dashboard.vocab.subtitle', { defaultValue: 'Daily spaced repetition' }),
        path: '/vocab-book',
        keywords: ['vocabulary', 'flashcard', 'words'],
      },
      {
        id: 'notebook',
        label: t('dashboard.notes.title', { defaultValue: 'Notebook' }),
        description: t('dashboard.notes.subtitle', { defaultValue: 'Study notes and mistakes' }),
        path: '/notebook',
        keywords: ['notes', 'mistakes'],
      },
      {
        id: 'profile',
        label: t('nav.profile', { defaultValue: 'Profile' }),
        description: t('profile.title', { defaultValue: 'Account and settings' }),
        path: '/profile',
        keywords: ['account', 'settings', 'security'],
      },
    ],
    [t]
  );

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => {
      const haystack = `${item.label} ${item.description} ${item.keywords.join(' ')}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  const highlightedIndex =
    filteredItems.length > 0 ? Math.min(activeIndex, filteredItems.length - 1) : -1;

  const navigateToItem = (item: CommandItem) => {
    setOpenPath(null);
    const currentPathWithSearch = `${location.pathname}${location.search}`;
    navigate(appendReturnToPath(item.path, currentPathWithSearch));
  };

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isOpenShortcut) {
        return;
      }

      event.preventDefault();
      setOpen(current => !current);
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [user]);

  useEffect(() => {
    if (!user || typeof globalThis.window === 'undefined') {
      return;
    }

    const idleWindow = globalThis.window as IdleWindow;
    if (!idleWindow.requestIdleCallback) {
      void loadGlobalCommandPaletteDialog();
      return;
    }

    const idleHandle = idleWindow.requestIdleCallback(() => {
      void loadGlobalCommandPaletteDialog();
    }, { timeout: 1500 });

    return () => {
      if (idleHandle !== undefined) {
        idleWindow.cancelIdleCallback?.(idleHandle);
      }
    };
  }, [user]);

  if (!user || !open) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <LazyGlobalCommandPaletteDialog open={open} onOpenChange={setOpen} />
    </Suspense>
  );
}
