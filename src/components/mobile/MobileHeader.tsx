import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Flame,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  Share2,
  Star,
  Type,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { qRef } from '../../utils/convexRefs';
import { Button } from '../ui';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui';
import { MobileHeaderAction, RouteUiConfig } from '../../config/routes.config';

type HeaderStats = {
  streak: number;
};

const FONT_SCALES = [0.95, 1, 1.08];

interface MobileHeaderProps {
  routeUiConfig: RouteUiConfig;
  pathWithoutLang: string;
}

export function MobileHeader({ routeUiConfig, pathWithoutLang }: Readonly<MobileHeaderProps>) {
  const { t } = useTranslation();
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const stats = useQuery(
    qRef<Record<string, never>, HeaderStats | null>('userStats:getStats'),
    user ? {} : 'skip'
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [fontScaleIndex, setFontScaleIndex] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const saved = window.localStorage.getItem('mobile_font_scale_index');
    const parsed = saved ? Number(saved) : 1;
    return Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALES.length ? parsed : 1;
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('mobile_route_favorites');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning', { defaultValue: 'Good morning' });
    if (hour < 18) return t('dashboard.greeting.afternoon', { defaultValue: 'Good afternoon' });
    return t('dashboard.greeting.evening', { defaultValue: 'Good evening' });
  }, [t]);

  const headerTitle = useMemo(() => {
    if (routeUiConfig.headerTitle === 'Dashboard') {
      return t('nav.dashboard', { defaultValue: 'Dashboard' });
    }
    if (routeUiConfig.headerTitle === 'Courses') {
      return t('nav.courses', { defaultValue: 'Courses' });
    }
    if (routeUiConfig.headerTitle === 'Practice') {
      return t('nav.practice', { defaultValue: 'Practice' });
    }
    if (routeUiConfig.headerTitle === 'Media') {
      return t('nav.media', { defaultValue: 'Media' });
    }
    if (routeUiConfig.headerTitle === 'Profile') {
      return t('nav.profile', { defaultValue: 'Profile' });
    }
    return routeUiConfig.headerTitle;
  }, [routeUiConfig.headerTitle, t]);

  const applyNextFontScale = () => {
    const next = (fontScaleIndex + 1) % FONT_SCALES.length;
    setFontScaleIndex(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mobile_font_scale_index', String(next));
      document.documentElement.style.setProperty('--mobile-font-scale', String(FONT_SCALES[next]));
    }
  };

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.style.setProperty(
      '--mobile-font-scale',
      String(FONT_SCALES[fontScaleIndex])
    );
  }, [fontScaleIndex]);

  const toggleFavorite = () => {
    const next = favorites.includes(pathWithoutLang)
      ? favorites.filter(path => path !== pathWithoutLang)
      : [...favorites, pathWithoutLang];
    setFavorites(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('mobile_route_favorites', JSON.stringify(next));
    }
  };

  const handleShare = async () => {
    const url = typeof window === 'undefined' ? '' : window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignored: user cancelled or unsupported
    } finally {
      setMenuOpen(false);
    }
  };

  const handlePrimaryAction = (action: MobileHeaderAction) => {
    if (action === 'search') {
      navigate('/dictionary/search');
      return;
    }
    if (action === 'filter') {
      if (pathWithoutLang.startsWith('/media')) {
        const query = new URLSearchParams(location.search);
        const currentTab = query.get('tab');
        const target = currentTab === 'podcasts' ? '/media?tab=videos' : '/media?tab=podcasts';
        navigate(target);
      }
      return;
    }
    setMenuOpen(prev => !prev);
  };

  const renderRightAction = () => {
    if (routeUiConfig.headerType === 'dashboard') {
      return (
        <div className="flex items-center gap-1 rounded-xl border border-orange-200 bg-orange-50 px-2.5 py-1.5">
          <Flame size={15} className="text-orange-500" />
          <span className="text-xs font-black text-orange-700">{stats?.streak ?? 0}</span>
        </div>
      );
    }

    if (routeUiConfig.headerType === 'section') {
      if (routeUiConfig.headerAction === 'none') {
        return <div className="h-10 w-10" />;
      }
      const Icon = routeUiConfig.headerAction === 'search' ? Search : SlidersHorizontal;
      return (
        <Button
          type="button"
          variant="outline"
          size="auto"
          onClick={() => handlePrimaryAction(routeUiConfig.headerAction)}
          className="w-10 h-10 rounded-xl border border-border bg-card shadow-sm"
          aria-label={t('common.search', { defaultValue: 'Search' })}
        >
          <Icon size={17} />
        </Button>
      );
    }

    return (
      <div className="relative">
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="auto"
              className="w-10 h-10 rounded-xl border border-border bg-card shadow-sm"
              aria-label={t('common.more', { defaultValue: 'More actions' })}
            >
              <MoreHorizontal size={18} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            unstyled
            className="absolute right-0 top-12 z-50 min-w-[160px] rounded-2xl border border-border bg-card p-1.5 shadow-xl"
          >
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={toggleFavorite}
              className="w-full justify-start rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <Star size={16} className="mr-2" />
              {favorites.includes(pathWithoutLang)
                ? t('common.unfavorite', { defaultValue: 'Unfavorite' })
                : t('common.favorite', { defaultValue: 'Favorite' })}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={handleShare}
              className="w-full justify-start rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <Share2 size={16} className="mr-2" />
              {t('common.share', { defaultValue: 'Share' })}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="auto"
              onClick={() => {
                applyNextFontScale();
                setMenuOpen(false);
              }}
              className="w-full justify-start rounded-xl px-3 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <Type size={16} className="mr-2" />
              {t('common.fontSize', { defaultValue: 'Font size' })}
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (routeUiConfig.headerType === 'dashboard') {
    return (
      <div className="md:hidden sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 bg-gradient-to-b from-background/95 via-background/85 to-background/0 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <img
              src={user?.avatar || '/logo.png'}
              alt={t('common.alt.logo', { defaultValue: 'Duhan logo' })}
              className="w-10 h-10 rounded-xl border border-border bg-card object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-foreground">{greeting}</p>
              <p className="truncate text-xs font-semibold text-muted-foreground">
                {user?.name || t('common.appName', { defaultValue: 'Duhan' })}
              </p>
            </div>
          </div>
          {renderRightAction()}
        </div>
      </div>
    );
  }

  return (
    <div className="md:hidden sticky top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-2 bg-gradient-to-b from-background/95 via-background/85 to-background/0 backdrop-blur-md">
      <div className="grid grid-cols-[40px,1fr,40px] items-center gap-2">
        {routeUiConfig.headerType === 'detail' ? (
          <Button
            type="button"
            variant="outline"
            size="auto"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl border border-border bg-card shadow-sm"
            aria-label={t('common.back', { defaultValue: 'Back' })}
          >
            <ArrowLeft size={17} />
          </Button>
        ) : (
          <div />
        )}
        <div className="truncate text-center text-base font-black tracking-tight text-foreground">
          {headerTitle}
        </div>
        <div className="justify-self-end">{renderRightAction()}</div>
      </div>
    </div>
  );
}
