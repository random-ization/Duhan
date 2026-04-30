import React from 'react';
import clsx from 'clsx';

export interface ProgressRingProps {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  bg?: string;
  className?: string;
}

export function ProgressRing({
  pct = 0,
  size = 56,
  stroke = 5,
  color,
  bg,
  className,
}: ProgressRingProps) {
  const defaultColor = color || 'var(--color-k-ink, #1F1B17)';
  const defaultBg = bg || 'rgba(31,27,23,0.1)';
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clampedPct = Math.max(0, Math.min(100, pct));

  return (
    <svg
      width={size}
      height={size}
      className={clsx('-rotate-90', className)}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={defaultBg}
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={defaultColor}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - clampedPct / 100)}
        strokeLinecap="round"
        className="transition-all duration-500 ease-out"
      />
    </svg>
  );
}
