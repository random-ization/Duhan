import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'auto';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingText?: React.ReactNode;
  loadingIconClassName?: string;
  asChild?: boolean;
}

const baseClasses =
  'inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap active:scale-[0.98]';

const variantClasses = {
  default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
  outline:
    'bg-background text-foreground border border-input shadow-sm hover:bg-accent hover:text-accent-foreground',
  secondary:
    'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 border border-transparent',
  ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  link: 'bg-transparent text-primary underline-offset-4 hover:underline',
} as const;

const sizeClasses = {
  default: 'h-10 px-4 py-2 rounded-xl text-sm',
  sm: 'h-9 px-3 rounded-lg text-sm',
  lg: 'h-11 px-8 rounded-xl text-base',
  icon: 'h-10 w-10 rounded-xl',
  auto: 'h-auto p-0',
} as const;

function composeEventHandlers<E>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void
) {
  return (event: E) => {
    theirHandler?.(event);
    ourHandler(event);
  };
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'default',
      size = 'default',
      loading = false,
      loadingText,
      loadingIconClassName,
      asChild = false,
      ...props
    },
    ref
  ) => {
    const { disabled, children, onClick, type, ...rest } = props;
    const isDisabled = Boolean(disabled || loading);
    const buttonType = type ?? 'button';
    const content = loading ? (
      <>
        <Loader2 className={cn('h-4 w-4 animate-spin', loadingIconClassName)} aria-hidden="true" />
        <span aria-live="polite">{loadingText ?? children}</span>
      </>
    ) : (
      children
    );
    const mergedClassName = cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      loading && 'cursor-wait gap-2',
      className
    );

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<Record<string, unknown>>;
      const childOnClick = child.props.onClick as React.MouseEventHandler<HTMLElement> | undefined;
      const childTabIndex = child.props.tabIndex as number | undefined;
      return React.cloneElement(child, {
        ...rest,
        'data-slot': 'button',
        'data-size': size,
        'data-variant': variant,
        'data-loading': loading ? 'true' : undefined,
        'aria-busy': loading || undefined,
        'aria-disabled': isDisabled || undefined,
        tabIndex: isDisabled ? -1 : childTabIndex,
        className: cn(mergedClassName, child.props.className as string | undefined),
        onClick: composeEventHandlers(childOnClick, event => {
          if (isDisabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event as React.MouseEvent<HTMLButtonElement>);
        }),
        children: content,
      });
    }

    return (
      <button
        data-slot="button"
        data-size={size}
        data-variant={variant}
        data-loading={loading ? 'true' : undefined}
        aria-busy={loading || undefined}
        ref={ref}
        className={mergedClassName}
        type={buttonType}
        disabled={isDisabled}
        onClick={onClick}
        {...rest}
      >
        {content}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button };
