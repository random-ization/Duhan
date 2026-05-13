import React from 'react';
import { cn } from '../../../lib/utils';
import { LogoIcon } from '../../ui/Logo';

interface HanjaSealProps {
  c: string;
  size?: number;
  color?: string;
  bg?: string;
  round?: number;
  className?: string;
}

const BRAND_CHARS = ['韓', '恆', '두'];

export function HanjaSeal({
  c,
  size = 40,
  color,
  bg,
  round = 8,
  className,
}: HanjaSealProps) {
  // If it's a brand character, show the new LogoIcon
  if (BRAND_CHARS.includes(c)) {
    return <LogoIcon size={size} className={className} />;
  }

  return (
    <div
      className={cn(
        'grid place-items-center font-k-serif font-medium leading-none tracking-tighter',
        className
      )}
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
