import React from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { getPathWithoutLang } from '../../utils/pathname';
import { KT } from './ksoft/ksoft';

type TabKey = 'dashboard' | 'learn' | 'media' | 'my';

type Tab = {
  key: TabKey;
  path: string;
  hanja: string;
  kr: string;
  labelKey: string;
  labelFallback: string;
  icon: (color: string) => React.ReactNode;
};

const icoToday = (c: string) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="11" r="7.5" stroke={c} strokeWidth="1.8" />
    <path d="M11 6v5l3 2" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const icoLearn = (c: string) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path d="M3 5h7v13H3V5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M12 5h7v13h-7V5z" stroke={c} strokeWidth="1.8" strokeLinejoin="round" />
    <path d="M5 8h3M14 8h3M5 11h3M14 11h3" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const icoImmerse = (c: string) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <path
      d="M2.5 11c3-5 6.5-5 8.5-5s5.5 0 8.5 5"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path d="M7 13v2M11 13v3M15 13v2" stroke={c} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);
const icoMy = (c: string) => (
  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
    <circle cx="11" cy="8" r="3.5" stroke={c} strokeWidth="1.8" />
    <path
      d="M4 19c1-4 4-5.5 7-5.5s6 1.5 7 5.5"
      stroke={c}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { t } = useTranslation();
  const pathWithoutLang = getPathWithoutLang(location.pathname);
  const pendingBadges = useQuery(api.achievements.getPendingBadges);
  const hasPendingBadges = (pendingBadges?.length ?? 0) > 0;

  const tabs: Tab[] = [
    {
      key: 'dashboard',
      path: '/dashboard',
      hanja: '今',
      kr: '오늘',
      labelKey: 'nav.dashboard',
      labelFallback: 'Today',
      icon: icoToday,
    },
    {
      key: 'learn',
      path: '/courses',
      hanja: '學',
      kr: '배우다',
      labelKey: 'nav.learn',
      labelFallback: 'Learn',
      icon: icoLearn,
    },
    {
      key: 'media',
      path: '/media',
      hanja: '沒',
      kr: '몰입',
      labelKey: 'nav.media',
      labelFallback: 'Immerse',
      icon: icoImmerse,
    },
    {
      key: 'my',
      path: '/profile',
      hanja: '我',
      kr: '나의',
      labelKey: 'nav.profile',
      labelFallback: 'My',
      icon: icoMy,
    },
  ];

  const isTabActive = (tab: Tab) => {
    if (tab.key === 'dashboard') {
      return pathWithoutLang.startsWith('/dashboard') || pathWithoutLang.startsWith('/dictionary/');
    }
    if (tab.key === 'learn') {
      return (
        pathWithoutLang.startsWith('/courses') ||
        pathWithoutLang.startsWith('/course/') ||
        pathWithoutLang.startsWith('/review') ||
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
    return (
      pathWithoutLang.startsWith('/profile') ||
      pathWithoutLang.startsWith('/vocab-book') ||
      pathWithoutLang.startsWith('/vocabbook') ||
      pathWithoutLang.startsWith('/notebook') ||
      pathWithoutLang.startsWith('/pricing') ||
      pathWithoutLang.startsWith('/subscription')
    );
  };

  const handleTabPress = (path: string) => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(5);
    }
    navigate(path);
  };

  return (
    <nav
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-[40] md:hidden"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div
        className="pointer-events-auto flex"
        style={{
          background: 'rgba(251,248,243,0.88)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderTop: `1px solid ${KT.line}`,
          padding: '10px 8px 14px',
          fontFamily: KT.font,
        }}
      >
        {tabs.map(tab => {
          const isActive = isTabActive(tab);
          const color = isActive ? KT.ink : KT.subLight;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabPress(tab.path)}
              className="flex-1"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                padding: '4px 0',
                color,
              }}
              aria-label={t(tab.labelKey, { defaultValue: tab.labelFallback })}
              aria-current={isActive ? 'page' : undefined}
              data-active={isActive ? 'true' : 'false'}
            >
              <div
                style={{
                  position: 'relative',
                  height: 26,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                {tab.icon(color)}
                {isActive && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -6,
                      right: -6,
                      fontSize: 9,
                      fontFamily: KT.serif,
                      color: KT.crimson,
                      opacity: 0.75,
                      fontWeight: 500,
                      lineHeight: 1,
                    }}
                  >
                    {tab.hanja}
                  </div>
                )}
                {tab.key === 'my' && hasPendingBadges && !isActive && (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: -2,
                      right: -4,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: KT.crimson,
                      border: `2px solid rgba(251,248,243,0.95)`,
                      boxShadow: '0 2px 4px rgba(162,59,46,0.3)',
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  fontFamily: KT.font,
                  fontSize: 10,
                  fontWeight: isActive ? 800 : 600,
                  letterSpacing: 0.3,
                }}
              >
                {tab.kr}
              </div>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
