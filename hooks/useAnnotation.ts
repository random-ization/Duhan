import React, { useState, useRef, useCallback } from 'react';
import { Annotation } from '../types';

interface UseAnnotationReturn {
    contentRef: React.RefObject<HTMLDivElement>;
    currentSelectionRange: { start: number; end: number; text: string } | null;
    setCurrentSelectionRange: (range: { start: number; end: number; text: string } | null) => void;
    showAnnotationMenu: boolean;
    setShowAnnotationMenu: (show: boolean) => void;
    menuPosition: { top: number; left: number } | null;
    selectedColor: 'yellow' | 'green' | 'blue' | 'pink';
    setSelectedColor: (color: 'yellow' | 'green' | 'blue' | 'pink') => void;
    handleTextSelection: (e?: React.MouseEvent) => void;
    saveAnnotation: (colorOverride?: string, noteOverride?: string, shouldCloseMenu?: boolean) => string | null;
    deleteAnnotation: () => void;
    cancelAnnotation: () => void;
}

export const useAnnotation = (
    contextKey: string,
    annotations: Annotation[],
    onSaveAnnotation: (annotation: Annotation) => void
): UseAnnotationReturn => {
    const contentRef = useRef<HTMLDivElement>(null);

    const [currentSelectionRange, setCurrentSelectionRange] = useState<{
        start: number;
        end: number;
        text: string;
    } | null>(null);

    const [showAnnotationMenu, setShowAnnotationMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
    const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink'>('yellow');

    const currentAnnotations = annotations.filter(a => a.contextKey === contextKey);

    const handleTextSelection = useCallback((e?: React.MouseEvent) => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            return;
        }

        if (!contentRef.current || !contentRef.current.contains(selection.anchorNode)) {
            return;
        }

        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(contentRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;
        const end = start + range.toString().length;
        const text = range.toString();

        if (text.trim().length === 0) return;

        setCurrentSelectionRange({ start, end, text });

        // Robust positioning fallback
        if ((rect.width === 0 && rect.height === 0) || (rect.top === 0 && rect.bottom === 0)) {
            if (e) {
                setMenuPosition({
                    top: e.clientY + window.scrollY - 10,
                    left: e.clientX + window.scrollX,
                });
            } else {
                setMenuPosition({
                    top: rect.top + window.scrollY - 10,
                    left: rect.left + rect.width / 2 + window.scrollX,
                });
            }
        } else {
            setMenuPosition({
                top: rect.top + window.scrollY - 10,
                left: rect.left + rect.width / 2 + window.scrollX,
            });
        }

        const exactMatch = currentAnnotations.find(
            a => Math.abs((a.startOffset || 0) - start) < 2 && Math.abs((a.endOffset || 0) - end) < 2
        );

        if (exactMatch) {
            setSelectedColor((exactMatch.color as 'yellow' | 'green' | 'blue' | 'pink') || 'yellow');
        } else {
            setSelectedColor('yellow');
        }

        setShowAnnotationMenu(true);
    }, [contextKey, currentAnnotations]);

    const saveAnnotation = useCallback((colorOverride?: string, noteOverride?: string, shouldCloseMenu: boolean = true) => {
        if (!currentSelectionRange) return null;

        const exactMatch = currentAnnotations.find(
            a =>
                Math.abs((a.startOffset || 0) - currentSelectionRange.start) < 2 &&
                Math.abs((a.endOffset || 0) - currentSelectionRange.end) < 2
        );

        const finalColor = (colorOverride !== undefined ? colorOverride : selectedColor) as 'yellow' | 'green' | 'blue' | 'pink' | null;
        const finalNote = noteOverride !== undefined ? noteOverride : (exactMatch?.note || '');

        const newAnnotation: Annotation = {
            id: exactMatch?.id || Date.now().toString(),
            contextKey,
            startOffset: currentSelectionRange.start,
            endOffset: currentSelectionRange.end,
            text: currentSelectionRange.text,
            color: finalColor,
            note: finalNote,
            timestamp: Date.now(),
        };

        onSaveAnnotation(newAnnotation);

        if (shouldCloseMenu) {
            setShowAnnotationMenu(false);
            setCurrentSelectionRange(null);
            window.getSelection()?.removeAllRanges();
        }

        return newAnnotation.id;
    }, [currentSelectionRange, currentAnnotations, contextKey, selectedColor, onSaveAnnotation]);

    const deleteAnnotation = useCallback(() => {
        if (!currentSelectionRange) return;
        const exactMatch = currentAnnotations.find(
            a =>
                Math.abs((a.startOffset || 0) - currentSelectionRange.start) < 2 &&
                Math.abs((a.endOffset || 0) - currentSelectionRange.end) < 2
        );
        if (exactMatch) {
            onSaveAnnotation({ ...exactMatch, color: null, note: '' }); // Treat as delete
        }
        setShowAnnotationMenu(false);
        setCurrentSelectionRange(null);
        window.getSelection()?.removeAllRanges();
    }, [currentSelectionRange, currentAnnotations, onSaveAnnotation]);

    const cancelAnnotation = useCallback(() => {
        setShowAnnotationMenu(false);
        setCurrentSelectionRange(null);
        window.getSelection()?.removeAllRanges();
    }, []);

    return {
        contentRef,
        currentSelectionRange,
        setCurrentSelectionRange,
        showAnnotationMenu,
        setShowAnnotationMenu,
        menuPosition,
        selectedColor,
        setSelectedColor,
        handleTextSelection,
        saveAnnotation,
        deleteAnnotation,
        cancelAnnotation
    };
};
