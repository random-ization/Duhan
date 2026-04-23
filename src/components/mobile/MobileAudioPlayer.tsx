import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Slider } from '../ui';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT } from './ksoft/ksoft';

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
  const { t } = useTranslation();
  const normalizedAudioUrl = normalizePublicAssetUrl(audioUrl) || audioUrl;
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

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: KT.card,
        borderTop: `1px solid ${KT.line}`,
        zIndex: 50,
        padding: '14px 22px',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 14px)',
        boxShadow: '0 -8px 32px rgba(31,27,23,0.08)',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        fontFamily: KT.font,
      }}
    >
      <audio ref={audioRef} src={normalizedAudioUrl} preload="metadata" />

      {/* Progress times */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          fontWeight: 700,
          color: KT.sub,
          marginBottom: 8,
          padding: '0 2px',
        }}
      >
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Progress bar (visual) + Slider */}
      <div
        style={{
          position: 'relative',
          height: 24,
          display: 'flex',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        {/* Background track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: 4,
            borderRadius: 2,
            background: KT.line2,
          }}
        />
        {/* Filled track */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            width: `${progress}%`,
            height: 4,
            borderRadius: 2,
            background: KT.crimson,
            transition: isDragging ? 'none' : 'width 0.1s',
          }}
        />
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
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            opacity: 0,
            cursor: 'pointer',
          }}
        />
      </div>

      {/* Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
        }}
      >
        <button
          type="button"
          onClick={() => skip(-10)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: KT.bg2,
            border: `1px solid ${KT.line}`,
            color: KT.sub,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={19} />
          <span
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}
          >
            {t('mobileAudioPlayer.rewind10', { defaultValue: 'Rewind 10s' })}
          </span>
        </button>

        <button
          type="button"
          onClick={togglePlay}
          style={{
            width: 62,
            height: 62,
            borderRadius: 20,
            background: KT.ink,
            border: 'none',
            color: KT.bg,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            boxShadow: KT.sh,
          }}
        >
          {isPlaying ? (
            <Pause size={26} fill="currentColor" />
          ) : (
            <Play size={26} fill="currentColor" style={{ marginLeft: 2 }} />
          )}
        </button>

        <button
          type="button"
          onClick={() => skip(10)}
          style={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            background: KT.bg2,
            border: `1px solid ${KT.line}`,
            color: KT.sub,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={19} style={{ transform: 'scaleX(-1)' }} />
          <span
            style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 }}
          >
            {t('mobileAudioPlayer.forward10', { defaultValue: 'Forward 10s' })}
          </span>
        </button>
      </div>
    </div>
  );
}
