import { useMemo } from 'react';
import { Volume2, Plus, ArrowRight, Book } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BottomSheet } from '../common/BottomSheet';
import { useTTS } from '../../hooks/useTTS';
import { getLocalizedContent } from '../../utils/languageUtils';
import { KT } from './ksoft/ksoft';

interface GrammarMatch {
  id: string;
  title: string;
  titleEn?: string;
  titleZh?: string;
  titleVi?: string;
  titleMn?: string;
  summary: string;
  summaryEn?: string;
  summaryVi?: string;
  summaryMn?: string;
  type: string;
  level: string;
}

interface MobileDictionarySheetProps {
  readonly word: string;
  readonly meaning: string;
  readonly lemma?: string;
  readonly pronunciation?: string;
  readonly grammarMatches?: GrammarMatch[];
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly onSave: () => void;
}

export function MobileDictionarySheet({
  word,
  meaning,
  lemma,
  pronunciation,
  grammarMatches,
  isOpen,
  onClose,
  onSave,
}: Readonly<MobileDictionarySheetProps>) {
  const { t, i18n } = useTranslation();
  const { speak } = useTTS();
  const language = (i18n.language || 'zh') as never;

  const safeGrammarMatches = useMemo(() => grammarMatches || [], [grammarMatches]);

  const handleSpeak = () => {
    speak(word);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} height="auto">
      <div
        style={{
          paddingBottom: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          fontFamily: KT.font,
        }}
      >
        {/* Header: Word & Audio */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <h2
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: KT.ink,
                  letterSpacing: -1,
                }}
              >
                {word}
              </h2>
              {pronunciation && (
                <span style={{ fontSize: 16, color: KT.sub, fontWeight: 500 }}>
                  [{pronunciation}]
                </span>
              )}
            </div>
            {lemma && lemma !== word && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: KT.sub,
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <ArrowRight size={12} />
                {t('mobileDictionarySheet.dictionaryForm', {
                  defaultValue: 'Dictionary form',
                })}: <span style={{ color: KT.ink2 }}>{lemma}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSpeak}
            style={{
              width: 46,
              height: 46,
              borderRadius: '50%',
              background: KT.bg2,
              border: `1px solid ${KT.line}`,
              color: KT.ink,
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Volume2 size={22} fill="currentColor" />
          </button>
        </div>

        {/* Meaning */}
        <div
          style={{
            background: KT.bg2,
            borderRadius: 18,
            padding: '16px 18px',
            border: `1px solid ${KT.line}`,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 8,
            }}
          >
            <Book size={14} style={{ color: KT.crimson }} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: KT.sub,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {t('mobileDictionarySheet.definition', { defaultValue: 'Definition' })}
            </span>
          </div>
          <p style={{ fontSize: 16, fontWeight: 500, color: KT.ink2, lineHeight: 1.6 }}>
            {meaning}
          </p>
        </div>

        {/* Related Grammar */}
        {safeGrammarMatches.length > 0 && (
          <div>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: KT.sub,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                marginBottom: 10,
                paddingLeft: 2,
              }}
            >
              {t('mobileDictionarySheet.relatedGrammar', { defaultValue: 'Related Grammar' })}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {safeGrammarMatches.map(g => (
                <div
                  key={g.id}
                  style={{
                    background: KT.card,
                    border: `1px solid ${KT.line}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    boxShadow: KT.shSm,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: 5,
                    }}
                  >
                    <span style={{ fontWeight: 700, color: KT.ink, fontSize: 14 }}>
                      {getLocalizedContent(g as never, 'title', language) || g.title}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        background: KT.bg2,
                        color: KT.sub,
                        padding: '2px 8px',
                        borderRadius: 8,
                        flexShrink: 0,
                        marginLeft: 8,
                      }}
                    >
                      {g.level}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: KT.sub, lineHeight: 1.5 }}>
                    {getLocalizedContent(g as never, 'summary', language) || g.summary}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        <div style={{ paddingTop: 4 }}>
          <button
            type="button"
            onClick={onSave}
            style={{
              width: '100%',
              height: 54,
              background: KT.ink,
              color: KT.bg,
              borderRadius: 18,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: KT.font,
              boxShadow: KT.sh,
              letterSpacing: 0.3,
            }}
          >
            <Plus size={18} strokeWidth={3} />
            {t('mobileDictionarySheet.saveToNotebook', { defaultValue: 'Save to Vocab' })}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
