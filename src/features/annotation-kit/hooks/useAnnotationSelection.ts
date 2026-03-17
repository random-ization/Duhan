import { useCallback, useState, type RefObject } from 'react';
import { useOutsideDismiss } from '../../../hooks/useOutsideDismiss';
import type { AnnotationToolbarState } from '../types';
import { buildAnchorFromRange, getToolbarPositionFromRect } from '../utils/selection';

interface UseAnnotationSelectionOptions {
  containerRef: RefObject<HTMLElement | null>;
  ignoreSelectors?: readonly string[];
}

const DEFAULT_STATE: AnnotationToolbarState = {
  visible: false,
  position: null,
  selectionText: '',
  anchor: null,
};

export const useAnnotationSelection = ({
  containerRef,
  ignoreSelectors = ['[data-annotation-toolbar]'],
}: UseAnnotationSelectionOptions) => {
  const [toolbar, setToolbar] = useState<AnnotationToolbarState>(DEFAULT_STATE);

  const closeToolbar = useCallback(() => {
    setToolbar(DEFAULT_STATE);
    globalThis.window.getSelection()?.removeAllRanges();
  }, []);

  useOutsideDismiss({
    enabled: toolbar.visible,
    onDismiss: closeToolbar,
    ignoreSelectors,
  });

  const captureSelection = useCallback(
    (blockId: string, e?: React.MouseEvent | MouseEvent) => {
      const selection = globalThis.window.getSelection();
      const container = containerRef.current;

      if (!selection || selection.rangeCount === 0 || !container) {
        closeToolbar();
        return null;
      }

      const text = selection.toString().trim();
      if (!text) {
        closeToolbar();
        return null;
      }

      const range = selection.getRangeAt(0);
      const anchor = buildAnchorFromRange(range, container, blockId);
      if (!anchor) {
        closeToolbar();
        return null;
      }

      const rect = range.getBoundingClientRect();
      const position = getToolbarPositionFromRect(rect,
        e ? { x: e.clientX, y: e.clientY } : undefined
      );

      setToolbar({
        visible: true,
        position,
        selectionText: anchor.quote,
        anchor,
      });

      return anchor;
    },
    [containerRef, closeToolbar]
  );

  return {
    toolbar,
    setToolbar,
    captureSelection,
    closeToolbar,
  };
};

export default useAnnotationSelection;
