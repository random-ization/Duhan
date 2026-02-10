import React from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Trophy, Headphones, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { isValidLanguage } from '../LanguageRouter';
import { Button } from '../ui/button';

type Tab = {
  key: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  path: string;
  label: string;
};

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();

  const tabs: Tab[] = [
    {
      key: 'dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      label: t('nav.dashboard', 'Dashboard'),
    },
    { key: 'courses', icon: BookOpen, path: '/courses', label: t('nav.courses', 'Courses') },
    { key: 'podcasts', icon: Headphones, path: '/podcasts', label: t('nav.podcasts', 'Podcasts') },
    { key: 'topik', icon: Trophy, path: '/topik', label: t('nav.topik', 'TOPIK') },
    { key: 'profile', icon: User, path: '/profile', label: t('nav.profile', 'Profile') },
  ];

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathWithoutLang =
    pathSegments[0] && isValidLanguage(pathSegments[0])
      ? `/${pathSegments.slice(1).join('/')}`
      : location.pathname;

  return (
    <nav className="md:hidden fixed left-4 right-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] z-50 h-[76px] rounded-[2rem] bg-white border-2 border-slate-900 shadow-2xl px-2 grid grid-cols-5 items-center">
      {tabs.map(tab => {
        const isActive = pathWithoutLang.startsWith(tab.path);
        const Icon = tab.icon;

        return (
          <Button
            key={tab.key}
            type="button"
            size="auto"
            variant="ghost"
            onClick={() => navigate(tab.path)}
            className={`h-14 w-full rounded-[22px] grid place-items-center gap-1 text-[11px] font-extrabold select-none transition ${
              isActive
                ? 'bg-indigo-50 text-indigo-600 outline outline-2 outline-indigo-500'
                : 'text-slate-300 active:bg-slate-50'
            }`}
            aria-label={tab.label}
          >
            <Icon size={22} strokeWidth={isActive ? 3 : 2} />
            <span className="leading-none">{tab.label}</span>
          </Button>
        );
      })}
    </nav>
  );
}
