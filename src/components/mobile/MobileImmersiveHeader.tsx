import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui';
import { cn } from '../../lib/utils';

interface MobileImmersiveHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  onBack: () => void;
  backLabel: string;
  backIcon?: React.ReactNode;
  status?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  tone?: 'default' | 'inverse';
}

export function MobileImmersiveHeader({
  title,
  subtitle,
  eyebrow,
  onBack,
  backLabel,
  backIcon,
  status,
  actions,
  children,
  className,
  tone = 'default',
}: Readonly<MobileImmersiveHeaderProps>) {
  const isInverse = tone === 'inverse';

  return (
    <header
      className={cn(
        isInverse
          ? 'shrink-0 border-b border-white/10 bg-white/8 px-4 pt-[calc(var(--mobile-safe-top)+10px)] pb-3 backdrop-blur-xl'
          : 'shrink-0 border-b border-border bg-background/88 px-4 pt-[calc(var(--mobile-safe-top)+10px)] pb-3 backdrop-blur-xl',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Button
          variant="ghost"
          size="auto"
          onClick={onBack}
          className={cn(
            'grid h-11 w-11 shrink-0 place-items-center rounded-2xl active:scale-95',
            isInverse
              ? 'border border-white/15 bg-white/10 shadow-sm'
              : 'border border-border bg-card shadow-sm'
          )}
          aria-label={backLabel}
        >
          {backIcon ?? (
            <ArrowLeft className={cn('h-4 w-4', isInverse ? 'text-white' : 'text-foreground')} />
          )}
        </Button>

        <div className="min-w-0 flex-1">
          {eyebrow ? (
            <div
              className={cn(
                'text-[10px] font-black uppercase tracking-[0.18em]',
                isInverse ? 'text-white/70' : 'text-muted-foreground'
              )}
            >
              {eyebrow}
            </div>
          ) : null}

          <div className="mt-1 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className={cn(
                  'truncate text-base font-black tracking-tight',
                  isInverse ? 'text-white' : 'text-foreground'
                )}
              >
                {title}
              </h1>
              {subtitle ? (
                <p
                  className={cn(
                    'mt-1 line-clamp-2 text-sm font-semibold leading-5',
                    isInverse ? 'text-white/80' : 'text-muted-foreground'
                  )}
                >
                  {subtitle}
                </p>
              ) : null}
            </div>

            {status ? <div className="shrink-0">{status}</div> : null}
          </div>
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {children ? <div className="mt-4">{children}</div> : null}
    </header>
  );
}
