import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui';

type ConfirmDialogOptions = Readonly<{
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmText?: React.ReactNode;
  cancelText?: React.ReactNode;
  variant?: 'default' | 'destructive';
}>;

type ConfirmDialogContextValue = {
  confirm: (options?: ConfirmDialogOptions) => Promise<boolean>;
};

const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

const DEFAULT_OPTIONS: Required<ConfirmDialogOptions> = {
  title: 'Please confirm',
  description: 'Are you sure you want to continue?',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'default',
};

export function ConfirmDialogProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<Required<ConfirmDialogOptions>>(DEFAULT_OPTIONS);
  const resolverRef = useRef<((result: boolean) => void) | null>(null);

  const closeWith = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOpen(false);
  }, []);

  const confirm = useCallback((nextOptions?: ConfirmDialogOptions) => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setOptions({
      ...DEFAULT_OPTIONS,
      ...nextOptions,
    });
    setOpen(true);
    return new Promise<boolean>(resolve => {
      resolverRef.current = resolve;
    });
  }, []);

  const value = useMemo(
    () => ({
      confirm,
    }),
    [confirm]
  );

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={nextOpen => {
          if (!nextOpen) closeWith(false);
        }}
      >
        <AlertDialogContent className="max-w-md border-2 border-foreground rounded-2xl shadow-pop">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-black text-foreground">
              {options.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-semibold text-muted-foreground leading-relaxed">
              {options.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row justify-end gap-2">
            <AlertDialogCancel onClick={() => closeWith(false)}>
              {options.cancelText}
            </AlertDialogCancel>
            <AlertDialogAction variant={options.variant} onClick={() => closeWith(true)}>
              {options.confirmText}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmDialogContext.Provider>
  );
}

export function useConfirmDialog() {
  const ctx = useContext(ConfirmDialogContext);
  const hasWarnedRef = useRef(false);
  const fallbackConfirm = useCallback(async (options?: ConfirmDialogOptions) => {
    const merged = { ...DEFAULT_OPTIONS, ...options };
    if (typeof window === 'undefined') return false;
    return window.confirm(
      [merged.title, merged.description].filter(Boolean).map(String).join('\n\n')
    );
  }, []);

  useEffect(() => {
    if (!ctx && import.meta.env.DEV && !hasWarnedRef.current) {
      hasWarnedRef.current = true;
      console.warn(
        'ConfirmDialogProvider is unavailable for this render; falling back to window.confirm().'
      );
    }
  }, [ctx]);

  if (ctx) return ctx;

  return { confirm: fallbackConfirm };
}
