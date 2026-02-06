import React, { useEffect, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Play, Clock, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { getLabels } from '../utils/i18n';
import { NoArgs, aRef, mRef, qRef } from '../utils/convexRefs';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';
import { notify } from '../utils/notify';
import { logger } from '../utils/logger';
import { localeFromLanguage } from '../utils/locale';

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

const PodcastChannelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useLocalizedNavigate();
  const { user, language } = useAuth();
  const labels = getLabels(language);

  // Get channel from navigation state or query params
  const stateChannel = (
    location.state as {
      channel?: Partial<ChannelData> & {
        feedUrl?: string;
        itunesId?: string;
        id?: string;
        artworkUrl?: string;
        artwork?: string;
      };
    } | null
  )?.channel;
  // 🔥 FIX: Prioritize URL params (survive page refresh)
  const feedUrl = searchParams.get('feedUrl') || stateChannel?.feedUrl;
  const channelId = searchParams.get('id') || stateChannel?.itunesId || stateChannel?.id;

  const [data, setData] = useState<FeedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Convex actions and queries
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
      if (stateChannel) {
        setLoading(false);
      } else {
        setError(labels.podcast?.missingFeed || 'Missing Channel Feed URL');
        setLoading(false);
      }
      return;
    }

    const fetchEpisodes = async () => {
      try {
        const result = await getEpisodesAction({ feedUrl });
        setData(result);
      } catch (err) {
        console.error('Failed to fetch episodes:', err);
        setError(labels.podcast?.loadEpisodesError || 'Failed to load episodes');
      } finally {
        setLoading(false);
      }
    };

    fetchEpisodes();
  }, [feedUrl, getEpisodesAction, labels, stateChannel]);

  // Check subscription status from Convex query
  useEffect(() => {
    if (!channelId || !subscriptions) return;
    const isSub = subscriptions.some(
      c => String(c.itunesId) === String(channelId) || String(c._id) === String(channelId)
    );
    setIsSubscribed(isSub);
  }, [subscriptions, channelId]); // subscriptions is from useQuery, stable enough for this check

  const handleToggleSubscribe = async () => {
    if (!user) {
      notify.error(labels.podcast?.loginRequired || 'Please login first');
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
        (labels.podcast?.subscribeFailed || 'Subscription failed: ') +
          (err instanceof Error ? err.message : 'Please try again later')
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
      // Fallback for missing GUID (use title or audio hash if needed)
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
        // Ensure channel info is passed for subscription check
        channel: {
          ...stateChannel,
          ...data?.channel,
          itunesId: channelId,
          feedUrl: feedUrl,
        },
      },
    });
  };

  const formatDuration = (duration: string | number | undefined) => {
    if (!duration) return '—';
    if (typeof duration === 'number') {
      const mins = Math.floor(duration / 60);
      return `${mins} ${labels.podcast?.minutes || 'mins'}`;
    }
    // Already formatted string like "01:23:45" or "23:45"
    return duration;
  };

  const formatDate = (dateStr: string | Date | undefined) => {
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-500 border-t-transparent mx-auto" />
          <p className="text-slate-500 text-sm">{labels.loading || 'Loading episodes...'}</p>
        </div>
      </div>
    );
  }

  // Allow rendering if we have data OR stateChannel
  const displayChannel = data?.channel || stateChannel;

  if (error && !displayChannel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
        <p className="text-red-500">{error}</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="text-indigo-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> {labels.errors?.backToHome || 'Back'}
        </Button>
      </div>
    );
  }

  if (!displayChannel) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white space-y-4">
        <p className="text-slate-500">{labels.podcast?.noChannelInfo || 'Channel not found'}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate(-1)}>
          {labels.errors?.backToHome || 'Back'}
        </Button>
      </div>
    );
  }

  const channelImage =
    displayChannel.image ||
    displayChannel.artworkUrl ||
    displayChannel.artwork ||
    'https://placehold.co/400x400';

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header with Blur Effect */}
      <div className="relative h-72 overflow-hidden bg-slate-900 text-white">
        {/* Blurred Background */}
        {channelImage && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-40"
            style={{ backgroundImage: `url(${channelImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
          <Button
            type="button"
            onClick={() => navigate(-1)}
            variant="ghost"
            size="icon"
            className="w-12 h-12 bg-black/30 backdrop-blur border border-white/20 hover:bg-black/50 rounded-xl"
            aria-label={labels.errors?.backToHome || 'Back'}
          >
            <ArrowLeft className="w-5 h-5 text-white" strokeWidth={2.5} />
          </Button>
        </div>

        {/* Share Button */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-20 bg-black/30 backdrop-blur rounded-full hover:bg-black/50 text-white"
        >
          <Share2 className="w-5 h-5" />
        </Button>

        {/* Channel Info */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6">
          <div className="flex gap-4 items-end">
            {channelImage && (
              <img
                src={channelImage}
                alt={displayChannel.title}
                className="w-24 h-24 rounded-xl shadow-2xl border-2 border-white/20"
              />
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold leading-tight mb-1 drop-shadow-lg">
                {displayChannel.title}
              </h1>
              <p className="text-sm opacity-80">{displayChannel.author}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscribe Button */}
      <div className="px-4 py-4 border-b border-slate-100">
        <Button
          onClick={handleToggleSubscribe}
          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
            isSubscribed
              ? 'bg-pink-100 text-pink-600 border border-pink-200'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600'
          }`}
        >
          <Heart className={`w-5 h-5 ${isSubscribed ? 'fill-current' : ''}`} />
          {isSubscribed
            ? labels.podcast?.subscribed || 'Subscribed'
            : labels.podcast?.subscribe || 'Subscribe'}
        </Button>
      </div>

      {/* Description */}
      {displayChannel.description && (
        <Card className="mx-4 my-4 bg-slate-50 border-slate-100">
          <CardContent className="p-4">
            <p
              className={`text-sm text-slate-600 leading-relaxed ${isDescExpanded ? '' : 'line-clamp-3'}`}
            >
              {displayChannel.description}
            </p>
            {displayChannel.description.length > 150 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="mt-2 text-xs text-indigo-600 font-medium flex items-center gap-1"
              >
                {isDescExpanded ? (
                  <>
                    {labels.podcast?.collapse || 'Collapse'} <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    {labels.podcast?.expand || 'Expand'} <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Episode List */}
      <div className="p-4">
        <h2 className="font-bold text-lg text-slate-800 mb-4">
          {labels.podcast?.episodes || 'Episodes'} ({data?.episodes?.length || 0})
        </h2>
        {(!data?.episodes || data.episodes.length === 0) && (
          <Card className="text-center py-10 text-slate-400 border-dashed">
            <CardContent className="py-4">
              <p>{labels.podcast?.noEpisodes || 'No episodes found'}</p>
              {!feedUrl && (
                <p className="text-xs mt-2">{labels.podcast?.missingFeed || 'Missing Feed URL'}</p>
              )}
            </CardContent>
          </Card>
        )}
        <div className="space-y-3">
          {data?.episodes?.map((episode, idx) => (
            <Button
              key={episode.guid || episode.id || episode.link || idx}
              type="button"
              size="auto"
              onClick={() => handlePlayEpisode(episode)}
              variant="ghost"
              className="w-full text-left flex items-center gap-4 p-4 rounded-xl hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer border border-slate-100 hover:border-slate-200 hover:shadow-sm font-normal"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600 flex-shrink-0">
                <Play className="w-5 h-5" fill="currentColor" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-800 line-clamp-2 mb-1">{episode.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Badge variant="secondary" className="gap-1 text-[11px] font-semibold">
                    <Clock className="w-3 h-3" />
                    {formatDuration(episode.duration)}
                  </Badge>
                  <Badge variant="outline" className="text-[11px] font-semibold">
                    {formatDate(episode.pubDate)}
                  </Badge>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PodcastChannelPage;
