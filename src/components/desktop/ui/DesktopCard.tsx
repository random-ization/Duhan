import React from 'react';
import { Card } from '../../ui/card';
import { cn } from '../../../lib/utils';

interface DesktopCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'card' | 'bg2' | string;
  pad?: number | string;
}

export function DesktopCard({
  className,
  tone = 'card',
  pad = 20,
  children,
  ...props
}: DesktopCardProps) {
  const bgClass = tone === 'card' ? 'bg-k-card' : tone === 'bg2' ? 'bg-k-bg2' : '';
  const bgColor = tone !== 'card' && tone !== 'bg2' ? tone : undefined;

  return (
    <Card
      className={cn(
        'border-none rounded-k-md shadow-k-sh overflow-hidden text-k-ink',
        bgClass,
        className
      )}
      style={{
        padding: pad,
        backgroundColor: bgColor,
      }}
      {...props}
    >
      {children}
    </Card>
  );
}
