import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface UsePodcastPlayerOptions {
  onEnded?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  initialVolume?: number;
  initialSpeed?: number;
}

export interface ABLoop {
  a: number | null;
  b: number | null;
  active: boolean;
}

export interface UsePodcastPlayerReturn {
  // Refs
  audioRef: React.RefObject<HTMLAudioElement | null>;

  // State
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  speed: number;
  volume: number;
  abLoop: ABLoop;

  // Actions
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  seekTo: (time: number) => void;
  skip: (seconds: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  toggleLoop: () => void;
  resetLoop: () => void;

  // Helpers
  formatTime: (seconds: number) => string;
}

/**
 * Custom hook for podcast audio playback control
 * Extracts common audio player logic from PodcastPlayerPage
 */
export function usePodcastPlayer(options: UsePodcastPlayerOptions = {}): UsePodcastPlayerReturn {
  const { onEnded, onTimeUpdate, initialVolume = 1, initialSpeed = 1 } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timeRafRef = useRef<number | null>(null);
  const pendingTimeRef = useRef(0);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [speed, setSpeed] = useState(initialSpeed);
  const [volume, setVolume] = useState(initialVolume);

  // A-B Loop state
  const [abLoop, setAbLoop] = useState<ABLoop>({
    a: null,
    b: null,
    active: false,
  });

  // Format time helper
  const formatTime = useCallback((seconds: number): string => {
    if (!seconds || Number.isNaN(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Play/Pause actions
  const play = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, []);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  // Seek actions
  const seekTo = useCallback(
    (time: number) => {
      if (audioRef.current) {
        const clampedTime = Math.max(0, Math.min(time, duration));
        audioRef.current.currentTime = clampedTime;
        setCurrentTime(clampedTime);
      }
    },
    [duration]
  );

  const skip = useCallback(
    (seconds: number) => {
      seekTo(currentTime + seconds);
    },
    [currentTime, seekTo]
  );

  // Speed control
  const updateSpeed = useCallback((newSpeed: number) => {
    setSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  }, []);

  // Volume control
  const updateVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolume(clampedVolume);
    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }
  }, []);

  // A-B Loop control
  const toggleLoop = useCallback(() => {
    if (abLoop.a === null) {
      // Set point A
      setAbLoop({ a: currentTime, b: null, active: false });
    } else if (abLoop.b === null) {
      // Set point B and activate
      setAbLoop({ ...abLoop, b: currentTime, active: true });
    } else {
      // Reset
      setAbLoop({ a: null, b: null, active: false });
    }
  }, [abLoop, currentTime]);

  const resetLoop = useCallback(() => {
    setAbLoop({ a: null, b: null, active: false });
  }, []);

  // Handle time update including A-B loop
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;

    const curr = audioRef.current.currentTime;

    // A-B Loop logic
    if (abLoop.active && abLoop.b !== null && curr >= abLoop.b) {
      audioRef.current.currentTime = abLoop.a || 0;
      return;
    }

    pendingTimeRef.current = curr;
    if (timeRafRef.current !== null) return;
    timeRafRef.current = requestAnimationFrame(() => {
      timeRafRef.current = null;
      const nextTime = pendingTimeRef.current;
      setCurrentTime(nextTime);
      onTimeUpdate?.(nextTime);
    });
  }, [abLoop, onTimeUpdate]);

  // Set up audio event listeners
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      if (timeRafRef.current !== null) {
        cancelAnimationFrame(timeRafRef.current);
        timeRafRef.current = null;
      }
    };
  }, [handleTimeUpdate, onEnded]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    speed,
    volume,
    abLoop,
    play,
    pause,
    togglePlay,
    seekTo,
    skip,
    setSpeed: updateSpeed,
    setVolume: updateVolume,
    toggleLoop,
    resetLoop,
    formatTime,
  };
}

export default usePodcastPlayer;
