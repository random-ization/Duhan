import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

interface MobileWorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack: () => void;
  backLabel: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function MobileWorkspaceHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  actions,
  children,
  className,
}: Readonly<MobileWorkspaceHeaderProps>) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b border-border/50 bg-background px-4 pt-[calc(var(--mobile-safe-top)+12px)] pb-7 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <Button
            variant="ghost"
            size="auto"
            onClick={onBack}
            className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-card shadow-sm active:scale-90 transition-all duration-200"
            aria-label={backLabel}
          >
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </Button>
          <div className="min-w-0 pt-0.5">
            {eyebrow ? (
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                {eyebrow}
              </div>
            ) : null}
            <h1 className="mt-1 text-2xl font-black italic tracking-tighter text-foreground leading-[1.15] text-balance uppercase">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-[11px] font-bold leading-relaxed text-muted-foreground/90 text-pretty">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2 pt-1">{actions}</div> : null}
      </div>
      {children ? <div className="mt-5">{children}</div> : null}
    </header>
  );
}
