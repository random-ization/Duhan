import React from 'react';
import { useLocation } from 'react-router-dom';
import { House, BookOpen, Dumbbell, Clapperboard, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { getPathWithoutLang } from '../../utils/pathname';
import { cn } from '../../lib/utils';

type Tab = {
  key: 'dashboard' | 'learn' | 'practice' | 'media' | 'profile';
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
      key: 'learn',
      icon: BookOpen,
      path: '/courses',
      label: t('nav.learn', { defaultValue: 'Learning' }),
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
    if (tab.key === 'learn') {
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
    <nav className="md:hidden fixed left-4 right-4 z-[40] pointer-events-none bottom-[calc(env(safe-area-inset-bottom)+16px)]">
      <div className="pointer-events-auto flex h-16 items-center justify-around px-2 rounded-[2rem] border border-white/20 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        {tabs.map(tab => {
          const isActive = isTabActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabPress(tab.path)}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-1.5 h-full select-none transition-all duration-300',
                isActive
                  ? 'text-indigo-600 dark:text-indigo-400 scale-110'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50'
              )}
              data-active={isActive ? 'true' : 'false'}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-900/20 animate-in fade-in zoom-in duration-300" />
                </div>
              )}
              <div className="relative z-10 flex flex-col items-center">
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold mt-0.5 tracking-tight uppercase">
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
