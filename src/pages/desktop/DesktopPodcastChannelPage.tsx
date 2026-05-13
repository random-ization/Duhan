import React, { useState } from 'react';
import { ArrowLeft, Play, Clock, Heart, Share2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { localeFromLanguage } from '../../utils/locale';
import { cn } from '../../lib/utils';
import { PodcastPlayerModule } from '../../components/podcast/PodcastPlayerModule';
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
  <div className="min-h-screen flex items-center justify-center bg-k-bg">
    <div className="text-center space-y-4">
      <div className="animate-spin rounded-full h-10 w-10 border-3 border-k-crimson border-t-transparent mx-auto" />
      <p className="text-k-sub text-sm font-bold">{loadingLabel}</p>
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
  <div className="min-h-screen flex flex-col items-center justify-center bg-k-bg space-y-4">
    <p className="text-k-crimson font-bold">{error}</p>
    <button
      onClick={onBack}
      className="text-k-sub hover:text-k-ink font-bold flex items-center gap-1 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" /> {backLabel}
    </button>
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
  <div className="min-h-screen flex flex-col items-center justify-center bg-k-bg space-y-4">
    <p className="text-k-sub font-bold">{message}</p>
    <button
      onClick={onBack}
      className="px-6 py-2 rounded-xl bg-k-card border border-k-line font-bold text-k-ink hover:bg-k-bg2 transition-all shadow-k-sh-sm"
    >
      {backLabel}
    </button>
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
}) => {
  const { t } = useTranslation();
  const [selectedEpisode, setSelectedEpisode] = React.useState<Episode | null>(null);

  const handleSelectEpisode = (ep: Episode) => {
    setSelectedEpisode(ep);
  };

  return (
    <div className={cn("min-h-screen bg-k-bg font-sans transition-all duration-500", selectedEpisode ? "pb-0" : "pb-32")}>
      <div className={cn("mx-auto py-12 px-10 transition-all duration-500", selectedEpisode ? "max-w-full" : "max-w-5xl")}>
        <div className={cn("grid gap-10", selectedEpisode ? "grid-cols-[1fr_500px] xl:grid-cols-[1fr_600px]" : "grid-cols-1")}>
          <div className="min-w-0">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="w-11 h-11 rounded-xl bg-k-card border border-k-line flex items-center justify-center text-k-ink shadow-k-sh-sm hover:bg-k-bg2 transition-all hover:scale-105 active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>
          <button
            onClick={handleShareChannel}
            className="w-11 h-11 rounded-xl bg-k-card border border-k-line flex items-center justify-center text-k-ink shadow-k-sh-sm hover:bg-k-bg2 transition-all"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col md:flex-row gap-10 mb-12">
          <div className="w-[240px] shrink-0">
            <div className="aspect-square rounded-2xl overflow-hidden shadow-k-sh-lg border border-k-line">
              <img
                src={channelImage}
                alt={displayChannel.title}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-k-serif text-[24px] font-medium text-k-crimson">聽</span>
              <h1 className="text-[32px] font-black tracking-tight text-k-ink leading-tight">
                {displayChannel.title}
              </h1>
            </div>
            <p className="text-[16px] font-bold text-k-sub mb-6">{displayChannel.author}</p>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleToggleSubscribe}
                className={cn(
                  "px-8 py-3 rounded-xl font-bold text-[14px] flex items-center gap-2 transition-all shadow-k-sh-sm hover:scale-105 active:scale-95",
                  isSubscribed 
                    ? "bg-k-bg2 text-k-crimson border border-k-crimson/20"
                    : "bg-k-crimson text-k-bg"
                )}
              >
                <Heart className={cn("w-5 h-5", isSubscribed && "fill-current")} />
                {isSubscribed ? copy.subscribed : copy.subscribe}
              </button>
            </div>
          </div>
        </div>

        {/* Description */}
        {displayChannel.description && (
          <DesktopCard pad={20} className="mb-12 bg-k-bg2/30 border border-k-line/10">
            <p className={cn(
              "text-[14px] text-k-sub leading-relaxed font-medium",
              !isDescExpanded && "line-clamp-3"
            )}>
              {displayChannel.description}
            </p>
            {displayChannel.description.length > 200 && (
              <button
                onClick={() => setIsDescExpanded(!isDescExpanded)}
                className="mt-3 text-[12px] font-extrabold text-k-crimson flex items-center gap-1 hover:underline"
              >
                {isDescExpanded ? (
                  <>收起內容 <ChevronUp size={14} /></>
                ) : (
                  <>展開詳情 <ChevronDown size={14} /></>
                )}
              </button>
            )}
          </DesktopCard>
        )}

        {/* Episode List */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-k-line pb-4">
            <h2 className="text-[18px] font-extrabold text-k-ink">
              所有節目 <span className="text-k-sub ml-1 opacity-60">({data?.episodes.length || 0})</span>
            </h2>
          </div>

          <div className="space-y-3">
            {data?.episodes.map((episode, idx) => (
              <DesktopCard
                key={episode.guid || episode.id || episode.link || idx}
                pad={16}
                onClick={() => handleSelectEpisode(episode)}
                className={cn(
                  "flex items-center gap-5 border transition-all hover:shadow-k-sh-sm cursor-pointer group",
                  selectedEpisode?.guid === episode.guid ? "border-k-crimson bg-k-butter/10" : "border-transparent hover:border-k-line hover:bg-k-card"
                )}
              >
                <div className="w-12 h-12 rounded-xl bg-k-bg2 flex items-center justify-center text-k-crimson shrink-0 transition-transform group-hover:scale-110">
                  <Play size={20} fill="currentColor" className="ml-1" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-extrabold text-k-ink line-clamp-1 mb-1 group-hover:text-k-crimson transition-colors">
                    {episode.title}
                  </h3>
                  <div className="flex items-center gap-3">
                    <DesignChip tone="muted" size="sm">
                      <Clock size={12} className="mr-1" />
                      {formatEpisodeDuration(episode.duration, copy.minutes)}
                    </DesignChip>
                    <span className="text-[11px] font-bold text-k-sub opacity-60">
                      {formatEpisodeDate(episode.pubDate, language)}
                    </span>
                  </div>
                </div>
              </DesktopCard>
            ))}

            {(!data || data.episodes.length === 0) && (
              <div className="text-center py-20 text-k-sub font-bold italic opacity-60">
                {copy.noEpisodes}
              </div>
            )}
          </div>
        </div>

        {/* The "Expanded" Player Module */}
        {selectedEpisode?.audioUrl && (
          <div className="h-[calc(100vh-100px)] sticky top-12">
            <DesktopCard pad={0} className="h-full overflow-hidden shadow-k-sh-lg border border-k-line/20">
              <PodcastPlayerModule 
                initialEpisode={{
                  ...selectedEpisode,
                  audioUrl: selectedEpisode.audioUrl,
                  pubDate:
                    typeof selectedEpisode.pubDate === 'string'
                      ? selectedEpisode.pubDate
                      : selectedEpisode.pubDate?.toISOString(),
                }} 
                initialChannel={displayChannel} 
                isEmbedded={true}
                onBack={() => setSelectedEpisode(null)}
              />
            </DesktopCard>
          </div>
        )}
        </div>
      </div>
    </div>
  </div>
);
};

export default DesktopPodcastChannelPage;
