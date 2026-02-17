import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
} from './sheet';

const Dialog = Sheet;
const DialogTrigger = SheetTrigger;
const DialogClose = SheetClose;
const DialogPortal = SheetPortal;

type DialogOverlayProps = React.ComponentPropsWithoutRef<typeof SheetOverlay>;

const DialogOverlay = React.forwardRef<React.ElementRef<typeof SheetOverlay>, DialogOverlayProps>(
  ({ className, unstyled = false, ...props }, ref) => {
    return (
      <SheetOverlay
        ref={ref}
        data-slot="dialog-overlay"
        unstyled={unstyled}
        className={cn(
          !unstyled &&
            'fixed inset-0 z-50 bg-black/50 transition-opacity data-[state=open]:opacity-100 data-[state=closed]:opacity-0',
          className
        )}
        {...props}
      />
    );
  }
);
DialogOverlay.displayName = 'DialogOverlay';

type DialogContentProps = React.ComponentPropsWithoutRef<typeof SheetContent>;

const DialogContent = React.forwardRef<React.ElementRef<typeof SheetContent>, DialogContentProps>(
  ({ className, unstyled = false, ...props }, ref) => {
    return (
      <SheetContent
        ref={ref}
        data-slot="dialog-content"
        unstyled={unstyled}
        className={cn(
          !unstyled &&
            'fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-card shadow-2xl transition',
          className
        )}
        {...props}
      />
    );
  }
);
DialogContent.displayName = 'DialogContent';

function DialogHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div data-slot="dialog-header" className={cn('flex flex-col gap-1.5', className)} {...props} />
  );
}

function DialogFooter({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2', className)}
      {...props}
    />
  );
}

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof SheetTitle>,
  React.ComponentPropsWithoutRef<typeof SheetTitle>
>(({ className, ...props }, ref) => {
  return <SheetTitle ref={ref} data-slot="dialog-title" className={cn(className)} {...props} />;
});
DialogTitle.displayName = 'DialogTitle';

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof SheetDescription>,
  React.ComponentPropsWithoutRef<typeof SheetDescription>
>(({ className, ...props }, ref) => {
  return (
    <SheetDescription
      ref={ref}
      data-slot="dialog-description"
      className={cn(className)}
      {...props}
    />
  );
});
DialogDescription.displayName = 'DialogDescription';

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
