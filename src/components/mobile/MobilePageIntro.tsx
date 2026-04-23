import React from 'react';
import { cn } from '../../lib/utils';
import { KT } from './ksoft/ksoft';

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
      className={cn('relative overflow-hidden rounded-[2.5rem] p-6 backdrop-blur-md', className)}
      style={{
        border: `1px solid ${KT.line}`,
        background: `${KT.card}E8`,
        boxShadow: KT.shSm,
      }}
    >
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] backdrop-blur-md"
            style={{
              border: `1px solid ${KT.line}`,
              background: `${KT.indigo}16`,
              color: KT.indigo,
              boxShadow: KT.shSm,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: KT.indigo,
                boxShadow: `0 0 8px ${KT.indigo}`,
              }}
            />
            {eyebrow}
          </div>
          <h1
            className="mt-4 text-2xl sm:text-3xl font-black leading-[1.3] tracking-tighter italic text-balance"
            style={{ color: KT.ink }}
          >
            {title}
          </h1>
          <p
            className="mt-3 max-w-[28rem] text-sm font-semibold leading-relaxed text-pretty"
            style={{ color: KT.sub }}
          >
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
