import React, { useState, useMemo } from 'react';
import { CourseSelection, GrammarPoint, Language } from '../../types';
import { Search, X } from 'lucide-react';
import { Input } from '../ui';
import { getLocalizedContent } from '../../utils/languageUtils';
import { BottomSheet } from '../common/BottomSheet';
import { useTranslation } from 'react-i18next';
import { KT, HanjaSeal, Card, SectionHead } from './ksoft/ksoft';

const UNIT_HANJA = [
  '挨',
  '時',
  '若',
  '過',
  '傳',
  '新',
  '望',
  '道',
  '會',
  '旅',
  '文',
  '法',
  '話',
  '書',
  '詞',
];

const matchesSearchQuery = (point: GrammarPoint, query: string, language: Language): boolean => {
  const q = query.toLowerCase();
  if (point.pattern.toLowerCase().includes(q)) return true;
  const explanation = (
    getLocalizedContent(point, 'explanation', language) || point.explanation
  ).toLowerCase();
  if (explanation.includes(q)) return true;
  return point.usages.some(
    usage =>
      usage.example.toLowerCase().includes(q) ||
      (getLocalizedContent(usage, 'translation', language) || usage.translation)
        .toLowerCase()
        .includes(q)
  );
};

interface MobileGrammarModuleProps {
  course: CourseSelection;
  instituteName: string;
  language: Language;
  groupedPoints: Record<number, GrammarPoint[]>;
}

export const MobileGrammarModule: React.FC<MobileGrammarModuleProps> = ({
  course,
  instituteName,
  language,
  groupedPoints,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPoint, setSelectedPoint] = useState<GrammarPoint | null>(null);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return groupedPoints;
    const result: Record<number, GrammarPoint[]> = {};
    Object.entries(groupedPoints).forEach(([unitKey, points]) => {
      const matches = points.filter(p => matchesSearchQuery(p, query, language));
      if (matches.length > 0) result[Number(unitKey)] = matches;
    });
    return result;
  }, [groupedPoints, language, searchQuery]);

  const units = Object.keys(filteredData)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div
      className="pb-mobile-nav"
      style={{
        background: `radial-gradient(ellipse at 20% 0%, ${KT.bg2} 0%, ${KT.bg} 60%)`,
        minHeight: '100dvh',
        fontFamily: KT.font,
        color: KT.ink,
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 22px 20px',
          paddingTop: 'calc(env(safe-area-inset-top) + 14px)',
        }}
      >
        <div
          style={{
            fontFamily: KT.serif,
            fontSize: 13,
            color: KT.crimson,
            letterSpacing: 4,
            marginBottom: 4,
            fontWeight: 500,
          }}
        >
          文 · GRAMMAR
        </div>
        <div
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: KT.ink,
            letterSpacing: -0.8,
          }}
        >
          {t('grammar', { defaultValue: '문법' })}
        </div>
        <div style={{ fontSize: 13, color: KT.sub, marginTop: 4 }}>
          {instituteName} ·{' '}
          {t('textbook.level', { level: course.level, defaultValue: 'Level {{level}}' })}
        </div>
      </div>

      {/* Search */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          padding: '0 18px 14px',
          background: `${KT.bg}dd`,
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: KT.sub,
            }}
          />
          <Input
            type="text"
            placeholder={t('common.search', { defaultValue: '검색...' })}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              paddingLeft: 38,
              paddingRight: searchQuery ? 38 : 14,
              height: 44,
              borderRadius: 14,
              background: KT.card,
              border: `1px solid ${KT.line}`,
              fontSize: 14,
              fontFamily: KT.font,
              color: KT.ink,
              boxShadow: KT.shSm,
              width: '100%',
              outline: 'none',
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute',
                right: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: KT.sub,
                display: 'grid',
                placeItems: 'center',
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 18px 28px' }}>
        {units.length === 0 ? (
          <Card pad={24} style={{ textAlign: 'center' }}>
            <div
              style={{
                fontFamily: KT.serif,
                fontSize: 36,
                color: KT.crimson,
                opacity: 0.3,
                marginBottom: 12,
              }}
            >
              空
            </div>
            <div style={{ fontSize: 15, fontWeight: 800, color: KT.ink }}>
              {searchQuery
                ? t('common.noMatches', { defaultValue: '검색 결과 없음' })
                : t('noGrammar', { defaultValue: '문법이 없습니다' })}
            </div>
          </Card>
        ) : (
          <div>
            {units.map(unit => (
              <div key={unit} style={{ marginBottom: 24 }}>
                <SectionHead
                  kanji={UNIT_HANJA[(unit - 1) % UNIT_HANJA.length]}
                  title={`${t('unit', { defaultValue: 'Unit' })} ${unit}`}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredData[unit].map(point => (
                    <button
                      key={`${unit}-${point.pattern}`}
                      type="button"
                      onClick={() => setSelectedPoint(point)}
                      style={{
                        background: KT.card,
                        borderRadius: 20,
                        boxShadow: KT.shSm,
                        padding: '14px 16px',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        fontFamily: KT.font,
                        width: '100%',
                      }}
                    >
                      <HanjaSeal
                        c={point.pattern.charAt(0) || '文'}
                        size={38}
                        bg={KT.bg2}
                        color={KT.crimson}
                        round={10}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: KT.ink,
                            letterSpacing: -0.2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {point.pattern}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: KT.sub,
                            marginTop: 3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {getLocalizedContent(point, 'explanation', language)}
                        </div>
                      </div>
                      <div style={{ color: KT.subLight, fontSize: 16, flexShrink: 0 }}>›</div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail sheet */}
      <BottomSheet
        isOpen={!!selectedPoint}
        onClose={() => setSelectedPoint(null)}
        height="auto"
        title={selectedPoint?.pattern || ''}
      >
        {selectedPoint && (
          <div style={{ paddingBottom: 32, fontFamily: KT.font }}>
            {/* Explanation */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  fontFamily: KT.serif,
                  fontSize: 11,
                  color: KT.crimson,
                  letterSpacing: 3,
                  fontWeight: 500,
                  marginBottom: 8,
                }}
              >
                解 · EXPLANATION
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: KT.ink,
                  lineHeight: 1.6,
                  fontWeight: 500,
                }}
              >
                {getLocalizedContent(selectedPoint, 'explanation', language)}
              </div>
            </div>

            {/* Examples */}
            {selectedPoint.usages && selectedPoint.usages.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div
                  style={{
                    fontFamily: KT.serif,
                    fontSize: 11,
                    color: KT.crimson,
                    letterSpacing: 3,
                    fontWeight: 500,
                    marginBottom: 10,
                  }}
                >
                  例 · EXAMPLES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedPoint.usages.map((usage, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        background: KT.bg2,
                        borderRadius: 14,
                        border: `1px solid ${KT.line}`,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          color: KT.ink,
                          fontWeight: 600,
                          lineHeight: 1.5,
                        }}
                      >
                        {usage.example}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: KT.sub,
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}
                      >
                        {getLocalizedContent(usage, 'translation', language)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setSelectedPoint(null)}
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 18,
                border: 'none',
                background: KT.ink,
                color: KT.bg,
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: KT.font,
                letterSpacing: 0.3,
                boxShadow: '0 4px 14px rgba(31,27,23,0.22)',
              }}
            >
              {t('common.gotIt', { defaultValue: '알겠어요 ✓' })}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
};
