import React, { useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, LogOut, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui';
import { useLayout } from '../../contexts/LayoutContext';
import { getPathWithoutLang } from '../../utils/pathname';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../ui';

const EmojiIcon = ({ src, grayscale = false }: { src: string; grayscale?: boolean }) => (
  <img
    src={src}
    alt="icon"
    className={`w-6 h-6 transition shrink-0 ${grayscale ? 'grayscale group-hover:grayscale-0' : ''}`}
  />
);

const HoverTooltip = ({
  label,
  children,
  enabled = true,
  side = 'top',
}: {
  label: string;
  children: React.ReactElement;
  enabled?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) => {
  if (!enabled) return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipPortal>
        <TooltipContent side={side}>{label}</TooltipContent>
      </TooltipPortal>
    </Tooltip>
  );
};

const UserProfileHeader = ({
  user,
  collapsed,
  navigate,
  t,
}: {
  user: { name?: string; email?: string; avatar?: string } | null;
  collapsed: boolean;
  navigate: (path: string) => void;
  t: (key: string) => string;
}) => (
  <HoverTooltip label={t('sidebar.profile')} side={collapsed ? 'right' : 'top'}>
    <Button
      type="button"
      variant="ghost"
      size="auto"
      className={`p-6 flex items-center cursor-pointer hover:bg-accent rounded-t-[2.3rem] transition text-left w-full ${collapsed ? 'justify-center' : 'gap-4'}`}
      onClick={() => navigate('/profile')}
      aria-label={t('sidebar.profile')}
    >
      <div className="w-12 h-12 bg-card rounded-2xl flex items-center justify-center border-2 border-foreground shadow-pop-sm hover:scale-110 transition shrink-0 overflow-hidden">
        {user?.avatar ? (
          <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
        )}
      </div>
      {!collapsed && (
        <div className="overflow-hidden">
          <p className="font-black text-foreground truncate">{user?.name || t('guest')}</p>
          <p className="text-xs text-muted-foreground truncate">
            {user?.email || t('sidebar.viewProfile')}
          </p>
        </div>
      )}
    </Button>
  </HoverTooltip>
);

const SidebarNav = ({
  items,
  pathWithoutLang,
  collapsed,
}: {
  items: Array<{
    path: string;
    to: string;
    label: string;
    icon: React.ReactNode;
    activeClass: string;
    activePrefixes: string[];
  }>;
  pathWithoutLang: string;
  collapsed: boolean;
}) => (
  <nav className="flex-1 px-3 space-y-2 py-2 overflow-y-auto scrollbar-hide">
    {items.map(item => {
      const isActive = item.activePrefixes.some(prefix => pathWithoutLang.startsWith(prefix));
      return (
        <HoverTooltip key={item.path} label={item.label} enabled={collapsed} side="right">
          <NavLink
            to={item.to}
            aria-label={item.label}
            className={`flex items-center ${collapsed ? 'justify-center px-3' : 'gap-4 px-5'} py-4 rounded-[1.5rem] font-bold transition-all border-2 group ${
              isActive
                ? `${item.activeClass}`
                : 'border-transparent text-muted-foreground hover:bg-accent hover:border-border'
            }`}
          >
            {item.icon}
            {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
          </NavLink>
        </HoverTooltip>
      );
    })}
  </nav>
);

const SidebarFooter = ({
  collapsed,
  pathWithoutLang,
  isEditing,
  toggleEditMode,
  navigate,
  logout,
  t,
}: {
  collapsed: boolean;
  pathWithoutLang: string;
  isEditing: boolean;
  toggleEditMode: () => void;
  navigate: (path: string) => void;
  logout: () => void;
  t: (key: string) => string;
}) => (
  <div className={`p-4 border-t-2 border-border flex ${collapsed ? 'flex-col' : ''} gap-2`}>
    <HoverTooltip
      label={pathWithoutLang === '/dashboard' && isEditing ? t('done') : t('sidebar.settings')}
      side={collapsed ? 'right' : 'top'}
    >
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={() => {
          if (pathWithoutLang === '/dashboard') {
            toggleEditMode();
          } else {
            navigate('/profile');
          }
        }}
        aria-label={
          pathWithoutLang === '/dashboard' && isEditing ? t('done') : t('sidebar.settings')
        }
        className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold ${
          pathWithoutLang === '/dashboard' && isEditing
            ? 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200'
            : 'text-muted-foreground hover:bg-accent border-transparent hover:border-border'
        } transition border-2`}
      >
        {pathWithoutLang === '/dashboard' && isEditing ? (
          <Check size={20} />
        ) : (
          <Settings size={20} />
        )}
      </Button>
    </HoverTooltip>
    <HoverTooltip label={t('sidebar.logout')} side={collapsed ? 'right' : 'top'}>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        onClick={logout}
        aria-label={t('sidebar.logout')}
        className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-50 transition border-2 border-transparent hover:border-red-100`}
      >
        <LogOut size={20} />
      </Button>
    </HoverTooltip>
  </div>
);

export default function DesktopSidebar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const { isEditing, toggleEditMode, sidebarHidden } = useLayout();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const [collapsed, setCollapsed] = useState(true);
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const navItems = useSidebarNavItems(t, currentLanguage);

  if (sidebarHidden) return null;

  return (
    <aside
      className={`
        hidden md:flex md:flex-col md:bg-card md:border-2 md:border-foreground md:shadow-pop md:sticky md:top-5 md:h-[95vh] md:m-5 md:rounded-[2.5rem] md:transition-all md:duration-300 md:z-40
        ${collapsed ? 'md:w-[76px]' : 'md:w-64'}
      `}
    >
      <UserProfileHeader user={user} collapsed={collapsed} navigate={navigate} t={t} />

      <Button
        type="button"
        variant="outline"
        size="auto"
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-card border-2 border-foreground rounded-full flex items-center justify-center text-muted-foreground hover:text-indigo-600 hover:bg-accent transition shadow-sm z-30"
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </Button>

      <SidebarNav items={navItems} pathWithoutLang={pathWithoutLang} collapsed={collapsed} />

      <SidebarFooter
        collapsed={collapsed}
        pathWithoutLang={pathWithoutLang}
        isEditing={isEditing}
        toggleEditMode={toggleEditMode}
        navigate={navigate}
        logout={logout}
        t={t}
      />
    </aside>
  );
}

function useSidebarNavItems(
  t: (key: string, options?: { defaultValue?: string }) => string,
  currentLanguage: string
) {
  return useMemo(() => {
    const items = [
      {
        path: '/dashboard',
        label: t('sidebar.dashboard'),
        icon: <EmojiIcon src="/emojis/Spiral_Calendar.webp" />,
        activeClass: 'bg-indigo-100 text-indigo-700 border-indigo-100',
        activePrefixes: ['/dashboard', '/dictionary/'],
      },
      {
        path: '/courses',
        label: t('sidebar.textbooks'),
        icon: <EmojiIcon src="/emojis/Books.png" grayscale />,
        activeClass: 'bg-blue-100 text-blue-700 border-blue-100',
        activePrefixes: ['/courses', '/course/'],
      },
      {
        path: '/topik',
        label: t('nav.practice', { defaultValue: 'Practice' }),
        icon: <EmojiIcon src="/emojis/Trophy.png" grayscale />,
        activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-100',
        activePrefixes: ['/practice', '/topik', '/typing', '/vocab-book', '/vocabbook'],
      },
      {
        path: '/videos',
        label: t('nav.media', { defaultValue: 'Media' }),
        icon: <EmojiIcon src="/emojis/Clapper_Board.png" grayscale />,
        activeClass: 'bg-red-100 text-red-700 border-red-100',
        activePrefixes: ['/media', '/reading', '/videos', '/video/', '/podcasts'],
      },
    ];

    return items.map(item => ({ ...item, to: getLocalizedPath(item.path, currentLanguage) }));
  }, [t, currentLanguage]);
}
