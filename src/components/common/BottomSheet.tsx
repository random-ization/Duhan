import { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import { Sheet, SheetClose, SheetContent, SheetOverlay, SheetPortal, SheetTitle } from '../ui';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: 'half' | 'full' | 'auto';
}

/**
 * Mobile Bottom Sheet component
 * Slides up from bottom of screen on mobile devices
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = 'half',
}: Readonly<BottomSheetProps>) {
  let heightClass = 'max-h-[80vh]';
  if (height === 'full') {
    heightClass = 'h-[90vh]';
  } else if (height === 'half') {
    heightClass = 'h-[60vh]';
  }

  return (
    <Sheet open={isOpen} onOpenChange={open => !open && onClose()}>
      <SheetPortal>
        {/* Backdrop */}
        <SheetOverlay
          unstyled
          className="fixed inset-0 z-40 md:hidden bg-black/40 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0 data-[state=closed]:pointer-events-none"
        />

        {/* Sheet */}
        <SheetContent
          unstyled
          forceMount
          className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card rounded-t-[2rem] border-t-2 border-x-2 border-foreground shadow-2xl ${heightClass} flex flex-col transition-transform duration-300 data-[state=open]:translate-y-0 data-[state=closed]:translate-y-[105%]`}
        >
          {/* Handle */}
          <div className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-1.5 bg-muted rounded-full" />
          </div>

          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-5 pb-3 border-b border-border">
              <SheetTitle className="font-black text-lg text-foreground">{title}</SheetTitle>
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="auto"
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-5 h-5" />
                </Button>
              </SheetClose>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
}

export default BottomSheet;
