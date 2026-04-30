import React from 'react';

export interface HanjaSealProps {
  c: string;
  size?: number;
  color?: string;
  bg?: string;
  round?: number;
}

export function HanjaSeal({ c, size = 40, color, bg, round = 8 }: HanjaSealProps) {
  return (
    <div
      className="flex items-center justify-center k-serif font-medium leading-none tracking-tighter"
      style={{
        width: size,
        height: size,
        background: bg || 'var(--color-k-crimson, #A23B2E)',
        color: color || 'var(--color-k-card, #FFFFFF)',
        fontSize: size * 0.5,
        borderRadius: round,
        boxShadow: `inset 0 0 0 ${Math.max(1, size / 20)}px rgba(255,255,255,0.15)`,
      }}
    >
      {c}
    </div>
  );
}
