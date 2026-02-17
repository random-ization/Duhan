import * as React from 'react';
import { cn } from '../../lib/utils';

export type RadioProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>;

const Radio = React.forwardRef<HTMLInputElement, RadioProps>(({ className, ...props }, ref) => (
  <input
    data-slot="radio"
    ref={ref}
    type="radio"
    className={cn(
      'h-4 w-4 shrink-0 rounded-full border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      className
    )}
    {...props}
  />
));

Radio.displayName = 'Radio';

export { Radio };
