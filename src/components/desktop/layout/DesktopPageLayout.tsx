import React, { ReactNode } from 'react';
import clsx from 'clsx';

export interface DesktopPageLayoutProps {
  children: ReactNode;
  maxWidth?: 'default' | 'wide' | 'full';
  padding?: 'default' | 'none';
  className?: string;
}

export function DesktopPageLayout({
  children,
  maxWidth = 'default',
  padding = 'default',
  className,
}: DesktopPageLayoutProps) {
  const maxWidthClass = {
    default: 'max-w-[1200px]',
    wide: 'max-w-[1400px]',
    full: 'max-w-full',
  }[maxWidth];

  const paddingClass = {
    default: 'p-6 lg:p-8',
    none: 'p-0',
  }[padding];

  return (
    <div
      className={clsx(
        'mx-auto w-full',
        maxWidthClass,
        paddingClass,
        className
      )}
    >
      {children}
    </div>
  );
}

export interface DesktopSectionProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function DesktopSection({
  title,
  subtitle,
  action,
  children,
  className,
}: DesktopSectionProps) {
  return (
    <section className={clsx('space-y-4', className)}>
      {(title || subtitle || action) && (
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            {title && (
              <h2 className="text-xl font-bold text-k-ink">{title}</h2>
            )}
            {subtitle && (
              <p className="text-sm text-k-sub">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export interface DesktopGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function DesktopGrid({
  children,
  cols = 3,
  gap = 'md',
  className,
}: DesktopGridProps) {
  const colsClass = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  }[cols];

  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  return (
    <div className={clsx('grid', colsClass, gapClass, className)}>
      {children}
    </div>
  );
}

export interface DesktopStatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export function DesktopStatCard({
  label,
  value,
  icon,
  trend,
  className,
}: DesktopStatCardProps) {
  return (
    <div
      className={clsx(
        'bg-k-card rounded-k-lg p-4 shadow-k-sh-sm',
        'flex items-center gap-4',
        className
      )}
    >
      {icon && (
        <div className="w-10 h-10 rounded-k-md bg-k-bg2 flex items-center justify-center text-k-sub">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-k-sub truncate">{label}</p>
        <p className="text-xl font-bold text-k-ink">{value}</p>
        {trend && (
          <p
            className={clsx(
              'text-xs font-medium',
              trend.isPositive ? 'text-k-jade' : 'text-k-crimson'
            )}
          >
            {trend.isPositive ? '+' : ''}
            {trend.value}%
          </p>
        )}
      </div>
    </div>
  );
}

export interface DesktopEmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function DesktopEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: DesktopEmptyStateProps) {
  return (
    <div
      className={clsx(
        'bg-k-card rounded-k-xl p-8 shadow-k-sh text-center',
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 mx-auto mb-4 rounded-k-lg bg-k-bg2 flex items-center justify-center text-k-sub">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-k-ink mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-k-sub mb-4">{description}</p>
      )}
      {action}
    </div>
  );
}