import * as React from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'solid' | 'outline' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'auto';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const baseClasses =
  'inline-flex items-center justify-center font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50';

const variantClasses: Record<ButtonVariant, string> = {
  solid:
    'bg-slate-900 text-white border-2 border-slate-900 shadow-pop hover:translate-y-1 hover:shadow-none',
  outline: 'bg-white text-slate-600 border-2 border-slate-900 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-transparent',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 rounded-lg text-sm',
  md: 'h-11 px-4 rounded-xl text-sm',
  lg: 'h-12 px-6 rounded-xl text-base',
  icon: 'h-10 w-10 rounded-full',
  auto: 'h-auto p-0',
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'solid', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';

export { Button };
