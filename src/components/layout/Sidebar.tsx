import React, { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Settings, LogOut, ChevronLeft, ChevronRight, Check, X, Keyboard } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useApp } from '../../contexts/AppContext';
import { useTranslation } from 'react-i18next';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../../hooks/useLocalizedNavigate';
import { isValidLanguage } from '../LanguageRouter';
import { Button } from '../ui/button';

// Helper for 3D Icons
const EmojiIcon = ({ src, grayscale = false }: { src: string; grayscale?: boolean }) => (
  <img
    src={src}
    alt="icon"
    className={`w-6 h-6 transition shrink-0 ${grayscale ? 'grayscale group-hover:grayscale-0' : ''}`}
  />
);

// --- Sub-components ---

const MobileOverlay = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  if (!isOpen) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="auto"
      className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm md:hidden animate-in fade-in duration-200 w-full h-full cursor-default"
      onClick={onClose}
      aria-label="Close menu"
    />
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
  <Button
    type="button"
    variant="ghost"
    size="auto"
    className={`p-6 flex items-center cursor-pointer hover:bg-slate-50 rounded-t-[2.3rem] transition text-left w-full ${collapsed ? 'justify-center' : 'gap-4'}`}
    onClick={() => navigate('/profile')}
    title={t('sidebar.profile')}
  >
    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border-2 border-slate-900 shadow-pop-sm hover:scale-110 transition shrink-0 overflow-hidden">
      {user?.avatar ? (
        <img src={user.avatar} alt="avatar" className="w-full h-full object-cover" />
      ) : (
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-1" />
      )}
    </div>
    {!collapsed && (
      <div className="overflow-hidden">
        <p className="font-black text-slate-900 truncate">{user?.name || t('guest')}</p>
        <p className="text-xs text-slate-400 truncate">{user?.email || t('sidebar.viewProfile')}</p>
      </div>
    )}
  </Button>
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
  }>;
  pathWithoutLang: string;
  collapsed: boolean;
}) => (
  <nav className="flex-1 px-3 space-y-2 py-2 overflow-y-auto scrollbar-hide">
    {items.map(item => {
      const isActive = pathWithoutLang.startsWith(item.path);
      return (
        <NavLink
          key={item.path}
          to={item.to}
          title={collapsed ? item.label : undefined}
          className={`flex items-center ${collapsed ? 'justify-center px-3' : 'gap-4 px-5'} py-4 rounded-[1.5rem] font-bold transition-all border-2 group ${
            isActive
              ? `${item.activeClass}`
              : 'border-transparent text-slate-500 hover:bg-slate-50 hover:border-slate-200'
          }`}
        >
          {item.icon}
          {!collapsed && <span className="whitespace-nowrap">{item.label}</span>}
        </NavLink>
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
  <div className={`p-4 border-t-2 border-slate-100 flex ${collapsed ? 'flex-col' : ''} gap-2`}>
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
      title={pathWithoutLang === '/dashboard' && isEditing ? t('done') : t('sidebar.settings')}
      className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold ${
        pathWithoutLang === '/dashboard' && isEditing
          ? 'bg-green-100 text-green-600 border-green-200 hover:bg-green-200'
          : 'text-slate-500 hover:bg-slate-50 border-transparent hover:border-slate-100'
      } transition border-2`}
    >
      {pathWithoutLang === '/dashboard' && isEditing ? <Check size={20} /> : <Settings size={20} />}
    </Button>
    <Button
      type="button"
      variant="ghost"
      size="auto"
      onClick={logout}
      title={t('sidebar.logout')}
      className={`${collapsed ? 'w-full' : 'flex-1'} flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-red-400 hover:bg-red-50 transition border-2 border-transparent hover:border-red-100`}
    >
      <LogOut size={20} />
    </Button>
  </div>
);

export default function Sidebar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const { isEditing, toggleEditMode, isMobileMenuOpen, toggleMobileMenu, sidebarHidden } = useApp();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const [collapsed, setCollapsed] = useState(true);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const pathWithoutLang =
    pathSegments[0] && isValidLanguage(pathSegments[0])
      ? `/${pathSegments.slice(1).join('/')}`
      : location.pathname;

  const navItems = useSidebarNavItems(t, currentLanguage);

  if (sidebarHidden) {
    return null;
  }

  return (
    <>
      <MobileOverlay isOpen={isMobileMenuOpen} onClose={toggleMobileMenu} />

      <aside
        className={`
                    flex flex-col bg-white border-slate-900 transition-all duration-300 z-50
                    fixed inset-y-0 left-0 h-full border-r-2 shadow-2xl transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:shadow-pop md:static md:h-[95vh] md:m-5 md:rounded-[2.5rem] md:border-2 md:sticky md:top-5
                    ${collapsed ? 'w-64 md:w-[76px]' : 'w-64'}
                `}
      >
        {/* Mobile Close Button */}
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={toggleMobileMenu}
          className="md:hidden absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-900"
        >
          <X size={20} />
        </Button>

        <UserProfileHeader user={user} collapsed={collapsed} navigate={navigate} t={t} />

        {/* Collapse Toggle Button */}
        <Button
          type="button"
          variant="outline"
          size="auto"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-white border-2 border-slate-900 rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition shadow-sm z-30"
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
    </>
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
      },
      {
        path: '/courses',
        label: t('sidebar.textbooks'),
        icon: <EmojiIcon src="/emojis/Books.png" grayscale />,
        activeClass: 'bg-blue-100 text-blue-700 border-blue-100',
      },
      {
        path: '/topik',
        label: t('sidebar.topik'),
        icon: <EmojiIcon src="/emojis/Trophy.png" grayscale />,
        activeClass: 'bg-yellow-100 text-yellow-700 border-yellow-100',
      },
      {
        path: '/videos',
        label: t('sidebar.videos'),
        icon: <EmojiIcon src="/emojis/Clapper_Board.png" grayscale />,
        activeClass: 'bg-red-100 text-red-700 border-red-100',
      },
      {
        path: '/podcasts',
        label: t('sidebar.podcasts'),
        icon: <EmojiIcon src="/emojis/Headphone.png" grayscale />,
        activeClass: 'bg-purple-100 text-purple-700 border-purple-100',
      },
      {
        path: '/typing',
        label: t('sidebar.typing', { defaultValue: 'Typing' }),
        icon: (
          <Keyboard className="w-6 h-6 shrink-0 transition text-slate-400 group-hover:text-slate-600" />
        ),
        activeClass: 'bg-indigo-100 text-indigo-700 border-indigo-100',
      },
    ];

    return items.map(item => ({ ...item, to: getLocalizedPath(item.path, currentLanguage) }));
  }, [t, currentLanguage]);
}
