import React, { useMemo, useState, useEffect } from 'react';
import { useQuery } from 'convex/react';
import { PlayCircle, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocalizedNavigate } from '../../hooks/useLocalizedNavigate';
import { NoArgs, qRef } from '../../utils/convexRefs';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { resolveSafeReturnTo } from '../../utils/navigation';
import {
  buildPodcastChannelPath,
  buildPodcastPlayerPath,
  buildPodcastSearchPath,
} from '../../utils/podcastRoutes';
import { formatSafeDateLabel } from '../../utils/dateLabel';
import { motion } from 'framer-motion';
import { KT, SectionHead, PageShell } from './ksoft/ksoft';

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
  level?: string;
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

const normalizeChannelKeyPart = (value: string | undefined): string =>
  value?.trim().toLowerCase() ?? '';

const getPodcastChannelKey = (channel: PodcastChannel): string => {
  const directId = channel.id ?? channel._id ?? channel.itunesId ?? channel.feedUrl;
  if (directId && directId.trim()) return directId.trim();
  return [
    normalizeChannelKeyPart(channel.title),
    normalizeChannelKeyPart(channel.author),
    normalizeChannelKeyPart(channel.artworkUrl ?? channel.artwork),
  ].join('|');
};

const dedupePodcastChannels = (channels: ReadonlyArray<PodcastChannel>): PodcastChannel[] => {
  const seen = new Set<string>();
  const result: PodcastChannel[] = [];
  for (const channel of channels) {
    const key = getPodcastChannelKey(channel);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(channel);
  }
  return result;
};

type MobilePodcastDashboardView = 'home' | 'subscriptions';

type MobilePodcastDashboardProps = {
  view?: MobilePodcastDashboardView;
};

export const MobilePodcastDashboard: React.FC<MobilePodcastDashboardProps> = ({ view = 'home' }) => {
  const navigate = useLocalizedNavigate();
  const { user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [trendingTab, setTrendingTab] = useState<'all' | 'picks'>('all');
  const backPath = useMemo(() => {
    const fallback = view === 'subscriptions' ? '/podcasts' : '/media?tab=podcasts';
    return resolveSafeReturnTo(searchParams.get('returnTo'), fallback);
  }, [searchParams, view]);
  const currentPath = `${location.pathname}${location.search}`;

  type TrendingResult = {
    internal: (PodcastChannel & { _id: string })[];
    external: (PodcastChannel & { _id: string })[];
  };
  const trendingData = useQuery(qRef<NoArgs, TrendingResult>('podcasts:getTrending'));
  const historyData = useQuery(
    qRef<NoArgs, (HistoryItem & { _id: string })[]>('podcasts:getHistory'),
    user ? {} : 'skip'
  );
  const subscriptionsData = useQuery(
    qRef<NoArgs, PodcastChannel[]>('podcasts:getSubscriptions'),
    user ? {} : 'skip'
  );

  const history = useMemo(() => historyData?.map(h => ({ ...h, id: h._id })) ?? [], [historyData]);
  const subscriptions = useMemo(() => subscriptionsData ?? [], [subscriptionsData]);
  const trending = useMemo(() => {
    if (!trendingData) return [];
    const source =
      trendingTab === 'all' ? [...trendingData.internal, ...trendingData.external] : trendingData.internal;
    return dedupePodcastChannels(source).slice(0, trendingTab === 'all' ? 10 : 5);
  }, [trendingData, trendingTab]);

  const latestHistory = history[0];
  const loadingTrending = trendingData === undefined;
  const loadingHistory = Boolean(user) && historyData === undefined;
  const loadingSubscriptions = Boolean(user) && subscriptionsData === undefined;
  const [showLoadingIssue, setShowLoadingIssue] = useState(false);

  useEffect(() => {
    const isLoading = loadingTrending || loadingHistory || loadingSubscriptions;
    if (!isLoading) return;
    const timer = globalThis.setTimeout(() => setShowLoadingIssue(true), 7000);
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [loadingTrending, loadingHistory, loadingSubscriptions]);

  const retryLoading = () => {
    setShowLoadingIssue(false);
    if (typeof window !== 'undefined') window.location.reload();
  };
  const isLoadingAny = loadingTrending || loadingHistory || loadingSubscriptions;
  const shouldShowLoadingIssue = isLoadingAny && showLoadingIssue;

  const navigateToChannel = (channel: PodcastChannel) => {
    navigate(buildPodcastChannelPath(channel, currentPath), { state: { channel } });
  };

  const navigateToEpisode = (item: HistoryItem) => {
    navigate(buildPodcastPlayerPath(currentPath), {
      state: {
        episode: {
          guid: item.episodeGuid,
          title: item.episodeTitle,
          audioUrl: item.episodeUrl,
          channel: { title: item.channelName, artworkUrl: item.channelImage },
        },
      },
    });
  };

  const handleSearchSubmit = () => {
    const target = buildPodcastSearchPath(searchQuery, currentPath);
    if (!target) return;
    navigate(target);
  };

  if (view === 'subscriptions') {
    return (
      <PageShell>
        <div
          style={{
            padding: '14px 22px 18px',
            paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(backPath)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              marginBottom: 16,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: KT.sub,
              fontSize: 13,
              fontWeight: 600,
              fontFamily: KT.font,
            }}
          >
            ← {t('common.back', { defaultValue: 'Back' })}
          </button>
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
            訂閱 · PODCAST
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 800,
              color: KT.ink,
              letterSpacing: -0.6,
            }}
          >
            {t('podcast.mySubscriptions', { defaultValue: 'My subscriptions' })}
          </div>
        </div>

        <main style={{ padding: '0 18px 112px', display: 'grid', gap: 12 }}>
          {loadingSubscriptions ? (
            <div
              style={{
                background: KT.card,
                borderRadius: 18,
                border: `1px solid ${KT.line}`,
                padding: 18,
                color: KT.sub,
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {t('common.loading', { defaultValue: 'Loading...' })}
            </div>
          ) : subscriptions.length === 0 ? (
            <div
              style={{
                background: KT.card,
                borderRadius: 18,
                border: `1px solid ${KT.line}`,
                padding: 18,
                color: KT.sub,
                fontSize: 13,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {t('podcast.noSubscriptions', { defaultValue: 'No subscriptions yet.' })}
              <button
                type="button"
                onClick={() => navigate('/podcasts')}
                style={{
                  display: 'block',
                  margin: '14px auto 0',
                  border: 'none',
                  borderRadius: 999,
                  background: KT.ink,
                  color: '#fff',
                  padding: '9px 14px',
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {t('podcast.explorePodcasts', { defaultValue: 'Explore Podcasts' })}
              </button>
            </div>
          ) : (
            subscriptions.map(sub => (
              <button
                key={getPodcastChannelKey(sub)}
                type="button"
                onClick={() => navigateToChannel(sub)}
                style={{
                  border: `1px solid ${KT.line}`,
                  borderRadius: 18,
                  background: KT.card,
                  boxShadow: KT.shSm,
                  padding: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    flexShrink: 0,
                    background: `url(${sub.artworkUrl || sub.artwork || '/logo.png'}) center/cover, ${KT.lilac}`,
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      color: KT.ink,
                      fontSize: 14,
                      fontWeight: 850,
                      lineHeight: 1.25,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sub.title}
                  </div>
                  <div
                    style={{
                      color: KT.sub,
                      fontSize: 12,
                      fontWeight: 650,
                      marginTop: 4,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {sub.author || t('podcast.unknownAuthor', { defaultValue: 'Unknown' })}
                  </div>
                </div>
              </button>
            ))
          )}
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell>
      {/* ── Header ─────────────────────────────────── */}
      <div
        style={{
          padding: '14px 22px 18px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(backPath)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginBottom: 16,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            color: KT.sub,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: KT.font,
          }}
        >
          ← {t('common.back', { defaultValue: 'Back' })}
        </button>

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
          聲音 · PODCAST
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: KT.ink,
            letterSpacing: -0.6,
            marginBottom: 4,
          }}
        >
          {t('podcast.title', { defaultValue: 'Podcasts' })}
        </div>

        {/* search */}
        <div style={{ position: 'relative', marginTop: 14 }}>
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: 14,
              color: KT.sub,
              pointerEvents: 'none',
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder={t('podcast.searchPlaceholder', { defaultValue: 'Search podcasts…' })}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              handleSearchSubmit();
            }}
            style={{
              width: '100%',
              background: 'rgba(31,27,23,0.06)',
              border: 'none',
              borderRadius: 16,
              padding: '12px 48px 12px 40px',
              fontSize: 14,
              fontFamily: KT.font,
              fontWeight: 500,
              color: KT.ink,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <button
            type="button"
            aria-label={t('common.search', { defaultValue: 'Search' })}
            onClick={handleSearchSubmit}
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 32,
              height: 32,
              borderRadius: 16,
              border: 'none',
              background: 'rgba(31,27,23,0.08)',
              color: KT.ink,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <Search size={16} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Load error */}
      {shouldShowLoadingIssue && (
        <div style={{ padding: '0 18px 12px' }}>
          <div
            style={{
              background: KT.card,
              borderRadius: 16,
              boxShadow: KT.shSm,
              padding: '14px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 13, color: KT.sub, marginBottom: 10, fontWeight: 600 }}>
              {t('podcast.loadError', { defaultValue: 'Unable to load podcast data right now.' })}
            </div>
            <button
              type="button"
              onClick={retryLoading}
              style={{
                padding: '9px 20px',
                borderRadius: 12,
                background: KT.bg2,
                border: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
                color: KT.ink,
                fontFamily: KT.font,
              }}
            >
              {t('common.retry', { defaultValue: 'Retry' })}
            </button>
          </div>
        </div>
      )}

      {/* ── Continue Listening hero ─────────────────── */}
      {latestHistory && (
        <div style={{ padding: '0 18px 20px' }}>
          <button
            type="button"
            onClick={() => navigateToEpisode(latestHistory)}
            style={{
              width: '100%',
              background: `linear-gradient(135deg, ${KT.indigo} 0%, #3A5280 100%)`,
              borderRadius: 24,
              padding: '18px 18px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              boxShadow: '0 8px 24px rgba(47,63,104,0.28)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Hanja watermark */}
            <span
              style={{
                position: 'absolute',
                right: 14,
                top: 8,
                fontFamily: KT.serif,
                fontSize: 52,
                color: 'rgba(255,255,255,0.07)',
                lineHeight: 1,
                pointerEvents: 'none',
              }}
            >
              聽
            </span>

            {/* Channel art */}
            <div
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: `url(${latestHistory.channelImage || '/logo.png'}) center/cover`,
                flexShrink: 0,
                border: '2px solid rgba(255,255,255,0.2)',
              }}
            />

            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#4ade80',
                    display: 'inline-block',
                  }}
                />
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 800,
                    color: 'rgba(255,255,255,0.7)',
                    letterSpacing: 1.5,
                    fontFamily: KT.font,
                  }}
                >
                  {t('podcast.nowPlaying', { defaultValue: 'RESUMING' })}
                </span>
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 800,
                  color: '#fff',
                  lineHeight: 1.3,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginBottom: 8,
                }}
              >
                {latestHistory.episodeTitle}
              </div>
              {/* progress bar */}
              <div
                style={{
                  height: 3,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width:
                      latestHistory.duration && latestHistory.progress
                        ? `${Math.min(100, Math.round((latestHistory.progress / latestHistory.duration) * 100))}%`
                        : '0%',
                  }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  style={{ height: '100%', background: '#4ade80', borderRadius: 999 }}
                />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* ── Subscriptions ───────────────────────────── */}
      {user && !loadingSubscriptions && subscriptions.length > 0 && (
        <div style={{ paddingBottom: 20 }}>
          <SectionHead
            kanji="訂"
            title={t('podcast.mySubscriptions', { defaultValue: 'My subscriptions' })}
          />
          <div
            className="hide-scroll"
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '4px 18px 4px',
              scrollSnapType: 'x mandatory',
            }}
          >
            {subscriptions.map(sub => (
              <button
                key={sub.id || sub._id}
                type="button"
                onClick={() => navigateToChannel(sub)}
                style={{
                  flexShrink: 0,
                  minWidth: 90,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                  scrollSnapAlign: 'start',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 18,
                    background: `url(${sub.artworkUrl || sub.artwork || '/logo.png'}) center/cover, ${KT.lilac}`,
                    boxShadow: KT.shSm,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: KT.ink2,
                    fontFamily: KT.font,
                    maxWidth: 80,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sub.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Trending ────────────────────────────────── */}
      <div style={{ paddingBottom: 20 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 22px',
            marginBottom: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span
              style={{
                fontFamily: KT.serif,
                fontSize: 16,
                color: KT.crimson,
                opacity: 0.85,
                fontWeight: 500,
              }}
            >
              熱
            </span>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 0.4, color: KT.ink }}>
              {t('podcast.trendingThisWeek', { defaultValue: 'Trending this week' })}
            </span>
          </div>
          {/* tab toggle */}
          <div
            style={{
              display: 'flex',
              background: 'rgba(31,27,23,0.06)',
              borderRadius: 10,
              padding: 3,
              gap: 2,
            }}
          >
            {(['all', 'picks'] as const).map(tab => (
              <button
                key={tab}
                type="button"
                onClick={() => setTrendingTab(tab)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 7,
                  background: trendingTab === tab ? KT.card : 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 10,
                  fontWeight: 800,
                  color: trendingTab === tab ? KT.ink : KT.sub,
                  fontFamily: KT.font,
                  boxShadow: trendingTab === tab ? KT.shSm : 'none',
                }}
              >
                {tab === 'all'
                  ? t('podcast.filterOptions.all', { defaultValue: 'All' })
                  : t('podcast.filterOptions.picks', { defaultValue: 'Picks' })}
              </button>
            ))}
          </div>
        </div>

        {loadingTrending ? (
          <div
            className="hide-scroll"
            style={{
              display: 'flex',
              gap: 12,
              padding: '0 18px',
              overflowX: 'auto',
            }}
          >
            {[1, 2, 3].map(i => (
              <div
                key={i}
                style={{
                  flexShrink: 0,
                  width: 120,
                  background: KT.card,
                  borderRadius: 16,
                  padding: 10,
                  boxShadow: KT.shSm,
                }}
              >
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    background: KT.bg2,
                    borderRadius: 10,
                    marginBottom: 8,
                  }}
                />
                <div style={{ height: 10, background: KT.bg2, borderRadius: 5, marginBottom: 5 }} />
                <div style={{ height: 8, background: KT.bg2, borderRadius: 5, width: '60%' }} />
              </div>
            ))}
          </div>
        ) : trending.length === 0 ? (
          <div
            style={{
              margin: '0 18px',
              background: KT.card,
              borderRadius: 16,
              padding: '20px',
              textAlign: 'center',
              color: KT.sub,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {t('podcast.emptyTrending', {
              defaultValue: 'No trending podcasts available right now.',
            })}
          </div>
        ) : (
          <div
            className="hide-scroll"
            style={{
              display: 'flex',
              gap: 12,
              overflowX: 'auto',
              padding: '4px 18px 8px',
              scrollSnapType: 'x mandatory',
            }}
          >
            {trending.map((pod, idx) => (
              <button
                key={`${getPodcastChannelKey(pod)}-${idx}`}
                type="button"
                onClick={() => navigateToChannel(pod)}
                style={{
                  flexShrink: 0,
                  width: 120,
                  background: KT.card,
                  borderRadius: 18,
                  padding: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  position: 'relative',
                  boxShadow: KT.sh,
                  scrollSnapAlign: 'start',
                }}
              >
                {/* rank badge */}
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: KT.indigo,
                    color: '#fff',
                    fontSize: 9,
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontFamily: KT.font,
                  }}
                >
                  #{idx + 1}
                </span>
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1/1',
                    borderRadius: 12,
                    background: `url(${pod.artworkUrl || pod.artwork || '/logo.png'}) center/cover, ${KT.pink}`,
                    marginBottom: 8,
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: KT.ink,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: KT.font,
                    marginBottom: 3,
                  }}
                >
                  {pod.title}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: KT.sub,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: KT.font,
                  }}
                >
                  {pod.author}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── History ─────────────────────────────────── */}
      {history.length > 1 && (
        <div style={{ paddingBottom: 24 }}>
          <SectionHead kanji="歷" title={t('podcast.history', { defaultValue: 'History' })} />
          <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {history.slice(1, 4).map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => navigateToEpisode(item)}
                style={{
                  width: '100%',
                  background: KT.card,
                  borderRadius: 18,
                  boxShadow: KT.shSm,
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `url(${item.channelImage || '/logo.png'}) center/cover, ${KT.mint}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: KT.ink,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: 3,
                    }}
                  >
                    {item.episodeTitle}
                  </div>
                  <div style={{ fontSize: 10, color: KT.sub, fontWeight: 600 }}>
                    {item.channelName} ·{' '}
                    {formatSafeDateLabel(
                      item.playedAt,
                      undefined,
                      t('common.recently', { defaultValue: 'Recently' })
                    )}
                  </div>
                </div>
                <PlayCircle size={22} color={KT.sub} />
              </button>
            ))}
          </div>
        </div>
      )}
    </PageShell>
  );
};

export default MobilePodcastDashboard;
