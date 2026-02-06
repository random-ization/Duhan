import React, { ReactNode, useEffect, useId } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/button';

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

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  const heightClass =
    height === 'full'
      ? 'max-h-[90dvh] max-h-[90vh]'
      : height === 'half'
        ? 'max-h-[60dvh] max-h-[60vh]'
        : 'max-h-[80dvh] max-h-[80vh]';

  return (
    <>
      <div
        className={`md:hidden fixed inset-0 z-[80] bg-slate-900/35 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title ? undefined : 'Sheet'}
        aria-labelledby={title ? titleId : undefined}
        className={`md:hidden fixed inset-x-0 bottom-0 z-[90] px-3 pb-[calc(env(safe-area-inset-bottom)+12px)] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-[105%]'
        }`}
      >
        <div
          className={`bg-[#FDFBF7] border-2 border-slate-900 rounded-[26px] overflow-hidden shadow-[0_-14px_40px_rgba(0,0,0,0.18)] flex flex-col ${heightClass}`}
        >
          {title ? (
            <div className="bg-white border-b-2 border-slate-200 px-3 py-3 flex items-center justify-between gap-2">
              <div id={titleId} className="text-[15px] font-black tracking-tight text-slate-900">
                {title}
              </div>
              <Button
                type="button"
                variant="outline"
                size="auto"
                onClick={onClose}
                className="w-11 h-11 rounded-[14px] border-2 border-slate-900 bg-white shadow-pop-sm grid place-items-center select-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition"
                aria-label="Close"
              >
                <X size={18} />
              </Button>
            </div>
          ) : (
            <div className="bg-white border-b-2 border-slate-200 px-3 py-3 flex justify-center">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-3">{children}</div>
        </div>
      </section>
    </>
  );
}
