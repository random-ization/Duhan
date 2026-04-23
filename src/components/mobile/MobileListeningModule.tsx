import { useRef, useState, useEffect, useMemo } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MobileAudioPlayer } from './MobileAudioPlayer';
import { KT } from './ksoft/ksoft';

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  translation?: string;
}

interface MobileListeningModuleProps {
  readonly unitTitle: string;
  readonly audioUrl: string;
  readonly transcriptData?: TranscriptSegment[];
  readonly onBack: () => void;
  readonly onWordClick?: (word: string) => void;
}

export function MobileListeningModule({
  unitTitle,
  audioUrl,
  transcriptData = [],
  onBack,
  onWordClick: _onWordClick,
}: MobileListeningModuleProps) {
  const { t } = useTranslation();
  const [currentTime, setCurrentTime] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeSegmentRef = useRef<HTMLDivElement>(null);

  const activeSegmentIndex = useMemo(() => {
    if (!transcriptData) return -1;
    return transcriptData.findIndex(seg => currentTime >= seg.start && currentTime <= seg.end);
  }, [currentTime, transcriptData]);

  useEffect(() => {
    if (activeSegmentIndex >= 0 && activeSegmentRef.current) {
      activeSegmentRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center',
      });
    }
  }, [activeSegmentIndex]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100dvh',
        background: KT.bg2,
        fontFamily: KT.font,
        color: KT.ink,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0 22px 14px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: KT.bg2,
          borderBottom: `1px solid ${KT.line}`,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: KT.card,
            color: KT.ink,
            fontSize: 16,
            cursor: 'pointer',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            boxShadow: KT.shSm,
          }}
        >
          ←
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: KT.sub, fontWeight: 700, letterSpacing: 1 }}>
            {t('mobileListeningModule.listening', { defaultValue: '聽 · LISTENING' })}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: KT.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginTop: 1,
            }}
          >
            {unitTitle}
          </div>
        </div>
        <button
          type="button"
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: KT.card,
            color: KT.sub,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: KT.shSm,
          }}
          aria-label="More options"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Transcript */}
      <div
        ref={scrollContainerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 22px',
          paddingBottom: 'calc(var(--mobile-safe-bottom, 0px) + 9rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {transcriptData.length === 0 ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 48,
                color: KT.crimson,
                opacity: 0.2,
                marginBottom: 12,
              }}
            >
              聽
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: KT.sub }}>
              {t('mobileListeningModule.noTranscript', { defaultValue: '자막이 없습니다' })}
            </div>
          </div>
        ) : (
          transcriptData.map((segment, index) => {
            const isActive = index === activeSegmentIndex;
            return (
              <div
                key={index}
                ref={isActive ? activeSegmentRef : null}
                style={{
                  transition: 'all 0.4s',
                  padding: '16px 18px',
                  borderRadius: 20,
                  background: isActive ? KT.card : 'transparent',
                  boxShadow: isActive ? KT.sh : 'none',
                  opacity: isActive ? 1 : 0.55,
                  transform: isActive ? 'scale(1.02)' : 'scale(1)',
                  border: isActive ? `1px solid ${KT.line}` : '1px solid transparent',
                }}
              >
                <p
                  style={{
                    fontSize: 17,
                    fontWeight: isActive ? 600 : 500,
                    lineHeight: 1.6,
                    color: isActive ? KT.ink : KT.ink2,
                    marginBottom: isActive && segment.translation ? 8 : 0,
                  }}
                >
                  {segment.text}
                </p>
                {segment.translation && isActive && (
                  <p
                    style={{
                      fontSize: 13,
                      color: KT.sub,
                      lineHeight: 1.4,
                      fontWeight: 500,
                    }}
                  >
                    {segment.translation}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Audio player */}
      {audioUrl && (
        <MobileAudioPlayer audioUrl={audioUrl} onTimeUpdate={setCurrentTime} initialTime={0} />
      )}
    </div>
  );
}
