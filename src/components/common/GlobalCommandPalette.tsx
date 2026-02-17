import { useEffect, useMemo, useRef, useState } from 'react';
import { Command, ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { getPathWithoutLang } from '../../utils/pathname';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../ui';
import { Input } from '../ui';
import { Button } from '../ui';

type CommandItem = {
  id: string;
  label: string;
  description: string;
  path: string;
  keywords: string[];
};

export function GlobalCommandPalette() {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { t } = useTranslation();
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
        path: '/practice',
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
    navigate(item.path);
  };

  useEffect(() => {
    if (!user) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const isOpenShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (!isOpenShortcut) return;
      event.preventDefault();
      setOpenPath(prev => (prev === currentPath ? null : currentPath));
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [currentPath, user]);

  if (!user) return null;

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setQuery('');
      setActiveIndex(0);
      setOpenPath(currentPath);
      setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }
    setOpenPath(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[100] bg-foreground/40 backdrop-blur-sm" />
        <DialogContent
          unstyled
          className="fixed left-1/2 top-24 z-[101] w-[min(680px,calc(100vw-2rem))] -translate-x-1/2 pointer-events-auto"
        >
          <div className="bg-card border-2 border-foreground rounded-2xl shadow-pop overflow-hidden">
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                <Command className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    setOpenPath(null);
                    return;
                  }
                  if (filteredItems.length === 0) return;
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setActiveIndex(prev => (prev + 1) % filteredItems.length);
                    return;
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setActiveIndex(
                      prev => (prev - 1 + filteredItems.length) % filteredItems.length
                    );
                    return;
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    const selected = filteredItems[highlightedIndex];
                    if (selected) navigateToItem(selected);
                  }
                }}
                placeholder={t('common.search', { defaultValue: 'Search...' })}
                className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
              />
              <span className="text-[10px] font-bold text-muted-foreground border border-border rounded px-1.5 py-0.5">
                ESC
              </span>
            </div>
            <div className="max-h-[420px] overflow-y-auto p-2">
              {filteredItems.length === 0 ? (
                <div className="px-3 py-10 text-center text-sm text-muted-foreground">
                  {t('common.noResults', { defaultValue: 'No matches' })}
                </div>
              ) : (
                filteredItems.map(item => {
                  const isActive = currentPath === item.path;
                  const isHighlighted = filteredItems[highlightedIndex]?.id === item.id;
                  return (
                    <Button
                      key={item.id}
                      type="button"
                      variant="ghost"
                      size="auto"
                      onMouseEnter={() => {
                        const nextIndex = filteredItems.findIndex(entry => entry.id === item.id);
                        if (nextIndex >= 0) setActiveIndex(nextIndex);
                      }}
                      onClick={() => navigateToItem(item)}
                      className={`w-full rounded-xl px-3 py-3 text-left border transition-colors ${
                        isHighlighted
                          ? 'bg-muted border-border'
                          : isActive
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-800 dark:bg-indigo-500/12 dark:border-indigo-300/35 dark:text-indigo-200'
                            : 'border-transparent hover:bg-muted'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-black text-sm truncate">{item.label}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {item.description}
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 shrink-0 text-muted-foreground" />
                      </div>
                    </Button>
                  );
                })
              )}
            </div>
            <div className="border-t border-border px-4 py-2 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>{t('common.search', { defaultValue: 'Search' })}</span>
              <span>Cmd+K / Ctrl+K</span>
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
