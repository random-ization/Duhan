import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

type PopoverContextValue = Readonly<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}>;

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext(component: string) {
  const context = React.useContext(PopoverContext);
  if (!context) {
    throw new Error(`${component} must be used within <Popover>`);
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

type PopoverProps = Readonly<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnEscape?: boolean;
  closeOnInteractOutside?: boolean;
  children: React.ReactNode;
}>;

function Popover({
  open,
  defaultOpen = false,
  onOpenChange,
  closeOnEscape = true,
  closeOnInteractOutside = true,
  children,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const controlled = open !== undefined;
  const actualOpen = controlled ? open : uncontrolledOpen;
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!controlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlled, onOpenChange]
  );

  React.useEffect(() => {
    if (!actualOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!closeOnInteractOutside) return;
      const target = event.target as Node | null;
      if (!target) return;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!closeOnEscape) return;
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [actualOpen, closeOnEscape, closeOnInteractOutside, setOpen]);

  return (
    <PopoverContext.Provider value={{ open: actualOpen, setOpen, triggerRef, contentRef }}>
      {children}
    </PopoverContext.Provider>
  );
}

type PopoverTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

function PopoverTrigger({ asChild = false, onClick, children, ...props }: PopoverTriggerProps) {
  const { open, setOpen, triggerRef } = usePopoverContext('PopoverTrigger');

  if (asChild && React.isValidElement(children)) {
    return (
      <span
        ref={node => {
          triggerRef.current = node;
        }}
        data-slot="popover-trigger"
        onClick={composeEventHandlers(onClick, () => setOpen(!open))}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      ref={node => {
        triggerRef.current = node as HTMLElement | null;
      }}
      type="button"
      data-slot="popover-trigger"
      onClick={composeEventHandlers(onClick, () => setOpen(!open))}
      {...props}
    >
      {children}
    </button>
  );
}

type PopoverAnchorProps = Readonly<{
  children: React.ReactNode;
}>;

function PopoverAnchor({ children }: PopoverAnchorProps) {
  const { triggerRef } = usePopoverContext('PopoverAnchor');
  return (
    <span
      ref={node => {
        triggerRef.current = node;
      }}
      data-slot="popover-anchor"
    >
      {children}
    </span>
  );
}

type PopoverCloseProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

function PopoverClose({ asChild = false, onClick, children, ...props }: PopoverCloseProps) {
  const { setOpen } = usePopoverContext('PopoverClose');

  if (asChild && React.isValidElement(children)) {
    return (
      <span data-slot="popover-close" onClick={composeEventHandlers(onClick, () => setOpen(false))}>
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      data-slot="popover-close"
      onClick={composeEventHandlers(onClick, () => setOpen(false))}
      {...props}
    >
      {children}
    </button>
  );
}

type PopoverPortalProps = Readonly<{
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}>;

function PopoverPortal({ children, container }: PopoverPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}

type PopoverContentProps = React.ComponentPropsWithoutRef<'div'> & {
  forceMount?: boolean;
  unstyled?: boolean;
};

const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ className, forceMount = false, unstyled = false, ...props }, ref) => {
    const { open, contentRef } = usePopoverContext('PopoverContent');
    if (!open && !forceMount) return null;

    return (
      <div
        ref={node => {
          contentRef.current = node;
          if (typeof ref === 'function') {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
        data-slot="popover-content"
        data-state={open ? 'open' : 'closed'}
        role="dialog"
        className={cn(
          !unstyled &&
            'absolute z-50 min-w-[10rem] rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md',
          className
        )}
        {...props}
      />
    );
  }
);
PopoverContent.displayName = 'PopoverContent';

export { Popover, PopoverTrigger, PopoverAnchor, PopoverClose, PopoverPortal, PopoverContent };
