import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

type SheetContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

const SheetContext = React.createContext<SheetContextValue | null>(null);

function useSheetContext(component: string) {
  const context = React.useContext(SheetContext);
  if (!context) {
    throw new Error(`${component} must be used within <Sheet>`);
  }
  return context;
}

function composeEventHandlers<E>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void
) {
  return (event: E) => {
    theirHandler?.(event);
    ourHandler(event);
  };
}

type SheetProps = Readonly<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}>;

function Sheet({ open, defaultOpen = false, onOpenChange, children }: SheetProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const controlled = open !== undefined;
  const actualOpen = controlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!controlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlled, onOpenChange]
  );

  return (
    <SheetContext.Provider value={{ open: actualOpen, setOpen }}>{children}</SheetContext.Provider>
  );
}

type SheetPortalProps = Readonly<{
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}>;

function SheetPortal({ children, container }: SheetPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}

type SheetTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ asChild = false, onClick, children, ...props }, ref) => {
    const { setOpen } = useSheetContext('SheetTrigger');

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
      return React.cloneElement(child, {
        onClick: composeEventHandlers(child.props.onClick, () => setOpen(true)),
      });
    }

    return (
      <button
        ref={ref}
        data-slot="sheet-trigger"
        type="button"
        onClick={composeEventHandlers(onClick, () => setOpen(true))}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SheetTrigger.displayName = 'SheetTrigger';

type SheetCloseProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
  ({ asChild = false, onClick, children, ...props }, ref) => {
    const { setOpen } = useSheetContext('SheetClose');

    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<{ onClick?: (event: React.MouseEvent) => void }>;
      return React.cloneElement(child, {
        onClick: composeEventHandlers(child.props.onClick, () => setOpen(false)),
      });
    }

    return (
      <button
        ref={ref}
        data-slot="sheet-close"
        type="button"
        onClick={composeEventHandlers(onClick, () => setOpen(false))}
        {...props}
      >
        {children}
      </button>
    );
  }
);
SheetClose.displayName = 'SheetClose';

type SheetOverlayProps = React.ComponentPropsWithoutRef<'div'> & {
  forceMount?: boolean;
  unstyled?: boolean;
  closeOnClick?: boolean;
};

const SheetOverlay = React.forwardRef<HTMLDivElement, SheetOverlayProps>(
  (
    { className, forceMount = false, unstyled = false, closeOnClick = true, onClick, ...props },
    ref
  ) => {
    const { open, setOpen } = useSheetContext('SheetOverlay');
    if (!open && !forceMount) return null;

    return (
      <div
        ref={ref}
        data-slot="sheet-overlay"
        data-state={open ? 'open' : 'closed'}
        className={cn(
          'data-[state=closed]:pointer-events-none',
          !unstyled &&
            'fixed inset-0 z-50 bg-black/50 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
          className
        )}
        onClick={composeEventHandlers(onClick, () => {
          if (closeOnClick) setOpen(false);
        })}
        {...props}
      />
    );
  }
);
SheetOverlay.displayName = 'SheetOverlay';

type SheetContentProps = React.ComponentPropsWithoutRef<'div'> & {
  forceMount?: boolean;
  unstyled?: boolean;
  closeOnEscape?: boolean;
  lockBodyScroll?: boolean;
};

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  (
    {
      className,
      forceMount = false,
      unstyled = false,
      closeOnEscape = true,
      lockBodyScroll = true,
      ...props
    },
    ref
  ) => {
    const { open, setOpen } = useSheetContext('SheetContent');

    React.useEffect(() => {
      if (!open) return;

      const previousOverflow = document.body.style.overflow;
      const onEscape = (event: KeyboardEvent) => {
        if (event.key === 'Escape' && closeOnEscape) setOpen(false);
      };

      if (lockBodyScroll) document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', onEscape);

      return () => {
        if (lockBodyScroll) document.body.style.overflow = previousOverflow;
        document.removeEventListener('keydown', onEscape);
      };
    }, [closeOnEscape, lockBodyScroll, open, setOpen]);

    if (!open && !forceMount) return null;

    return (
      <div
        ref={ref}
        data-slot="sheet-content"
        data-state={open ? 'open' : 'closed'}
        role="dialog"
        aria-modal="true"
        className={cn(
          'data-[state=closed]:pointer-events-none',
          !unstyled && 'fixed z-50 bg-card shadow-lg',
          className
        )}
        {...props}
      />
    );
  }
);
SheetContent.displayName = 'SheetContent';

function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5', className)} {...props} />
  );
}

function SheetFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn('mt-2 flex justify-end gap-2', className)}
      {...props}
    />
  );
}

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.ComponentPropsWithoutRef<'h2'>>(
  ({ className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        data-slot="sheet-title"
        className={cn('text-lg font-semibold', className)}
        {...props}
      />
    );
  }
);
SheetTitle.displayName = 'SheetTitle';

const SheetDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<'p'>
>(({ className, ...props }, ref) => {
  return (
    <p
      ref={ref}
      data-slot="sheet-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
});
SheetDescription.displayName = 'SheetDescription';

export {
  Sheet,
  SheetPortal,
  SheetTrigger,
  SheetClose,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
