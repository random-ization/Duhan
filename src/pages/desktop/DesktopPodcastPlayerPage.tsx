import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  X,
  Languages,
  RefreshCw,
  Heart,
  Share2,
  ListMusic,
  Volume2,
  Repeat,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { Button, Switch, Badge, Slider, Sheet, SheetPortal, SheetOverlay, SheetContent, Tooltip, TooltipTrigger, TooltipPortal, TooltipContent, AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../../components/ui';
import { AppBreadcrumb } from '../../components/common/AppBreadcrumb';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';

export interface DesktopPodcastPlayerPageProps {
  navigate: (path: string) => void;
  returnToPath: string;
  channel: any;
  episode: any;
  breadcrumbItems: any[];
  copy: any;
  showTranscriptResetConfirm: boolean;
  setShowTranscriptResetConfirm: (val: boolean) => void;
  isGeneratingTranscript: boolean;
  transcriptLoading: boolean;
  handleConfirmRegenerateTranscript: () => void;
  showPlaylist: boolean;
  setShowPlaylist: (val: boolean) => void;
  playlist: any[];
  playEpisode: (ep: any) => void;
  formatTime: (sec: number) => string;
  analyzingLine: any;
  showAnalysis: boolean;
  analysisLoading: boolean;
  analysisData: any;
  setShowAnalysis: (val: boolean) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  showTranscriptLoader: boolean;
  transcriptError: string | null;
  transcript: any[];
  activeLineIndex: number;
  currentTime: number;
  showTranslation: boolean;
  setShowTranslation: React.Dispatch<React.SetStateAction<boolean>>;
  translationLabel: string;
  translationStatusLabel: string | null;
  onRegenerate: () => void;
  onToggleSubscription: any;
  subscriptionPending: boolean;
  isSubscribed: boolean;
  onShare: () => void;
  progressPercent: number;
  effectiveDuration: number;
  seekTo: (time: number) => void;
  safeCurrentTime: number;
  remainingTime: number;
  speed: number;
  changeSpeed: () => void;
  toggleLoop: () => void;
  getAbLoopClassName: () => string;
  getAbLoopLabel: () => string;
  skip: (offset: number) => void;
  togglePlay: () => void;
  isPlaying: boolean;
  volume: number;
  setVolume: (val: number) => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  handleTimeUpdate: () => void;
  setDuration: React.Dispatch<React.SetStateAction<number>>;
  fallbackDuration: number;
  setIsLoading: (val: boolean) => void;
  setIsPlaying: (val: boolean) => void;
  viewerAccess: any;
  onRetry: () => void;
  onSeek: (time: number) => void;
  onAnalyze: (line: any) => void;
  TranscriptStreamBody: React.FC<any>;
  EpisodeUtilityControls: React.FC<any>;
  PlaylistSheetBody: React.FC<any>;
  PlayPauseIcon: React.FC<any>;
  AnalysisDialog: React.FC<any>;
}

export const DesktopPodcastPlayerPage: React.FC<DesktopPodcastPlayerPageProps> = ({
  navigate,
  returnToPath,
  channel,
  episode,
  breadcrumbItems,
  copy,
  showTranscriptResetConfirm,
  setShowTranscriptResetConfirm,
  isGeneratingTranscript,
  transcriptLoading,
  handleConfirmRegenerateTranscript,
  showPlaylist,
  setShowPlaylist,
  playlist,
  playEpisode,
  formatTime,
  analyzingLine,
  showAnalysis,
  analysisLoading,
  analysisData,
  setShowAnalysis,
  scrollRef,
  showTranscriptLoader,
  transcriptError,
  transcript,
  activeLineIndex,
  currentTime,
  showTranslation,
  setShowTranslation,
  translationLabel,
  translationStatusLabel,
  onRegenerate,
  onToggleSubscription,
  subscriptionPending,
  isSubscribed,
  onShare,
  progressPercent,
  effectiveDuration,
  seekTo,
  safeCurrentTime,
  remainingTime,
  speed,
  changeSpeed,
  toggleLoop,
  getAbLoopClassName,
  getAbLoopLabel,
  skip,
  togglePlay,
  isPlaying,
  volume,
  setVolume,
  audioRef,
  handleTimeUpdate,
  setDuration,
  fallbackDuration,
  setIsLoading,
  setIsPlaying,
  viewerAccess,
  onRetry,
  onSeek,
  onAnalyze,
  TranscriptStreamBody,
  EpisodeUtilityControls,
  PlaylistSheetBody,
  PlayPauseIcon,
  AnalysisDialog,
}) => {
  return (
    <div className="flex flex-col h-screen h-[100dvh] overflow-hidden font-sans bg-muted text-foreground">
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Column: Fixed Cover & Controls (Desktop) */}
        <aside className="hidden md:flex md:w-[360px] lg:w-[420px] flex-none flex-col border-r border-border bg-card p-6 lg:p-8 overflow-y-auto">
          <div className="flex items-center gap-3 mb-6">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate(returnToPath)}
              className="p-2 hover:bg-muted rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <AppBreadcrumb items={breadcrumbItems} className="text-xs" />
          </div>

          <div className="relative aspect-square w-full rounded-2xl overflow-hidden shadow-2xl border border-border group mb-6">
            <img
              src={normalizePublicAssetUrl(channel.coverUrl) || channel.coverUrl}
              alt={copy.coverAlt}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <span className="text-white text-xs font-medium px-2 py-1 bg-black/40 backdrop-blur-sm rounded-lg">
                {channel.title}
              </span>
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-indigo-600 dark:text-indigo-300 font-bold">
                {channel.title}
              </Badge>
            </div>
            <h1 className="text-xl lg:text-2xl font-black text-foreground tracking-tight leading-tight">
              {episode.title}
            </h1>
          </div>

          {/* Controls Container */}
          <EpisodeUtilityControls
            showTranslation={showTranslation}
            setShowTranslation={setShowTranslation}
            translationLabel={translationLabel}
            translationStatusLabel={translationStatusLabel}
            copy={copy}
            transcriptLoading={transcriptLoading}
            isGeneratingTranscript={isGeneratingTranscript}
            onRegenerate={onRegenerate}
            onToggleSubscription={onToggleSubscription}
            subscriptionPending={subscriptionPending}
            isSubscribed={isSubscribed}
            onShare={onShare}
          />
        </aside>

        {/* Right Column: Transcript Stream */}
        <main
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth pb-[calc(var(--mobile-safe-bottom)+5.75rem)] md:pb-12 relative bg-muted/50"
        >
          {/* Main Desktop Container */}
          <div className="max-w-3xl mx-auto px-6 lg:px-8 py-8">
            {/* Top Bar for Desktop */}
            <div className="hidden md:flex items-center justify-between mb-8 pb-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500 dark:text-indigo-300" />
                <span className="text-sm font-bold text-muted-foreground">
                  {copy.generatingSmartSubtitle}
                </span>
              </div>
            </div>

            <div className="space-y-4 md:space-y-6">
              <TranscriptStreamBody
                showTranscriptLoader={showTranscriptLoader}
                isGeneratingTranscript={isGeneratingTranscript}
                transcriptError={transcriptError}
                transcriptLoading={transcriptLoading}
                transcript={transcript}
                activeLineIndex={activeLineIndex}
                currentTime={currentTime}
                showTranslation={showTranslation}
                copy={copy}
                onRetry={onRetry}
                onSeek={onSeek}
                onAnalyze={onAnalyze}
                formatTime={formatTime}
              />
            </div>
          </div>

          {/* Player Bar (Aligned with Transcript Width) */}
          <div className="sticky bottom-mobile-safe z-30 pt-3 md:pt-6">
            <div className="bg-card border border-border rounded-xl md:rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.08)] px-3 md:px-6 py-2.5 md:py-3">
              {/* Progress Slider */}
              <div className="relative group mb-1 pt-1.5 md:pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute -top-3 left-0 right-0 h-4 cursor-pointer z-10 w-full p-0 font-normal bg-transparent hover:bg-transparent"
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pct = (e.clientX - rect.left) / rect.width;
                    if (effectiveDuration > 0) {
                      seekTo(pct * effectiveDuration);
                    }
                  }}
                >
                  <span className="sr-only">{copy.seek}</span>
                </Button>
                <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-indigo-600 dark:bg-indigo-500 rounded-full shadow border-2 border-card scale-0 group-hover:scale-100 transition-transform" />
                  </div>
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground font-medium mt-1 select-none">
                  <span>{formatTime(safeCurrentTime)}</span>
                  <span>-{formatTime(remainingTime)}</span>
                </div>
              </div>

              {/* Controls Row */}
              <div className="flex items-center justify-between">
                {/* Left: Speed & Loop */}
                <div className="flex items-center gap-1.5 md:gap-2 flex-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={changeSpeed}
                    className="text-[10px] font-bold text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-300 px-1.5 py-0.5 rounded hover:bg-muted transition-colors w-8 h-auto disabled:opacity-60 disabled:cursor-pointer"
                    title={
                      viewerAccess?.flags.mediaSpeedControl
                        ? undefined
                        : 'Upgrade to unlock playback speed control'
                    }
                  >
                    {speed}x
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={toggleLoop}
                    className={`flex items-center gap-1 px-1.5 md:px-2 py-1 rounded-full text-[10px] font-bold transition-all ${getAbLoopClassName()}`}
                  >
                    <Repeat className="w-3 h-3" />
                    <span className="hidden sm:inline">{getAbLoopLabel()}</span>
                  </Button>
                </div>

                {/* Center: Main Playback */}
                <div className="flex items-center gap-3 md:gap-4 flex-none">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => skip(-10)}
                    className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-muted-foreground transition-colors hover:scale-110"
                  >
                    <SkipBack className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                  </Button>

                  <Button
                    type="button"
                    variant="default"
                    size="icon"
                    onClick={togglePlay}
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full shadow-lg hover:bg-indigo-600 dark:hover:bg-indigo-500 hover:scale-105 transition-all active:scale-95 ring-2 ring-transparent hover:ring-indigo-100 dark:hover:ring-indigo-300/35"
                  >
                    <PlayPauseIcon isPlaying={isPlaying} />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => skip(10)}
                    className="h-8 w-8 md:h-10 md:w-10 text-muted-foreground hover:text-muted-foreground transition-colors hover:scale-110"
                  >
                    <SkipForward className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
                  </Button>
                </div>

                {/* Right: Tools / Volume */}
                <div className="flex items-center justify-end gap-2 md:gap-3 flex-1">
                  <div className="hidden md:flex items-center gap-2 group w-20">
                    <Volume2 className="w-3.5 h-3.5 text-muted-foreground" />
                    <Slider
                      min="0"
                      max="1"
                      step="0.1"
                      value={volume}
                      onChange={e => {
                        const v = Number.parseFloat(e.target.value);
                        setVolume(v);
                        if (audioRef.current) audioRef.current.volume = v;
                      }}
                    />
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowPlaylist(true)}
                        aria-label={copy.playlist}
                        className={`p-1.5 rounded-lg transition-colors ${showPlaylist ? 'text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/15' : 'text-muted-foreground hover:text-muted-foreground'}`}
                      >
                        <ListMusic className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipPortal>
                      <TooltipContent side="top">{copy.playlist}</TooltipContent>
                    </TooltipPortal>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={normalizePublicAssetUrl(episode.audioUrl) || episode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={e => {
          const mediaDuration = e.currentTarget.duration;
          if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
            setDuration(prev => (prev > 0 ? Math.max(prev, mediaDuration) : mediaDuration));
          }
        }}
        onLoadedMetadata={e => {
          const mediaDuration = e.currentTarget.duration;
          if (Number.isFinite(mediaDuration) && mediaDuration > 0) {
            setDuration(prev => (prev > 0 ? Math.max(prev, mediaDuration) : mediaDuration));
          } else if (fallbackDuration > 0) {
            setDuration(prev => (prev > 0 ? prev : fallbackDuration));
          }
          setIsLoading(false);
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      >
        <track kind="captions" />
      </audio>

      <AlertDialog open={showTranscriptResetConfirm} onOpenChange={setShowTranscriptResetConfirm}>
        <AlertDialogContent className="max-w-md border-2 border-foreground rounded-2xl shadow-pop">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-foreground">
              {copy.regenerateTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold text-muted-foreground leading-relaxed">
              {copy.regenerateDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel onClick={() => setShowTranscriptResetConfirm(false)}>
              {copy.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegenerateTranscript}
              loading={isGeneratingTranscript || transcriptLoading}
              loadingText={copy.processing}
            >
              {copy.confirmRegenerate}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Playlist Drawer */}
      <Sheet open={showPlaylist} onOpenChange={setShowPlaylist}>
        <SheetPortal>
          <SheetOverlay
            unstyled
            forceMount
            className="fixed inset-0 bg-black/20 backdrop-blur-[1px] z-[55] transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-card shadow-2xl z-[60] border-l border-border transform transition-transform duration-300 ease-in-out data-[state=open]:translate-x-0 data-[state=closed]:translate-x-full data-[state=closed]:pointer-events-none"
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
                <div className="flex items-center gap-2">
                  <ListMusic className="w-5 h-5 text-indigo-600 dark:text-indigo-300" />
                  <h3 className="font-bold text-muted-foreground">{copy.playlist}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                    {playlist.length}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPlaylist(false)}
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground hover:text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                <PlaylistSheetBody
                  playlist={playlist}
                  copy={copy}
                  episode={episode}
                  channel={channel}
                  onPlayEpisode={playEpisode}
                  formatTime={formatTime}
                />
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>

      <AnalysisDialog
        analyzingLine={analyzingLine}
        showAnalysis={showAnalysis}
        analysisLoading={analysisLoading}
        analysisData={analysisData}
        copy={copy}
        setShowAnalysis={setShowAnalysis}
      />
    </div>
  );
};
