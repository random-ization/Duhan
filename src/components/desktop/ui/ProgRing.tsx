import React from 'react';
import { cn } from '../../../lib/utils';

interface ProgRingProps {
  pct?: number;
  size?: number;
  stroke?: number;
  color?: string;
  bg?: string;
  className?: string;
}

export function ProgRing({
  pct = 62,
  size = 56,
  stroke = 5,
  color,
  bg = 'rgba(31,27,23,0.1)',
  className,
}: ProgRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const c = color || 'var(--color-k-ink, #1F1B17)';

  return (
    <svg
      width={size}
      height={size}
      className={cn('-rotate-90', className)}
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle cx={size / 2} cy={size / 2} r={r} stroke={bg} strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={c}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}
