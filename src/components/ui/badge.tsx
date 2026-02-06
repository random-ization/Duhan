import * as React from 'react';

import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'secondary' | 'outline';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-slate-900 text-white',
  secondary: 'bg-slate-100 text-slate-600',
  outline: 'border border-slate-200 text-slate-600',
};

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold leading-none',
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = 'Badge';

export { Badge };
