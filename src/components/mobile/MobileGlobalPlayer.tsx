import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+110px)] left-4 right-4 z-50 pointer-events-none">
          <div
            className="pointer-events-auto bg-card/80 dark:bg-card/60 backdrop-blur-2xl rounded-[1.5rem] p-2 pr-3 flex items-center shadow-[0_-8px_30px_-15px_rgba(0,0,0,0.3)] border border-border/50"
            onClick={() => setMinimized(false)}
            role="button"
            tabIndex={0}
          >
            <img
              src={artworkSrc}
              className="w-12 h-12 rounded-[14px] bg-muted object-cover shrink-0 shadow-sm"
              alt={t('mobilePlayer.artAlt', { defaultValue: 'Art' })}
              loading="lazy"
            />
            <div className="flex-1 min-w-0 mx-3 flex flex-col justify-center">
              <h4 className="text-foreground font-bold text-[13px] tracking-tight truncate">
                {activeEpisode.title}
              </h4>
              <p className="text-muted-foreground text-[11px] font-semibold truncate mt-0.5">
                {activeEpisode.channelTitle}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                className="w-10 h-10 rounded-full text-foreground hover:bg-muted active:scale-90 transition-transform"
                onClick={e => {
                  e.stopPropagation();
                  togglePlay();
                }}
                aria-label={
                  isPlaying
                    ? t('common.pause', { defaultValue: 'Pause' })
                    : t('common.play', { defaultValue: 'Play' })
                }
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
                aria-label={t('mobilePlayer.minimize', { defaultValue: 'Minimize' })}
              >
                <ChevronDown className="w-8 h-8" />
              </Button>
              <span className="font-bold text-muted-foreground text-xs tracking-widest uppercase">
                {t('podcast.nowPlaying', { defaultValue: 'Now Playing' })}
              </span>
              <Button
                variant="ghost"
                size="auto"
                type="button"
                onClick={() => closePlayer()}
                className="p-2 -mr-2 text-muted-foreground"
                aria-label={t('common.close', { defaultValue: 'Close' })}
              >
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="flex-1 px-8 flex flex-col justify-center pb-12 overflow-y-auto">
              <div className="w-full aspect-square rounded-[2rem] bg-muted shadow-2xl mb-12 relative overflow-hidden">
                <img
                  src={artworkSrc}
                  className="w-full h-full object-cover"
                  alt={t('mobilePlayer.artworkAlt', { defaultValue: 'Artwork' })}
                />
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
                    aria-label={t('mobilePlayer.skipBack15', {
                      defaultValue: 'Skip back 15 seconds',
                    })}
                  >
                    <SkipBack className="w-8 h-8 fill-slate-900" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="auto"
                    type="button"
                    className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all"
                    onClick={togglePlay}
                    aria-label={
                      isPlaying
                        ? t('common.pause', { defaultValue: 'Pause' })
                        : t('common.play', { defaultValue: 'Play' })
                    }
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
                    aria-label={t('mobilePlayer.skipForward15', {
                      defaultValue: 'Skip forward 15 seconds',
                    })}
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
