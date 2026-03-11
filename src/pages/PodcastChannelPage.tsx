import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAction, useMutation, useQuery } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { Badge } from '../components/ui';
import { Button } from '../components/ui';
import { Card, CardContent } from '../components/ui';
import { getLabels } from '../utils/i18n';
import { NoArgs, aRef, mRef, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { localeFromLanguage } from '../utils/locale';
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

type NavigateFn = ReturnType<typeof useLocalizedNavigate>;

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
  navigate,
}: {
  error: string;
  backLabel: string;
  navigate: NavigateFn;
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-card space-y-4">
    <p className="text-red-500 dark:text-red-300">{error}</p>
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => navigate(-1)}
      className="text-indigo-600 dark:text-indigo-300 hover:underline flex items-center gap-1"
    >
      <ArrowLeft className="w-4 h-4" /> {backLabel}
    </Button>
  </div>
);

const MissingChannelState = ({
  message,
  backLabel,
  navigate,
}: {
  message: string;
  backLabel: string;
  navigate: NavigateFn;
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-card space-y-4">
    <p className="text-muted-foreground">{message}</p>
    <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)}>
      {backLabel}
    </Button>
  </div>
);

const ChannelHero = ({
  channelImage,
  channel,
  backLabel,
  navigate,
}: {
  channelImage: string;
  channel: ChannelData | StateChannel;
  backLabel: string;
  navigate: NavigateFn;
}) => (
  <div className="relative h-72 overflow-hidden bg-primary text-primary-foreground">
    <div
      className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-40"
      style={{ backgroundImage: `url(${channelImage})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

    <div className="absolute top-4 left-4 z-20">
      <Button
        type="button"
        onClick={() => navigate(-1)}
        variant="ghost"
        size="icon"
        className="w-12 h-12 bg-black/30 backdrop-blur border border-white/20 hover:bg-black/50 rounded-xl"
        aria-label={backLabel}
      >
        <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
      </Button>
    </div>

    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur rounded-full hover:bg-black/50 text-white"
    >
      <Share2 className="w-5 h-5" />
    </Button>

    <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
      <div className="flex gap-4 items-end">
        <img
          src={channelImage}
          alt={channel.title}
          className="w-24 h-24 rounded-xl shadow-2xl border-2 border-white/20"
        />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold leading-tight mb-1 drop-shadow-lg">{channel.title}</h1>
          <p className="text-sm opacity-80">{channel.author}</p>
        </div>
      </div>
    </div>
  </div>
);

const SubscribeBar = ({
  isSubscribed,
  onToggle,
  copy,
}: {
  isSubscribed: boolean;
  onToggle: () => void;
  copy: ChannelCopy;
}) => (
  <div className="px-4 py-4 border-b border-border">
    <Button
      onClick={onToggle}
      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
        isSubscribed
          ? 'bg-pink-100 text-pink-700 border border-pink-200 dark:bg-pink-500/20 dark:text-pink-200 dark:border-pink-400/30'
          : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 dark:bg-indigo-400/75 dark:hover:bg-indigo-300/80 dark:border-indigo-300/35'
      }`}
    >
      <Heart className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`} />
      {isSubscribed ? copy.subscribed : copy.subscribe}
    </Button>
  </div>
);

const ChannelDescriptionCard = ({
  description,
  isExpanded,
  setIsExpanded,
  copy,
}: {
  description?: string;
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  copy: ChannelCopy;
}) => {
  if (!description) return null;

  const canExpand = description.length > 150;
  return (
    <Card className="mx-4 my-4 bg-muted border-border">
      <CardContent className="p-4">
        <p
          className={`text-sm text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}
        >
          {description}
        </p>
        {canExpand && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(value => !value)}
            className="mt-2 text-xs text-indigo-600 dark:text-indigo-200 font-medium flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                {copy.collapse} <ChevronUp className="w-4 h-4" />
              </>
            ) : (
              <>
                {copy.expand} <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const EpisodeListSection = ({
  episodes,
  feedUrl,
  copy,
  language,
  onPlay,
}: {
  episodes: Episode[];
  feedUrl: string | undefined;
  copy: ChannelCopy;
  language: Language;
  onPlay: (episode: Episode) => void;
}) => (
  <div className="p-4">
    <h2 className="font-bold text-lg text-muted-foreground mb-4">
      {copy.episodes} ({episodes.length})
    </h2>
    {episodes.length === 0 && (
      <Card className="text-center py-10 text-muted-foreground border-dashed">
        <CardContent className="py-4">
          <p>{copy.noEpisodes}</p>
          {!feedUrl && <p className="text-xs mt-2">{copy.missingFeed}</p>}
        </CardContent>
      </Card>
    )}
    <div className="space-y-3">
      {episodes.map((episode, idx) => (
        <Button
          key={episode.guid || episode.id || episode.link || idx}
          type="button"
          size="auto"
          onClick={() => onPlay(episode)}
          variant="ghost"
          className="w-full text-left flex items-center gap-4 p-4 rounded-xl hover:bg-muted active:scale-[0.98] transition-all cursor-pointer border border-border hover:border-border hover:shadow-sm font-normal"
        >
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-400/14 dark:to-purple-400/14 flex items-center justify-center text-indigo-600 dark:text-indigo-200 flex-shrink-0">
            <Play className="w-5 h-5" fill="currentColor" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-muted-foreground line-clamp-2 mb-1">
              {episode.title}
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="gap-1 text-[11px] font-semibold">
                <Clock className="w-3 h-3" />
                {formatEpisodeDuration(episode.duration, copy.minutes)}
              </Badge>
              <Badge variant="outline" className="text-[11px] font-semibold">
                {formatEpisodeDate(episode.pubDate, language)}
              </Badge>
            </div>
          </div>
        </Button>
      ))}
    </div>
  </div>
);

const PodcastChannelLayout = ({
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
  navigate,
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
  navigate: NavigateFn;
}) => (
  <div className="min-h-screen bg-card pb-24">
    <ChannelHero
      channelImage={channelImage}
      channel={displayChannel}
      backLabel={copy.back}
      navigate={navigate}
    />
    <SubscribeBar isSubscribed={isSubscribed} onToggle={handleToggleSubscribe} copy={copy} />
    <ChannelDescriptionCard
      description={displayChannel.description}
      isExpanded={isDescExpanded}
      setIsExpanded={setIsDescExpanded}
      copy={copy}
    />
    <EpisodeListSection
      episodes={data?.episodes ?? []}
      feedUrl={feedUrl}
      copy={copy}
      language={language}
      onPlay={handlePlayEpisode}
    />
  </div>
);

const PodcastChannelPage: React.FC = () => {
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

  if (loading) return <LoadingState loadingLabel={copy.loadingEpisodes} />;

  const displayChannel = data?.channel || stateChannel;

  if (error && !displayChannel) {
    return <ErrorState error={error} backLabel={copy.back} navigate={navigate} />;
  }

  if (!displayChannel) {
    return (
      <MissingChannelState message={copy.noChannelInfo} backLabel={copy.back} navigate={navigate} />
    );
  }

  return (
    <PodcastChannelLayout
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
      navigate={navigate}
    />
  );
};

export default PodcastChannelPage;
