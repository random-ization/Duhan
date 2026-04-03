import React from 'react';
import { cn } from '../../lib/utils';

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
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-600/70 dark:text-indigo-400/70 mb-1.5">
            {eyebrow}
          </div>
        )}
        <h3
          className={cn(
            'text-xl font-black text-foreground tracking-tighter italic leading-tight text-balance uppercase'
          )}
        >
          {title}
        </h3>
        {description && (
          <p className="mt-2 text-[11px] font-semibold leading-relaxed text-muted-foreground/80 text-pretty">
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
