import * as React from 'react';

import { cn } from '../../lib/utils';

export type SliderProps = React.ComponentPropsWithoutRef<'input'>;

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, type, ...props }, ref) => (
    <input
      data-slot="slider"
      ref={ref}
      type={type ?? 'range'}
      className={cn(
        'h-1 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
      {...props}
    />
  )
);

Slider.displayName = 'Slider';

export { Slider };
