import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { KT } from './ksoft/ksoft';

interface MobileUnitChipsProps {
  readonly totalUnits: number;
  readonly selectedUnit: number;
  readonly onSelect: (unit: number) => void;
}

export default function MobileUnitChips({
  totalUnits,
  selectedUnit,
  onSelect,
}: MobileUnitChipsProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll active chip into view when selection changes
  useEffect(() => {
    if (scrollRef.current) {
      const activeChip = scrollRef.current.children[selectedUnit - 1] as HTMLElement;
      if (activeChip) {
        activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [selectedUnit]);

  const getUnitName = (unitId: number) => {
    const units: Record<number, string> = {
      1: t('grammarModule.unitsShort.unit1', 'Speculation'),
      2: t('grammarModule.unitsShort.unit2', 'Contrast'),
      3: t('grammarModule.unitsShort.unit3', 'Reason'),
      4: t('grammarModule.unitsShort.unit4', 'Purpose'),
      5: t('grammarModule.unitsShort.unit5', 'Aspect'),
      6: t('grammarModule.unitsShort.unit6', 'State'),
      7: t('grammarModule.unitsShort.unit7', 'Degree'),
      8: t('grammarModule.unitsShort.unit8', 'Hypothesis'),
      9: t('grammarModule.unitsShort.unit9', 'Concession'),
      10: t('grammarModule.unitsShort.unit10', 'Opportunity'),
      11: t('grammarModule.unitsShort.unit11', 'Indirect'),
      12: t('grammarModule.unitsShort.unit12', 'Necessity'),
      13: t('grammarModule.unitsShort.unit13', 'Listing'),
      14: t('grammarModule.unitsShort.unit14', 'Standard'),
      15: t('grammarModule.unitsShort.unit15', 'Particles'),
    };
    return units[unitId] || `${t('unit', 'Unit')} ${unitId}`;
  };

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto gap-2.5 px-[22px] pb-1 no-scrollbar scroll-smooth"
    >
      {Array.from({ length: totalUnits }, (_, i) => i + 1).map(unit => {
        const isActive = unit === selectedUnit;
        return (
          <button
            key={unit}
            type="button"
            onClick={() => onSelect(unit)}
            className="relative shrink-0 snap-start overflow-hidden rounded-[1.15rem] outline-none transition-transform active:scale-[0.98]"
            style={{
              padding: '10px 14px 11px',
              border: isActive ? 'none' : `1px solid ${KT.line}`,
              background: isActive ? KT.ink : 'rgba(255,255,255,0.88)',
              color: isActive ? KT.bg : KT.ink,
              boxShadow: isActive ? KT.shSm : '0 1px 3px rgba(31,27,23,0.03)',
            }}
          >
            {isActive && (
              <motion.div
                layoutId="activeUnitTab"
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(135deg, ${KT.ink} 0%, ${KT.indigo} 100%)`,
                  zIndex: 0,
                }}
              />
            )}
            <div
              className="relative z-10 text-left"
              style={{ minWidth: 88, display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 1.2,
                  color: isActive ? 'rgba(251,248,243,0.68)' : KT.sub,
                }}
              >
                UNIT {unit}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  letterSpacing: -0.2,
                  whiteSpace: 'nowrap',
                }}
              >
                {getUnitName(unit)}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
