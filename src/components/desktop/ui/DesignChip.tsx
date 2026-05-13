import React from 'react';
import { Badge } from '../../ui/badge';
import { cn } from '../../../lib/utils';

type Tone = 'muted' | 'pink' | 'mint' | 'butter' | 'lilac' | 'sky' | 'crimson' | 'ink';

interface DesignChipProps {
  children: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
}

export function DesignChip({ children, tone = 'muted', size = 'sm', className }: DesignChipProps) {
  // Mapping to K-Soft tokens directly or using Tailwind classes
  const toneClasses: Record<Tone, string> = {
    muted: 'bg-[rgba(31,27,23,0.05)] text-k-sub',
    pink: 'bg-k-pink text-[#7A2F26]',
    mint: 'bg-k-mint text-[#2F5847]',
    butter: 'bg-k-butter text-[#7A5F1F]',
    lilac: 'bg-k-lilac text-[#5A4985]',
    sky: 'bg-k-sky text-[#274D66]',
    crimson: 'bg-k-crimson text-k-card',
    ink: 'bg-k-ink text-k-card',
  };

  const sizeClasses = size === 'sm' ? 'px-[10px] py-[4px] text-[10px]' : 'px-[13px] py-[6px] text-[11px]';

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold tracking-[0.4px] font-k-sans leading-tight border-none',
        sizeClasses,
        toneClasses[tone] || toneClasses.muted,
        className
      )}
    >
      {children}
    </Badge>
  );
}
