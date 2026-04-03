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
  variant?: 'default' | 'minimal';
}

export default function MobileUnitSelector({
  currentUnitId,
  availableUnits,
  unitCounts,
  onSelect,
  allWordsCount,
  variant = 'default',
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
        className={
          variant === 'minimal'
            ? 'flex items-center gap-1.5 bg-muted border border-border rounded-full px-3 py-1 active:scale-95 transition-all min-w-0 overflow-hidden'
            : 'flex items-center gap-2 bg-muted border border-border rounded-full px-4 py-2 shadow-sm active:scale-95 transition-all outline-none focus-visible:ring-2 focus-visible:ring-primary'
        }
      >
        <Book
          className={
            variant === 'minimal'
              ? 'w-3.5 h-3.5 text-indigo-600 shrink-0'
              : 'w-4 h-4 text-indigo-600'
          }
        />
        <div className="text-left min-w-0">
          {variant !== 'minimal' && (
            <div className="text-[9px] font-black text-muted-foreground/70 uppercase tracking-[0.15em] leading-none mb-0.5">
              {t('vocab.currentScope', { defaultValue: 'Current Scope' })}
            </div>
          )}
          <div
            className={
              variant === 'minimal'
                ? 'text-[11px] font-black text-foreground leading-tight truncate'
                : 'text-xs font-black italic text-foreground leading-none tracking-tight'
            }
          >
            {getLabel(currentUnitId)}
          </div>
        </div>
        <ChevronDown
          className={
            variant === 'minimal'
              ? 'w-3 h-3 text-muted-foreground shrink-0'
              : 'w-3.5 h-3.5 text-muted-foreground ml-0.5'
          }
        />
      </Button>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetPortal>
          <SheetOverlay
            unstyled
            forceMount
            className="fixed inset-0 bg-black/40 z-[100] backdrop-blur-md transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0"
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
              transition={{ type: 'spring', damping: 30, stiffness: 350 }}
              className="pointer-events-auto bg-card rounded-t-[3rem] max-h-[85vh] flex flex-col shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.3)] border-t border-border"
            >
              <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-muted-foreground/20" />
              <div className="px-8 py-6 flex items-center justify-between shrink-0">
                <h3 className="font-black italic text-2xl tracking-tighter text-foreground">
                  {t('vocab.selectScope', { defaultValue: 'Select Scope' })}
                </h3>
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => setIsOpen(false)}
                  className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 pb-12 pt-2 space-y-3">
                {/* All Units Option */}
                <Button
                  variant="ghost"
                  size="auto"
                  onClick={() => {
                    onSelect('ALL');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                    currentUnitId === 'ALL'
                      ? 'bg-indigo-50/50 border-indigo-500/50 shadow-inner ring-1 ring-indigo-500/20'
                      : 'bg-card border-border active:scale-[0.97]'
                  }`}
                >
                  <div className="text-left">
                    <div
                      className={`text-base font-black ${currentUnitId === 'ALL' ? 'text-indigo-700' : 'text-foreground'}`}
                    >
                      {t('vocab.allUnits', { defaultValue: 'All Units' })}
                    </div>
                    <div className="text-xs text-muted-foreground font-semibold">
                      {allWordsCount} {t('vocab.words', { defaultValue: 'words' })}
                    </div>
                  </div>
                  {currentUnitId === 'ALL' && (
                    <div className="w-7 h-7 rounded-full bg-indigo-500 shadow-md flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </Button>

                <div className="flex items-center gap-4 px-2 py-2">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                    Individual Units
                  </span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                {/* Individual Units */}
                <div className="grid grid-cols-1 gap-2">
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
                        className={`w-full flex items-center justify-between p-5 rounded-2xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-50/50 border-indigo-500/50 shadow-inner ring-1 ring-indigo-500/20'
                            : isDisabled
                              ? 'bg-muted/50 border-transparent opacity-40'
                              : 'bg-card border-border hover:bg-muted/30 active:scale-[0.97]'
                        }`}
                      >
                        <div className="text-left">
                          <div
                            className={`text-base font-black ${isSelected ? 'text-indigo-700' : 'text-foreground'}`}
                          >
                            {u === 0
                              ? t('vocab.unassigned', { defaultValue: 'Unassigned' })
                              : `${t('vocab.unit', { defaultValue: 'Unit' })} ${u}`}
                          </div>
                          <div className="text-xs text-muted-foreground font-semibold">
                            {count} {t('vocab.words', { defaultValue: 'words' })}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="w-7 h-7 rounded-full bg-indigo-500 shadow-md flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </SheetContent>
        </SheetPortal>
      </Sheet>
    </>
  );
}
