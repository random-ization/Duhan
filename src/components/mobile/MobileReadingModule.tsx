import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PlayCircle, Square, BookOpen } from 'lucide-react';
import { InteractiveWordChip } from './InteractiveWordChip';
import { MobileWorkspaceHeader } from './MobileWorkspaceHeader';
import { KT, HanjaSeal } from './ksoft/ksoft';

interface MobileReadingModuleProps {
  readonly unitTitle: string;
  readonly unitData: any;
  readonly onBack: () => void;
  readonly onWordClick: (word: string) => void;
}

export function MobileReadingModule({
  unitTitle,
  unitData,
  onBack,
  onWordClick,
}: MobileReadingModuleProps) {
  const { t } = useTranslation();
  const [isPlaying, setIsPlaying] = useState(false);

  const textSegments = useMemo(() => {
    if (!unitData?.readingText) return [];
    const rawText = unitData.readingText;

    return rawText
      .split('\n')
      .filter((line: string) => line.trim().length > 0)
      .map((line: string, index: number) => {
        const match = /^([A-Za-z가-힣0-9]+)[:：]/.exec(line);
        const speaker = match ? match[1] : null;
        const content = match ? line.substring(match[0].length).trim() : line;

        return {
          id: index,
          speaker,
          content,
          type: 'message' as const,
        };
      });
  }, [unitData]);

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100dvh',
        flexDirection: 'column',
        background: KT.bg,
        fontFamily: KT.font,
      }}
    >
      <MobileWorkspaceHeader
        title={unitTitle}
        subtitle={t('readingModule.mobile.storyHint', {
          defaultValue: 'Tap any underlined word to see its meaning.',
        })}
        eyebrow={t('readingModule.mobile.title', { defaultValue: '讀 · READING' })}
        onBack={onBack}
        backLabel={t('common.back', { defaultValue: 'Back' })}
      />

      {/* Content Stream */}
      <div
        style={{
          flex: 1,
          padding: '16px 18px',
          paddingBottom: 'calc(var(--mobile-safe-bottom, env(safe-area-inset-bottom)) + 7rem)',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        {/* Intro Card */}
        <div
          style={{
            background: `linear-gradient(135deg, ${KT.crimson} 0%, #7B2C22 100%)`,
            borderRadius: 24,
            padding: '20px 22px',
            color: '#fff',
            boxShadow: '0 12px 32px rgba(162,59,46,0.3)',
            marginBottom: 4,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                background: 'rgba(255,255,255,0.15)',
                display: 'grid',
                placeItems: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <BookOpen size={22} style={{ color: '#fff' }} />
            </div>
            <div
              style={{
                padding: '4px 12px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.18)',
                backdropFilter: 'blur(8px)',
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 1.5,
                border: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              {t('readingModule.mobile.levelBadge', { defaultValue: 'LEVEL 1' })}
            </div>
          </div>
          <h2
            style={{
              fontSize: 22,
              fontWeight: 800,
              marginBottom: 6,
              letterSpacing: -0.5,
              lineHeight: 1.2,
            }}
          >
            {t('readingModule.mobile.storyTitle', { defaultValue: "Let's read today's story." })}
          </h2>
          <p style={{ fontSize: 13, opacity: 0.85, fontWeight: 500 }}>
            {t('readingModule.mobile.storyHint', {
              defaultValue: 'Tap any underlined word to see its meaning.',
            })}
          </p>
        </div>

        {textSegments.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: KT.sub,
              padding: '40px 0',
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            {t('dashboard.reading.noContent')}
          </div>
        )}

        {textSegments.map((segment: any) => (
          <div key={segment.id}>
            {segment.speaker && (
              <div
                style={{
                  marginLeft: 14,
                  marginBottom: 5,
                  fontSize: 10,
                  fontWeight: 700,
                  color: KT.sub,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                }}
              >
                {segment.speaker}
              </div>
            )}
            <div
              style={{
                background: KT.card,
                border: `1px solid ${KT.line}`,
                borderRadius: 22,
                padding: '16px 18px',
                fontSize: 16,
                fontWeight: 500,
                lineHeight: 1.9,
                color: KT.ink2,
                boxShadow: KT.shSm,
              }}
            >
              <div
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', lineHeight: 1.9 }}
              >
                {segment.content.split(' ').map((word: string, i: number) => (
                  <InteractiveWordChip key={i} word={word} onClick={onWordClick} />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Action Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: `${KT.card}f0`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderTop: `1px solid ${KT.line}`,
          padding: '12px 18px',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)',
          zIndex: 20,
          display: 'flex',
          gap: 10,
          boxShadow: '0 -8px 24px rgba(31,27,23,0.06)',
        }}
      >
        <button
          type="button"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            flex: 1,
            height: 52,
            background: KT.ink,
            borderRadius: 18,
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: KT.bg,
            fontSize: 14,
            fontWeight: 800,
            cursor: 'pointer',
            fontFamily: KT.font,
            boxShadow: KT.sh,
          }}
        >
          {isPlaying ? (
            <>
              <Square size={16} fill="currentColor" />
              {t('readingModule.mobile.stopAudio', { defaultValue: 'Stop Audio' })}
            </>
          ) : (
            <>
              <PlayCircle size={18} fill="currentColor" />
              {t('readingModule.mobile.playFullAudio', { defaultValue: 'Play Full Audio' })}
            </>
          )}
        </button>

        <div style={{ width: 52, height: 52, flexShrink: 0 }}>
          <HanjaSeal c="言" size={52} bg={KT.bg2} color={KT.crimson} round={16} />
        </div>
      </div>
    </div>
  );
}
