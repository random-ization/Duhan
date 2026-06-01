import React from 'react';
import { useQuery } from 'convex/react';
import { Button } from '../ui/button';
import { Plus } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DesktopNotificationsBell } from '../desktop/DesktopNotificationsBell';
import { useAuth } from '../../contexts/AuthContext';
import { USER_STATS, XP } from '../../utils/convexRefs';

// Simplified route mapping for title display
function useRouteTitle() {
  const location = useLocation();
  const p = location.pathname;

  // 核 · 主页 (HOME)
  if (p.includes('/dashboard/course') || p.endsWith('/course'))
    return { title: '今日', kanji: '今', breadcrumb: 'TODAY' };
  if (p === '/dashboard' || p === '/') return { title: '我的', kanji: '我', breadcrumb: 'MY' };

  // 學 · 学习模块 (STUDY)
  if (p.includes('/courses')) return { title: '学习', kanji: '學', breadcrumb: 'STUDY' };
  if (p.includes('/vocab')) return { title: '词汇学习', kanji: '詞', breadcrumb: 'STUDY' };
  if (p.includes('/grammar')) return { title: '语法', kanji: '法', breadcrumb: 'STUDY' };
  if (p.includes('/typing')) return { title: '打字练习', kanji: '寫', breadcrumb: 'STUDY' };
  if (p.includes('/topik')) return { title: 'TOPIK 备考', kanji: '試', breadcrumb: 'STUDY' };

  // 入 · 沉浸内容 (IMMERSE)
  if (p.includes('/media')) return { title: '沉浸', kanji: '沒', breadcrumb: 'IMMERSE' };
  if (p.includes('/podcast')) return { title: '播客', kanji: '話', breadcrumb: 'IMMERSE' };
  if (p.includes('/video')) return { title: '视频', kanji: '映', breadcrumb: 'IMMERSE' };
  if (p.includes('/reading')) return { title: '阅读', kanji: '讀', breadcrumb: 'IMMERSE' };
  if (p.includes('/dictionary')) return { title: '词典', kanji: '典', breadcrumb: 'IMMERSE' };

  // 會 · 社区 (SOCIAL)
  if (p.includes('/leaderboard'))
    return { title: '排行榜', kanji: '榜', breadcrumb: 'LEADERBOARD' };
  if (p.includes('/community')) return { title: '社区动态', kanji: '會', breadcrumb: 'COMMUNITY' };

  // 庫 · 我的资料 (LIBRARY)
  if (p.includes('/notebook')) return { title: '笔记本', kanji: '記', breadcrumb: 'LIBRARY' };
  if (p.includes('/review')) return { title: '复习中心', kanji: '復', breadcrumb: 'LIBRARY' };
  if (p.includes('/achievements')) return { title: '成就', kanji: '旗', breadcrumb: 'LIBRARY' };

  return { title: 'Duhan', kanji: '', breadcrumb: '' };
}

export function DesktopHeader() {
  const { title, kanji, breadcrumb } = useRouteTitle();
  const { t } = useTranslation();
  const { user } = useAuth();
  const stats = useQuery(USER_STATS.getStats, user ? {} : 'skip');
  const xpStats = useQuery(XP.getMyXpStats, user ? {} : 'skip');
  const streak = stats?.streak ?? 0;
  const totalXp = xpStats?.totalXp ?? 0;

  return (
    <div className="flex h-[60px] shrink-0 items-center gap-[18px] border-b border-k-line bg-k-bg px-7">
      <div className="flex items-baseline gap-2.5">
        {kanji && (
          <span className="font-k-serif text-[22px] font-medium text-k-crimson">{kanji}</span>
        )}
        <span className="text-[18px] font-black tracking-tight text-k-ink">{title}</span>
        {breadcrumb && (
          <span className="text-[11px] font-bold tracking-widest text-k-sub opacity-60">
            · {breadcrumb}
          </span>
        )}
      </div>

      <div className="flex-1" />

      {/* XP Badge */}
      {user && xpStats && (
        <div
          className="flex items-center gap-2 rounded-xl bg-k-card px-3 py-1.5 shadow-k-sh-sm border border-k-line"
          aria-label={t('common.totalXp', { defaultValue: 'Total XP' })}
        >
          <span className="text-[13px]">⚡</span>
          <span className="text-[14px] font-black text-k-ink">{totalXp}</span>
          <span className="text-[10px] font-bold text-k-sub uppercase tracking-wider">XP</span>
        </div>
      )}

      {/* Streak Badge */}
      <div className="flex items-center gap-2 rounded-xl bg-k-card px-3 py-1.5 shadow-k-sh-sm border border-k-line">
        <span className="text-[13px]">🔥</span>
        <span className="text-[14px] font-black text-k-ink">{streak}</span>
        <span className="text-[10px] font-bold text-k-sub uppercase tracking-wider">
          {t('dashboard.streakDays', { defaultValue: 'Days' })}
        </span>
      </div>

      <DesktopNotificationsBell />

      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 rounded-xl bg-k-card text-k-ink shadow-k-sh-sm border border-k-line hover:bg-k-bg2 transition-colors"
      >
        <Plus size={20} className="text-k-ink" />
      </Button>
    </div>
  );
}
