import React, { ReactNode } from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps {
  children: ReactNode;
  className?: string;
  pad?: number | string;
  tone?: 'card' | 'bg2' | string;
  style?: React.CSSProperties;
}

export function Card({ children, className, pad = 20, tone = 'card', style }: CardProps) {
  const isCustomTone = tone !== 'card' && tone !== 'bg2';
  
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-k-xl shadow-k-sh',
          tone === 'card' && 'bg-k-card',
          tone === 'bg2' && 'bg-k-bg2',
          className
        )
      )}
      style={{
        padding: pad,
        ...(isCustomTone ? { background: tone } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
