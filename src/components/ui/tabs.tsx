import * as React from 'react';
import { cn } from '../../lib/utils';

type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const context = React.useContext(TabsContext);
  if (!context) throw new Error(`${component} must be used within <Tabs>`);
  return context;
}

type TabsProps = Readonly<{
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}>;

function Tabs({ value, defaultValue = '', onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;

  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!isControlled) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange]
  );

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div data-slot="tabs" className={cn(className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

type TabsListProps = React.ComponentPropsWithoutRef<'div'>;

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(({ className, ...props }, ref) => {
  return (
    <div ref={ref} role="tablist" data-slot="tabs-list" className={cn(className)} {...props} />
  );
});
TabsList.displayName = 'TabsList';

type TabsTriggerProps = React.ComponentPropsWithoutRef<'button'> & {
  value: string;
};

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ className, value, onClick, ...props }, ref) => {
    const { value: currentValue, onValueChange } = useTabsContext('TabsTrigger');
    const isActive = currentValue === value;
    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        data-slot="tabs-trigger"
        data-state={isActive ? 'active' : 'inactive'}
        aria-selected={isActive}
        className={cn(className)}
        onClick={event => {
          onClick?.(event);
          if (!event.defaultPrevented) onValueChange(value);
        }}
        {...props}
      />
    );
  }
);
TabsTrigger.displayName = 'TabsTrigger';

type TabsContentProps = React.ComponentPropsWithoutRef<'div'> & {
  value: string;
  forceMount?: boolean;
};

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ className, value, forceMount = false, ...props }, ref) => {
    const { value: currentValue } = useTabsContext('TabsContent');
    const isActive = currentValue === value;
    if (!isActive && !forceMount) return null;
    return (
      <div
        ref={ref}
        role="tabpanel"
        data-slot="tabs-content"
        data-state={isActive ? 'active' : 'inactive'}
        hidden={!isActive}
        className={cn(className)}
        {...props}
      />
    );
  }
);
TabsContent.displayName = 'TabsContent';

export { Tabs, TabsList, TabsTrigger, TabsContent };
