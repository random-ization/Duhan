import React from 'react';
import { cn } from '../../../lib/utils';

interface DRailProps {
  kanji?: string;
  title: string;
  action?: string;
  onActionClick?: () => void;
  children: React.ReactNode;
  pad?: number;
  className?: string;
}

export function DRail({ kanji, title, action, onActionClick, children, pad = 14, className }: DRailProps) {
  return (
    <div className={cn("mb-[22px]", className)}>
      <div className="mb-2.5 flex items-baseline px-0.5">
        {kanji && (
          <span className="mr-1.5 font-k-serif text-[14px] font-medium text-k-crimson">
            {kanji}
          </span>
        )}
        <span className="text-[11px] font-extrabold tracking-[0.4px] text-k-ink">
          {title}
        </span>
        {action && (
          <span
            className={`ml-auto text-[10px] font-bold text-k-sub ${onActionClick ? 'cursor-pointer hover:text-k-ink' : ''}`}
            onClick={onActionClick}
          >
            {action}
          </span>
        )}
      </div>
      <div className="rounded-[14px] bg-k-card shadow-k-sh-sm" style={{ padding: pad }}>
        {children}
      </div>
    </div>
  );
}
