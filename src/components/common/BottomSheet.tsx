import React, { ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

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
    height = 'half'
}: Readonly<BottomSheetProps>) {
    const sheetRef = useRef<HTMLDivElement>(null);

    // Close on escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    let heightClass = 'max-h-[80vh]';
    if (height === 'full') {
        heightClass = 'h-[90vh]';
    } else if (height === 'half') {
        heightClass = 'h-[60vh]';
    }

    return (
        <>
            {/* Backdrop */}
            <button
                type="button"
                aria-label="Close"
                className="fixed inset-0 bg-black/40 z-40 md:hidden animate-in fade-in duration-200 w-full h-full border-0 cursor-default"
                onClick={onClose}
            />

            {/* Sheet */}
            <div
                ref={sheetRef}
                className={`fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white rounded-t-[2rem] border-t-2 border-x-2 border-zinc-900 shadow-2xl ${heightClass} flex flex-col animate-in slide-in-from-bottom duration-300`}
            >
                {/* Handle */}
                <div className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing">
                    <div className="w-12 h-1.5 bg-zinc-300 rounded-full" />
                </div>

                {/* Header */}
                {title && (
                    <div className="flex items-center justify-between px-5 pb-3 border-b border-zinc-200">
                        <h3 className="font-black text-lg text-zinc-900">{title}</h3>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {children}
                </div>
            </div>
        </>
    );
}

export default BottomSheet;
