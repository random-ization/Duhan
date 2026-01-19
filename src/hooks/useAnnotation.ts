import React, { useState, useRef, useCallback } from 'react';
import { Annotation } from '../types';

interface UseAnnotationReturn {
  contentRef: React.RefObject<HTMLDivElement | null>;
  currentSelectionRange: { start: number; end: number; text: string } | null;
  setCurrentSelectionRange: (range: { start: number; end: number; text: string } | null) => void;
  showAnnotationMenu: boolean;
  setShowAnnotationMenu: (show: boolean) => void;
  menuPosition: { top: number; left: number } | null;
  selectedColor: 'yellow' | 'green' | 'blue' | 'pink' | null;
  setSelectedColor: (color: 'yellow' | 'green' | 'blue' | 'pink' | null) => void;
  handleTextSelection: (e?: React.MouseEvent) => void;
  saveAnnotation: (
    colorOverride?: string | null,
    noteOverride?: string,
    shouldCloseMenu?: boolean
  ) => string | null;
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
  const [selectedColor, setSelectedColor] = useState<'yellow' | 'green' | 'blue' | 'pink' | null>(
    'yellow'
  );

  const currentAnnotations = annotations.filter(a => a.contextKey === contextKey);

  // Handle text selection
  const handleTextSelection = useCallback(
    (_e?: React.MouseEvent) => {
      // Renamed to handleTextSelection to match return type
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setShowAnnotationMenu(false);
        return;
      }

      if (!contentRef.current || !contentRef.current.contains(selection.anchorNode)) {
        setShowAnnotationMenu(false); // Hide menu if selection is outside contentRef
        return;
      }

      const text = selection.toString().trim();
      if (text) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();

        // Calculate start and end offsets relative to contentRef
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(contentRef.current);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        const start = preCaretRange.toString().length;
        const end = start + range.toString().length;

        setCurrentSelectionRange({ start, end, text });

        setMenuPosition({
          top: rect.bottom + window.scrollY + 10,
          left: rect.left + window.scrollX + rect.width / 2,
        });

        // Check if exact match exists
        const exactMatch = currentAnnotations.find(
          a => Math.abs((a.startOffset || 0) - start) < 2 && Math.abs((a.endOffset || 0) - end) < 2
        );

        if (exactMatch) {
          setSelectedColor((exactMatch.color as 'yellow' | 'green' | 'blue' | 'pink') || 'yellow');
        } else {
          setSelectedColor('yellow');
        }

        setShowAnnotationMenu(true);
      }
    },
    [currentAnnotations]
  );

  const saveAnnotation = useCallback(
    (colorOverride?: string | null, noteOverride?: string, shouldCloseMenu: boolean = true) => {
      if (!currentSelectionRange) return null;

      const exactMatch = currentAnnotations.find(
        a =>
          Math.abs((a.startOffset || 0) - currentSelectionRange.start) < 2 &&
          Math.abs((a.endOffset || 0) - currentSelectionRange.end) < 2
      );

      const finalColor = (colorOverride !== undefined ? colorOverride : selectedColor) as
        | 'yellow'
        | 'green'
        | 'blue'
        | 'pink'
        | null;
      const finalNote = noteOverride !== undefined ? noteOverride : exactMatch?.note || '';

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
        setCurrentSelectionRange(null);
        window.getSelection()?.removeAllRanges();
      }

      return newAnnotation.id;
    },
    [currentSelectionRange, currentAnnotations, contextKey, selectedColor, onSaveAnnotation]
  );

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
    cancelAnnotation,
  };
};
