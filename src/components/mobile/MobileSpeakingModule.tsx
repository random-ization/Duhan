import { useRef, useState, useEffect } from 'react';
import { Mic, Square, Play, RotateCcw, Volume2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';
import { normalizePublicAssetUrl } from '../../utils/imageSrc';
import { KT } from './ksoft/ksoft';

interface MobileSpeakingModuleProps {
  readonly unitTitle: string;
  readonly targetSentence: string;
  readonly referenceAudioUrl?: string;
  readonly translation?: string;
  readonly onBack: () => void;
  readonly onComplete?: () => void;
}

export function MobileSpeakingModule({
  unitTitle,
  targetSentence,
  referenceAudioUrl,
  translation,
  onBack,
  onComplete: _onComplete,
}: MobileSpeakingModuleProps) {
  const { t } = useTranslation();
  const {
    isRecording,
    recordingTime,
    audioUrl,
    startRecording,
    stopRecording,
    resetRecording,
    error,
  } = useAudioRecorder();

  const [isPlayingReference, setIsPlayingReference] = useState(false);
  const [isPlayingUser, setIsPlayingUser] = useState(false);
  const normalizedReferenceAudioUrl =
    normalizePublicAssetUrl(referenceAudioUrl) || referenceAudioUrl;
  const normalizedUserAudioUrl = normalizePublicAssetUrl(audioUrl) || audioUrl;

  const referenceAudioRef = useRef<HTMLAudioElement>(null);
  const userAudioRef = useRef<HTMLAudioElement>(null);

  const toggleReferencePlay = () => {
    if (referenceAudioRef.current) {
      if (isPlayingReference) {
        referenceAudioRef.current.pause();
      } else {
        referenceAudioRef.current.play();
      }
      setIsPlayingReference(!isPlayingReference);
    }
  };

  const toggleUserPlay = () => {
    if (userAudioRef.current) {
      if (isPlayingUser) {
        userAudioRef.current.pause();
      } else {
        userAudioRef.current.play();
      }
      setIsPlayingUser(!isPlayingUser);
    }
  };

  useEffect(() => {
    const refAudio = referenceAudioRef.current;
    const userAudio = userAudioRef.current;

    const onRefEnd = () => setIsPlayingReference(false);
    const onUserEnd = () => setIsPlayingUser(false);

    if (refAudio) refAudio.addEventListener('ended', onRefEnd);
    if (userAudio) userAudio.addEventListener('ended', onUserEnd);

    return () => {
      if (refAudio) refAudio.removeEventListener('ended', onRefEnd);
      if (userAudio) userAudio.removeEventListener('ended', onUserEnd);
    };
  }, [audioUrl, referenceAudioUrl]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: KT.bg2,
        fontFamily: KT.font,
      }}
    >
      <MobileWorkspaceHeader
        title={unitTitle}
        subtitle={t('mobileSpeakingModule.subtitle', {
          defaultValue: 'Listen, record, and compare your pronunciation.',
        })}
        eyebrow={t('mobileSpeakingModule.title', { defaultValue: '說 · SPEAKING' })}
        onBack={onBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
      />

      {/* Content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 22px',
          gap: 24,
        }}
      >
        {/* Sentence Card */}
        <div
          style={{
            width: '100%',
            background: KT.card,
            borderRadius: 28,
            padding: '28px 24px',
            boxShadow: KT.sh,
            border: `1px solid ${KT.line}`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 14,
            textAlign: 'center',
          }}
        >
          {/* Hanja watermark */}
          <div
            style={{
              fontFamily: KT.serif,
              fontSize: 13,
              color: KT.crimson,
              letterSpacing: 3,
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            說 · SPEAK
          </div>

          <h1
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: KT.ink,
              lineHeight: 1.5,
              letterSpacing: -0.3,
            }}
          >
            {targetSentence}
          </h1>

          {translation && (
            <p style={{ fontSize: 14, color: KT.sub, fontWeight: 500, lineHeight: 1.5 }}>
              {translation}
            </p>
          )}

          {/* Reference Audio */}
          {normalizedReferenceAudioUrl && (
            <button
              type="button"
              onClick={toggleReferencePlay}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 20,
                border: `1px solid rgba(162,59,46,0.2)`,
                background: 'rgba(162,59,46,0.07)',
                color: KT.crimson,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: KT.font,
              }}
            >
              {isPlayingReference ? (
                <Square size={13} fill="currentColor" />
              ) : (
                <Volume2 size={15} />
              )}
              <span>
                {t('mobileSpeakingModule.listenToReference', {
                  defaultValue: 'Listen to Reference',
                })}
              </span>
              <audio ref={referenceAudioRef} src={normalizedReferenceAudioUrl} />
            </button>
          )}
        </div>

        {/* Feedback / Waveform Area */}
        <div
          style={{
            height: 80,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {isRecording ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {[
                { h: 14, d: 0.55 },
                { h: 24, d: 0.7 },
                { h: 18, d: 0.6 },
                { h: 28, d: 0.75 },
                { h: 16, d: 0.65 },
              ].map((b, i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: b.h,
                    background: KT.crimson,
                    borderRadius: 3,
                    animation: `bounce ${b.d}s infinite alternate`,
                  }}
                />
              ))}
              <span
                style={{
                  marginLeft: 10,
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  color: KT.crimson,
                  fontSize: 15,
                }}
              >
                {formatTime(recordingTime)}
              </span>
            </div>
          ) : normalizedUserAudioUrl ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button
                type="button"
                onClick={toggleUserPlay}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: KT.ink,
                  color: KT.bg,
                  display: 'grid',
                  placeItems: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: KT.sh,
                }}
              >
                {isPlayingUser ? (
                  <Square size={18} fill="currentColor" />
                ) : (
                  <Play size={22} fill="currentColor" style={{ marginLeft: 2 }} />
                )}
                <audio ref={userAudioRef} src={normalizedUserAudioUrl} />
              </button>
              <button
                type="button"
                onClick={resetRecording}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: KT.bg2,
                  border: `1px solid ${KT.line}`,
                  color: KT.sub,
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                }}
              >
                <RotateCcw size={16} />
              </button>
            </div>
          ) : (
            <p style={{ color: KT.sub, fontSize: 14, fontWeight: 500 }}>
              {t('mobileSpeakingModule.tapMicToRecord', { defaultValue: 'Tap mic to record' })}
            </p>
          )}
        </div>
      </div>

      {/* Footer / Record Button */}
      <div
        style={{
          background: KT.card,
          borderTop: `1px solid ${KT.line}`,
          padding: '24px 22px',
          paddingBottom: 'calc(var(--mobile-safe-bottom, env(safe-area-inset-bottom)) + 24px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          boxShadow: '0 -8px 32px rgba(31,27,23,0.06)',
        }}
      >
        {error && (
          <p style={{ color: KT.crimson, fontSize: 13, marginBottom: 14, fontWeight: 500 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={!!audioUrl}
          style={{
            width: 88,
            height: 88,
            borderRadius: 26,
            display: 'grid',
            placeItems: 'center',
            border: 'none',
            cursor: audioUrl ? 'not-allowed' : 'pointer',
            transition: 'all 0.3s',
            background: isRecording ? KT.crimson : audioUrl ? KT.bg2 : KT.ink,
            color: audioUrl ? KT.subLight : KT.bg,
            opacity: audioUrl ? 0.6 : 1,
            boxShadow: isRecording ? `0 8px 24px rgba(162,59,46,0.35)` : audioUrl ? 'none' : KT.sh,
          }}
        >
          {isRecording ? <Square size={30} fill="currentColor" /> : <Mic size={34} />}
        </button>
        <p
          style={{
            marginTop: 12,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: KT.sub,
          }}
        >
          {isRecording
            ? t('mobileSpeakingModule.tapToStop', { defaultValue: 'Tap to Stop' })
            : audioUrl
              ? t('mobileSpeakingModule.recorded', { defaultValue: 'Recorded' })
              : t('mobileSpeakingModule.tapToRecord', { defaultValue: 'Tap to Record' })}
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          from { transform: scaleY(0.6); }
          to { transform: scaleY(1); }
        }
      `}</style>
    </div>
  );
}
