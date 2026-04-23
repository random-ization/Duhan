import { ReactNode, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { Button } from '../ui';
import { Sheet, SheetClose, SheetContent, SheetOverlay, SheetPortal, SheetTitle } from '../ui';
import { KT } from './ksoft/ksoft';

type MobileSheetHeight = 'half' | 'full' | 'auto';

export function MobileSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'half',
}: {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: MobileSheetHeight;
}) {
  const { t } = useTranslation();
  const titleId = useId();

  const heightClass =
    height === 'full'
      ? 'max-h-[90dvh] max-h-[90vh]'
      : height === 'half'
        ? 'max-h-[60dvh] max-h-[60vh]'
        : 'max-h-[80dvh] max-h-[80vh]';

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetPortal>
        <SheetOverlay
          unstyled
          className="md:hidden fixed inset-0 z-[80] transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none"
          style={{ background: 'rgba(31,27,23,0.34)' }}
          aria-hidden={!isOpen}
        />
        <SheetContent
          unstyled
          forceMount
          aria-label={title ? undefined : t('common.menu', { defaultValue: 'Sheet' })}
          aria-labelledby={title ? titleId : undefined}
          className={`md:hidden fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] transition-transform duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%]`}
        >
          <div
            className={`rounded-[26px] overflow-hidden flex flex-col ${heightClass}`}
            style={{
              background: KT.card,
              border: `1px solid ${KT.line}`,
              boxShadow: KT.shLg,
            }}
          >
            {title ? (
              <div
                className="px-3 py-3 flex items-center justify-between gap-2"
                style={{ background: KT.card, borderBottom: `1px solid ${KT.line}` }}
              >
                <SheetTitle
                  id={titleId}
                  className="text-[15px] font-black tracking-tight"
                  style={{ color: KT.ink }}
                >
                  {title}
                </SheetTitle>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="auto"
                    className="w-11 h-11 rounded-[14px] grid place-items-center select-none active:scale-95 transition-all"
                    style={{
                      border: `1px solid ${KT.line}`,
                      background: KT.bg2,
                    }}
                    aria-label={t('common.close', { defaultValue: 'Close' })}
                  >
                    <X size={18} />
                  </Button>
                </SheetClose>
              </div>
            ) : (
              <div
                className="px-3 py-3 flex justify-center"
                style={{ background: KT.card, borderBottom: `1px solid ${KT.line}` }}
              >
                <div className="w-12 h-1.5 rounded-full" style={{ background: KT.line2 }} />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3">{children}</div>
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
