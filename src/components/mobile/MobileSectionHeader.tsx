import React from 'react';
import { cn } from '../../lib/utils';
import { KT } from './ksoft/ksoft';

interface MobileSectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function MobileSectionHeader({
  eyebrow,
  title,
  description,
  badge,
  action,
  className,
}: Readonly<MobileSectionHeaderProps>) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div
            className="text-[10px] font-black uppercase tracking-[0.22em] mb-1.5"
            style={{ color: KT.crimson }}
          >
            {eyebrow}
          </div>
        )}
        <h3
          className={cn(
            'text-xl font-black tracking-tighter italic leading-tight text-balance uppercase'
          )}
          style={{ color: KT.ink }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="mt-2 text-[11px] font-semibold leading-relaxed text-pretty"
            style={{ color: KT.sub }}
          >
            {description}
          </p>
        )}
      </div>
      {(badge || action) && (
        <div className="flex shrink-0 items-center gap-2.5 pt-1">
          {badge}
          {action}
        </div>
      )}
    </div>
  );
}
