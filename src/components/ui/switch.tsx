import * as React from 'react';

import { cn } from '../../lib/utils';

export interface SwitchProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange'
> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        data-state={checked ? 'checked' : 'unchecked'}
        disabled={disabled}
        onClick={event => {
          props.onClick?.(event);
          if (event.defaultPrevented) return;
          onCheckedChange?.(!checked);
        }}
        className={cn(
          'relative inline-flex h-6 w-11 items-center rounded-full border border-transparent transition-colors',
          checked ? 'bg-indigo-600' : 'bg-slate-300',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-1'
          )}
        />
      </button>
    );
  }
);

Switch.displayName = 'Switch';

export { Switch };
