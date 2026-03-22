import React, { CSSProperties, useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Settings,
  LogOut,
  PanelLeft,
  Check,
  Moon,
  Sun,
  GraduationCap,
  Dumbbell,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../../hooks/useLocalizedNavigate';
import { Button, Switch } from '../ui';
import {
  useContextualSidebarState,
  useLayoutActions,
  useLayoutChromeState,
  useLayoutDashboardState,
} from '../../contexts/LayoutContext';
import { getPathWithoutLang } from '../../utils/pathname';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../ui';
import { useTheme } from '../../contexts/ThemeContext';
import { getSidebarThemeTokens } from './sidebarTheme';

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
  t: (key: string, options?: { defaultValue?: string }) => string;
}) => {
  const displayName = user?.name || t('guest');
  const workspaceLabel = user?.name || t('sidebar.workspace', { defaultValue: 'Duhan' });
  const initial = (displayName?.[0] || 'K').toUpperCase();

  return (
    <HoverTooltip label={t('sidebar.profile')} side={collapsed ? 'right' : 'top'}>
      <Button
        type="button"
        variant="ghost"
        size="auto"
        className={`mx-3 mb-2 mt-3 flex items-center rounded-lg px-3 py-2 text-left transition hover:bg-[var(--sb-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)] ${
          collapsed ? 'mx-auto mb-3 mt-3 h-11 w-11 justify-center rounded-xl px-0 py-0' : 'gap-3'
        }`}
        onClick={() => navigate('/profile')}
        aria-label={t('sidebar.profile')}
        title={t('sidebar.profile')}
      >
        <div
          className="grid h-6 w-6 shrink-0 place-items-center rounded bg-indigo-600 text-xs font-bold text-white shadow-sm"
          style={{ backgroundColor: user?.avatar ? 'transparent' : undefined }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={displayName} className="h-6 w-6 rounded object-cover" />
          ) : (
            initial
          )}
        </div>
        {!collapsed && (
          <span
            className="truncate text-sm font-semibold tracking-wide"
            style={{ color: 'var(--sb-text)' }}
          >
            {workspaceLabel}
          </span>
        )}
      </Button>
    </HoverTooltip>
  );
};

const SidebarNav = ({
  items,
  pathWithoutLang,
  searchString,
  collapsed,
  t,
}: {
  items: Array<{
    path: string;
    to: string;
    label: string;
    icon: LucideIcon;
    activePrefixes: string[];
  }>;
  pathWithoutLang: string;
  searchString: string;
  collapsed: boolean;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) => (
  <nav
    className={collapsed ? 'px-2 pb-4' : 'px-3 pb-4'}
    aria-label={t('sidebar.navigation', { defaultValue: 'Sidebar navigation' })}
  >
    <ul className="space-y-1">
      {items.map(item => {
        const fullPath = pathWithoutLang + searchString;
        const isActive = item.activePrefixes.some(prefix => {
          if (prefix.includes('?')) return fullPath.startsWith(prefix);
          if (pathWithoutLang.startsWith(prefix) && fullPath.includes('?view=')) return false;
          return pathWithoutLang.startsWith(prefix);
        });

        return (
          <li key={item.path}>
            <HoverTooltip label={item.label} enabled={collapsed} side="right">
              <NavLink
                to={item.to}
                aria-label={item.label}
                aria-current={isActive ? 'page' : undefined}
                title={collapsed ? item.label : undefined}
                className={`group flex items-center rounded-lg py-2 text-[14px] font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)] ${
                  collapsed ? 'mx-auto h-11 w-11 justify-center rounded-xl px-0' : 'gap-3 px-3'
                }`}
                style={
                  isActive
                    ? {
                        backgroundColor: 'var(--sb-surface-muted)',
                        color: 'var(--sb-text)',
                        boxShadow: '0 1px 2px rgba(15,23,42,0.08)',
                      }
                    : { color: 'var(--sb-muted-text)' }
                }
              >
                <item.icon
                  className="h-[18px] w-[18px] transition-colors"
                  style={{ color: isActive ? 'var(--sb-text)' : 'var(--sb-muted-text)' }}
                  aria-hidden="true"
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            </HoverTooltip>
          </li>
        );
      })}
    </ul>
  </nav>
);

const SidebarContextual = ({
  collapsed,
  title,
  subtitle,
  content,
}: {
  collapsed: boolean;
  title?: string;
  subtitle?: string;
  content: React.ReactNode;
}) => {
  if (collapsed) return null;
  return (
    <div className="relative min-h-0 flex-1 overflow-y-auto">
      <div
        className="absolute left-4 right-4 top-0 h-px opacity-70"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, var(--sb-border) 50%, transparent 100%)',
        }}
      />
      <div className="flex flex-col gap-5 px-3 py-5">
        {title ? (
          <div className="px-3">
            <p
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: 'var(--sb-muted-text)' }}
            >
              {title}
            </p>
            {subtitle ? (
              <p className="mt-1 text-[11px]" style={{ color: 'var(--sb-muted-text)' }}>
                {subtitle}
              </p>
            ) : null}
          </div>
        ) : null}
        {content}
      </div>
    </div>
  );
};

const SidebarFooter = ({
  collapsed,
  pathWithoutLang,
  isEditing,
  toggleEditMode,
  navigate,
  logout,
  isDarkMode,
  toggleDarkMode,
  t,
}: {
  collapsed: boolean;
  pathWithoutLang: string;
  isEditing: boolean;
  toggleEditMode: () => void;
  navigate: (path: string) => void;
  logout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  t: (key: string, options?: { defaultValue?: string }) => string;
}) => (
  <div
    className={`mt-auto border-t ${collapsed ? 'px-2 py-3' : 'p-3'}`}
    style={{ borderColor: 'var(--sb-border)' }}
  >
    <div className="space-y-2">
      <HoverTooltip
        label={t('sidebar.darkMode', { defaultValue: 'Dark mode' })}
        side={collapsed ? 'right' : 'top'}
      >
        {collapsed ? (
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={toggleDarkMode}
            aria-label={t('sidebar.darkMode', { defaultValue: 'Dark mode' })}
            title={t('sidebar.darkMode', { defaultValue: 'Dark mode' })}
            className="mx-auto h-11 w-11 rounded-xl p-0 transition-colors hover:bg-[var(--sb-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]"
            style={{ color: 'var(--sb-muted-text)' }}
          >
            <span className="flex items-center justify-center">
              {isDarkMode ? (
                <Moon size={17} aria-hidden="true" />
              ) : (
                <Sun size={17} aria-hidden="true" />
              )}
            </span>
          </Button>
        ) : (
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--sb-surface-muted)' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{ backgroundColor: 'var(--sb-surface)' }}
              >
                {isDarkMode ? (
                  <Moon size={16} aria-hidden="true" style={{ color: 'var(--sb-text)' }} />
                ) : (
                  <Sun size={16} aria-hidden="true" style={{ color: 'var(--sb-text)' }} />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--sb-text)' }}>
                  {t('sidebar.darkMode', { defaultValue: 'Dark mode' })}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--sb-muted-text)' }}>
                  {isDarkMode
                    ? t('sidebar.darkModeOn', { defaultValue: 'On for all pages' })
                    : t('sidebar.darkModeOff', { defaultValue: 'Off for all pages' })}
                </p>
              </div>
            </div>
            <Switch
              checked={isDarkMode}
              onCheckedChange={toggleDarkMode}
              aria-label={t('sidebar.darkMode', { defaultValue: 'Dark mode' })}
              className="data-[state=checked]:bg-indigo-600 data-[state=unchecked]:bg-[var(--sb-border)]"
            />
          </div>
        )}
      </HoverTooltip>

      <div className={`flex items-center gap-2 ${collapsed ? 'flex-col' : ''}`}>
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
            title={
              pathWithoutLang === '/dashboard' && isEditing ? t('done') : t('sidebar.settings')
            }
            className={`rounded-lg py-2 text-[14px] font-medium transition-colors hover:bg-[var(--sb-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)] ${
              collapsed ? 'h-11 w-11 rounded-xl p-0' : 'flex-1 px-3'
            }`}
            style={{
              color:
                pathWithoutLang === '/dashboard' && isEditing
                  ? 'var(--sb-success-text)'
                  : 'var(--sb-muted-text)',
            }}
          >
            <span className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
              {pathWithoutLang === '/dashboard' && isEditing ? (
                <Check size={17} aria-hidden="true" />
              ) : (
                <Settings size={17} aria-hidden="true" />
              )}
              {!collapsed && (
                <span>
                  {pathWithoutLang === '/dashboard' && isEditing
                    ? t('done')
                    : t('sidebar.settings', { defaultValue: 'Settings & account' })}
                </span>
              )}
            </span>
          </Button>
        </HoverTooltip>

        <HoverTooltip label={t('sidebar.logout')} side={collapsed ? 'right' : 'top'}>
          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={logout}
            aria-label={t('sidebar.logout')}
            title={t('sidebar.logout')}
            className={`rounded-lg p-2 transition-colors hover:bg-[var(--sb-danger-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)] ${
              collapsed ? 'h-11 w-11 rounded-xl p-0' : 'w-9'
            }`}
            style={{ color: 'var(--sb-danger-text)' }}
          >
            <span className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
              <LogOut size={16} aria-hidden="true" />
            </span>
          </Button>
        </HoverTooltip>
      </div>
    </div>
  </div>
);

export default function DesktopSidebar() {
  const { logout, user } = useAuth();
  const { t } = useTranslation();
  const { resolvedTheme, setTheme } = useTheme();
  const { isEditing } = useLayoutDashboardState();
  const { sidebarHidden } = useLayoutChromeState();
  const contextualSidebar = useContextualSidebarState();
  const { toggleEditMode } = useLayoutActions();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const navItems = useSidebarNavItems(t, currentLanguage);
  const tokens = useMemo(() => getSidebarThemeTokens(resolvedTheme), [resolvedTheme]);
  const sidebarStyle = useMemo(
    () =>
      ({
        '--sb-bg': tokens.background,
        '--sb-border': tokens.border,
        '--sb-text': tokens.text,
        '--sb-muted-text': tokens.mutedText,
        '--sb-surface': tokens.surface,
        '--sb-surface-muted': tokens.surfaceMuted,
        '--sb-active-bg': tokens.activeBackground,
        '--sb-active-text': tokens.activeText,
        '--sb-hover-bg': tokens.hoverBackground,
        '--sb-hover-text': tokens.hoverText,
        '--sb-focus-ring': tokens.focusRing,
        '--sb-success-bg': tokens.successBackground,
        '--sb-success-text': tokens.successText,
        '--sb-danger-hover-bg': tokens.destructiveHoverBackground,
        '--sb-danger-text': tokens.destructiveText,
        '--sb-badge-bg': tokens.badgeBackground,
        '--sb-badge-text': tokens.badgeText,
        backgroundColor: 'var(--sb-bg)',
        borderColor: 'var(--sb-border)',
      }) as CSSProperties,
    [tokens]
  );

  const collapseToggleLabel = collapsed
    ? t('sidebar.expand', { defaultValue: 'Expand sidebar' })
    : t('sidebar.collapse', { defaultValue: 'Collapse sidebar' });
  const isDarkMode = resolvedTheme === 'dark';
  const toggleCollapsed = useCallback(() => setCollapsed(previous => !previous), []);
  const toggleDarkMode = useCallback(() => {
    setTheme(isDarkMode ? 'light' : 'dark');
  }, [isDarkMode, setTheme]);

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key.toLowerCase() !== 'b') return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }
      event.preventDefault();
      toggleCollapsed();
    };
    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [toggleCollapsed]);

  if (sidebarHidden) return null;

  return (
    <div
      data-state={collapsed ? 'collapsed' : 'expanded'}
      data-collapsible={collapsed ? 'icon' : ''}
      className={`relative hidden h-screen shrink-0 transition-[width] duration-200 ease-linear md:block ${
        collapsed ? 'w-[4.5rem]' : 'w-64'
      }`}
    >
      <aside className="flex h-full flex-col overflow-hidden border-r" style={sidebarStyle}>
        <UserProfileHeader user={user} collapsed={collapsed} navigate={navigate} t={t} />

        <SidebarNav
          items={navItems}
          pathWithoutLang={pathWithoutLang}
          searchString={location.search}
          collapsed={collapsed}
          t={t}
        />

        {contextualSidebar && !collapsed ? (
          <SidebarContextual
            collapsed={collapsed}
            title={contextualSidebar.title}
            subtitle={contextualSidebar.subtitle}
            content={contextualSidebar.content}
          />
        ) : (
          <div className="flex-1" />
        )}

        <SidebarFooter
          collapsed={collapsed}
          pathWithoutLang={pathWithoutLang}
          isEditing={isEditing}
          toggleEditMode={toggleEditMode}
          navigate={navigate}
          logout={logout}
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          t={t}
        />
      </aside>

      <HoverTooltip label={collapseToggleLabel} enabled side={collapsed ? 'right' : 'top'}>
        <Button
          type="button"
          variant="ghost"
          size="auto"
          onClick={toggleCollapsed}
          aria-label={collapseToggleLabel}
          aria-expanded={!collapsed}
          title={collapseToggleLabel}
          className="absolute -right-3 top-3 z-30 inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]"
          style={{
            backgroundColor: 'var(--sb-surface)',
            borderColor: 'var(--sb-border)',
            color: 'var(--sb-muted-text)',
          }}
        >
          <PanelLeft
            className={`h-[15px] w-[15px] transition-transform ${collapsed ? '' : 'rotate-180'}`}
            aria-hidden="true"
          />
        </Button>
      </HoverTooltip>

      <button
        type="button"
        aria-label={collapseToggleLabel}
        onClick={toggleCollapsed}
        className="group/rail absolute inset-y-0 -right-2 z-20 hidden w-4 md:flex"
      >
        <span
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors group-hover/rail:bg-[var(--sb-border)]"
          style={{ backgroundColor: 'transparent' }}
        />
        <span
          className="absolute left-1/2 top-1/2 h-8 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover/rail:opacity-100"
          style={{ backgroundColor: 'var(--sb-border)' }}
        />
      </button>
    </div>
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
        label: t('sidebar.learn', { defaultValue: 'Learn' }),
        icon: GraduationCap,
        activePrefixes: [
          '/dashboard',
          '/courses',
          '/course/',
          '/reading',
          '/videos',
          '/video/',
          '/podcasts',
        ],
      },
      {
        path: '/practice',
        label: t('sidebar.practice', { defaultValue: 'Practice' }),
        icon: Dumbbell,
        activePrefixes: [
          '/practice',
          '/dashboard?view=practice',
          '/review',
          '/vocab-book',
          '/notebook',
          '/typing',
        ],
      },
      {
        path: '/topik',
        label: t('nav.topik', { defaultValue: 'TOPIK' }),
        icon: Trophy,
        activePrefixes: ['/topik'],
      },
    ];

    return items.map(item => ({ ...item, to: getLocalizedPath(item.path, currentLanguage) }));
  }, [t, currentLanguage]);
}
