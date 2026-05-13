import React from 'react';
import { cn } from '../../../lib/utils';

interface SectionHeadProps {
  kanji?: string;
  title: string;
  action?: string;
  onAction?: () => void;
  className?: string;
}

export function SectionHead({ kanji, title, action, onAction, className }: SectionHeadProps) {
  return (
    <div
      className={cn(
        'mb-3 flex items-baseline justify-between px-1',
        className
      )}
    >
      <div className="flex items-baseline gap-2">
        {kanji && (
          <span className="font-k-serif text-[16px] font-medium text-k-crimson/85">
            {kanji}
          </span>
        )}
        <span className="text-[13px] font-extrabold tracking-[0.4px] text-k-ink">
          {title}
        </span>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="text-[11px] font-semibold text-k-sub hover:text-k-ink transition-colors"
        >
          {action} →
        </button>
      )}
    </div>
  );
}
