import React, { useCallback, useMemo, useState } from 'react';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { Play, Pause, ChevronDown, ListMusic, SkipBack, SkipForward, X } from 'lucide-react';
import { Button } from '../ui';
import { Slider } from '../ui';
import { Sheet, SheetContent, SheetPortal } from '../ui';

function formatClock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const MobileGlobalPlayer: React.FC = () => {
  const {
    activeEpisode,
    isPlaying,
    togglePlay,
    isMinimized,
    setMinimized,
    audioRef,
    setProgress,
    progress,
    closePlayer,
  } = useAudioPlayer();

  const [duration, setDuration] = useState(0);

  const artworkSrc = useMemo(() => activeEpisode?.channelArtwork || '/logo.png', [activeEpisode]);

  const handleTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLAudioElement>) => {
      setProgress(e.currentTarget.currentTime);
    },
    [setProgress]
  );

  const handleLoadStart = useCallback(() => {
    setDuration(0);
    setProgress(0);
  }, [setProgress]);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration || 0);
  }, []);

  const handleDurationChange = useCallback((e: React.SyntheticEvent<HTMLAudioElement>) => {
    setDuration(e.currentTarget.duration || 0);
  }, []);

  const handleSeek = useCallback(
    (val: number) => {
      if (audioRef.current) {
        audioRef.current.currentTime = val;
      }
      setProgress(val);
    },
    [audioRef, setProgress]
  );

  const skip = useCallback(
    (deltaSeconds: number) => {
      if (!audioRef.current) return;
      const next = Math.max(
        0,
        Math.min(duration || 0, audioRef.current.currentTime + deltaSeconds)
      );
      audioRef.current.currentTime = next;
      setProgress(next);
    },
    [audioRef, duration, setProgress]
  );

  if (!activeEpisode) return null;

  return (
    <>
      {isMinimized && (
        <div className="fixed bottom-20 left-4 right-4 z-50">
          <div
            className="bg-primary/95 backdrop-blur-md rounded-2xl p-3 flex items-center shadow-2xl border border-white/10"
            onClick={() => setMinimized(false)}
            role="button"
            tabIndex={0}
          >
            <img
              src={artworkSrc}
              className="w-10 h-10 rounded-lg bg-muted object-cover shrink-0"
              alt="Art"
              loading="lazy"
            />
            <div className="flex-1 min-w-0 mx-3">
              <h4 className="text-white font-bold text-sm truncate">{activeEpisode.title}</h4>
              <p className="text-muted-foreground text-xs truncate">{activeEpisode.channelTitle}</p>
            </div>
            <div className="flex items-center gap-3 pr-1">
              <Button
                variant="ghost"
                size="auto"
                type="button"
                className="text-white p-1"
                onClick={e => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" />
                ) : (
                  <Play className="w-6 h-6 fill-current" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet open={!isMinimized} onOpenChange={open => setMinimized(!open)}>
        <SheetPortal>
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed inset-0 z-[100] bg-card flex flex-col transition-transform duration-300 data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%] data-[state=closed]:pointer-events-none"
          >
            <div className="px-6 py-4 flex items-center justify-between mt-8 sticky top-0">
              <Button
                variant="ghost"
                size="auto"
                type="button"
                onClick={() => setMinimized(true)}
                className="p-2 -ml-2 text-muted-foreground"
                aria-label="Minimize"
              >
                <ChevronDown className="w-8 h-8" />
              </Button>
              <span className="font-bold text-muted-foreground text-xs tracking-widest uppercase">
                Now Playing
              </span>
              <Button
                variant="ghost"
                size="auto"
                type="button"
                onClick={() => closePlayer()}
                className="p-2 -mr-2 text-muted-foreground"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 px-8 flex flex-col justify-center pb-12 overflow-y-auto">
              <div className="w-full aspect-square rounded-[2rem] bg-muted shadow-2xl mb-12 relative overflow-hidden">
                <img src={artworkSrc} className="w-full h-full object-cover" alt="Artwork" />
              </div>

              <div className="mb-8">
                <h2 className="text-2xl font-black text-foreground leading-tight mb-2">
                  {activeEpisode.title}
                </h2>
                <p className="text-lg text-indigo-500 font-bold">{activeEpisode.channelTitle}</p>
              </div>

              <div className="mb-4">
                <Slider
                  value={progress || 0}
                  max={duration || 1}
                  step={1}
                  onChange={e => handleSeek(Number(e.target.value))}
                  className="cursor-pointer"
                />
                <div className="flex justify-between text-xs font-bold text-muted-foreground mt-2">
                  <span>{formatClock(progress || 0)}</span>
                  <span>{duration > 0 ? formatClock(duration) : '--:--'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between mb-12">
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  className="text-muted-foreground p-2 hover:text-muted-foreground"
                >
                  <ListMusic className="w-6 h-6" />
                </Button>

                <div className="flex items-center gap-6">
                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    className="text-foreground p-2 active:scale-90 transition-transform"
                    onClick={() => skip(-15)}
                    aria-label="Skip back 15 seconds"
                  >
                    <SkipBack className="w-8 h-8 fill-slate-900" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                    onClick={togglePlay}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? (
                      <Pause className="w-8 h-8 fill-current" />
                    ) : (
                      <Play className="w-8 h-8 fill-current ml-1" />
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    className="text-foreground p-2 active:scale-90 transition-transform"
                    onClick={() => skip(15)}
                    aria-label="Skip forward 15 seconds"
                  >
                    <SkipForward className="w-8 h-8 fill-slate-900" />
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  className="text-muted-foreground p-2 hover:text-muted-foreground"
                >
                  <span className="text-xl font-bold tracking-widest">•••</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>

      {/* Persist the audio element across minimized/full UI */}
      <audio
        ref={audioRef}
        src={activeEpisode.audioUrl}
        onLoadStart={handleLoadStart}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleDurationChange}
        onTimeUpdate={handleTimeUpdate}
        autoPlay
      />
    </>
  );
};

export default MobileGlobalPlayer;
