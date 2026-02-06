import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * Reusable Empty State component for list pages
 * Displays encouraging message and optional action button when data is empty
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <Card className={`border-dashed ${className}`}>
      <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
        {/* Icon Container */}
        <div className="w-20 h-20 bg-zinc-100 rounded-2xl border-2 border-zinc-200 flex items-center justify-center mb-6">
          <Icon className="w-10 h-10 text-zinc-400" />
        </div>

        {/* Title */}
        <h3 className="text-xl font-black text-zinc-700 mb-2">{title}</h3>

        {/* Description */}
        <p className="text-zinc-500 font-medium max-w-sm mb-6">{description}</p>

        {/* Action Button */}
        {actionLabel && onAction && (
          <Button
            type="button"
            size="auto"
            onClick={onAction}
            className="px-6 py-3 bg-lime-300 border-2 border-zinc-900 rounded-xl font-bold text-sm hover:bg-lime-400 shadow-[4px_4px_0px_0px_#18181B] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;
