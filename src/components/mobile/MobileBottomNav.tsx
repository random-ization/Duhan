import React from 'react';
import { useLocation } from 'react-router-dom';
import { House, BookOpen, Dumbbell, Clapperboard, Bookmark } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { getPathWithoutLang } from '../../utils/pathname';
import { cn } from '../../lib/utils';

type Tab = {
  key: 'dashboard' | 'learn' | 'practice' | 'media' | 'vocab';
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
      key: 'vocab',
      icon: Bookmark,
      path: '/vocab-book',
      label: t('dashboard.vocab.title', { defaultValue: 'Vocab' }),
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
        pathWithoutLang.startsWith('/typing')
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
    return pathWithoutLang.startsWith('/vocab-book') || pathWithoutLang.startsWith('/vocabbook');
  };

  const handleTabPress = (path: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(5);
    }
    navigate(path);
  };

  return (
    <nav className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] left-1/2 z-[40] w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 md:hidden">
      <div className="pointer-events-auto flex h-16 items-center justify-between rounded-[2rem] border border-white/60 bg-[rgba(230,231,233,0.66)] px-2 py-2 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.15)] backdrop-blur-[40px]">
        {tabs.map(tab => {
          const isActive = isTabActive(tab);
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabPress(tab.path)}
              className={cn(
                'relative flex h-full items-center justify-center select-none transition-all duration-300',
                isActive
                  ? 'rounded-[1.5rem] bg-slate-900 px-4 text-white shadow-[0_8px_16px_-6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(186,218,255,0.1)]'
                  : 'min-w-0 flex-1 text-slate-400 hover:text-slate-900'
              )}
              data-active={isActive ? 'true' : 'false'}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={cn(
                  'relative z-10 flex items-center justify-center',
                  isActive ? 'gap-2' : 'w-full'
                )}
              >
                <Icon size={isActive ? 16 : 18} strokeWidth={isActive ? 2.4 : 2.2} />
                {isActive ? (
                  <span className="text-[12px] font-black tracking-widest">{tab.label}</span>
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
