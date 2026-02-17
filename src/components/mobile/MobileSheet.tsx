import { ReactNode, useId } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import { Sheet, SheetClose, SheetContent, SheetOverlay, SheetPortal, SheetTitle } from '../ui';

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
          className="md:hidden fixed inset-0 z-[80] bg-primary/35 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none"
          aria-hidden={!isOpen}
        />
        <SheetContent
          unstyled
          forceMount
          aria-label={title ? undefined : 'Sheet'}
          aria-labelledby={title ? titleId : undefined}
          className={`md:hidden fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] transition-transform duration-300 ease-out data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%]`}
        >
          <div
            className={`bg-[#FDFBF7] border-2 border-foreground rounded-[26px] overflow-hidden shadow-[0_-14px_40px_rgba(0,0,0,0.18)] flex flex-col ${heightClass}`}
          >
            {title ? (
              <div className="bg-card border-b-2 border-border px-3 py-3 flex items-center justify-between gap-2">
                <SheetTitle
                  id={titleId}
                  className="text-[15px] font-black tracking-tight text-foreground"
                >
                  {title}
                </SheetTitle>
                <SheetClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="auto"
                    className="w-11 h-11 rounded-[14px] border-2 border-foreground bg-card shadow-pop-sm grid place-items-center select-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
                    aria-label="Close"
                  >
                    <X size={18} />
                  </Button>
                </SheetClose>
              </div>
            ) : (
              <div className="bg-card border-b-2 border-border px-3 py-3 flex justify-center">
                <div className="w-12 h-1.5 bg-muted rounded-full" />
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-3">{children}</div>
          </div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}
