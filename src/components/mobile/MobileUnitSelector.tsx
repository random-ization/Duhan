import { useState, type CSSProperties } from 'react';
import { Book, ChevronDown, Check, X } from 'lucide-react';
import { m as motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sheet, SheetContent, SheetOverlay, SheetPortal } from '../ui';
import { KT } from './ksoft/ksoft';

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

  const triggerStyle: CSSProperties =
    variant === 'minimal'
      ? {
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: KT.bg2,
          border: `1px solid ${KT.line}`,
          borderRadius: 20,
          padding: '5px 12px',
          cursor: 'pointer',
          minWidth: 0,
          overflow: 'hidden',
          fontFamily: KT.font,
        }
      : {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: KT.bg2,
          border: `1px solid ${KT.line}`,
          borderRadius: 20,
          padding: '8px 16px',
          cursor: 'pointer',
          boxShadow: KT.shSm,
          fontFamily: KT.font,
        };

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} style={triggerStyle}>
        <Book size={variant === 'minimal' ? 13 : 15} style={{ color: KT.crimson, flexShrink: 0 }} />
        <div style={{ textAlign: 'left', minWidth: 0 }}>
          {variant !== 'minimal' && (
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: KT.subLight,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                lineHeight: 1,
                marginBottom: 2,
              }}
            >
              {t('vocab.currentScope', { defaultValue: 'Current Scope' })}
            </div>
          )}
          <div
            style={{
              fontSize: variant === 'minimal' ? 11 : 12,
              fontWeight: 800,
              color: KT.ink,
              lineHeight: 1.1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getLabel(currentUnitId)}
          </div>
        </div>
        <ChevronDown
          size={variant === 'minimal' ? 11 : 13}
          style={{ color: KT.sub, flexShrink: 0 }}
        />
      </button>

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
              style={{
                pointerEvents: 'auto',
                background: KT.card,
                borderTopLeftRadius: 32,
                borderTopRightRadius: 32,
                maxHeight: '85vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 -12px 40px rgba(31,27,23,0.18)',
                borderTop: `1px solid ${KT.line}`,
                fontFamily: KT.font,
              }}
            >
              {/* Drag handle */}
              <div
                style={{
                  margin: '12px auto 0',
                  width: 44,
                  height: 5,
                  borderRadius: 3,
                  background: KT.line2,
                }}
              />

              {/* Header */}
              <div
                style={{
                  padding: '18px 22px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexShrink: 0,
                }}
              >
                <h3
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: KT.ink,
                    letterSpacing: -0.5,
                  }}
                >
                  {t('vocab.selectScope', { defaultValue: 'Select Scope' })}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: '50%',
                    background: KT.bg2,
                    border: `1px solid ${KT.line}`,
                    color: KT.sub,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options list */}
              <div
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0 18px',
                  paddingBottom: 'calc(env(safe-area-inset-bottom) + 28px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {/* All Units */}
                <button
                  type="button"
                  onClick={() => {
                    onSelect('ALL');
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 16px',
                    borderRadius: 18,
                    border:
                      currentUnitId === 'ALL' ? `2px solid ${KT.crimson}` : `1px solid ${KT.line}`,
                    background: currentUnitId === 'ALL' ? 'rgba(162,59,46,0.06)' : KT.card,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: KT.font,
                    boxShadow: KT.shSm,
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 800,
                        color: currentUnitId === 'ALL' ? KT.crimson : KT.ink,
                      }}
                    >
                      {t('vocab.allUnits', { defaultValue: 'All Units' })}
                    </div>
                    <div style={{ fontSize: 12, color: KT.sub, fontWeight: 600, marginTop: 2 }}>
                      {allWordsCount} {t('vocab.words', { defaultValue: 'words' })}
                    </div>
                  </div>
                  {currentUnitId === 'ALL' && (
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: KT.crimson,
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Check size={14} style={{ color: '#fff' }} />
                    </div>
                  )}
                </button>

                {/* Divider */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '4px 6px',
                  }}
                >
                  <div style={{ height: 1, flex: 1, background: KT.line }} />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: 1.5,
                      textTransform: 'uppercase',
                      color: KT.subLight,
                    }}
                  >
                    Individual Units
                  </span>
                  <div style={{ height: 1, flex: 1, background: KT.line }} />
                </div>

                {/* Individual units */}
                {availableUnits.map(u => {
                  const count = unitCounts.get(u) || 0;
                  const isSelected = currentUnitId === u;
                  const isDisabled = count === 0;

                  return (
                    <button
                      type="button"
                      key={u}
                      disabled={isDisabled}
                      onClick={() => {
                        onSelect(u);
                        setIsOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: 18,
                        border: isSelected ? `2px solid ${KT.crimson}` : `1px solid ${KT.line}`,
                        background: isSelected
                          ? 'rgba(162,59,46,0.06)'
                          : isDisabled
                            ? KT.bg2
                            : KT.card,
                        cursor: isDisabled ? 'default' : 'pointer',
                        textAlign: 'left',
                        opacity: isDisabled ? 0.45 : 1,
                        fontFamily: KT.font,
                        boxShadow: isDisabled ? 'none' : KT.shSm,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 800,
                            color: isSelected ? KT.crimson : KT.ink,
                          }}
                        >
                          {u === 0
                            ? t('vocab.unassigned', { defaultValue: 'Unassigned' })
                            : `${t('vocab.unit', { defaultValue: 'Unit' })} ${u}`}
                        </div>
                        <div style={{ fontSize: 12, color: KT.sub, fontWeight: 600, marginTop: 2 }}>
                          {count} {t('vocab.words', { defaultValue: 'words' })}
                        </div>
                      </div>
                      {isSelected && (
                        <div
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            background: KT.crimson,
                            display: 'grid',
                            placeItems: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Check size={14} style={{ color: '#fff' }} />
                        </div>
                      )}
                    </button>
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
