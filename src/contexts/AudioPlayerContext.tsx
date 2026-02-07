import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

export interface Episode {
  guid: string;
  title: string;
  audioUrl: string;
  channelTitle: string;
  channelArtwork?: string;
  duration?: number;
  pubDate?: number;
}

interface AudioPlayerContextType {
  activeEpisode: Episode | null;
  isPlaying: boolean;
  isMinimized: boolean;
  progress: number;
  playEpisode: (episode: Episode) => void;
  togglePlay: () => void;
  setMinimized: (minimized: boolean) => void;
  setProgress: (progress: number) => void;
  closePlayer: () => void;
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | null>(null);

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error('useAudioPlayer must be used within an AudioPlayerProvider');
  }
  return context;
};

export const AudioPlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeEpisode, setActiveEpisode] = useState<Episode | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playEpisode = useCallback((episode: Episode) => {
    setActiveEpisode(episode);
    setIsMinimized(false); // Open full player initially
    setIsPlaying(true);
    setProgress(0);
    // Audio element handling will be done by the Player component consuming this context
  }, []);

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const closePlayer = useCallback(() => {
    setActiveEpisode(null);
    setIsPlaying(false);
  }, []);

  // Sync isPlaying state with audio element
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error('Play failed', e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying, activeEpisode]); // activeEpisode change should trigger re-eval

  const value = {
    activeEpisode,
    isPlaying,
    isMinimized,
    progress,
    playEpisode,
    togglePlay,
    setMinimized: setIsMinimized,
    setProgress,
    closePlayer,
    audioRef,
  };

  return <AudioPlayerContext.Provider value={value}>{children}</AudioPlayerContext.Provider>;
};
