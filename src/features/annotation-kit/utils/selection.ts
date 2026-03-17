import type { AnnotationAnchor, AnnotationToolbarPosition } from '../types';

const WINDOW_PADDING = 12;
const CONTEXT_WINDOW = 36;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const getToolbarPositionFromRect = (
  rect: DOMRect,
  fallback?: { x: number; y: number }
): AnnotationToolbarPosition => {
  const maxX = globalThis.window.innerWidth - WINDOW_PADDING;
  const preferredLeft = rect.width > 0 ? rect.left + rect.width / 2 : fallback?.x ?? maxX / 2;
  const preferredTop = rect.top > 0 ? rect.top - 16 : (fallback?.y ?? 120) - 16;

  return {
    left: clamp(preferredLeft, WINDOW_PADDING, maxX),
    top: clamp(preferredTop, 72, globalThis.window.innerHeight - WINDOW_PADDING),
  };
};

export const buildAnchorFromRange = (
  range: Range,
  container: HTMLElement,
  blockId: string
): AnnotationAnchor | null => {
  if (!container.contains(range.commonAncestorContainer)) return null;

  const quote = range.toString().trim();
  if (!quote) return null;

  const containerRange = range.cloneRange();
  containerRange.selectNodeContents(container);
  containerRange.setEnd(range.startContainer, range.startOffset);
  const start = containerRange.toString().length;
  const end = start + range.toString().length;

  const content = container.innerText || container.textContent || '';
  const contextBefore = content.slice(Math.max(0, start - CONTEXT_WINDOW), start);
  const contextAfter = content.slice(end, end + CONTEXT_WINDOW);

  return {
    blockId,
    start,
    end,
    quote,
    contextBefore,
    contextAfter,
  };
};
