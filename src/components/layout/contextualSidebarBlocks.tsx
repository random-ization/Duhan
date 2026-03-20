import React from 'react';
import { Button } from '../ui';

interface ContextualSectionProps {
  title: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  withRail?: boolean;
}

export const ContextualSection: React.FC<ContextualSectionProps> = ({
  title,
  badge,
  action,
  children,
  withRail = false,
}) => (
  <section>
    <div className="mb-1 flex items-center justify-between gap-2 px-3">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
        <h4 style={{ color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))' }}>{title}</h4>
        {badge}
      </div>
      <div
        className="text-[11px]"
        style={{ color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))' }}
      >
        {action}
      </div>
    </div>
    <div className="relative">
      {withRail ? (
        <div
          className="pointer-events-none absolute bottom-2 left-[1.1rem] top-2 w-px"
          style={{ backgroundColor: 'var(--sb-border, hsl(var(--border)))' }}
        />
      ) : null}
      <div className="space-y-0.5">{children}</div>
    </div>
  </section>
);

export const ContextualCountBadge: React.FC<{
  value: React.ReactNode;
  tone?: 'default' | 'accent' | 'warning' | 'success';
}> = ({ value, tone = 'default' }) => {
  const toneStyle =
    tone === 'accent'
      ? {
          backgroundColor: 'var(--sb-active-bg, hsl(var(--accent)))',
          color: 'var(--sb-active-text, hsl(var(--accent-foreground)))',
        }
      : tone === 'warning'
        ? { backgroundColor: 'hsl(36 90% 52% / 0.18)', color: 'hsl(30 90% 40%)' }
        : tone === 'success'
          ? {
              backgroundColor: 'var(--sb-success-bg, hsl(var(--secondary)))',
              color: 'var(--sb-success-text, hsl(var(--secondary-foreground)))',
            }
          : {
              backgroundColor: 'var(--sb-surface-muted, hsl(var(--muted)))',
              color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))',
            };

  return (
    <span
      className="inline-flex min-w-[1.35rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
      style={toneStyle}
    >
      {value}
    </span>
  );
};

export const ContextualListItemButton: React.FC<{
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  subtitle?: string;
  trailing?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon: Icon, label, subtitle, trailing, active = false, onClick }) => (
  <Button
    type="button"
    variant="ghost"
    size="auto"
    onClick={onClick}
    className="group relative z-10 flex w-full items-start gap-2.5 rounded-md px-3 py-1.5 text-left transition hover:bg-[var(--sb-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]"
    style={{
      backgroundColor: active ? 'var(--sb-active-bg, hsl(var(--accent)))' : 'transparent',
      color: active
        ? 'var(--sb-active-text, hsl(var(--accent-foreground)))'
        : 'var(--sb-text, hsl(var(--foreground)))',
    }}
  >
    {Icon ? (
      <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center">
        <Icon
          className="h-[15px] w-[15px]"
          style={{ color: active ? 'var(--sb-active-text)' : 'var(--sb-muted-text)' }}
        />
      </span>
    ) : null}
    <span className="min-w-0 flex-1">
      <span className="line-clamp-1 block text-[13px] font-medium">{label}</span>
      {subtitle ? (
        <span
          className="mt-0.5 line-clamp-1 block text-[11px]"
          style={{ color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))' }}
        >
          {subtitle}
        </span>
      ) : null}
    </span>
    {trailing ? <span className="shrink-0">{trailing}</span> : null}
  </Button>
);

export const ContextualEmptyState: React.FC<{
  icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  title: string;
  subtitle?: string;
}> = ({ icon: Icon, title, subtitle }) => (
  <div
    className="rounded-md px-3 py-6 text-center"
    style={{ backgroundColor: 'var(--sb-surface-muted, hsl(var(--muted)))' }}
  >
    {Icon ? (
      <span
        className="mx-auto mb-2 grid h-8 w-8 place-items-center rounded-full border"
        style={{ borderColor: 'var(--sb-border, hsl(var(--border)))' }}
      >
        <Icon
          className="h-4 w-4"
          style={{ color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))' }}
        />
      </span>
    ) : null}
    <p
      className="text-xs font-semibold"
      style={{ color: 'var(--sb-text, hsl(var(--foreground)))' }}
    >
      {title}
    </p>
    {subtitle ? (
      <p
        className="mt-1 text-[11px]"
        style={{ color: 'var(--sb-muted-text, hsl(var(--muted-foreground)))' }}
      >
        {subtitle}
      </p>
    ) : null}
  </div>
);

export const ContextualPrimaryActionButton: React.FC<{
  label: string;
  onClick: () => void;
}> = ({ label, onClick }) => (
  <Button
    type="button"
    variant="default"
    size="auto"
    onClick={onClick}
    className="w-full rounded-md px-3 py-2 text-sm font-semibold transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sb-focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sb-bg)]"
    style={{
      backgroundColor: 'var(--sb-active-bg, hsl(var(--accent)))',
      color: 'var(--sb-active-text, hsl(var(--accent-foreground)))',
    }}
  >
    {label}
  </Button>
);
