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
            className={`flex-shrink-0 px-4 py-2 rounded-full font-bold text-sm transition-all border-2 ${
              isActive
                ? 'bg-primary text-white border-foreground shadow-[2px_2px_0px_0px_rgba(15,23,42,0.3)]'
                : 'bg-card text-muted-foreground border-border hover:border-border'
            }`}
          >
            {t('unit')} {unit}
          </Button>
        );
      })}
    </div>
  );
}
