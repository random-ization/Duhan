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
  'inline-flex items-center justify-center font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap';

const variantClasses = {
  default:
    'bg-primary text-primary-foreground border-2 border-primary shadow-pop hover:translate-y-1 hover:shadow-none',
  destructive:
    'bg-destructive text-destructive-foreground border-2 border-destructive shadow-pop hover:translate-y-1 hover:shadow-none',
  outline:
    'bg-card text-foreground border-2 border-border hover:bg-accent hover:text-accent-foreground',
  secondary:
    'bg-secondary text-secondary-foreground border-2 border-border hover:bg-accent hover:text-accent-foreground',
  ghost:
    'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent',
  link: 'bg-transparent border border-transparent text-primary underline-offset-4 hover:underline shadow-none',
} as const;

const sizeClasses = {
  default: 'h-11 px-4 rounded-xl text-sm',
  sm: 'h-9 px-3 rounded-lg text-sm',
  lg: 'h-12 px-6 rounded-xl text-base',
  icon: 'h-10 w-10 rounded-full',
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
