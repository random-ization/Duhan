import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAudioPlayer } from '../../contexts/AudioPlayerContext';
import { Play, Pause, ChevronDown, SkipBack, SkipForward, X } from 'lucide-react';
import { Slider } from '../ui';
import { Sheet, SheetContent, SheetPortal } from '../ui';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT } from './ksoft/ksoft';

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
  const normalizedEpisodeUrl =
    normalizePublicAssetUrl(activeEpisode?.audioUrl) || activeEpisode?.audioUrl || '';

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

  const progressPct = duration > 0 ? ((progress || 0) / duration) * 100 : 0;

  const iconBtnStyle = (variant: 'light' | 'dark' = 'light'): React.CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: variant === 'dark' ? 'rgba(255,255,255,0.1)' : KT.bg2,
    border: variant === 'dark' ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${KT.line}`,
    color: variant === 'dark' ? 'rgba(255,255,255,0.75)' : KT.sub,
    display: 'grid',
    placeItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
  });

  return (
    <>
      {/* Minimized bar */}
      {isMinimized && (
        <div
          style={{
            position: 'fixed',
            bottom: 'calc(env(safe-area-inset-bottom) + 72px)',
            left: 14,
            right: 14,
            zIndex: 50,
          }}
        >
          <div
            style={{
              background: `${KT.card}ee`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 22,
              padding: '8px 12px 8px 8px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: KT.shLg,
              border: `1px solid ${KT.line}`,
              cursor: 'pointer',
            }}
            onClick={() => setMinimized(false)}
            role="button"
            tabIndex={0}
            onKeyDown={e => {
              if (e.key === 'Enter') setMinimized(false);
            }}
          >
            <img
              src={artworkSrc}
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                objectFit: 'cover',
                flexShrink: 0,
                boxShadow: KT.shSm,
              }}
              alt={t('mobilePlayer.artAlt', { defaultValue: 'Art' })}
              loading="lazy"
            />
            <div
              style={{
                flex: 1,
                minWidth: 0,
                margin: '0 12px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <h4
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: KT.ink,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontFamily: KT.font,
                }}
              >
                {activeEpisode.title}
              </h4>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: KT.sub,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  marginTop: 2,
                  fontFamily: KT.font,
                }}
              >
                {activeEpisode.channelTitle}
              </p>
            </div>
            <button
              type="button"
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: KT.ink,
                border: 'none',
                color: KT.bg,
                display: 'grid',
                placeItems: 'center',
                cursor: 'pointer',
                flexShrink: 0,
              }}
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
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" style={{ marginLeft: 2 }} />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Full player sheet */}
      <Sheet open={!isMinimized} onOpenChange={open => setMinimized(!open)}>
        <SheetPortal>
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 100,
              background: KT.ink,
              display: 'flex',
              flexDirection: 'column',
              transition: 'transform 0.3s cubic-bezier(0.32, 0, 0.67, 0)',
              fontFamily: KT.font,
            }}
            className="data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%] data-[state=closed]:pointer-events-none"
          >
            {/* Top bar */}
            <div
              style={{
                padding: '14px 22px 0',
                paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <button
                type="button"
                onClick={() => setMinimized(true)}
                style={iconBtnStyle('dark')}
                aria-label={t('mobilePlayer.minimize', { defaultValue: 'Minimize' })}
              >
                <ChevronDown size={22} />
              </button>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: 'rgba(255,255,255,0.5)',
                }}
              >
                {t('podcast.nowPlaying', { defaultValue: 'Now Playing' })}
              </span>
              <button
                type="button"
                onClick={() => closePlayer()}
                style={iconBtnStyle('dark')}
                aria-label={t('common.close', { defaultValue: 'Close' })}
              >
                <X size={18} />
              </button>
            </div>

            {/* Main content */}
            <div
              style={{
                flex: 1,
                padding: '32px 28px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                overflowY: 'auto',
                paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)',
              }}
            >
              {/* Artwork */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1/1',
                  borderRadius: 28,
                  overflow: 'hidden',
                  background: 'rgba(255,255,255,0.08)',
                  boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
                  marginBottom: 40,
                  flexShrink: 0,
                }}
              >
                <img
                  src={artworkSrc}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  alt={t('mobilePlayer.artworkAlt', { defaultValue: 'Artwork' })}
                />
              </div>

              {/* Track info */}
              <div style={{ marginBottom: 28 }}>
                <h2
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: '#fff',
                    lineHeight: 1.2,
                    letterSpacing: -0.5,
                    marginBottom: 6,
                  }}
                >
                  {activeEpisode.title}
                </h2>
                <p style={{ fontSize: 15, color: KT.crimson, fontWeight: 700 }}>
                  {activeEpisode.channelTitle}
                </p>
              </div>

              {/* Progress */}
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    position: 'relative',
                    height: 20,
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      height: 3,
                      borderRadius: 2,
                      background: 'rgba(255,255,255,0.15)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      width: `${progressPct}%`,
                      height: 3,
                      borderRadius: 2,
                      background: KT.crimson,
                    }}
                  />
                  <Slider
                    value={progress || 0}
                    max={duration || 1}
                    step={1}
                    onChange={e => handleSeek(Number(e.target.value))}
                    style={{
                      position: 'absolute',
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                    }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 11,
                    fontWeight: 700,
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  <span>{formatClock(progress || 0)}</span>
                  <span>{duration > 0 ? formatClock(duration) : '--:--'}</span>
                </div>
              </div>

              {/* Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  style={iconBtnStyle('dark')}
                  onClick={() => skip(-15)}
                  aria-label={t('mobilePlayer.skipBack15', {
                    defaultValue: 'Skip back 15 seconds',
                  })}
                >
                  <SkipBack size={22} fill="currentColor" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 24,
                    background: KT.crimson,
                    border: 'none',
                    color: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    boxShadow: `0 12px 32px rgba(162,59,46,0.5)`,
                  }}
                  aria-label={
                    isPlaying
                      ? t('common.pause', { defaultValue: 'Pause' })
                      : t('common.play', { defaultValue: 'Play' })
                  }
                >
                  {isPlaying ? (
                    <Pause size={30} fill="currentColor" />
                  ) : (
                    <Play size={30} fill="currentColor" style={{ marginLeft: 3 }} />
                  )}
                </button>

                <button
                  type="button"
                  style={iconBtnStyle('dark')}
                  onClick={() => skip(15)}
                  aria-label={t('mobilePlayer.skipForward15', {
                    defaultValue: 'Skip forward 15 seconds',
                  })}
                >
                  <SkipForward size={22} fill="currentColor" />
                </button>
              </div>
            </div>
          </SheetContent>
        </SheetPortal>
      </Sheet>

      {/* Persistent audio element */}
      <audio
        ref={audioRef}
        src={normalizedEpisodeUrl}
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
