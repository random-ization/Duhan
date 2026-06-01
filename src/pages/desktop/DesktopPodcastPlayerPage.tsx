import React from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ArrowLeft,
  Share2,
  Heart,
  Search,
  MoreHorizontal,
  ListMusic,
  RefreshCw,
  Repeat,
} from 'lucide-react';
import { DesktopCard } from '../../components/desktop/ui/DesktopCard';
import { DesignChip } from '../../components/desktop/ui/DesignChip';
import { cn } from '../../lib/utils';

type PodcastEpisode = {
  guid?: string;
  title: string;
  audioUrl: string;
  channelArtwork?: string;
  channelTitle?: string;
  episodeNumber?: number;
  level?: string;
};

type PodcastChannel = {
  artworkUrl?: string;
  title?: string;
};

type TranscriptLine = {
  start: number;
  end: number;
  text: string;
  translation?: string;
};

interface DesktopPodcastPlayerPageProps {
  navigate: (path: string | number) => void;
  episode: PodcastEpisode;
  channel: PodcastChannel;
  transcript: TranscriptLine[];
  activeLineIndex: number;
  currentTime: number;
  isPlaying: boolean;
  togglePlay: () => void;
  progressPercent: number;
  safeCurrentTime: number;
  effectiveDuration: number;
  remainingTime: number;
  formatTime: (s: number) => string;
  seekTo: (s: number) => void;
  skip: (s: number) => void;
  speed: number;
  changeSpeed: () => void;
  toggleLoop: () => void;
  getAbLoopLabel: () => string;
  getAbLoopClassName: () => string;
  showTranslation: boolean;
  setShowTranslation: (v: boolean) => void;
  translationLabel: string;
  translationStatusLabel: string | null;
  onRegenerate: () => void;
  onToggleSubscription: () => void;
  subscriptionPending: boolean;
  isSubscribed: boolean;
  onShare: () => void;
  showPlaylist: boolean;
  setShowPlaylist: (v: boolean) => void;
  playlist: PodcastEpisode[];
  playEpisode: (e: PodcastEpisode) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showTranscriptLoader: boolean;
  transcriptError: string | null;
}

export const DesktopPodcastPlayerPage: React.FC<DesktopPodcastPlayerPageProps> = ({
  navigate,
  episode,
  channel,
  transcript,
  activeLineIndex,
  currentTime: _currentTime,
  isPlaying,
  togglePlay,
  progressPercent,
  safeCurrentTime,
  effectiveDuration,
  remainingTime,
  formatTime,
  seekTo,
  skip,
  speed,
  changeSpeed,
  toggleLoop,
  getAbLoopLabel,
  getAbLoopClassName,
  showTranslation,
  setShowTranslation,
  translationLabel,
  translationStatusLabel,
  onRegenerate,
  onToggleSubscription,
  subscriptionPending,
  isSubscribed,
  onShare,
  showPlaylist,
  setShowPlaylist,
  playlist,
  playEpisode,
  scrollRef,
  showTranscriptLoader,
  transcriptError,
}) => {
  return (
    <div className="w-full h-full font-sans overflow-hidden flex flex-col p-8">
      <div className="flex flex-col h-full space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between flex-none">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate(-1)}
              className="w-11 h-11 rounded-xl bg-k-card border border-k-line flex items-center justify-center text-k-ink shadow-k-sh-sm hover:bg-k-bg2 transition-all hover:scale-105 active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-k-serif text-[18px] font-medium text-k-crimson">聽</span>
                <h1 className="text-[14px] font-extrabold text-k-ink opacity-80 uppercase tracking-wider">
                  PODCAST PLAYER
                </h1>
              </div>
              <h2 className="text-[13px] font-bold text-k-sub line-clamp-1 max-w-[400px]">
                {episode.title}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onShare}
              className="w-10 h-10 rounded-full flex items-center justify-center text-k-sub hover:text-k-crimson hover:bg-k-bg2 transition-all"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={onToggleSubscription}
              disabled={subscriptionPending}
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                isSubscribed
                  ? 'text-k-crimson bg-k-crimson/5'
                  : 'text-k-sub hover:text-k-crimson hover:bg-k-bg2'
              )}
            >
              <Heart size={18} className={cn(isSubscribed && 'fill-current')} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] items-stretch gap-8 h-[calc(100vh-220px)] min-h-[400px] overflow-hidden">
          {/* Left Column: Cover + Player Controls (Scrollable if needed) */}
          <div className="space-y-4 h-full overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-k-line/20">
            <DesktopCard pad={0} className="overflow-hidden shadow-k-sh-lg border border-k-line/20">
              <div className="relative aspect-square">
                <img
                  src={
                    episode.channelArtwork || channel.artworkUrl || 'https://placehold.co/800x800'
                  }
                  className="w-full h-full object-cover"
                  alt="cover"
                />
                <div className="absolute bottom-5 left-5 flex gap-2">
                  <DesignChip
                    tone="ink"
                    size="sm"
                    className="backdrop-blur-md bg-k-ink/70 border-white/20"
                  >
                    {episode.episodeNumber ? `EP.${episode.episodeNumber}` : 'PODCAST'}
                  </DesignChip>
                  {episode.level && (
                    <DesignChip
                      tone="crimson"
                      size="sm"
                      className="backdrop-blur-md bg-k-crimson/70 border-white/20"
                    >
                      {episode.level}
                    </DesignChip>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-k-serif text-[18px] font-medium leading-tight text-k-ink mb-1 line-clamp-2">
                  {episode.title}
                </h3>
                <p className="text-[12px] font-bold text-k-sub">
                  {episode.channelTitle || channel.title}
                </p>
              </div>
            </DesktopCard>

            <DesktopCard pad={24} className="shadow-k-sh border border-k-line/10">
              {/* Progress Slider */}
              <div
                className="relative h-1.5 w-full bg-k-bg2 rounded-full overflow-hidden mb-2 cursor-pointer"
                onClick={e => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  if (effectiveDuration > 0) seekTo(pct * effectiveDuration);
                }}
              >
                <div
                  className="absolute left-0 top-0 h-full bg-k-crimson rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-extrabold text-k-sub opacity-70 mb-4">
                <span>{formatTime(safeCurrentTime)}</span>
                <span>-{formatTime(remainingTime)}</span>
              </div>

              {/* Main Controls */}
              <div className="flex items-center justify-center gap-5 mb-4">
                <button
                  onClick={() => skip(-30)}
                  className="text-k-sub hover:text-k-ink transition-colors"
                  aria-label="Back 30s"
                >
                  <SkipBack size={20} />
                </button>
                <button
                  onClick={togglePlay}
                  className="w-14 h-14 rounded-full bg-k-ink text-k-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause size={24} fill="currentColor" />
                  ) : (
                    <Play size={24} fill="currentColor" className="ml-1" />
                  )}
                </button>
                <button
                  onClick={() => skip(30)}
                  className="text-k-sub hover:text-k-ink transition-colors"
                  aria-label="Forward 30s"
                >
                  <SkipForward size={20} />
                </button>
              </div>

              {/* Secondary Controls */}
              <div className="flex items-center justify-between pt-6 border-t border-k-line/10">
                <div className="flex gap-2">
                  <button
                    onClick={changeSpeed}
                    className="h-8 px-3 rounded-full bg-k-bg2 text-[11px] font-black text-k-ink hover:bg-k-line transition-colors"
                  >
                    {speed}×
                  </button>
                  <button
                    onClick={toggleLoop}
                    className={cn(
                      'h-8 px-3 rounded-full flex items-center gap-1.5 text-[11px] font-black transition-all',
                      getAbLoopClassName() === 'active'
                        ? 'bg-k-crimson text-k-bg'
                        : 'bg-k-bg2 text-k-ink hover:bg-k-line'
                    )}
                  >
                    <Repeat size={12} />
                    {getAbLoopLabel()}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPlaylist(!showPlaylist)}
                    className={cn(
                      'p-2 rounded-lg transition-all',
                      showPlaylist
                        ? 'text-k-crimson bg-k-crimson/5'
                        : 'text-k-sub hover:bg-k-bg2 hover:text-k-ink'
                    )}
                  >
                    <ListMusic size={18} />
                  </button>
                  <button
                    onClick={onRegenerate}
                    className="p-2 rounded-lg text-k-sub hover:bg-k-bg2 hover:text-k-ink transition-all"
                  >
                    <RefreshCw size={18} />
                  </button>
                </div>
              </div>
            </DesktopCard>
          </div>

          <div className="h-full overflow-hidden">
            <DesktopCard
              pad={0}
              className="h-full flex flex-col shadow-k-sh border border-k-line/10 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-k-line">
                <div className="flex items-center gap-3">
                  <span className="font-k-serif text-[18px] font-medium text-k-crimson">文</span>
                  <h3 className="text-[15px] font-extrabold text-k-ink">交互字幕</h3>
                  {translationStatusLabel && (
                    <DesignChip
                      tone="crimson"
                      size="sm"
                      className="text-[9px] px-1.5 py-0.5 animate-pulse"
                    >
                      {translationStatusLabel}
                    </DesignChip>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  {/* Translation Toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-k-sub uppercase tracking-wider">
                      {translationLabel}
                    </span>
                    <button
                      onClick={() => setShowTranslation(!showTranslation)}
                      className={cn(
                        'w-9 h-5 rounded-full transition-all relative',
                        showTranslation ? 'bg-k-crimson' : 'bg-k-sub/20'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-1 w-3 h-3 rounded-full bg-white transition-all',
                          showTranslation ? 'left-5' : 'left-1'
                        )}
                      />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button className="p-2 text-k-sub hover:text-k-ink">
                      <Search size={16} />
                    </button>
                    <button className="p-2 text-k-sub hover:text-k-ink">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </div>
              </div>

              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
                style={{ scrollPaddingTop: '20px' }}
              >
                {/* 
                  We could use TranscriptStreamBody passed from props here, 
                  but that component might have Tailwind styles that conflict or look "old".
                  However, it contains critical logic for word-by-word highlighting.
                  For now, let's replicate the interactive list but cleaner.
                */}
                {showTranscriptLoader ? (
                  <div className="flex flex-col items-center justify-center h-64 text-k-sub">
                    <RefreshCw size={32} className="animate-spin mb-4 opacity-20" />
                    <p className="text-[13px] font-bold italic">正在生成智能字幕...</p>
                  </div>
                ) : transcriptError ? (
                  <div className="text-center py-20 text-k-crimson/60 font-bold">
                    {transcriptError}
                  </div>
                ) : transcript.length === 0 ? (
                  <div className="text-center py-20 text-k-sub font-bold italic opacity-40">
                    暫無字幕內容
                  </div>
                ) : (
                  transcript.map((line, i) => {
                    const isCur = i === activeLineIndex;
                    return (
                      <div
                        key={i}
                        id={`line-${i}`}
                        onClick={() => seekTo(line.start)}
                        className={cn(
                          'group cursor-pointer rounded-2xl p-5 border-l-4 transition-all duration-300',
                          isCur
                            ? 'bg-k-butter/30 border-k-crimson shadow-sm'
                            : 'bg-transparent border-transparent hover:bg-k-bg2/50'
                        )}
                      >
                        <div
                          className={cn(
                            'font-k-serif leading-relaxed transition-all flex flex-wrap gap-x-1',
                            isCur
                              ? 'text-[20px] font-medium text-k-ink'
                              : 'text-[17px] font-medium text-k-ink/60'
                          )}
                        >
                          {/* 
                            Note: Word-by-word highlighting is complex. 
                            If line.words exists, we could map it. 
                            But to keep it simple and robust, we'll show the text.
                          */}
                          {line.text}
                        </div>
                        {(line.translation || isCur) && showTranslation && (
                          <div
                            className={cn(
                              'mt-2 text-[14px] font-bold transition-all leading-relaxed',
                              isCur
                                ? 'text-k-crimson opacity-80'
                                : 'text-k-ink/40 group-hover:opacity-100'
                            )}
                          >
                            {line.translation || '正在翻译中...'}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="p-6 border-t border-k-line bg-k-bg2/10">
                <p className="text-[11px] font-bold text-k-sub opacity-50 text-center">
                  點擊任意段落即可跳轉播放 • 支持雙語切換
                </p>
              </div>
            </DesktopCard>
          </div>
        </div>
      </div>

      {/* Playlist Drawer */}
      {showPlaylist && (
        <div
          className="fixed inset-0 z-[100] bg-black/20 backdrop-blur-sm flex justify-end"
          onClick={() => setShowPlaylist(false)}
        >
          <div
            className="w-[400px] bg-k-card h-full shadow-2xl border-l border-k-line flex flex-col animate-in slide-in-from-right duration-300"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6 border-b border-k-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ListMusic size={20} className="text-k-crimson" />
                <h3 className="text-[16px] font-extrabold text-k-ink">播放列表</h3>
              </div>
              <button
                onClick={() => setShowPlaylist(false)}
                className="text-k-sub hover:text-k-ink"
              >
                關閉
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {playlist.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => playEpisode(item)}
                  className={cn(
                    'w-full text-left p-4 rounded-xl border border-transparent transition-all',
                    item.guid === episode.guid
                      ? 'bg-k-crimson/5 border-k-crimson/20'
                      : 'hover:bg-k-bg2'
                  )}
                >
                  <p
                    className={cn(
                      'text-[14px] font-extrabold line-clamp-1',
                      item.guid === episode.guid ? 'text-k-crimson' : 'text-k-ink'
                    )}
                  >
                    {item.title}
                  </p>
                  <p className="text-[11px] font-bold text-k-sub mt-1">
                    {item.channelTitle || channel.title}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesktopPodcastPlayerPage;
