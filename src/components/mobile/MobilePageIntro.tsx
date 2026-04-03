import React from 'react';
import { cn } from '../../lib/utils';

interface MobilePageIntroProps {
  eyebrow: string;
  title: string;
  description: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function MobilePageIntro({
  eyebrow,
  title,
  description,
  badge,
  action,
  className,
}: Readonly<MobilePageIntroProps>) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[2.5rem] border border-border bg-card/50 p-6 shadow-sm backdrop-blur-md',
        className
      )}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200/50 bg-indigo-50/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-600 shadow-sm backdrop-blur-md dark:border-indigo-400/20 dark:bg-indigo-400/10 dark:text-indigo-200">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]" />
            {eyebrow}
          </div>
          <h1 className="mt-4 text-2xl sm:text-3xl font-black leading-[1.3] text-foreground tracking-tighter italic text-balance">
            {title}
          </h1>
          <p className="mt-3 max-w-[28rem] text-sm font-semibold leading-relaxed text-muted-foreground/80 text-pretty">
            {description}
          </p>
          {action && <div className="mt-4 flex flex-wrap items-center gap-2">{action}</div>}
        </div>
        {badge && (
          <div className="flex shrink-0 flex-col items-end gap-3 translate-y-1">{badge}</div>
        )}
      </div>
    </section>
  );
}
