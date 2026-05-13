import React from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Rewind, FastForward, 
  Share2, Heart, ListMusic, RefreshCw, Languages, Repeat, X
} from 'lucide-react';
import { DesktopCard } from './DesktopCard';
import { DesignChip } from './DesignChip';
import { cn } from '../../../lib/utils';

interface PodcastEpisode {
  id?: string;
  guid?: string;
  title: string;
  audioUrl?: string;
  channelTitle?: string;
  channelArtwork?: string;
  episodeNumber?: number;
  level?: string;
  category?: string;
}

interface PodcastChannel {
  id?: string;
  title?: string;
  author?: string;
  artworkUrl?: string;
}

interface TranscriptLine {
  start: number;
  end: number;
  text: string;
  translation: string;
}

interface DesktopPodcastPlayerViewProps {
  episode: PodcastEpisode;
  channel: PodcastChannel;
  transcript: TranscriptLine[];
  activeLineIndex: number;
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
  onClose?: () => void;
  scrollRef: React.RefObject<HTMLDivElement>;
  showTranscriptLoader: boolean;
  transcriptError: string | null;
}

export const DesktopPodcastPlayerView: React.FC<DesktopPodcastPlayerViewProps> = ({
  episode,
  channel,
  transcript,
  activeLineIndex,
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
  onClose,
  scrollRef,
  showTranscriptLoader,
  transcriptError,
}) => {
  return (
    <div className="flex flex-col h-full bg-k-bg font-sans animate-in fade-in duration-500 overflow-hidden">
      {/* 1. Header (Fixed Height) */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-k-line bg-k-card/50 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <span className="font-k-serif text-[18px] font-medium text-k-crimson">聽</span>
          <h2 className="text-[14px] font-extrabold text-k-ink uppercase tracking-wider">PODCAST PLAYER</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={onShare}
            className="p-2 text-k-sub hover:text-k-crimson transition-colors"
          >
            <Share2 size={16} />
          </button>
          <button 
            onClick={onToggleSubscription}
            className={cn("p-2 transition-colors", isSubscribed ? "text-k-crimson" : "text-k-sub hover:text-k-crimson")}
          >
            <Heart size={16} className={cn(isSubscribed && "fill-current")} />
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="ml-2 w-7 h-7 rounded-full bg-k-bg2 flex items-center justify-center text-k-sub hover:text-k-ink transition-all"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Top Controls Area (Fixed/Compact) */}
      <div className="p-6 pb-4 space-y-5 border-b border-k-line/10 bg-gradient-to-b from-k-card/30 to-transparent">
        {/* Compact Info Section */}
        <div className="flex gap-4 items-center">
          <div className="w-20 h-20 rounded-xl overflow-hidden shadow-k-sh border border-k-line/20 shrink-0">
            <img
              src={episode.channelArtwork || channel.artworkUrl || 'https://placehold.co/400x400'}
              className="w-full h-full object-cover"
              alt="cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-k-serif text-[16px] font-medium leading-tight text-k-ink mb-1 line-clamp-1">
              {episode.title}
            </h3>
            <p className="text-[12px] font-bold text-k-sub truncate mb-2">
              {episode.channelTitle || channel.title}
            </p>
            <div className="flex gap-1.5">
              {episode.level && (
                <DesignChip tone="crimson" size="sm" className="scale-90 origin-left">{episode.level}</DesignChip>
              )}
              <DesignChip tone="muted" size="sm" className="scale-90 origin-left">EP.{episode.episodeNumber || '—'}</DesignChip>
            </div>
          </div>
        </div>

        {/* Compact Progress & Main Controls */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <div 
              className="relative h-1 w-full bg-k-bg2 rounded-full overflow-hidden cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                if (effectiveDuration > 0) seekTo(pct * effectiveDuration);
              }}
            >
              <div className="absolute left-0 top-0 h-full bg-k-crimson rounded-full transition-all duration-200" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-extrabold text-k-sub opacity-70">
              <span>{formatTime(safeCurrentTime)}</span>
              <span>-{formatTime(remainingTime)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={() => skip(-15)} className="text-k-sub hover:text-k-ink transition-colors"><Rewind size={18} /></button>
              <button 
                onClick={togglePlay}
                className="w-11 h-11 rounded-full bg-k-ink text-k-bg flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
              <button onClick={() => skip(15)} className="text-k-sub hover:text-k-ink transition-colors"><FastForward size={18} /></button>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={changeSpeed}
                className="h-7 px-2.5 rounded-lg bg-k-bg2 text-[10px] font-black text-k-ink hover:bg-k-line transition-colors"
              >
                {speed}×
              </button>
              <button 
                onClick={toggleLoop}
                className={cn(
                  "h-7 px-2.5 rounded-lg flex items-center gap-1 text-[10px] font-black transition-all",
                  getAbLoopClassName() === 'active' ? "bg-k-crimson text-k-bg" : "bg-k-bg2 text-k-ink hover:bg-k-line"
                )}
              >
                <Repeat size={10} />
                {getAbLoopLabel()}
              </button>
              <button onClick={() => setShowPlaylist(!showPlaylist)} className="p-2 text-k-sub hover:text-k-ink transition-colors">
                <ListMusic size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Transcript Area (Flexible & Dedicated Scroll) */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-6 py-3 border-b border-k-line/10 z-10 bg-k-bg/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="font-k-serif text-[16px] font-medium text-k-crimson">文</span>
            <h3 className="text-[13px] font-extrabold text-k-ink">交互字幕</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onRegenerate} className="p-1.5 text-k-sub hover:text-k-ink transition-colors">
              <RefreshCw size={14} />
            </button>
            <button 
              onClick={() => setShowTranslation(!showTranslation)}
              className={cn(
                "text-[10px] font-black px-2 py-1 rounded-md border transition-all",
                showTranslation ? "bg-k-crimson text-k-bg border-k-crimson" : "text-k-sub border-k-line hover:text-k-ink"
              )}
            >
              {showTranslation ? '雙語' : '原文'}
            </button>
          </div>
        </div>

        <div 
          ref={scrollRef} 
          className="flex-1 overflow-y-auto p-6 pt-2 space-y-3 scroll-smooth scrollbar-thin scrollbar-thumb-k-line"
        >
          {showTranscriptLoader ? (
            <div className="flex flex-col items-center justify-center py-20 text-k-sub">
              <RefreshCw size={24} className="animate-spin mb-3 opacity-20" />
              <p className="text-[12px] font-bold italic">AI 正在生成智能字幕...</p>
            </div>
          ) : transcriptError ? (
            <div className="text-center py-20 text-k-crimson/60 font-bold">{transcriptError}</div>
          ) : transcript.length === 0 ? (
            <div className="text-center py-20 text-k-sub font-bold italic opacity-40">暫無字幕內容</div>
          ) : (
            transcript.map((line, i) => {
              const isCur = i === activeLineIndex;
              return (
                <div
                  key={i}
                  id={`line-${i}`}
                  onClick={() => seekTo(line.start)}
                  className={cn(
                    "group cursor-pointer rounded-xl p-4 border-l-3 transition-all duration-300",
                    isCur 
                      ? "bg-k-butter/25 border-k-crimson shadow-sm translate-x-1" 
                      : "bg-transparent border-transparent hover:bg-k-bg2/40"
                  )}
                >
                  <div className={cn(
                    "font-k-serif leading-relaxed transition-all",
                    isCur ? "text-[18px] font-medium text-k-ink" : "text-[16px] font-medium text-k-ink/50"
                  )}>
                    {line.text}
                  </div>
                  {line.translation && showTranslation && (
                    <div className={cn(
                      "mt-2 text-[12px] font-bold transition-all",
                      isCur ? "text-k-sub opacity-100" : "text-k-sub opacity-0 group-hover:opacity-40"
                    )}>
                      {line.translation}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {/* Bottom spacer for transcript */}
          <div className="h-20" />
        </div>
      </div>
    </div>
  );
};
