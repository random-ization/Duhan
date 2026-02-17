import { useState } from 'react';
import { Book, ChevronDown, Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../ui';
import { Button } from '../ui';

interface MobileUnitSelectorProps {
  currentUnitId: number | 'ALL';
  availableUnits: number[];
  unitCounts: Map<number, number>;
  onSelect: (unitId: number | 'ALL') => void;
  allWordsCount: number;
}

export default function MobileUnitSelector({
  currentUnitId,
  availableUnits,
  unitCounts,
  onSelect,
  allWordsCount,
}: MobileUnitSelectorProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const getLabel = (unitId: number | 'ALL') => {
    if (unitId === 'ALL') return t('vocab.allUnits', { defaultValue: 'All Units' });
    if (unitId === 0) return t('vocab.unassigned', { defaultValue: 'Unassigned' });
    return `${t('vocab.unit', { defaultValue: 'Unit' })} ${unitId}`;
  };

  return (
    <>
      <Button
        variant="ghost"
        size="auto"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-muted border-2 border-foreground rounded-xl px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all"
      >
        <Book className="w-4 h-4 text-indigo-600" />
        <div className="text-left">
          <div className="text-[8px] font-bold text-muted-foreground uppercase tracking-wider">
            {t('vocab.currentScope', { defaultValue: 'Current Scope' })}
          </div>
          <div className="text-xs font-black text-foreground leading-none">
            {getLabel(currentUnitId)}
          </div>
        </div>
        <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetPortal>
          <SheetOverlay
            unstyled
            forceMount
            className="fixed inset-0 bg-primary/50 z-[100] backdrop-blur-sm transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
          />
          <SheetContent
            unstyled
            forceMount
            closeOnEscape={false}
            lockBodyScroll={false}
            className="fixed bottom-0 left-0 right-0 z-[101] pointer-events-none data-[state=closed]:pointer-events-none"
          >
            <motion.div
              initial={false}
              animate={isOpen ? { y: 0 } : { y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="pointer-events-auto bg-card rounded-t-3xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
                <h3 className="font-black text-lg text-foreground">
                  {t('vocab.selectScope', { defaultValue: 'Select Scope' })}
                </h3>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center active:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* All Units Option */}
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    onSelect('ALL');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    currentUnitId === 'ALL'
                      ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                      : 'bg-card border-border active:scale-[0.99]'
                  }`}
                >
                  <div className="text-left">
                    <div
                      className={`font-bold ${currentUnitId === 'ALL' ? 'text-indigo-700' : 'text-foreground'}`}
                    >
                      {t('vocab.allUnits', { defaultValue: 'All Units' })}
                    </div>
                    <div className="text-xs text-muted-foreground font-medium">
                      {allWordsCount} {t('vocab.words', { defaultValue: 'words' })}
                    </div>
                  </div>
                  {currentUnitId === 'ALL' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </Button>

                <div className="h-px bg-muted my-2" />

                {/* Individual Units */}
                {availableUnits.map(u => {
                  const count = unitCounts.get(u) || 0;
                  const isSelected = currentUnitId === u;
                  const isDisabled = count === 0;

                  return (
                    <Button
                      variant="ghost"
                      size="auto"
                      key={u}
                      disabled={isDisabled}
                      onClick={() => {
                        onSelect(u);
                        setIsOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                          : isDisabled
                            ? 'bg-muted border-transparent opacity-50'
                            : 'bg-card border-border active:scale-[0.99]'
                      }`}
                    >
                      <div className="text-left">
                        <div
                          className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-foreground'}`}
                        >
                          {u === 0
                            ? t('vocab.unassigned', { defaultValue: 'Unassigned' })
                            : `${t('vocab.unit', { defaultValue: 'Unit' })} ${u}`}
                        </div>
                        <div className="text-xs text-muted-foreground font-medium">
                          {count} {t('vocab.words', { defaultValue: 'words' })}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </Button>
                  );
                })}
              </div>
            </motion.div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </>
  );
}
