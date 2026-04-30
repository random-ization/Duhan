import React from 'react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SectionHeadProps {
  kanji?: string;
  title: string;
  action?: string;
  onActionClick?: () => void;
  className?: string;
}

export function SectionHead({ kanji, title, action, onActionClick, className }: SectionHeadProps) {
  return (
    <div
      className={twMerge(
        clsx('flex items-baseline justify-between px-1 mb-3', className)
      )}
    >
      <div className="flex items-baseline gap-2">
        {kanji && (
          <span className="font-k-serif text-base font-medium text-k-crimson opacity-85">
            {kanji}
          </span>
        )}
        <span className="text-[13px] font-extrabold tracking-[0.4px] text-k-ink">
          {title}
        </span>
      </div>
      {action && (
        <button
          onClick={onActionClick}
          className="text-[11px] font-semibold text-k-sub hover:text-k-ink transition-colors"
        >
          {action} →
        </button>
      )}
    </div>
  );
}
