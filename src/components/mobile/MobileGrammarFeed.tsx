import { Check, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { m as motion, AnimatePresence } from 'framer-motion';
import { GrammarPointData } from '../../types';
import { getLocalizedContent } from '../../utils/languageUtils';
import { Card, Chip, HanjaSeal, KT, type ChipTone } from './ksoft/ksoft';

interface MobileGrammarFeedProps {
  readonly grammarPoints: GrammarPointData[];
  readonly onSelect: (grammar: GrammarPointData) => void;
  readonly onToggleStatus: (id: string) => void;
  readonly isLoading: boolean;
}

type GrammarTone = {
  readonly chipTone: ChipTone;
  readonly seal: string;
  readonly deep: string;
  readonly surface: string;
};

const getGrammarTone = (type: string): GrammarTone => {
  const normalized = type.trim().toUpperCase();
  switch (normalized) {
    case 'ENDING':
      return {
        chipTone: 'mint',
        seal: '結',
        deep: KT.mintDeep,
        surface: `${KT.mint}72`,
      };
    case 'PARTICLE':
      return {
        chipTone: 'lilac',
        seal: '助',
        deep: KT.lilacDeep,
        surface: `${KT.lilac}72`,
      };
    case 'CONNECTIVE':
      return {
        chipTone: 'butter',
        seal: '接',
        deep: KT.butterDeep,
        surface: `${KT.butter}78`,
      };
    default:
      return {
        chipTone: 'sky',
        seal: '文',
        deep: KT.skyDeep,
        surface: `${KT.sky}70`,
      };
  }
};

const clampProficiency = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

export default function MobileGrammarFeed({
  grammarPoints,
  onSelect,
  onToggleStatus,
  isLoading,
}: MobileGrammarFeedProps) {
  const { t, i18n } = useTranslation();
  const language = i18n.language || 'zh';

  if (isLoading) {
    return (
      <div className="px-[18px] pb-mobile-nav pt-3 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="animate-pulse rounded-[1.9rem]"
            style={{
              height: 126,
              background: `linear-gradient(135deg, ${KT.bg2} 0%, ${KT.card} 72%)`,
              boxShadow: KT.shSm,
            }}
          />
        ))}
      </div>
    );
  }

  if (grammarPoints.length === 0) {
    return (
      <div className="px-[18px] pb-mobile-nav pt-4">
        <Card
          pad={20}
          style={{
            textAlign: 'center',
            background: `linear-gradient(135deg, ${KT.bg2} 0%, ${KT.card} 72%)`,
            boxShadow: KT.shSm,
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: KT.card,
              color: KT.subLight,
              boxShadow: KT.shSm,
            }}
          >
            <Sparkles size={28} />
          </div>
          <p
            style={{
              marginTop: 14,
              fontSize: 14,
              fontWeight: 800,
              letterSpacing: 0.3,
              color: KT.ink,
            }}
          >
            {t('grammarFeed.empty', { defaultValue: 'No grammar points found' })}
          </p>
          <p style={{ marginTop: 6, fontSize: 12, color: KT.sub, lineHeight: 1.6 }}>
            {t('grammarFeed.emptyHint', {
              defaultValue: 'Try another unit or a broader search phrase.',
            })}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-[18px] pb-mobile-nav pt-3">
      <div
        style={{
          padding: '0 6px 12px',
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: KT.serif,
              fontSize: 12,
              color: KT.crimson,
              letterSpacing: 3,
              fontWeight: 500,
            }}
          >
            句 · PATTERNS
          </div>
          <div style={{ marginTop: 4, fontSize: 14, fontWeight: 800, color: KT.ink }}>
            {t('grammarFeed.collection', { defaultValue: 'Grammar collection' })}
          </div>
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: KT.sub }}>{grammarPoints.length}</div>
      </div>

      <AnimatePresence mode="popLayout">
        {grammarPoints.map((point, index) => {
          const isMastered = point.status === 'MASTERED';
          const proficiency = clampProficiency(isMastered ? 100 : point.proficiency || 0);
          const tone = getGrammarTone(point.type);
          const localizedTitle = getLocalizedContent(point, 'title', language) || point.title;
          const localizedSummary = getLocalizedContent(point, 'summary', language) || point.summary;
          const statusLabel = isMastered
            ? t('grammar.status.mastered', { defaultValue: 'Mastered' })
            : proficiency > 0
              ? t('grammar.status.learning', { defaultValue: 'Learning' })
              : t('grammar.status.new', { defaultValue: 'New' });

          return (
            <motion.div
              layout
              key={point.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{ marginBottom: 10 }}
            >
              <Card
                pad={18}
                style={{
                  background: `linear-gradient(135deg, ${tone.surface} 0%, ${KT.card} 72%)`,
                  boxShadow: KT.shSm,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'stretch', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => onSelect(point)}
                    className="min-w-0 flex-1 text-left transition-transform active:scale-[0.99]"
                    style={{
                      border: 'none',
                      padding: 0,
                      background: 'transparent',
                      cursor: 'pointer',
                      fontFamily: KT.font,
                    }}
                  >
                    <div style={{ display: 'flex', gap: 14 }}>
                      <HanjaSeal c={tone.seal} size={42} bg={tone.deep} round={11} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: 6,
                          }}
                        >
                          <Chip tone={tone.chipTone} size="sm">
                            {point.type}
                          </Chip>
                          {point.level ? <Chip size="sm">{point.level}</Chip> : null}
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: tone.deep,
                              letterSpacing: 0.6,
                              textTransform: 'uppercase',
                            }}
                          >
                            {statusLabel}
                          </span>
                        </div>

                        <h3
                          style={{
                            marginTop: 10,
                            fontSize: 19,
                            fontWeight: 800,
                            color: KT.ink,
                            letterSpacing: -0.4,
                            lineHeight: 1.2,
                          }}
                        >
                          {localizedTitle}
                        </h3>

                        <p
                          style={{
                            marginTop: 8,
                            fontSize: 13,
                            color: KT.sub,
                            lineHeight: 1.6,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {localizedSummary}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            marginTop: 14,
                          }}
                        >
                          <div
                            style={{
                              flex: 1,
                              height: 5,
                              borderRadius: 999,
                              overflow: 'hidden',
                              background: KT.line2,
                            }}
                          >
                            <div
                              style={{
                                width: `${proficiency}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: tone.deep,
                              }}
                            />
                          </div>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              color: KT.sub,
                              minWidth: 34,
                              textAlign: 'right',
                            }}
                          >
                            {proficiency}%
                          </span>
                          <ChevronRight size={16} color={KT.subLight} />
                        </div>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onToggleStatus(point.id)}
                    aria-label={
                      isMastered
                        ? t('grammar.actions.markLearning', { defaultValue: 'Mark as learning' })
                        : t('grammar.actions.markMastered', { defaultValue: 'Mark as mastered' })
                    }
                    className="shrink-0 transition-transform active:scale-95"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 16,
                      border: isMastered ? 'none' : `1px solid ${KT.line}`,
                      background: isMastered ? KT.mint : KT.card,
                      color: isMastered ? KT.mintDeep : KT.sub,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: KT.shSm,
                      cursor: 'pointer',
                    }}
                  >
                    <Trophy size={20} fill={isMastered ? 'currentColor' : 'none'} />
                  </button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
