import React, { Suspense, lazy, useCallback, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { useTranslation } from 'react-i18next';
import { useQuery } from 'convex/react';
import { useAuth } from '../../contexts/AuthContext';
import { qRef, NoArgs } from '../../utils/convexRefs';
import { Play, Search, Headphones } from 'lucide-react';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { KT, Chip, Card, SectionHead, type ChipTone } from './ksoft/ksoft';
import { buildPodcastPlayerPath } from '../../utils/podcastRoutes';
import type { User } from '../../types';

// --- TYPES ---
type ActiveTab = 'video' | 'podcast' | 'reading';

interface PodcastChannel {
  _id?: string;
  id?: string;
  title: string;
  author?: string;
  artwork?: string;
  artworkUrl?: string;
  feedUrl?: string;
  itunesId?: string;
  views?: number;
}

interface HistoryItem {
  _id?: string;
  id?: string;
  episodeGuid?: string;
  episodeTitle: string;
  episodeUrl?: string;
  channelName: string;
  channelImage?: string;
  playedAt: number;
  progress?: number;
  duration?: number;
}

const getTrendingList = (
  activeTab: 'community' | 'weekly',
  trending: { external: PodcastChannel[]; internal: PodcastChannel[] }
): PodcastChannel[] => {
  if (activeTab === 'community') return trending.external;
  return trending.internal;
};

function getArtworkUrl(...candidates: Array<string | undefined | null>): string | null {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate;
    }
  }
  return null;
}

const getLocale = (lang: string) => {
  if (lang === 'zh') return 'zh-CN';
  if (lang === 'en') return 'en-US';
  if (lang === 'vi') return 'vi-VN';
  return 'mn-MN';
};

const loadMobileVideoTab = () =>
  import('./MobileVideoTab').then(module => ({
    default: module.MobileVideoTab,
  }));

const loadMobileReadingDiscoveryView = () =>
  import('./MobileReadingDiscoveryView').then(module => ({
    default: module.MobileReadingDiscoveryView,
  }));

const LazyMobileVideoTab = lazy(loadMobileVideoTab);
const LazyMobileReadingDiscoveryView = lazy(loadMobileReadingDiscoveryView);

type MediaTone = {
  readonly chipTone: ChipTone;
  readonly surface: string;
  readonly accent: string;
  readonly gradient: string;
  readonly deep: string;
  readonly seal: string;
};

const PODCAST_TONES: MediaTone[] = [
  {
    chipTone: 'pink',
    surface: `${KT.pink}70`,
    accent: KT.pinkDeep,
    gradient: `linear-gradient(135deg, ${KT.pink} 0%, ${KT.lilac} 100%)`,
    deep: KT.pinkDeep,
    seal: '聲',
  },
  {
    chipTone: 'mint',
    surface: `${KT.mint}70`,
    accent: KT.mintDeep,
    gradient: `linear-gradient(135deg, ${KT.mint} 0%, ${KT.sky} 100%)`,
    deep: KT.mintDeep,
    seal: '話',
  },
  {
    chipTone: 'butter',
    surface: `${KT.butter}78`,
    accent: KT.butterDeep,
    gradient: `linear-gradient(135deg, ${KT.butter} 0%, ${KT.pink} 100%)`,
    deep: KT.butterDeep,
    seal: '聽',
  },
];

const clampTextStyle = (lines: number): React.CSSProperties => ({
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: lines,
  WebkitBoxOrient: 'vertical',
});

const getPodcastTone = (index: number): MediaTone => PODCAST_TONES[index % PODCAST_TONES.length];

const EmptyMediaCard: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <Card pad={18}>
    <div style={{ textAlign: 'center', padding: '10px 6px' }}>
      <div
        style={{
          fontFamily: KT.serif,
          fontSize: 13,
          color: KT.crimson,
          letterSpacing: 3,
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        空 · EMPTY
      </div>
      <div
        style={{
          fontSize: 17,
          fontWeight: 800,
          color: KT.ink,
          lineHeight: 1.3,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 12,
          color: KT.sub,
          lineHeight: 1.6,
          marginTop: 8,
        }}
      >
        {description}
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          style={{
            marginTop: 14,
            padding: '10px 18px',
            borderRadius: 999,
            border: `1px solid ${KT.line}`,
            background: KT.bg,
            color: KT.ink,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 0.4,
            fontFamily: KT.font,
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  </Card>
);

// --- SUB-COMPONENTS ---

const MediaTabSkeleton: React.FC = () => (
  <div
    className="h-full overflow-y-auto no-scrollbar px-[18px] pb-mobile-nav pt-4"
    style={{ touchAction: 'pan-y', maxWidth: '100%', overflowX: 'hidden' }}
  >
    <div className="space-y-4">
      {[1, 2, 3].map(item => (
        <Card key={item} pad={0} style={{ overflow: 'hidden' }}>
          <div className="aspect-[16/9] animate-pulse" style={{ background: KT.bg2 }} />
          <div style={{ padding: 18 }}>
            <div
              className="animate-pulse"
              style={{ height: 12, width: 84, borderRadius: 999, background: KT.bg2 }}
            />
            <div
              className="animate-pulse"
              style={{
                height: 22,
                width: '78%',
                borderRadius: 999,
                background: KT.bg2,
                marginTop: 12,
              }}
            />
            <div
              className="animate-pulse"
              style={{
                height: 12,
                width: '56%',
                borderRadius: 999,
                background: KT.bg2,
                marginTop: 10,
              }}
            />
          </div>
        </Card>
      ))}
    </div>
  </div>
);

// 1. PODCAST TAB
const PodcastTab: React.FC<{
  active: boolean;
  user: User | null;
  language: string;
}> = ({ active, user, language }) => {
  const navigate = useLocalizedNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = React.useState<'community' | 'weekly'>('community');
  const currentPath = `${location.pathname}${location.search}`;

  // -- DATA FETCHING --

  // 1. Trending
  type TrendingResult = {
    internal: (PodcastChannel & { _id: string })[];
    external: (PodcastChannel & { _id: string })[];
  };
  const trendingData = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));

  // 2. Subscriptions
  const subscriptionsData = useQuery(
    qRef<NoArgs, PodcastChannel[]>('podcasts:getSubscriptions'),
    user ? {} : 'skip'
  );

  // 3. History
  const historyData = useQuery(
    qRef<NoArgs, (HistoryItem & { _id: string })[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );

  // Derived State
  const trending = useMemo(() => {
    if (!trendingData || typeof trendingData !== 'object') {
      return { external: [], internal: [] };
    }
    const internal = Array.isArray(trendingData.internal) ? trendingData.internal : [];
    const external = Array.isArray(trendingData.external) ? trendingData.external : [];
    return {
      internal: internal.map(c => ({ ...c, id: c._id })),
      external: external.map(c => ({ ...c, id: c._id })),
    };
  }, [trendingData]);

  const subscriptions = useMemo(() => subscriptionsData ?? [], [subscriptionsData]);
  const history = useMemo(() => historyData ?? [], [historyData]);
  const latestHistory = history[0] ?? null;

  const listToShow = getTrendingList(activeTab, trending);
  const loadingTrending = trendingData === undefined;

  if (!active) return null;

  return (
    <div
      className="h-full overflow-y-auto no-scrollbar px-[18px] pb-mobile-nav pt-4 animate-in fade-in slide-in-from-left-4 duration-300"
      style={{ touchAction: 'pan-y', maxWidth: '100%', overflowX: 'hidden' }}
    >
      <div
        style={{
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', minWidth: 0 }}>
          <Chip tone="lilac">{t('podcast.filterOptions.all', { defaultValue: 'All' })}</Chip>
          <Chip tone="muted">{t('podcast.filterOptions.beginner', { defaultValue: 'Easy' })}</Chip>
          {history.length > 0 ? (
            <Chip tone="muted">
              {t('podcast.history', { defaultValue: 'History' })} {history.length}
            </Chip>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => navigate(`/podcasts/search?returnTo=${encodeURIComponent(currentPath)}`)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 12,
            border: `1px solid ${KT.line}`,
            background: KT.card,
            color: KT.ink,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: KT.shSm,
            flexShrink: 0,
          }}
          aria-label={t('common.search', { defaultValue: 'Search' })}
        >
          <Search size={16} />
        </button>
      </div>

      {latestHistory ? (
        <div style={{ marginBottom: 24 }}>
          <SectionHead
            kanji="續"
            title={t('media.continueListening', { defaultValue: 'Continue listening' })}
          />
          <Card pad={0} style={{ overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() =>
                navigate(buildPodcastPlayerPath(currentPath), {
                  state: {
                    episode: {
                      guid: latestHistory.episodeGuid,
                      title: latestHistory.episodeTitle,
                      audioUrl: latestHistory.episodeUrl,
                      channel: {
                        title: latestHistory.channelName,
                        artworkUrl: latestHistory.channelImage,
                      },
                    },
                  },
                })
              }
              style={{
                width: '100%',
                height: 140,
                background: `linear-gradient(135deg, ${KT.indigo} 0%, ${KT.crimson}cc 100%)`,
                position: 'relative',
                padding: 18,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontFamily: KT.font,
                color: KT.card,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'repeating-linear-gradient(45deg, transparent 0, transparent 18px, rgba(255,255,255,0.05) 18px, rgba(255,255,255,0.05) 19px)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  fontFamily: KT.serif,
                  fontSize: 72,
                  color: 'rgba(255,255,255,0.12)',
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                話
              </div>
              <div style={{ position: 'relative' }}>
                <Chip tone="ink">{t('podcast.nowPlaying', { defaultValue: 'Now playing' })}</Chip>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: KT.card,
                    marginTop: 8,
                    letterSpacing: -0.3,
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {latestHistory.episodeTitle}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.75)',
                    marginTop: 4,
                  }}
                >
                  {latestHistory.channelName}
                </div>
              </div>
            </button>
          </Card>
        </div>
      ) : null}

      {subscriptions.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <SectionHead
            kanji="藏"
            title={t('podcast.mySubscriptions', { defaultValue: 'My Subscriptions' })}
          />
          <div
            className="hide-scroll"
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}
          >
            {subscriptions.map((sub, index) => {
              const tone = getPodcastTone(index);
              return (
                <button
                  key={sub.id || sub._id}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    const cid = sub.itunesId || sub.id || sub._id;
                    if (cid) params.set('id', String(cid));
                    if (sub.feedUrl) params.set('feedUrl', sub.feedUrl);
                    params.set('returnTo', currentPath);
                    navigate(`/podcasts/channel?${params.toString()}`, { state: { channel: sub } });
                  }}
                  style={{
                    minWidth: 146,
                    maxWidth: 146,
                    border: `1px solid ${KT.line}`,
                    borderRadius: 24,
                    background: KT.card,
                    padding: 12,
                    textAlign: 'left',
                    boxShadow: KT.shSm,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 18,
                      overflow: 'hidden',
                      background: tone.gradient,
                      border: `1px solid ${KT.line}`,
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {getArtworkUrl(sub.artworkUrl, sub.artwork) ? (
                      <img
                        src={getArtworkUrl(sub.artworkUrl, sub.artwork) || undefined}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Headphones size={24} color={tone.accent} />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: 6,
                        fontFamily: KT.serif,
                        fontSize: 28,
                        color: 'rgba(255,255,255,0.22)',
                        fontWeight: 500,
                      }}
                    >
                      {tone.seal}
                    </div>
                  </div>
                  <div style={{ padding: '10px 2px 4px' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: KT.ink,
                        lineHeight: 1.35,
                        letterSpacing: -0.2,
                        ...clampTextStyle(2),
                      }}
                    >
                      {sub.title}
                    </div>
                    {sub.author ? (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: KT.sub,
                          marginTop: 6,
                          letterSpacing: 0.5,
                          ...clampTextStyle(1),
                        }}
                      >
                        {sub.author}
                      </div>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <SectionHead
            kanji="流"
            title={t('podcast.trendingThisWeek', { defaultValue: 'Trending' })}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button
              type="button"
              onClick={() => setActiveTab('community')}
              style={{
                padding: '10px 14px',
                borderRadius: 18,
                border: activeTab === 'community' ? 'none' : `1px solid ${KT.line}`,
                background: activeTab === 'community' ? KT.ink : KT.card,
                color: activeTab === 'community' ? KT.card : KT.ink,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.4,
                fontFamily: KT.font,
                boxShadow: activeTab === 'community' ? KT.shSm : 'none',
                cursor: 'pointer',
              }}
            >
              {t('dashboard.podcast.community', { defaultValue: 'Top Charts' })}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('weekly')}
              style={{
                padding: '10px 14px',
                borderRadius: 18,
                border: activeTab === 'weekly' ? 'none' : `1px solid ${KT.line}`,
                background: activeTab === 'weekly' ? KT.ink : KT.card,
                color: activeTab === 'weekly' ? KT.card : KT.ink,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.4,
                fontFamily: KT.font,
                boxShadow: activeTab === 'weekly' ? KT.shSm : 'none',
                cursor: 'pointer',
              }}
            >
              {t('dashboard.podcast.editorPicks', { defaultValue: 'Editor Picks' })}
            </button>
          </div>
        </div>

        {loadingTrending ? (
          <div
            className="hide-scroll"
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}
          >
            {[1, 2, 3].map(item => (
              <Card
                key={item}
                pad={0}
                style={{
                  minWidth: 170,
                  maxWidth: 170,
                  overflow: 'hidden',
                }}
              >
                <div
                  className="animate-pulse"
                  style={{ aspectRatio: '1 / 1', background: KT.bg2 }}
                />
                <div style={{ padding: 12 }}>
                  <div
                    className="animate-pulse"
                    style={{ height: 14, width: '80%', borderRadius: 999, background: KT.bg2 }}
                  />
                  <div
                    className="animate-pulse"
                    style={{
                      height: 10,
                      width: '58%',
                      borderRadius: 999,
                      background: KT.bg2,
                      marginTop: 8,
                    }}
                  />
                </div>
              </Card>
            ))}
          </div>
        ) : listToShow.length === 0 ? (
          <EmptyMediaCard
            title={t('podcast.emptyTrending', {
              defaultValue: 'No trending podcasts available right now.',
            })}
            description={t('podcast.emptyTrendingHint', {
              defaultValue: 'Try switching tabs or come back later for fresh picks.',
            })}
          />
        ) : (
          <div
            className="hide-scroll"
            style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}
          >
            {listToShow.slice(0, 10).map((pod, idx) => {
              const tone = getPodcastTone(idx);
              return (
                <button
                  key={pod.id || pod.title}
                  type="button"
                  onClick={() => {
                    const params = new URLSearchParams();
                    const cid = pod.itunesId || pod.id;
                    if (cid) params.set('id', String(cid));
                    if (pod.feedUrl) params.set('feedUrl', pod.feedUrl);
                    params.set('returnTo', currentPath);
                    navigate(`/podcasts/channel?${params.toString()}`, { state: { channel: pod } });
                  }}
                  style={{
                    minWidth: 170,
                    maxWidth: 170,
                    border: `1px solid ${KT.line}`,
                    borderRadius: 24,
                    background: KT.card,
                    padding: 12,
                    textAlign: 'left',
                    boxShadow: KT.shSm,
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      left: 12,
                      zIndex: 1,
                      padding: '4px 8px',
                      borderRadius: 999,
                      background: idx < 3 ? KT.ink : KT.card,
                      color: idx < 3 ? KT.card : KT.sub,
                      fontSize: 9,
                      fontWeight: 800,
                      letterSpacing: 0.4,
                      boxShadow: KT.shSm,
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div
                    style={{
                      aspectRatio: '1 / 1',
                      borderRadius: 18,
                      overflow: 'hidden',
                      background: tone.gradient,
                      border: `1px solid ${KT.line}`,
                      position: 'relative',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    {getArtworkUrl(pod.artworkUrl, pod.artwork) ? (
                      <img
                        src={getArtworkUrl(pod.artworkUrl, pod.artwork) || undefined}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Headphones size={24} color={tone.accent} />
                    )}
                    <div
                      style={{
                        position: 'absolute',
                        right: 10,
                        top: 8,
                        fontFamily: KT.serif,
                        fontSize: 28,
                        color: 'rgba(255,255,255,0.22)',
                        fontWeight: 500,
                      }}
                    >
                      {tone.seal}
                    </div>
                  </div>
                  <div style={{ padding: '10px 2px 4px' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: KT.ink,
                        lineHeight: 1.35,
                        letterSpacing: -0.2,
                        ...clampTextStyle(2),
                      }}
                    >
                      {pod.title}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: KT.sub,
                        marginTop: 6,
                        letterSpacing: 0.5,
                        ...clampTextStyle(1),
                      }}
                    >
                      {pod.author}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {history.length > 1 && (
        <div style={{ marginBottom: 8 }}>
          <SectionHead kanji="記" title={t('podcast.history', { defaultValue: 'History' })} />
          <div style={{ display: 'grid', gap: 10 }}>
            {history.slice(1, 6).map((record, index) => {
              const tone = getPodcastTone(index);
              return (
                <button
                  key={record.id || record._id || record.episodeGuid || record.episodeTitle}
                  type="button"
                  onClick={() =>
                    navigate(buildPodcastPlayerPath(currentPath), {
                      state: {
                        episode: {
                          guid: record.episodeGuid,
                          title: record.episodeTitle,
                          audioUrl: record.episodeUrl,
                          channel: { title: record.channelName, artworkUrl: record.channelImage },
                        },
                      },
                    })
                  }
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    borderRadius: 22,
                    border: `1px solid ${KT.line}`,
                    background: KT.card,
                    padding: 14,
                    textAlign: 'left',
                    boxShadow: KT.shSm,
                    cursor: 'pointer',
                  }}
                >
                  <div
                    style={{
                      width: 58,
                      height: 58,
                      borderRadius: 18,
                      overflow: 'hidden',
                      background: tone.gradient,
                      border: `1px solid ${KT.line}`,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {getArtworkUrl(record.channelImage) ? (
                      <img
                        src={getArtworkUrl(record.channelImage) || undefined}
                        loading="lazy"
                        decoding="async"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <Headphones size={22} color={tone.accent} />
                    )}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 800,
                        color: KT.ink,
                        letterSpacing: -0.2,
                        ...clampTextStyle(1),
                      }}
                    >
                      {record.episodeTitle}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        flexWrap: 'wrap',
                        marginTop: 6,
                        fontSize: 10,
                        color: KT.sub,
                        fontWeight: 800,
                        letterSpacing: 0.4,
                      }}
                    >
                      <span style={{ ...clampTextStyle(1), maxWidth: 120 }}>
                        {record.channelName}
                      </span>
                      <span>•</span>
                      <span>
                        {formatSafeDateLabel(
                          record.playedAt,
                          getLocale(language),
                          t('common.recently', { defaultValue: 'Recently' }),
                          { month: 'short', day: 'numeric' }
                        )}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      background: KT.bg2,
                      color: tone.accent,
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Play size={16} fill="currentColor" style={{ marginLeft: 1 }} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN PAGE ---
export const MobileMediaPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { user, language } = useAuth();
  const { t } = useTranslation();

  const activeTab = useMemo<ActiveTab>(() => {
    const qTab = searchParams.get('tab');
    if (qTab === 'video') return 'video';
    if (qTab === 'reading' || location.pathname.includes('/reading')) return 'reading';
    return 'podcast';
  }, [searchParams, location.pathname]);

  const updateActiveTab = useCallback(
    (nextTab: ActiveTab) => {
      const nextParams = new URLSearchParams(searchParams);
      if (nextTab === 'podcast') {
        nextParams.delete('tab');
      } else {
        nextParams.set('tab', nextTab);
      }
      setSearchParams(nextParams);
    },
    [searchParams, setSearchParams]
  );

  const tabsDef: { key: ActiveTab; kr: string; hanja: string; en: string }[] = [
    {
      key: 'podcast',
      kr: '팟캐스트',
      hanja: '聲',
      en: t('nav.podcasts', { defaultValue: 'Podcasts' }),
    },
    { key: 'video', kr: '영상', hanja: '映', en: t('nav.videos', { defaultValue: 'Videos' }) },
    { key: 'reading', kr: '읽기', hanja: '讀', en: t('nav.reading', { defaultValue: 'Reading' }) },
  ];

  const immerseSubtitle = language.startsWith('zh')
    ? '进入真正的韩语世界'
    : language.startsWith('vi')
      ? 'Bước vào thế giới tiếng Hàn thực thụ'
      : language.startsWith('mn')
        ? 'Жинхэнэ солонгос хэлний ертөнц рүү'
        : 'Step into real Korean content';

  useEffect(() => {
    if (typeof globalThis.window === 'undefined') return;

    const navWithConnection = globalThis.navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    const connection = navWithConnection.connection;
    if (connection?.saveData) return;
    const effectiveType = connection?.effectiveType || '4g';
    if (effectiveType.includes('2g') || effectiveType === 'slow-2g') return;

    type IdleWindow = Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    const idleWindow = globalThis.window as IdleWindow;
    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const warmLikelyNextTabs = () => {
      if (activeTab === 'podcast') {
        void loadMobileVideoTab();
        void loadMobileReadingDiscoveryView();
        return;
      }
      if (activeTab === 'video') {
        void loadMobileReadingDiscoveryView();
      }
    };

    if (idleWindow.requestIdleCallback) {
      idleId = idleWindow.requestIdleCallback(warmLikelyNextTabs, { timeout: 2000 });
    } else {
      timeoutId = globalThis.window.setTimeout(warmLikelyNextTabs, 1200);
    }

    return () => {
      if (idleId !== null) {
        idleWindow.cancelIdleCallback?.(idleId);
      }
      if (timeoutId !== null) {
        globalThis.window.clearTimeout(timeoutId);
      }
    };
  }, [activeTab]);

  return (
    <div
      className="flex h-screen flex-col overflow-hidden relative"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
        color: KT.ink,
        fontFamily: KT.font,
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
      }}
    >
      <header
        style={{
          padding: '14px 22px 0',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 13,
            color: KT.crimson,
            letterSpacing: 4,
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          浸 · IMMERSE
        </div>
        <div
          style={{
            fontSize: 30,
            fontWeight: 800,
            color: KT.ink,
            letterSpacing: -0.8,
          }}
        >
          몰입
        </div>
        <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>{immerseSubtitle}</div>
      </header>

      {/* Mode tabs */}
      <div style={{ padding: '14px 18px 8px', display: 'flex', gap: 8 }}>
        {tabsDef.map(tab => {
          const on = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => updateActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '12px 10px',
                borderRadius: 16,
                background: on ? KT.ink : KT.card,
                color: on ? KT.bg : KT.ink,
                textAlign: 'center',
                boxShadow: on ? KT.shSm : 'none',
                border: on ? 'none' : `1px solid ${KT.line}`,
                cursor: 'pointer',
                fontFamily: KT.font,
              }}
              aria-label={tab.en}
              aria-current={on ? 'page' : undefined}
            >
              <div
                style={{
                  fontFamily: KT.serif,
                  fontSize: 14,
                  opacity: 0.7,
                  marginBottom: 2,
                  fontWeight: 500,
                }}
              >
                {tab.hanja}
              </div>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: -0.2 }}>{tab.kr}</div>
            </button>
          );
        })}
      </div>

      {/* Content Container */}
      <main className="flex-1 min-h-0 overflow-hidden relative z-0 w-full">
        <PodcastTab active={activeTab === 'podcast'} user={user} language={language} />
        {activeTab === 'video' ? (
          <Suspense fallback={<MediaTabSkeleton />}>
            <LazyMobileVideoTab active language={language} />
          </Suspense>
        ) : null}
        {activeTab === 'reading' ? (
          <Suspense fallback={<MediaTabSkeleton />}>
            <LazyMobileReadingDiscoveryView active />
          </Suspense>
        ) : null}
      </main>
    </div>
  );
};
