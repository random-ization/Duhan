import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { LearnerStatsDto } from '../../../convex/learningStats';
import {
  ArrowLeft,
  Bell,
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
import { useMutation, useQuery } from 'convex/react';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useAuth } from '../../contexts/AuthContext';
import { NOTIFICATIONS, qRef, type NotificationDto } from '../../utils/convexRefs';
import { notify } from '../../utils/notify';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui';
import { MobileHeaderAction, RouteUiConfig } from '../../config/routes.config';
import { safeGetLocalStorageItem, safeSetLocalStorageItem } from '../../utils/browserStorage';
import { hasSafeReturnTo, resolveSafeReturnTo } from '../../utils/navigation';
import { formatNotificationTime } from '../../utils/notificationFormat';
import { KT } from './ksoft/ksoft';
import { MobileSearchSheet } from './MobileSearchSheet';

type HeaderStats = Pick<LearnerStatsDto, 'streak'>;

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
  const [bellOpen, setBellOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const unreadCount = useQuery(NOTIFICATIONS.getUnreadCount, user ? {} : 'skip') ?? 0;
  const recentNotifications = useQuery(
    NOTIFICATIONS.listRecent,
    user && bellOpen ? { limit: 8 } : 'skip'
  );
  const markRead = useMutation(NOTIFICATIONS.markRead);
  const markAllRead = useMutation(NOTIFICATIONS.markAllRead);
  const dismissNotification = useMutation(NOTIFICATIONS.dismiss);
  const [fontScaleIndex, setFontScaleIndex] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const saved = safeGetLocalStorageItem('mobile_font_scale_index');
    const parsed = saved ? Number(saved) : 1;
    return Number.isInteger(parsed) && parsed >= 0 && parsed < FONT_SCALES.length ? parsed : 1;
  });
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = safeGetLocalStorageItem('mobile_route_favorites');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const returnToParam = searchParams.get('returnTo');
  const defaultBackPath = useMemo(() => {
    if (pathWithoutLang.startsWith('/podcasts')) {
      return '/media?tab=podcasts';
    }
    if (pathWithoutLang.startsWith('/videos') || pathWithoutLang.startsWith('/video/')) {
      return '/media?tab=videos';
    }
    if (pathWithoutLang.startsWith('/reading')) {
      return '/media?tab=reading';
    }
    if (
      pathWithoutLang.startsWith('/courses') ||
      pathWithoutLang.startsWith('/course/') ||
      pathWithoutLang.startsWith('/review') ||
      pathWithoutLang.startsWith('/notebook') ||
      pathWithoutLang.startsWith('/topik') ||
      pathWithoutLang.startsWith('/typing') ||
      pathWithoutLang.startsWith('/vocab-book') ||
      pathWithoutLang.startsWith('/vocabbook')
    ) {
      return '/courses';
    }
    if (pathWithoutLang.startsWith('/profile')) {
      return '/profile';
    }
    return '/dashboard';
  }, [pathWithoutLang]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t('dashboard.greeting.morning', { defaultValue: 'Good morning' });
    if (hour < 18) return t('dashboard.greeting.afternoon', { defaultValue: 'Good afternoon' });
    return t('dashboard.greeting.evening', { defaultValue: 'Good evening' });
  }, [t]);

  const headerTitle = useMemo(() => {
    return t(routeUiConfig.headerTitle, {
      defaultValue: routeUiConfig.headerTitleDefault ?? routeUiConfig.headerTitle,
    });
  }, [routeUiConfig.headerTitle, routeUiConfig.headerTitleDefault, t]);

  const applyNextFontScale = () => {
    const next = (fontScaleIndex + 1) % FONT_SCALES.length;
    setFontScaleIndex(next);
    if (typeof window !== 'undefined') {
      safeSetLocalStorageItem('mobile_font_scale_index', String(next));
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
      safeSetLocalStorageItem('mobile_route_favorites', JSON.stringify(next));
    }
  };

  const handleShare = async () => {
    const url = typeof window === 'undefined' ? '' : window.location.href;
    try {
      if (globalThis.navigator.share) {
        await globalThis.navigator.share({ title: document.title, url });
        return;
      }

      if (globalThis.navigator.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(url);
        notify.success(t('common.linkCopied', { defaultValue: 'Share link copied' }));
        return;
      }

      notify.info(url);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      notify.error(t('common.shareFailed', { defaultValue: 'Unable to share right now.' }));
    } finally {
      setMenuOpen(false);
    }
  };

  const handleOpenNotification = async (n: NotificationDto) => {
    setBellOpen(false);
    try {
      if (!n.readAt) await markRead({ id: n.id });
    } catch {
      // ignore — tap-to-dismiss is best-effort
    }
    if (n.linkPath) {
      navigate(n.linkPath);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllRead({});
    } catch {
      notify.error(
        t('notifications.markAllFailed', { defaultValue: 'Could not mark all as read.' })
      );
    }
  };

  const handleDismissNotification = async (id: NotificationDto['id']) => {
    try {
      await dismissNotification({ id });
    } catch {
      // ignore — best-effort dismiss
    }
  };

  const handlePrimaryAction = (action: MobileHeaderAction) => {
    if (action === 'search') {
      setSearchOpen(true);
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

  const iconBtnStyle: CSSProperties = {
    width: 38,
    height: 38,
    borderRadius: 19,
    border: `1px solid ${KT.line}`,
    background: KT.card,
    color: KT.ink,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    boxShadow: KT.shSm,
    flexShrink: 0,
  };

  const renderRightAction = () => {
    if (routeUiConfig.headerType === 'dashboard') {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            padding: '7px 11px',
            borderRadius: 20,
            background: 'rgba(162,59,46,0.10)',
            border: `1px solid rgba(162,59,46,0.18)`,
          }}
        >
          <Flame size={14} style={{ color: KT.crimson }} />
          <span
            style={{
              fontSize: 13,
              fontWeight: 800,
              color: KT.crimson,
              fontFamily: KT.font,
            }}
          >
            {stats?.streak ?? 0}
          </span>
        </div>
      );
    }

    if (routeUiConfig.headerType === 'section') {
      if (routeUiConfig.headerAction === 'none') {
        return <div style={{ width: 38 }} />;
      }
      if (routeUiConfig.headerAction === 'filter' && !pathWithoutLang.startsWith('/media')) {
        return <div style={{ width: 38 }} />;
      }
      const Icon = routeUiConfig.headerAction === 'search' ? Search : SlidersHorizontal;
      const ariaLabel =
        routeUiConfig.headerAction === 'search'
          ? t('common.search', { defaultValue: 'Search' })
          : pathWithoutLang.startsWith('/media')
            ? t('common.switchTab', { defaultValue: 'Switch tab' })
            : t('common.filter', { defaultValue: 'Filter' });
      return (
        <button
          type="button"
          onClick={() => handlePrimaryAction(routeUiConfig.headerAction)}
          style={iconBtnStyle}
          aria-label={ariaLabel}
        >
          <Icon size={17} />
        </button>
      );
    }

    return (
      <div style={{ position: 'relative' }}>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              style={iconBtnStyle}
              aria-label={t('common.more', { defaultValue: 'More actions' })}
            >
              <MoreHorizontal size={18} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            unstyled
            style={{
              position: 'absolute',
              right: 0,
              top: 46,
              zIndex: 50,
              minWidth: 168,
              borderRadius: 18,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              padding: 6,
              boxShadow: '0 8px 32px rgba(31,27,23,0.14)',
            }}
          >
            <button
              type="button"
              onClick={toggleFavorite}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                color: KT.ink,
                fontFamily: KT.font,
              }}
            >
              <Star size={15} />
              {favorites.includes(pathWithoutLang)
                ? t('common.unfavorite', { defaultValue: 'Unfavorite' })
                : t('common.favorite', { defaultValue: 'Favorite' })}
            </button>
            <button
              type="button"
              onClick={handleShare}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                color: KT.ink,
                fontFamily: KT.font,
              }}
            >
              <Share2 size={15} />
              {t('common.share', { defaultValue: 'Share' })}
            </button>
            <button
              type="button"
              onClick={() => {
                applyNextFontScale();
                setMenuOpen(false);
              }}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 12,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                color: KT.ink,
                fontFamily: KT.font,
              }}
            >
              <Type size={15} />
              {t('common.fontSize', { defaultValue: 'Font size' })}
            </button>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  if (routeUiConfig.headerType === 'dashboard') {
    return (
      <>
        <header
          className="md:hidden"
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            background: `${KT.bg}dd`,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            padding: '0 20px 14px',
            paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
            fontFamily: KT.font,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
              {/* Avatar */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <img
                  src={user?.avatar || '/logo.png'}
                  alt={user?.name ?? 'User'}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    border: `2px solid ${KT.card}`,
                    boxShadow: KT.sh,
                    objectFit: 'cover',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -2,
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: '#3DAF82',
                    border: `2px solid ${KT.bg}`,
                  }}
                />
              </div>
              {/* Name + greeting */}
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: KT.sub,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    marginBottom: 2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {greeting}
                </div>
                <div
                  style={{
                    fontSize: 19,
                    fontWeight: 800,
                    color: KT.ink,
                    letterSpacing: -0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {user?.name || t('common.appName', { defaultValue: 'Duhan' })}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {user && (
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setBellOpen(v => !v)}
                    style={iconBtnStyle}
                    aria-label={t('notifications.open', { defaultValue: 'Notifications' })}
                  >
                    <Bell size={17} />
                    {unreadCount > 0 && (
                      <span
                        style={{
                          position: 'absolute',
                          top: 6,
                          right: 6,
                          minWidth: 8,
                          height: 8,
                          borderRadius: 5,
                          background: KT.crimson,
                          boxShadow: `0 0 0 2px ${KT.card}`,
                        }}
                      />
                    )}
                  </button>
                  {bellOpen && (
                    <div
                      role="menu"
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 46,
                        zIndex: 60,
                        width: 288,
                        maxHeight: 420,
                        overflowY: 'auto',
                        borderRadius: 18,
                        border: `1px solid ${KT.line}`,
                        background: KT.card,
                        padding: 6,
                        boxShadow: '0 10px 36px rgba(31,27,23,0.18)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px 10px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: KT.sub,
                            letterSpacing: 1.5,
                            textTransform: 'uppercase',
                          }}
                        >
                          {t('notifications.title', { defaultValue: 'Notifications' })}
                        </span>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllRead}
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: KT.crimson,
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {t('notifications.markAll', { defaultValue: 'Mark all read' })}
                          </button>
                        )}
                      </div>
                      {recentNotifications === undefined ? (
                        <div style={{ padding: '14px 10px', fontSize: 12, color: KT.sub }}>
                          {t('common.loading', { defaultValue: 'Loading…' })}
                        </div>
                      ) : recentNotifications.length === 0 ? (
                        <div style={{ padding: '14px 10px', fontSize: 12, color: KT.sub }}>
                          {t('notifications.empty', {
                            defaultValue: "You're all caught up.",
                          })}
                        </div>
                      ) : (
                        recentNotifications.map(n => (
                          <div
                            key={n.id}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 8,
                              padding: '8px 10px',
                              borderRadius: 12,
                              background: n.readAt ? 'transparent' : `${KT.pink}33`,
                              marginBottom: 2,
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleOpenNotification(n)}
                              style={{
                                flex: 1,
                                textAlign: 'left',
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                cursor: 'pointer',
                                minWidth: 0,
                              }}
                            >
                              <div
                                style={{
                                  fontSize: 13,
                                  fontWeight: 800,
                                  color: KT.ink,
                                  marginBottom: 2,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {n.title}
                              </div>
                              <div
                                style={{
                                  fontSize: 12,
                                  color: KT.sub,
                                  lineHeight: 1.3,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                {n.body}
                              </div>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: KT.sub,
                                  marginTop: 3,
                                  letterSpacing: 1,
                                  textTransform: 'uppercase',
                                }}
                              >
                                {formatNotificationTime(n.createdAt, defaultLabel =>
                                  t('time.now', { defaultValue: defaultLabel })
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDismissNotification(n.id)}
                              aria-label={t('notifications.dismiss', {
                                defaultValue: 'Dismiss',
                              })}
                              style={{
                                fontSize: 12,
                                color: KT.sub,
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                fontWeight: 800,
                              }}
                            >
                              ×
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
              {renderRightAction()}
            </div>
          </div>
        </header>
        <MobileSearchSheet isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      </>
    );
  }

  const handleBack = () => {
    if (hasSafeReturnTo(returnToParam)) {
      navigate(resolveSafeReturnTo(returnToParam, defaultBackPath));
      return;
    }
    navigate('/dashboard');
  };

  return (
    <>
      <header
        className="md:hidden"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: `${KT.bg}ee`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${KT.line}`,
          padding: '0 20px 12px',
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          fontFamily: KT.font,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 1fr 40px',
            alignItems: 'center',
            gap: 12,
          }}
        >
          {routeUiConfig.headerType === 'detail' ? (
            <button
              type="button"
              onClick={handleBack}
              style={iconBtnStyle}
              aria-label={t('common.back', { defaultValue: 'Back' })}
            >
              <ArrowLeft size={17} />
            </button>
          ) : (
            <div />
          )}
          <div
            style={{
              textAlign: 'center',
              fontSize: 16,
              fontWeight: 800,
              color: KT.ink,
              letterSpacing: -0.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 4px',
            }}
          >
            {headerTitle}
          </div>
          <div style={{ justifySelf: 'end' }}>{renderRightAction()}</div>
        </div>
      </header>
      <MobileSearchSheet isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
