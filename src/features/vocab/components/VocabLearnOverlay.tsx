import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../../contexts/AppContext';
import { getLabels } from '../../../utils/i18n';
import type { Language } from '../../../types';

type Props = Readonly<{
  open: boolean;
  onClose: () => void;
  language: Language;
  title?: string;
  variant?: 'panel' | 'fullscreen';
  children: React.ReactNode;
}>;

export default function VocabLearnOverlay({
  open,
  onClose,
  language,
  title,
  variant = 'panel',
  children,
}: Props) {
  const labels = getLabels(language);
  const { sidebarHidden, setSidebarHidden } = useApp();
  const previousSidebarHiddenRef = useRef(sidebarHidden);

  useEffect(() => {
    if (!open) return;

    previousSidebarHiddenRef.current = sidebarHidden;
    setSidebarHidden(true);
    return () => setSidebarHidden(previousSidebarHiddenRef.current);
  }, [open, setSidebarHidden, sidebarHidden]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isFullscreen = variant === 'fullscreen';

  return (
    <div className="fixed inset-0 z-[90] bg-slate-950/70 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        aria-label="Close overlay"
      />
      <div className={`absolute inset-0 ${isFullscreen ? '' : 'p-3 sm:p-6'}`}>
        <div
          className={`relative w-full h-full bg-white overflow-hidden flex flex-col ${
            isFullscreen
              ? 'rounded-none border-0 shadow-none'
              : 'rounded-2xl border-2 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]'
          }`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <div className="font-black text-slate-900">{title || labels.learn || 'Learn'}</div>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
              aria-label={labels.common?.close || 'Close'}
            >
              <X className="w-5 h-5 text-slate-700" />
            </button>
          </div>

          <div className="flex-1 overflow-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}
