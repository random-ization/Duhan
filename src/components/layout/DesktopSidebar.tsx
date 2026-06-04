import React, { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import {
  getLocalizedPath,
  useCurrentLanguage,
  useLocalizedNavigate,
} from '../../hooks/useLocalizedNavigate';
import { Button } from '../ui/button';
import { useLayoutActions, useLayoutChromeState } from '../../contexts/LayoutContext';
import { getPathWithoutLang } from '../../utils/pathname';
import { Settings } from 'lucide-react';
import { UserAvatar } from '../common';
import { cn } from '../../lib/utils';
import { ABILITY_PROFILER } from '../../utils/convexRefs';

interface NavGroup {
  label: string;
  sub: string;
  items: Array<{
    id: string;
    k: string;
    l: string;
    path: string;
  }>;
}

function useDesktopSidebarNav(currentLanguage: string) {
  const { t } = useTranslation('public');

  return useMemo<NavGroup[]>(() => {
    const toPath = (p: string) => getLocalizedPath(p, currentLanguage);

    // Today is the unified coaching cockpit. Course detail stays available
    // through the course center and explicit deep links.
    const todayPath = toPath('/dashboard');

    // Grammar is a standalone top-level entry. `/grammar` resolves the right
    // institute and forwards to `/course/:id/grammar`, independent of "今日".
    const grammarPath = toPath('/grammar');

    return [
      {
        label: '核 · 主页',
        sub: 'HOME',
        items: [
          { id: 'today', k: '艙', l: '学习驾驶舱', path: todayPath },
          { id: 'courses', k: '課', l: '课程中心', path: toPath('/courses') },
        ],
      },
      {
        label: '學 · 学习模块',
        sub: 'STUDY',
        items: [
          { id: 'vocabhub', k: '詞', l: '词汇学习', path: toPath('/vocab-book') },
          { id: 'grammar', k: '法', l: '语法', path: grammarPath },
          { id: 'typing', k: '寫', l: '打字练习', path: toPath('/typing') },
          {
            id: 'speaking',
            k: 'S',
            l: t('mobileSpeakingModule.title', { defaultValue: 'Speaking Practice' }),
            path: toPath('/speaking'),
          },
          { id: 'writing-coach', k: '筆', l: '写作教练', path: toPath('/topik/writing-coach') },
          { id: 'topik', k: '試', l: 'TOPIK 备考', path: toPath('/topik') },
        ],
      },
      {
        label: '入 · 沉浸内容',
        sub: 'IMMERSE',
        items: [
          { id: 'media', k: '匯', l: '沉浸内容', path: toPath('/media') },
          { id: 'player', k: '話', l: '播客', path: toPath('/podcasts') },
          { id: 'video', k: '映', l: '视频', path: toPath('/videos') },
          { id: 'reader', k: '讀', l: '阅读', path: toPath('/reading') },
          { id: 'dict', k: '典', l: '词典', path: toPath('/dictionary/search') },
        ],
      },
      {
        label: '會 · 社区',
        sub: 'SOCIAL',
        items: [
          { id: 'community', k: '會', l: '社区动态', path: toPath('/community') },
          { id: 'leaderboard', k: '榜', l: '排行榜', path: toPath('/leaderboard') },
        ],
      },
      {
        label: '庫 · 我的资料',
        sub: 'LIBRARY',
        items: [
          { id: 'notebook', k: '記', l: '笔记本', path: toPath('/notebook') },
          { id: 'reviewhub', k: '復', l: '复习中心', path: toPath('/review') },
          { id: 'achieve', k: '旗', l: '成就', path: toPath('/achievements') },
          {
            id: 'learning-feedback',
            k: '饋',
            l: '学习反馈',
            path: toPath('/dashboard/weekly-report'),
          },
          { id: 'help', k: '導', l: '帮助与文档', path: toPath('/help') },
        ],
      },
    ];
  }, [currentLanguage, t]);
}

export default function DesktopSidebar() {
  const { user, viewerAccess } = useAuth();
  const isPremium = Boolean(viewerAccess?.isPremium);
  useTranslation();
  const { sidebarHidden, sidebarCollapsed } = useLayoutChromeState();
  const { toggleSidebar } = useLayoutActions();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const currentLanguage = useCurrentLanguage();
  const abilityScores = useQuery(ABILITY_PROFILER.getLiveAbilityScores, user ? {} : 'skip');
  const estimatedLevel = abilityScores?.estimatedTopikLevel;

  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const groups = useDesktopSidebarNav(currentLanguage);

  const activeId = useMemo(() => {
    if (pathWithoutLang.startsWith('/course/')) {
      const parts = pathWithoutLang.split('/').filter(Boolean);
      if (parts.length === 2) return 'courses';
      if (parts.length >= 3 && parts[2] === 'grammar') return 'grammar';
      if (parts.length >= 3 && parts[2] === 'vocab') return 'learn';
    }

    for (const group of groups) {
      for (const item of group.items) {
        const itemBase = getPathWithoutLang(item.path);
        if (itemBase === '/dashboard' && pathWithoutLang === '/dashboard') return item.id;
        if (itemBase !== '/dashboard' && pathWithoutLang.startsWith(itemBase)) return item.id;
      }
    }

    return 'today';
  }, [groups, pathWithoutLang]);

  if (sidebarHidden) return null;

  return (
    <motion.div
      initial={false}
      animate={{ width: sidebarCollapsed ? 72 : 240 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="hidden md:flex h-screen shrink-0 flex-col border-r border-[rgba(31,27,23,0.08)] bg-k-card text-k-ink relative z-40 overflow-hidden"
    >
      {/* Brand Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-5 pb-4 pt-5',
          sidebarCollapsed && 'px-0 justify-center'
        )}
      >
        <img
          src="/logo.svg"
          alt="Duhan Logo"
          width={sidebarCollapsed ? 32 : 40}
          height={sidebarCollapsed ? 32 : 40}
          className="rounded-[10px] flex-shrink-0"
        />
        {!sidebarCollapsed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="text-[17px] font-extrabold leading-none tracking-[-0.4px] text-k-ink">
              Duhan
            </div>
            <div className="mt-[3px] font-k-serif text-[10px] font-medium tracking-[2px] text-k-crimson">
              讀韓 · 桌面端
            </div>
          </motion.div>
        )}
      </div>

      {/* Collapse Toggle Button */}
      <button
        onClick={toggleSidebar}
        aria-label="Toggle sidebar"
        className="absolute right-0 top-16 translate-x-1/2 w-6 h-6 rounded-full bg-k-card border border-k-line flex items-center justify-center shadow-sm z-50 hover:bg-k-bg2 transition-colors"
      >
        <motion.div animate={{ rotate: sidebarCollapsed ? 180 : 0 }} className="text-k-sub">
          <span style={{ fontSize: 10 }}>◀</span>
        </motion.div>
      </button>

      {/* Search */}
      <div className={cn('px-4 pb-[14px]', sidebarCollapsed && 'px-2')}>
        <button
          className={cn(
            'flex items-center gap-2 rounded-xl bg-k-bg2 px-3 py-[9px] text-k-sub transition-colors hover:bg-k-bg2/80',
            sidebarCollapsed ? 'justify-center px-0 w-10 mx-auto' : 'w-full'
          )}
        >
          <span className="text-[13px]">⌕</span>
          {!sidebarCollapsed && (
            <>
              <span className="flex-1 text-left font-semibold text-[12px]">搜索…</span>
              <span className="rounded-md bg-k-card px-1.5 py-0.5 text-[9px] font-extrabold tracking-[0.5px]">
                ⌘K
              </span>
            </>
          )}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 scrollbar-hide">
        {groups.map(g => (
          <div key={g.sub} className="mb-[14px]">
            {!sidebarCollapsed && (
              <div className="flex items-baseline gap-1.5 px-2 pb-1.5 pt-2">
                <span className="font-k-serif text-[12px] font-medium text-k-crimson">
                  {g.label.split(' · ')[0]}
                </span>
                <span className="text-[10px] font-extrabold tracking-[0.3px] text-k-ink">
                  {g.label.split(' · ')[1]}
                </span>
              </div>
            )}
            <div className="space-y-[2px]">
              {g.items.map(it => {
                const on = activeId === it.id;
                return (
                  <Button
                    key={it.id}
                    variant="ghost"
                    asChild
                    className={cn(
                      'flex h-auto w-full items-center justify-start gap-2.5 rounded-[9px] px-2.5 py-[7px] text-left transition-colors',
                      on
                        ? 'bg-k-ink text-k-bg hover:bg-k-ink hover:text-k-bg'
                        : 'bg-transparent text-k-ink hover:bg-k-bg2/50',
                      sidebarCollapsed && 'justify-center px-0 w-10 h-10 mx-auto'
                    )}
                  >
                    <NavLink to={it.path}>
                      <span
                        className={cn(
                          'w-[14px] text-center font-k-serif text-[13px] font-medium',
                          on ? 'text-k-card opacity-85' : 'text-k-crimson',
                          sidebarCollapsed && 'w-auto text-[15px]'
                        )}
                      >
                        {it.k}
                      </span>
                      {!sidebarCollapsed && (
                        <span
                          className={cn(
                            'flex-1 text-[12px] truncate',
                            on ? 'font-extrabold' : 'font-semibold'
                          )}
                        >
                          {it.l}
                        </span>
                      )}
                    </NavLink>
                  </Button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User Chip */}
      <div
        className={cn(
          'flex items-center gap-2.5 border-t border-k-line p-3',
          sidebarCollapsed && 'px-0 justify-center'
        )}
      >
        <div
          className={cn(
            'flex flex-1 items-center gap-2.5 min-w-0 cursor-pointer transition-opacity hover:opacity-70',
            sidebarCollapsed && 'justify-center'
          )}
          onClick={() => navigate('/profile')}
        >
          <UserAvatar
            user={user}
            className={cn('h-9 w-9 rounded-xl', sidebarCollapsed && 'h-10 w-10')}
            fallbackClassName="text-[14px]"
            showNameFallback={false}
          />
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-black text-k-ink">
                {user?.name || '河恩'}
              </div>
              <div className="truncate text-[10px] font-bold text-k-sub">
                {isPremium ? 'Premium' : 'Free'}
                {estimatedLevel ? ` · Lv.${estimatedLevel}` : ''}
              </div>
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-k-sub hover:bg-k-bg2/50"
            onClick={() => navigate('/profile')}
          >
            <Settings size={14} />
          </Button>
        )}
      </div>
    </motion.div>
  );
}
