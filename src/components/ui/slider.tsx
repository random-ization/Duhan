import * as React from 'react';

import { cn } from '../../lib/utils';

const Slider = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
  ({ className, type = 'range', ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        'w-full h-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-500',
        className
      )}
      {...props}
    />
  )
);

Slider.displayName = 'Slider';

export { Slider };
