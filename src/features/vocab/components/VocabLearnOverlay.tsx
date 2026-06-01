import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useLayoutActions, useLayoutChromeState } from '../../../contexts/LayoutContext';
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
  const isFullscreen = variant === 'fullscreen';
  const { sidebarHidden } = useLayoutChromeState();
  const { setSidebarHidden } = useLayoutActions();
  const latestSidebarHiddenRef = useRef(sidebarHidden);
  const previousSidebarHiddenRef = useRef<boolean | null>(null);

  useEffect(() => {
    latestSidebarHiddenRef.current = sidebarHidden;
  }, [sidebarHidden]);

  useEffect(() => {
    if (!open) return;

    // Capture once when opening so we can reliably restore on close.
    previousSidebarHiddenRef.current = latestSidebarHiddenRef.current;
    if (isFullscreen) {
      setSidebarHidden(true);
    }
    return () => {
      if (isFullscreen) {
        setSidebarHidden(previousSidebarHiddenRef.current ?? false);
      }
      previousSidebarHiddenRef.current = null;
    };
  }, [isFullscreen, open, setSidebarHidden]);

  useEffect(() => {
    if (!open || !isFullscreen || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isFullscreen, open]);

  if (!open) return null;

  const overlayContent = (
    <div
      className={`pointer-events-auto relative w-full h-full bg-k-bg overflow-hidden flex flex-col ${
        isFullscreen
          ? 'rounded-none border-0 shadow-none'
          : 'rounded-[32px] border border-k-divider shadow-2xl shadow-black/5'
      }`}
    >
      {headerContent !== undefined ? (
        headerContent
      ) : (
        <div className="flex items-center justify-between px-6 py-4 border-b border-k-divider bg-k-card/80 backdrop-blur-md">
          <div className="text-[18px] font-extrabold text-k-ink">
            {title || labels.learn || 'Learn'}
          </div>
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

      <div
        className={
          isFullscreen ? 'flex-1 overflow-hidden relative' : 'flex-1 overflow-auto relative'
        }
      >
        {children}
      </div>
    </div>
  );

  if (isFullscreen) {
    if (typeof document === 'undefined') return null;
    return createPortal(
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 101 }}>
        {overlayContent}
      </div>,
      document.body
    );
  }

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && onClose()}>
      <DialogPortal>
        <DialogOverlay
          unstyled
          className="fixed inset-0 bg-muted/70 backdrop-blur-sm"
          style={{ zIndex: 90 }}
          aria-label={labels.common?.close || 'Close'}
        />
        <DialogContent
          unstyled
          className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4 sm:p-8"
        >
          {overlayContent}
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
