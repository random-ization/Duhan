import React from 'react';
import { cn } from '../../../lib/utils';

interface StreakRowProps {
  done?: number;
  labels?: string[];
  className?: string;
}

export function StreakRow({
  done = 5,
  labels = ['月', '火', '水', '木', '金', '土', '日'],
  className,
}: StreakRowProps) {
  return (
    <div className={cn('flex gap-1.5', className)}>
      {labels.map((d, i) => {
        const isDone = i < done;
        const isCurrent = i === done - 1;

        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className={cn(
                'relative grid aspect-square w-full place-items-center rounded-xl text-[13px] font-bold',
                isDone ? 'bg-k-mint text-[#2F5847]' : 'bg-[rgba(31,27,23,0.05)] text-k-sub'
              )}
            >
              {isDone ? '✓' : ''}
              {isCurrent && (
                <div className="absolute -right-1 -top-1 text-[12px]">🔥</div>
              )}
            </div>
            <div className="font-k-sans text-[10px] font-semibold text-k-sub">
              {d}
            </div>
          </div>
        );
      })}
    </div>
  );
}
