import React, { useState } from 'react';
import { Book, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

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
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-slate-50 border-2 border-slate-900 rounded-xl px-3 py-1.5 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] active:translate-y-0.5 active:shadow-none transition-all"
      >
        <Book className="w-4 h-4 text-indigo-600" />
        <div className="text-left">
          <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
            {t('vocab.currentScope', { defaultValue: 'Current Scope' })}
          </div>
          <div className="text-xs font-black text-slate-900 leading-none">
            {getLabel(currentUnitId)}
          </div>
        </div>
        <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/50 z-[100] backdrop-blur-sm"
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[101] max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                <h3 className="font-black text-lg text-slate-900">
                  {t('vocab.selectScope', { defaultValue: 'Select Scope' })}
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center active:bg-slate-200"
                >
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {/* All Units Option */}
                <button
                  onClick={() => {
                    onSelect('ALL');
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    currentUnitId === 'ALL'
                      ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                      : 'bg-white border-slate-100 active:scale-[0.99]'
                  }`}
                >
                  <div className="text-left">
                    <div
                      className={`font-bold ${currentUnitId === 'ALL' ? 'text-indigo-700' : 'text-slate-900'}`}
                    >
                      {t('vocab.allUnits', { defaultValue: 'All Units' })}
                    </div>
                    <div className="text-xs text-slate-500 font-medium">
                      {allWordsCount} {t('vocab.words', { defaultValue: 'words' })}
                    </div>
                  </div>
                  {currentUnitId === 'ALL' && (
                    <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>

                <div className="h-px bg-slate-100 my-2" />

                {/* Individual Units */}
                {availableUnits.map(u => {
                  const count = unitCounts.get(u) || 0;
                  const isSelected = currentUnitId === u;
                  const isDisabled = count === 0;

                  return (
                    <button
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
                            ? 'bg-slate-50 border-transparent opacity-50'
                            : 'bg-white border-slate-100 active:scale-[0.99]'
                      }`}
                    >
                      <div className="text-left">
                        <div
                          className={`font-bold ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}
                        >
                          {u === 0
                            ? t('vocab.unassigned', { defaultValue: 'Unassigned' })
                            : `${t('vocab.unit', { defaultValue: 'Unit' })} ${u}`}
                        </div>
                        <div className="text-xs text-slate-500 font-medium">
                          {count} {t('vocab.words', { defaultValue: 'words' })}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
