import React, { useState } from 'react';
import { ArrowLeft, Play, Clock, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '../../components/ui';
import { Button } from '../../components/ui';
import { Card, CardContent } from '../../components/ui';
import { localeFromLanguage } from '../../utils/locale';
import type { Language } from '../../types';

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

export const LoadingState = ({ loadingLabel }: { loadingLabel: string }) => (
  <div className="min-h-screen flex items-center justify-center bg-card">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-indigo-500 dark:border-indigo-300 border-t-transparent mx-auto" />
      <p className="text-muted-foreground text-sm">{loadingLabel}</p>
    </div>
  </div>
);

export const ErrorState = ({
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

export const MissingChannelState = ({
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

const ChannelHero = ({
  channelImage,
  channel,
  backLabel,
  onBack,
  onShare,
}: {
  channelImage: string;
  channel: ChannelData | StateChannel;
  backLabel: string;
  onBack: () => void;
  onShare: () => void;
}) => (
  <div className="relative h-72 overflow-hidden bg-primary text-primary-foreground font-sans">
    <div
      className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-40"
      style={{ backgroundImage: `url(${channelImage})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />

    <div className="absolute top-4 left-4 z-20">
      <Button
        type="button"
        onClick={onBack}
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
      onClick={onShare}
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
  <div className="px-4 py-4 border-b border-border font-sans">
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
    <Card className="mx-4 my-4 bg-muted border-border font-sans">
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
  <div className="p-4 font-sans">
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

export const DesktopPodcastChannelPage = ({
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
}) => (
  <div className="min-h-screen bg-card pb-24 font-sans">
    <ChannelHero
      channelImage={channelImage}
      channel={displayChannel}
      backLabel={copy.back}
      onBack={onBack}
      onShare={handleShareChannel}
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

export default DesktopPodcastChannelPage;
