import { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui';

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
      1: t('grammarModule.units.unit1', '猜测 (Speculation)'),
      2: t('grammarModule.units.unit2', '对照 (Contrast)'),
      3: t('grammarModule.units.unit3', '原因 (Reason)'),
      4: t('grammarModule.units.unit4', '目的 (Purpose)'),
      5: t('grammarModule.units.unit5', '进行 (Aspect)'),
      6: t('grammarModule.units.unit6', '状态 (State)'),
      7: t('grammarModule.units.unit7', '程度 (Degree)'),
      8: t('grammarModule.units.unit8', '假设 (Hypothesis)'),
      9: t('grammarModule.units.unit9', '让步 (Concession)'),
      10: t('grammarModule.units.unit10', '机会 (Opportunity)'),
      11: t('grammarModule.units.unit11', '传闻 (Indirect)'),
      12: t('grammarModule.units.unit12', '必然 (Necessity)'),
      13: t('grammarModule.units.unit13', '罗列 (Listing)'),
      14: t('grammarModule.units.unit14', '基准 (Standard)'),
      15: t('grammarModule.units.unit15', '助词 (Particles)'),
    };
    return units[unitId] || `${t('unit')} ${unitId}`;
  };

  return (
    <div
      ref={scrollRef}
      className="flex overflow-x-auto gap-2 px-4 pb-4 no-scrollbar scroll-smooth"
    >
      {Array.from({ length: totalUnits }, (_, i) => i + 1).map(unit => {
        const isActive = unit === selectedUnit;
        return (
          <Button
            variant="ghost"
            size="auto"
            key={unit}
            onClick={() => onSelect(unit)}
            className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-xs transition-all border-2 whitespace-nowrap ${isActive
                ? 'bg-slate-900 text-white border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,0.3)] dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'
              }`}
          >
            {getUnitName(unit)}
          </Button>
        );
      })}
    </div>
  );
}
