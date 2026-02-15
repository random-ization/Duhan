import React from 'react';
import { useLocation } from 'react-router-dom';
import { House, BookOpen, Dumbbell, Clapperboard, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui/button';
import { getPathWithoutLang } from '../../utils/pathname';

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
    <nav className="md:hidden fixed left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+20px)] z-50 h-[78px] rounded-[2rem] bg-white border-2 border-slate-900 shadow-2xl px-2 grid grid-cols-5 items-center pb-2">
      {tabs.map(tab => {
        const isActive = isTabActive(tab);
        const Icon = tab.icon;
        return (
          <Button
            key={tab.key}
            type="button"
            size="auto"
            variant="ghost"
            onClick={() => handleTabPress(tab.path)}
            className={`h-14 w-full rounded-[22px] grid place-items-center gap-1 text-[11px] font-extrabold select-none transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-600 outline outline-2 outline-indigo-500'
                : 'text-slate-400 active:bg-slate-50'
            }`}
            aria-label={tab.label}
          >
            <Icon size={21} strokeWidth={isActive ? 3 : 2.2} />
            <span className="leading-none">{tab.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
