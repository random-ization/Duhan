import { Annotation } from '../types';

/**
 * Generate Tailwind CSS class string for a text segment based on its annotation.
 * - When the annotation has a note, we show a solid underline.
 * - When it is only a highlight, we show a background color block.
 * - When the annotation is active (selected/hovered), we use a stronger background and ring.
 */
export const getHighlightClasses = (
  annotation: Annotation,
  isActive: boolean,
  hasNote: boolean
): string => {
  const color = annotation.color || 'yellow';
  const colorMap: Record<
    string,
    { border: string; bg: string; activeBg: string; activeRing: string }
  > = {
    yellow: {
      border: 'border-yellow-400',
      bg: 'bg-yellow-200',
      activeBg: 'bg-yellow-300',
      activeRing: 'yellow-400',
    },
    green: {
      border: 'border-green-400',
      bg: 'bg-green-200',
      activeBg: 'bg-green-300',
      activeRing: 'green-400',
    },
    blue: {
      border: 'border-blue-400',
      bg: 'bg-blue-200',
      activeBg: 'bg-blue-300',
      activeRing: 'blue-400',
    },
    pink: {
      border: 'border-pink-400',
      bg: 'bg-pink-200',
      activeBg: 'bg-pink-300',
      activeRing: 'pink-400',
    },
  };

  const { border, bg, activeBg, activeRing } = colorMap[color] ?? colorMap['yellow'];

  let className =
    'relative rounded px-0 py-0.5 box-decoration-clone transition-all cursor-pointer ';

  if (isActive) {
    className += `${activeBg} ring-2 ring-${activeRing} `;
  } else if (hasNote) {
    className += `border-b-2 border-solid ${border} hover:${bg} `;
  } else {
    className += `${bg} `;
  }

  return className.trim();
};
