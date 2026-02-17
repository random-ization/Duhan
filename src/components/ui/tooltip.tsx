import * as React from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';

type TooltipProviderContextValue = Readonly<{
  delayDuration: number;
}>;

const TooltipProviderContext = React.createContext<TooltipProviderContextValue>({
  delayDuration: 300,
});

type TooltipContextValue = Readonly<{
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
  openWithDelay: () => void;
  closeNow: () => void;
}>;

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltipContext(component: string) {
  const context = React.useContext(TooltipContext);
  if (!context) {
    throw new Error(`${component} must be used within <Tooltip>`);
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

type TooltipProviderProps = Readonly<{
  delayDuration?: number;
  children: React.ReactNode;
}>;

function TooltipProvider({ delayDuration = 300, children }: TooltipProviderProps) {
  return (
    <TooltipProviderContext.Provider value={{ delayDuration }}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

type TooltipProps = Readonly<{
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  children: React.ReactNode;
}>;

function Tooltip({
  open,
  defaultOpen = false,
  onOpenChange,
  delayDuration,
  children,
}: TooltipProps) {
  const { delayDuration: providerDelay } = React.useContext(TooltipProviderContext);
  const effectiveDelay = delayDuration ?? providerDelay;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const controlled = open !== undefined;
  const actualOpen = controlled ? open : uncontrolledOpen;
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const openTimeoutRef = React.useRef<number | null>(null);

  const clearOpenTimer = React.useCallback(() => {
    if (openTimeoutRef.current !== null) {
      window.clearTimeout(openTimeoutRef.current);
      openTimeoutRef.current = null;
    }
  }, []);

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!controlled) setUncontrolledOpen(nextOpen);
      onOpenChange?.(nextOpen);
    },
    [controlled, onOpenChange]
  );

  const openWithDelay = React.useCallback(() => {
    clearOpenTimer();
    if (effectiveDelay <= 0) {
      setOpen(true);
      return;
    }
    openTimeoutRef.current = window.setTimeout(() => {
      setOpen(true);
      openTimeoutRef.current = null;
    }, effectiveDelay);
  }, [clearOpenTimer, effectiveDelay, setOpen]);

  const closeNow = React.useCallback(() => {
    clearOpenTimer();
    setOpen(false);
  }, [clearOpenTimer, setOpen]);

  React.useEffect(() => () => clearOpenTimer(), [clearOpenTimer]);

  React.useEffect(() => {
    if (!actualOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (contentRef.current?.contains(target)) return;
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
    <TooltipContext.Provider
      value={{ open: actualOpen, setOpen, triggerRef, contentRef, openWithDelay, closeNow }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

type TooltipTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  asChild?: boolean;
};

function TooltipTrigger({
  asChild = false,
  onPointerEnter,
  onPointerLeave,
  onFocus,
  onBlur,
  children,
  ...props
}: TooltipTriggerProps) {
  const { triggerRef, openWithDelay, closeNow, setOpen } = useTooltipContext('TooltipTrigger');
  const handlePointerEnter = composeEventHandlers(onPointerEnter, () => openWithDelay());
  const handlePointerLeave = composeEventHandlers(onPointerLeave, () => closeNow());
  const handleFocus = composeEventHandlers(onFocus, () => setOpen(true));
  const handleBlur = composeEventHandlers(onBlur, () => closeNow());

  if (asChild && React.isValidElement(children)) {
    return (
      <span
        ref={node => {
          triggerRef.current = node;
        }}
        data-slot="tooltip-trigger"
        className="block"
        onPointerEnter={handlePointerEnter as unknown as React.PointerEventHandler<HTMLSpanElement>}
        onPointerLeave={handlePointerLeave as unknown as React.PointerEventHandler<HTMLSpanElement>}
        onFocus={handleFocus as unknown as React.FocusEventHandler<HTMLSpanElement>}
        onBlur={handleBlur as unknown as React.FocusEventHandler<HTMLSpanElement>}
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
      data-slot="tooltip-trigger"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {children}
    </button>
  );
}

type TooltipPortalProps = Readonly<{
  children: React.ReactNode;
  container?: Element | DocumentFragment | null;
}>;

function TooltipPortal({ children, container }: TooltipPortalProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  return createPortal(children, container ?? document.body);
}

type TooltipContentProps = React.ComponentPropsWithoutRef<'div'> & {
  forceMount?: boolean;
  unstyled?: boolean;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  alignOffset?: number;
};

const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      className,
      forceMount = false,
      unstyled = false,
      side = 'top',
      align = 'center',
      sideOffset = 8,
      alignOffset = 0,
      style,
      ...props
    },
    ref
  ) => {
    const { open, triggerRef, contentRef } = useTooltipContext('TooltipContent');
    const [positionStyle, setPositionStyle] = React.useState<React.CSSProperties>({});

    const updatePosition = React.useCallback(() => {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      let top = 0;
      let left = 0;
      let translateX = '-50%';
      let translateY = '-100%';

      if (side === 'top' || side === 'bottom') {
        top = side === 'top' ? rect.top - sideOffset : rect.bottom + sideOffset;
        if (align === 'start') {
          left = rect.left + alignOffset;
          translateX = '0';
        } else if (align === 'end') {
          left = rect.right + alignOffset;
          translateX = '-100%';
        } else {
          left = rect.left + rect.width / 2 + alignOffset;
          translateX = '-50%';
        }
        translateY = side === 'top' ? '-100%' : '0';
      } else {
        left = side === 'left' ? rect.left - sideOffset : rect.right + sideOffset;
        if (align === 'start') {
          top = rect.top + alignOffset;
          translateY = '0';
        } else if (align === 'end') {
          top = rect.bottom + alignOffset;
          translateY = '-100%';
        } else {
          top = rect.top + rect.height / 2 + alignOffset;
          translateY = '-50%';
        }
        translateX = side === 'left' ? '-100%' : '0';
      }

      setPositionStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        transform: `translate(${translateX}, ${translateY})`,
      });
    }, [align, alignOffset, side, sideOffset, triggerRef]);

    React.useEffect(() => {
      if (!open && !forceMount) return;
      updatePosition();

      const onUpdate = () => updatePosition();
      window.addEventListener('resize', onUpdate);
      window.addEventListener('scroll', onUpdate, true);
      return () => {
        window.removeEventListener('resize', onUpdate);
        window.removeEventListener('scroll', onUpdate, true);
      };
    }, [forceMount, open, updatePosition]);

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
        data-slot="tooltip-content"
        data-state={open ? 'open' : 'closed'}
        data-side={side}
        role="tooltip"
        className={cn(
          !unstyled &&
            'pointer-events-none z-50 max-w-[280px] rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-foreground shadow-md',
          className
        )}
        style={{ ...positionStyle, ...style }}
        {...props}
      />
    );
  }
);
TooltipContent.displayName = 'TooltipContent';

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipPortal, TooltipContent };
