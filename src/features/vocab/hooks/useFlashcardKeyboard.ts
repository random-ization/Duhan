
import { useCallback, useEffect } from 'react';

interface UseFlashcardKeyboardProps {
    isFullscreen: boolean;
    setIsFullscreen: (value: boolean) => void;
    handleUndo: () => void;
    isFlipped: boolean;
    setIsFlipped: (value: boolean) => void;
    handleCardRate: (result: boolean | number) => void;
    ratingMode: 'PASS_FAIL' | 'FOUR_BUTTONS';
}

export const useFlashcardKeyboard = ({
    isFullscreen,
    setIsFullscreen,
    handleUndo,
    isFlipped,
    setIsFlipped,
    handleCardRate,
    ratingMode,
}: UseFlashcardKeyboardProps) => {

    const handleFlippedKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (ratingMode === 'PASS_FAIL') {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handleCardRate(false);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleCardRate(true);
                }
            } else {
                const rating = Number.parseInt(e.key, 10);
                if (rating >= 1 && rating <= 4) {
                    handleCardRate(rating);
                }
            }
        },
        [handleCardRate, ratingMode]
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (isFullscreen) {
                    setIsFullscreen(false);
                }
                return;
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                handleUndo();
                return;
            }

            if (isFlipped) {
                handleFlippedKeyDown(e);
            } else if (e.code === 'Space' || e.code === 'Enter') {
                e.preventDefault();
                setIsFlipped(true);
            }
        },
        [isFlipped, handleUndo, isFullscreen, handleFlippedKeyDown, setIsFlipped, setIsFullscreen]
    );

    useEffect(() => {
        globalThis.addEventListener('keydown', handleKeyDown);
        return () => globalThis.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};
