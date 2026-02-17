import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useLayout } from '../../../contexts/LayoutContext';
import { getLabels } from '../../../utils/i18n';
import type { Language } from '../../../types';
import { Dialog, DialogContent, DialogOverlay, DialogPortal } from '../../../components/ui';
import { Button } from '../../../components/ui';

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  language: Language;
  title?: string;
  variant?: 'panel' | 'fullscreen';
  headerContent?: React.ReactNode;
  children: React.ReactNode;
}>;

export default function VocabLearnOverlay({
  open,
  onClose,
  language,
  title,
  variant = 'panel',
  headerContent,
  children,
}: Props) {
  const labels = getLabels(language);
  const { sidebarHidden, setSidebarHidden } = useLayout();
  const latestSidebarHiddenRef = useRef(sidebarHidden);
  const previousSidebarHiddenRef = useRef<boolean | null>(null);

  useEffect(() => {
    latestSidebarHiddenRef.current = sidebarHidden;
  }, [sidebarHidden]);

  useEffect(() => {
    if (!open) return;

    // Capture once when opening so we can reliably restore on close.
    previousSidebarHiddenRef.current = latestSidebarHiddenRef.current;
    setSidebarHidden(true);
    return () => {
      setSidebarHidden(previousSidebarHiddenRef.current ?? false);
      previousSidebarHiddenRef.current = null;
    };
  }, [open, setSidebarHidden]);

  if (!open) return null;

  const isFullscreen = variant === 'fullscreen';

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay
          unstyled
          className="fixed inset-0 z-[90] bg-muted/70 backdrop-blur-sm"
          aria-label="Close overlay"
        />
        <DialogContent
          unstyled
          className={`fixed inset-0 z-[91] pointer-events-none ${isFullscreen ? '' : 'p-3 sm:p-6'}`}
        >
          <div
            className={`pointer-events-auto relative w-full h-full bg-card overflow-hidden flex flex-col ${
              isFullscreen
                ? 'rounded-none border-0 shadow-none'
                : 'rounded-2xl border-2 border-foreground shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]'
            }`}
          >
            {headerContent ?? (
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="font-black text-foreground">{title || labels.learn || 'Learn'}</div>
                <Button
                  variant="ghost"
                  size="auto"
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 rounded-xl bg-muted hover:bg-muted flex items-center justify-center"
                  aria-label={labels.common?.close || 'Close'}
                >
                  <X className="w-5 h-5 text-muted-foreground" />
                </Button>
              </div>
            )}

            <div className={isFullscreen ? 'flex-1 overflow-hidden' : 'flex-1 overflow-auto'}>
              {children}
            </div>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
