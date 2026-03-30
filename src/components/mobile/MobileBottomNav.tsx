import React from 'react';
import { useLocation } from 'react-router-dom';
import { House, BookOpen, Dumbbell, Clapperboard, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { getPathWithoutLang } from '../../utils/pathname';
import { cn } from '../../lib/utils';

type Tab = {
  key: 'dashboard' | 'courses' | 'practice' | 'media' | 'profile';
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  path: string;
  label: string;
};

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const pathWithoutLang = getPathWithoutLang(location.pathname);

  const tabs: Tab[] = [
    {
      key: 'dashboard',
      icon: House,
      path: '/dashboard',
      label: t('nav.dashboard', { defaultValue: 'Dashboard' }),
    },
    {
      key: 'courses',
      icon: BookOpen,
      path: '/courses',
      label: t('nav.courses', { defaultValue: 'Courses' }),
    },
    {
      key: 'practice',
      icon: Dumbbell,
      path: '/practice',
      label: t('nav.practice', { defaultValue: 'Practice' }),
    },
    {
      key: 'media',
      icon: Clapperboard,
      path: '/media',
      label: t('nav.media', { defaultValue: 'Media' }),
    },
    {
      key: 'profile',
      icon: UserRound,
      path: '/profile',
      label: t('nav.profile', { defaultValue: 'Profile' }),
    },
  ];

  const isTabActive = (tab: Tab) => {
    if (tab.key === 'dashboard') {
      return pathWithoutLang.startsWith('/dashboard') || pathWithoutLang.startsWith('/dictionary/');
    }
    if (tab.key === 'courses') {
      return pathWithoutLang.startsWith('/courses') || pathWithoutLang.startsWith('/course/');
    }
    if (tab.key === 'practice') {
      return (
        pathWithoutLang.startsWith('/practice') ||
        pathWithoutLang.startsWith('/review') ||
        pathWithoutLang.startsWith('/notebook') ||
        pathWithoutLang.startsWith('/topik') ||
        pathWithoutLang.startsWith('/typing') ||
        pathWithoutLang.startsWith('/vocab-book') ||
        pathWithoutLang.startsWith('/vocabbook')
      );
    }
    if (tab.key === 'media') {
      return (
        pathWithoutLang.startsWith('/media') ||
        pathWithoutLang.startsWith('/reading') ||
        pathWithoutLang.startsWith('/videos') ||
        pathWithoutLang.startsWith('/video/') ||
        pathWithoutLang.startsWith('/podcasts')
      );
    }
    return pathWithoutLang.startsWith('/profile');
  };

  const handleTabPress = (path: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(5);
    }
    navigate(path);
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-[60px] items-center justify-around px-2">
        {tabs.map(tab => {
          const isActive = isTabActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabPress(tab.path)}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 h-full select-none transition-colors rounded-xl active:bg-zinc-100/50 dark:active:bg-zinc-800/50',
                isActive
                  ? 'text-zinc-900 dark:text-zinc-50 font-bold'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50 font-medium'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] sm:text-[11px] leading-none tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
