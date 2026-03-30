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
            className={`flex-shrink-0 cursor-pointer snap-start rounded-xl px-4 py-2 font-bold text-sm border-2 transition-transform active:scale-95 ${
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-muted-foreground border-border hover:border-foreground/30 shadow-none'
            }`}
          >
            {getUnitName(unit)}
          </Button>
        );
      })}
    </div>
  );
}
