import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export type ChipTone = 'muted' | 'pink' | 'mint' | 'butter' | 'lilac' | 'sky' | 'crimson' | 'ink';
export type ChipSize = 'sm' | 'md';

export interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  size?: ChipSize;
  className?: string;
}

const TONES: Record<ChipTone, string> = {
  muted: 'bg-[rgba(31,27,23,0.05)] text-k-sub',
  pink: 'bg-k-pink text-[#7A2F26]',
  mint: 'bg-k-mint text-[#2F5847]',
  butter: 'bg-k-butter text-[#7A5F1F]',
  lilac: 'bg-k-lilac text-[#5A4985]',
  sky: 'bg-k-sky text-[#274D66]',
  crimson: 'bg-k-crimson text-k-card',
  ink: 'bg-k-ink text-k-card',
};

const SIZES: Record<ChipSize, string> = {
  sm: 'px-[10px] py-[4px] text-[10px]',
  md: 'px-[13px] py-[6px] text-[11px]',
};

export function Chip({ children, tone = 'muted', size = 'sm', className }: ChipProps) {
  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 rounded-full font-bold tracking-[0.4px] leading-[1.2] font-k-sans',
          TONES[tone],
          SIZES[size],
          className
        )
      )}
    >
      {children}
    </span>
  );
}
