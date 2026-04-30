import React, { useEffect, useState, lazy, Suspense } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Share2 } from 'lucide-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui';
import { getLabels } from '../utils/i18n';
import { NoArgs, aRef, mRef, qRef } from '../utils/convexRefs';
import { getLocalizedPath, useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { localeFromLanguage } from '../utils/locale';
import { buildMediaPath } from '../utils/mediaRoutes';
import { buildPodcastChannelPath } from '../utils/podcastRoutes';
import { resolveSafeReturnTo } from '../utils/navigation';
import { useIsMobile } from '../hooks/useIsMobile';
import { KT, PageShell, SectionHead, Chip } from '../components/mobile/ksoft/ksoft';
import type { Language } from '../types';

interface Episode {
  title: string;
  audioUrl?: string;
  pubDate?: string | Date;
  duration?: string | number;
  description?: string;
  guid?: string;
  link?: string;
  id?: string;
  image?: string;
}

interface ChannelData {
  title?: string;
  author?: string;
  description?: string;
  image?: string;
  artworkUrl?: string;
  artwork?: string;
}

interface FeedData {
  channel: ChannelData;
  episodes: Episode[];
}

type StateChannel = Partial<ChannelData> & {
  feedUrl?: string;
  itunesId?: string;
  id?: string;
};

interface ChannelCopy {
  missingFeed: string;
  loadEpisodesError: string;
  loginRequired: string;
  subscribeFailedPrefix: string;
  loadingEpisodes: string;
  back: string;
  noChannelInfo: string;
  subscribed: string;
  subscribe: string;
  collapse: string;
  expand: string;
  episodes: string;
  noEpisodes: string;
  minutes: string;
}

const withFallback = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return fallback;
};

const buildChannelCopy = (labels: ReturnType<typeof getLabels>): ChannelCopy => ({
  missingFeed: withFallback(labels.podcast?.missingFeed, 'Missing Channel Feed URL'),
  loadEpisodesError: withFallback(labels.podcast?.loadEpisodesError, 'Failed to load episodes'),
  loginRequired: withFallback(labels.podcast?.loginRequired, 'Please login first'),
  subscribeFailedPrefix: withFallback(labels.podcast?.subscribeFailed, 'Subscription failed: '),
  loadingEpisodes: withFallback(labels.loading, 'Loading episodes...'),
  back: withFallback(labels.errors?.backToHome, 'Back'),
  noChannelInfo: withFallback(labels.podcast?.noChannelInfo, 'Channel not found'),
  subscribed: withFallback(labels.podcast?.subscribed, 'Subscribed'),
  subscribe: withFallback(labels.podcast?.subscribe, 'Subscribe'),
  collapse: withFallback(labels.podcast?.collapse, 'Collapse'),
  expand: withFallback(labels.podcast?.expand, 'Expand'),
  episodes: withFallback(labels.podcast?.episodes, 'Episodes'),
  noEpisodes: withFallback(labels.podcast?.noEpisodes, 'No episodes found'),
  minutes: withFallback(labels.podcast?.minutes, 'mins'),
});

const resolveChannelImage = (channel?: Partial<ChannelData> | null) =>
  channel?.image || channel?.artworkUrl || channel?.artwork || 'https://placehold.co/400x400';

export function buildPodcastChannelShareUrl({
  origin,
  language,
  channel,
}: {
  origin: string;
  language: string;
  channel: {
    _id?: string | number | null;
    id?: string | number | null;
    itunesId?: string | number | null;
    feedUrl?: string | null;
  };
}) {
  const sharePath = getLocalizedPath(buildPodcastChannelPath(channel), language);
  return new URL(sharePath, origin).toString();
}

const formatEpisodeDuration = (duration: string | number | undefined, minutesLabel: string) => {
  if (!duration) return '—';
  if (typeof duration === 'number') {
    const mins = Math.floor(duration / 60);
    return `${mins} ${minutesLabel}`;
  }
  return duration;
};

const formatEpisodeDate = (dateStr: string | Date | undefined, language: Language) => {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return date.toLocaleDateString(localeFromLanguage(language), {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
};

const LoadingState = ({ loadingLabel }: { loadingLabel: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-card">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-500 dark:border-indigo-300 border-t-transparent mx-auto" />
      <p className="text-muted-foreground text-sm">{loadingLabel}</p>
    </div>
  </div>
);

const ErrorState = ({
  error,
  backLabel,
  onBack,
}: {
  error: string;
  backLabel: string;
  onBack: () => void;
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-card space-y-4">
    <p className="text-red-500 dark:text-red-300">{error}</p>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onBack}
      className="text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-1"
    >
      <ArrowLeft className="w-4 h-4" /> {backLabel}
    </Button>
  </div>
);

const MissingChannelState = ({
  message,
  backLabel,
  onBack,
}: {
  message: string;
  backLabel: string;
  onBack: () => void;
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-card space-y-4">
    <p className="text-muted-foreground">{message}</p>
    <Button type="button" variant="ghost" size="sm" onClick={onBack}>
      {backLabel}
    </Button>
  </div>
);

const MobilePodcastChannelLayout = ({
  displayChannel,
  channelImage,
  feedUrl,
  data,
  language,
  copy,
  isDescExpanded,
  setIsDescExpanded,
  isSubscribed,
  handleToggleSubscribe,
  handlePlayEpisode,
  onBack,
  handleShareChannel,
}: {
  displayChannel: ChannelData | StateChannel;
  channelImage: string;
  feedUrl: string | undefined;
  data: FeedData | null;
  language: Language;
  copy: ChannelCopy;
  isDescExpanded: boolean;
  setIsDescExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isSubscribed: boolean;
  handleToggleSubscribe: () => void;
  handlePlayEpisode: (episode: Episode) => void;
  onBack: () => void;
  handleShareChannel: () => void;
}) => {
  const description = displayChannel.description || '';
  const canExpand = description.length > 120;
  const visibleDescription =
    !description || isDescExpanded || !canExpand ? description : `${description.slice(0, 120)}…`;
  const episodes = data?.episodes ?? [];

  return (
    <PageShell>
      <div
        style={{
          padding: '14px 22px 18px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
            marginBottom: 14,
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.ink,
              boxShadow: KT.shSm,
              cursor: 'pointer',
              fontSize: 18,
              fontWeight: 700,
            }}
            aria-label={copy.back}
          >
            ←
          </button>
          <button
            type="button"
            onClick={handleShareChannel}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              border: `1px solid ${KT.line}`,
              background: KT.card,
              color: KT.ink,
              boxShadow: KT.shSm,
              cursor: 'pointer',
            }}
            aria-label="Share"
          >
            <Share2 size={16} />
          </button>
        </div>

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
          }}
        >
          {displayChannel.title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: KT.sub,
            marginTop: 4,
            fontWeight: 600,
          }}
        >
          {displayChannel.author || ''}
        </div>
      </div>

      <div style={{ padding: '0 18px 16px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${KT.indigo} 0%, ${KT.ink2} 100%)`,
            borderRadius: 24,
            padding: 18,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: KT.shLg,
            color: KT.card,
          }}
        >
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: 8,
              fontFamily: KT.serif,
              fontSize: 68,
              lineHeight: 1,
              color: 'rgba(255,255,255,0.1)',
              fontWeight: 500,
            }}
          >
            聲
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative' }}>
            <div
              style={{
                width: 78,
                height: 78,
                borderRadius: 18,
                border: '1px solid rgba(255,255,255,0.2)',
                background: `url(${channelImage}) center/cover, rgba(255,255,255,0.08)`,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <Chip tone="ink" size="sm">
                {copy.episodes} {episodes.length}
              </Chip>
              <div
                style={{
                  fontSize: 13,
                  marginTop: 8,
                  color: 'rgba(255,255,255,0.8)',
                  lineHeight: 1.5,
                }}
              >
                {displayChannel.author || ''}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleSubscribe}
            style={{
              marginTop: 14,
              width: '100%',
              padding: '10px 14px',
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              background: isSubscribed ? 'rgba(255,255,255,0.86)' : KT.crimson,
              color: isSubscribed ? KT.ink : KT.card,
              fontSize: 13,
              fontWeight: 800,
              fontFamily: KT.font,
            }}
          >
            {isSubscribed ? copy.subscribed : copy.subscribe}
          </button>
        </div>
      </div>

      {description ? (
        <div style={{ padding: '0 18px 16px' }}>
          <div
            style={{
              background: KT.card,
              borderRadius: 18,
              border: `1px solid ${KT.line}`,
              boxShadow: KT.shSm,
              padding: 14,
            }}
          >
            <p
              style={{
                fontSize: 13,
                color: KT.ink2,
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              {visibleDescription}
            </p>
            {canExpand ? (
              <button
                type="button"
                onClick={() => setIsDescExpanded(value => !value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: KT.indigo,
                  fontSize: 12,
                  fontWeight: 800,
                  marginTop: 10,
                  padding: 0,
                  cursor: 'pointer',
                }}
              >
                {isDescExpanded ? copy.collapse : copy.expand}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div style={{ paddingBottom: 24 }}>
        <SectionHead kanji="錄" title={`${copy.episodes} (${episodes.length})`} />
        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {episodes.length === 0 ? (
            <div
              style={{
                borderRadius: 16,
                background: KT.card,
                border: `1px solid ${KT.line}`,
                boxShadow: KT.shSm,
                textAlign: 'center',
                padding: '18px 14px',
              }}
            >
              <div style={{ fontSize: 13, color: KT.sub, fontWeight: 600 }}>{copy.noEpisodes}</div>
              {!feedUrl ? (
                <div style={{ fontSize: 11, color: KT.subLight, marginTop: 6 }}>
                  {copy.missingFeed}
                </div>
              ) : null}
            </div>
          ) : (
            episodes.map((episode, idx) => (
              <button
                key={episode.guid || episode.id || episode.link || idx}
                type="button"
                onClick={() => handlePlayEpisode(episode)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  border: 'none',
                  background: KT.card,
                  borderRadius: 18,
                  boxShadow: KT.shSm,
                  padding: '12px 14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: KT.bg2,
                    color: KT.indigo,
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Play size={18} fill="currentColor" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: KT.ink,
                      lineHeight: 1.4,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {episode.title}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <Chip size="sm">{formatEpisodeDuration(episode.duration, copy.minutes)}</Chip>
                    <Chip size="sm">{formatEpisodeDate(episode.pubDate, language)}</Chip>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </PageShell>
  );
};

const DesktopPodcastChannelPage = lazy(() => import('./desktop/DesktopPodcastChannelPage'));

const PodcastChannelPage: React.FC = () => {
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { user, language } = useAuth();
  const labels = getLabels(language);
  const copy = buildChannelCopy(labels);

  const stateChannel =
    (
      location.state as {
        channel?: StateChannel;
      } | null
    )?.channel ?? null;
  const feedUrl = searchParams.get('feedUrl') || stateChannel?.feedUrl;
  const channelId = searchParams.get('id') || stateChannel?.itunesId || stateChannel?.id;
  const backPath = resolveSafeReturnTo(searchParams.get('returnTo'), buildMediaPath('podcast'));
  const currentPath = `${location.pathname}${location.search}`;

  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const getEpisodesAction = useAction(
    aRef<{ feedUrl: string }, FeedData>('podcastActions:getEpisodes')
  );
  type SubscriptionChannel = { _id?: string; itunesId?: string };
  const subscriptions = useQuery(
    qRef<NoArgs, SubscriptionChannel[]>('podcasts:getSubscriptions'),
    user ? {} : 'skip'
  );
  const toggleSubscriptionMutation = useMutation(
    mRef<
      {
        channel: {
          itunesId: string;
          title: string;
          author: string;
          feedUrl: string;
          artworkUrl: string;
        };
      },
      unknown
    >('podcasts:toggleSubscription')
  );

  useEffect(() => {
    if (!feedUrl) {
      if (!stateChannel) setError(copy.missingFeed);
      setLoading(false);
      return;
    }

    const fetchEpisodes = async () => {
      try {
        const result = await getEpisodesAction({ feedUrl });
        setData(result);
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
        setError(copy.loadEpisodesError);
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [copy.loadEpisodesError, copy.missingFeed, feedUrl, getEpisodesAction, stateChannel]);

  useEffect(() => {
    if (!channelId || !subscriptions) return;
    const isSub = subscriptions.some(
      c => String(c.itunesId) === String(channelId) || String(c._id) === String(channelId)
    );
    setIsSubscribed(isSub);
  }, [subscriptions, channelId]);

  const handleToggleSubscribe = async () => {
    if (!user) {
      notify.error(copy.loginRequired);
      return;
    }

    const channelInfo = data?.channel || stateChannel;
    if (!channelId || !channelInfo) {
      logger.error('Cannot subscribe: Missing channel info');
      return;
    }

    const oldState = isSubscribed;
    setIsSubscribed(!oldState);

    try {
      await toggleSubscriptionMutation({
        channel: {
          itunesId: String(channelId),
          title: channelInfo.title || 'Unknown',
          author: channelInfo.author || 'Unknown',
          feedUrl: feedUrl || '',
          artworkUrl: channelInfo.image || channelInfo.artworkUrl || channelInfo.artwork || '',
        },
      });
    } catch (err: unknown) {
      setIsSubscribed(oldState);
      logger.error('Failed to toggle subscription:', err);
      notify.error(
        copy.subscribeFailedPrefix + (err instanceof Error ? err.message : 'Please try again later')
      );
    }
  };

  const handlePlayEpisode = (episode: Episode) => {
    const fullEpisode = {
      ...episode,
      image:
        episode.image ||
        data?.channel.image ||
        stateChannel?.image ||
        data?.channel.artworkUrl ||
        data?.channel.artwork ||
        '',
      channelTitle: data?.channel.title,
      channelArtwork: data?.channel.image,
      guid: episode.guid || episode.link || episode.id || episode.title,
    };

    const params = new URLSearchParams();
    params.set('audioUrl', fullEpisode.audioUrl || '');
    params.set('title', fullEpisode.title);
    if (fullEpisode.guid) params.set('guid', fullEpisode.guid);
    if (fullEpisode.channelTitle) params.set('channelTitle', fullEpisode.channelTitle);
    if (fullEpisode.channelArtwork) params.set('channelArtwork', fullEpisode.channelArtwork);
    params.set('returnTo', currentPath);

    navigate(`/podcasts/player?${params.toString()}`, {
      state: {
        episode: fullEpisode,
        channel: {
          ...stateChannel,
          ...data?.channel,
          itunesId: channelId,
          feedUrl: feedUrl,
        },
      },
    });
  };

  const handleShareChannel = async () => {
    const shareUrl = buildPodcastChannelShareUrl({
      origin: globalThis.location.origin,
      language,
      channel: {
        id: channelId,
        feedUrl,
      },
    });

    try {
      if (globalThis.navigator.share) {
        await globalThis.navigator.share({
          title: data?.channel.title || stateChannel?.title || 'Podcast channel',
          text: data?.channel.author || stateChannel?.author || 'Podcast channel',
          url: shareUrl,
        });
        return;
      }

      if (globalThis.navigator.clipboard?.writeText) {
        await globalThis.navigator.clipboard.writeText(shareUrl);
        notify.success('Share link copied');
        return;
      }

      notify.info(shareUrl);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      logger.error('Failed to share podcast channel', error);
      notify.error('Unable to share this channel right now.');
    }
  };

  if (loading) return <LoadingState loadingLabel={copy.loadingEpisodes} />;

  const displayChannel = data?.channel || stateChannel;

  if (error && !displayChannel) {
    return <ErrorState error={error} backLabel={copy.back} onBack={() => navigate(backPath)} />;
  }

  if (!displayChannel) {
    return (
      <MissingChannelState
        message={copy.noChannelInfo}
        backLabel={copy.back}
        onBack={() => navigate(backPath)}
      />
    );
  }

  if (isMobile) {
    return (
      <MobilePodcastChannelLayout
        displayChannel={displayChannel}
        channelImage={resolveChannelImage(displayChannel)}
        feedUrl={feedUrl || undefined}
        data={data}
        language={language}
        copy={copy}
        isDescExpanded={isDescExpanded}
        setIsDescExpanded={setIsDescExpanded}
        isSubscribed={isSubscribed}
        handleToggleSubscribe={handleToggleSubscribe}
        handlePlayEpisode={handlePlayEpisode}
        onBack={() => navigate(backPath)}
        handleShareChannel={handleShareChannel}
      />
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-card text-muted-foreground font-sans">Loading...</div>}>
      <DesktopPodcastChannelPage
        displayChannel={displayChannel}
        channelImage={resolveChannelImage(displayChannel)}
        feedUrl={feedUrl || undefined}
        data={data}
        language={language}
        copy={copy}
        isDescExpanded={isDescExpanded}
        setIsDescExpanded={setIsDescExpanded}
        isSubscribed={isSubscribed}
        handleToggleSubscribe={handleToggleSubscribe}
        handlePlayEpisode={handlePlayEpisode}
        onBack={() => navigate(backPath)}
        handleShareChannel={handleShareChannel}
      />
    </Suspense>
  );
};

export default PodcastChannelPage;
