import * as React from 'react';
import { cn } from '../../lib/utils';

type DropdownMenuContextValue = Readonly<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}>;

const DropdownMenuContext = React.createContext<DropdownMenuContextValue | null>(null);

function useDropdownMenuContext(component: string) {
  const context = React.useContext(DropdownMenuContext);
  if (!context) {
    throw new Error(`${component} must be used within <DropdownMenu>`);
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

type DropdownMenuProps = Readonly<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}>;

function DropdownMenu({ open, defaultOpen = false, onOpenChange, children }: DropdownMenuProps) {
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
      const target = event.target as Node | null;
      if (!target) return;
      if (contentRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
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
  }, [actualOpen, setOpen]);

  return (
    <DropdownMenuContext.Provider value={{ open: actualOpen, setOpen, triggerRef, contentRef }}>
      {children}
    </DropdownMenuContext.Provider>
  );
}

type DropdownMenuTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

function DropdownMenuTrigger({
  asChild = false,
  onClick,
  children,
  ...props
}: DropdownMenuTriggerProps) {
  const { open, setOpen, triggerRef } = useDropdownMenuContext('DropdownMenuTrigger');

  if (asChild && React.isValidElement(children)) {
    return (
      <span
        ref={node => {
          triggerRef.current = node;
        }}
        data-slot="dropdown-menu-trigger"
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
      data-slot="dropdown-menu-trigger"
      onClick={composeEventHandlers(onClick, () => setOpen(!open))}
      {...props}
    >
      {children}
    </button>
  );
}

type DropdownMenuAnchorProps = Readonly<{
  children: React.ReactNode;
}>;

function DropdownMenuAnchor({ children }: DropdownMenuAnchorProps) {
  const { triggerRef } = useDropdownMenuContext('DropdownMenuAnchor');
  return (
    <span
      ref={node => {
        triggerRef.current = node;
      }}
      data-slot="dropdown-menu-anchor"
    >
      {children}
    </span>
  );
}

type DropdownMenuContentProps = React.ComponentPropsWithoutRef<'div'> & {
  forceMount?: boolean;
  unstyled?: boolean;
};

const DropdownMenuContent = React.forwardRef<HTMLDivElement, DropdownMenuContentProps>(
  ({ className, forceMount = false, unstyled = false, ...props }, ref) => {
    const { open, contentRef } = useDropdownMenuContext('DropdownMenuContent');
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
        data-slot="dropdown-menu-content"
        data-state={open ? 'open' : 'closed'}
        role="menu"
        className={cn(
          !unstyled &&
            'absolute top-full left-0 mt-2 z-50 min-w-[10rem] rounded-md border border-border bg-card p-1 shadow-md',
          className
        )}
        {...props}
      />
    );
  }
);
DropdownMenuContent.displayName = 'DropdownMenuContent';

export { DropdownMenu, DropdownMenuTrigger, DropdownMenuAnchor, DropdownMenuContent };
