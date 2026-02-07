import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Slider } from '../ui/slider';

interface MobileAudioPlayerProps {
  readonly audioUrl: string;
  readonly onTimeUpdate?: (currentTime: number) => void;
  readonly initialTime?: number;
  readonly onPlaybackComplete?: () => void;
}

export function MobileAudioPlayer({
  audioUrl,
  onTimeUpdate,
  initialTime = 0,
  onPlaybackComplete,
}: MobileAudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      if (initialTime > 0 && initialTime < audio.duration) {
        audio.currentTime = initialTime;
      }
      setCurrentTime(audio.currentTime);
      onTimeUpdate?.(audio.currentTime);
    };

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      }
    };

    const handleSeeked = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime);
        onTimeUpdate?.(audio.currentTime);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onPlaybackComplete?.();
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [onTimeUpdate, initialTime, isDragging, onPlaybackComplete]);

  // Sync external initialTime changes (e.g. clicking a timestamp)
  useEffect(() => {
    if (audioRef.current && Math.abs(audioRef.current.currentTime - initialTime) > 0.5) {
      audioRef.current.currentTime = initialTime;
    }
  }, [initialTime]);

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

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.min(
        Math.max(audioRef.current.currentTime + seconds, 0),
        duration
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-4 px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.05)] rounded-t-[2rem]">
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Progress Info */}
      <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 px-1">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Slider */}
      <div className="mb-6 relative h-6 flex items-center">
        <Slider
          type="range"
          min={0}
          max={duration || 100}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          className="w-full h-full cursor-pointer accent-indigo-500"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4">
        <button
          type="button"
          onClick={() => skip(-10)}
          className="w-12 h-12 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center active:bg-slate-100 active:scale-95 transition-all"
        >
          <RotateCcw size={20} />
          <span className="sr-only">Rewind 10s</span>
        </button>

        <button
          type="button"
          onClick={togglePlay}
          className="w-16 h-16 rounded-[24px] bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-slate-900/20 active:scale-95 transition-transform"
        >
          {isPlaying ? (
            <Pause size={28} fill="currentColor" />
          ) : (
            <Play size={28} fill="currentColor" className="ml-1" />
          )}
        </button>

        <button
          type="button"
          onClick={() => skip(10)}
          className="w-12 h-12 rounded-full bg-slate-50 text-slate-500 flex items-center justify-center active:bg-slate-100 active:scale-95 transition-all"
        >
          {/* Rotate icon flipped or just Forward icon */}
          <RotateCcw size={20} className="-scale-x-100" />
          <span className="sr-only">Forward 10s</span>
        </button>
      </div>
    </div>
  );
}
