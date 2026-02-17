import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { Button } from '../ui';
import { Slider } from '../ui';
import { Tooltip, TooltipContent, TooltipPortal, TooltipTrigger } from '../ui';

interface StickyAudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (currentTime: number) => void;
  initialTime?: number;
}

export const StickyAudioPlayer: React.FC<StickyAudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  initialTime = 0,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (initialTime > 0 && initialTime < audio.duration) {
        audio.currentTime = initialTime;
      }
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, initialTime, isDragging]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number.parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSeekStart = () => {
    setIsDragging(true);
  };

  const handleSeekEnd = () => {
    setIsDragging(false);
    if (audioRef.current) {
      audioRef.current.currentTime = currentTime;
      onTimeUpdate?.(currentTime);
    }
  };

  const seekTo = (time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
      onTimeUpdate?.(time);
    }
  };

  const restart = () => {
    seekTo(0);
    if (!isPlaying && audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const changePlaybackRate = () => {
    const currentIndex = playbackRates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % playbackRates.length;
    const newRate = playbackRates[nextIndex];
    setPlaybackRate(newRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = newRate;
    }
  };

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t-2 border-foreground shadow-[0px_-4px_10px_rgba(0,0,0,0.1)] z-50">
      <audio ref={audioRef} src={audioUrl} preload="metadata">
        <track kind="captions" src="" label="English" />
      </audio>

      {/* Progress Bar */}
      <div className="h-1 bg-muted relative cursor-pointer group">
        <div
          className="absolute h-full bg-lime-400 transition-all"
          style={{ width: `${progressPercent}%` }}
        />
        <Slider
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={handleSeekStart}
          onMouseUp={handleSeekEnd}
          onTouchStart={handleSeekStart}
          onTouchEnd={handleSeekEnd}
          className="absolute w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <div className="px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Play Controls */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={restart}
                aria-label="重新播放"
                className="w-10 h-10 rounded-full bg-muted hover:bg-muted flex items-center justify-center transition-colors"
              >
                <RotateCcw size={18} className="text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top">重新播放</TooltipContent>
            </TooltipPortal>
          </Tooltip>

          <Button
            type="button"
            variant="ghost"
            size="auto"
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-primary hover:bg-muted flex items-center justify-center transition-colors shadow-[3px_3px_0px_0px_#4ADE80]"
          >
            {isPlaying ? (
              <Pause size={24} className="text-white" fill="white" />
            ) : (
              <Play size={24} className="text-white ml-1" fill="white" />
            )}
          </Button>
        </div>

        {/* Center: Time Display */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <span className="font-mono text-sm font-bold text-muted-foreground">
            {formatTime(currentTime)}
          </span>
          <span className="text-muted-foreground">/</span>
          <span className="font-mono text-sm font-bold text-foreground">
            {formatTime(duration)}
          </span>
        </div>

        {/* Right: Rate & Volume */}
        <div className="flex items-center gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={changePlaybackRate}
                aria-label="切换播放速度"
                className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted text-sm font-black text-muted-foreground transition-colors min-w-[50px]"
              >
                {playbackRate}x
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top">切换播放速度</TooltipContent>
            </TooltipPortal>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="auto"
                onClick={toggleMute}
                aria-label={isMuted ? '取消静音' : '静音'}
                className="w-10 h-10 rounded-full bg-muted hover:bg-muted flex items-center justify-center transition-colors"
              >
                {isMuted ? (
                  <VolumeX size={18} className="text-muted-foreground" />
                ) : (
                  <Volume2 size={18} className="text-muted-foreground" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipPortal>
              <TooltipContent side="top">{isMuted ? '取消静音' : '静音'}</TooltipContent>
            </TooltipPortal>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

export default StickyAudioPlayer;
