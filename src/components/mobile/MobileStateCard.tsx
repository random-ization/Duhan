import React from 'react';
import { cn } from '../../lib/utils';

interface MobileStateCardProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function MobileStateCard({
  icon,
  title,
  description,
  action,
  className,
}: Readonly<MobileStateCardProps>) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-sm dark:border-slate-700 dark:bg-slate-950/70',
        className
      )}
    >
      {icon && (
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
          {icon}
        </div>
      )}
      <p className={cn('text-base font-black text-foreground', icon ? 'mt-4' : '')}>{title}</p>
      {description && (
        <p className="mt-2 text-sm font-semibold leading-6 text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
