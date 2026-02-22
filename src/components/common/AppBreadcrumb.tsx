import React from 'react';
import { LocalizedLink } from '../LocalizedLink';
import { cn } from '../../lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem as UiBreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui';

export type BreadcrumbItem = {
  label: React.ReactNode;
  to?: string;
};

type AppBreadcrumbProps = Readonly<{
  items: BreadcrumbItem[];
  className?: string;
}>;

export function AppBreadcrumb({ items, className }: AppBreadcrumbProps) {
  if (!items || items.length === 0) return null;

  return (
    <Breadcrumb className={cn('text-xs', className)} aria-label="Breadcrumb">
      <BreadcrumbList className="flex items-center gap-1.5 text-muted-foreground">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const labelText = typeof item.label === 'string' ? item.label : undefined;
          return (
            <React.Fragment key={`crumb-${index}`}>
              <UiBreadcrumbItem className="min-w-0">
                {item.to && !isLast ? (
                  <LocalizedLink
                    to={item.to}
                    className="hover:text-foreground transition-colors whitespace-nowrap"
                    title={labelText}
                  >
                    {item.label}
                  </LocalizedLink>
                ) : (
                  <BreadcrumbPage
                    className={cn(
                      'truncate',
                      isLast
                        ? 'text-foreground font-semibold'
                        : 'whitespace-nowrap text-muted-foreground'
                    )}
                    title={labelText}
                  >
                    {item.label}
                  </BreadcrumbPage>
                )}
              </UiBreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
