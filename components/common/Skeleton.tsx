import React from 'react';
import { clsx } from 'clsx';

// Base Skeleton component - supports different shapes and sizes
export const Skeleton: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
    className, 
    ...props 
}) => (
    <div 
        className={clsx('animate-pulse bg-slate-200 rounded', className)} 
        {...props} 
    />
);

// Text line skeleton - multiple lines of text placeholder
interface SkeletonTextProps {
    lines?: number;
    className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({ 
    lines = 3, 
    className 
}) => (
    <div className={clsx('space-y-3', className)}>
        {Array.from({ length: lines }).map((_, i) => (
            <Skeleton 
                key={i} 
                className={clsx(
                    'h-4',
                    i === lines - 1 ? 'w-2/3' : 'w-full'
                )} 
            />
        ))}
    </div>
);

// Avatar skeleton - circular placeholder for profile images
interface SkeletonAvatarProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({ 
    size = 'md' 
}) => {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-24 h-24'
    };

    return (
        <Skeleton 
            className={clsx('rounded-full', sizeClasses[size])} 
        />
    );
};

// Card skeleton - placeholder for card components
interface SkeletonCardProps {
    className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ 
    className 
}) => (
    <div className={clsx(
        'rounded-2xl border-[3px] border-slate-200 p-6 space-y-4',
        'shadow-[0_8px_30px_rgba(0,0,0,0.08)]',
        className
    )}>
        <Skeleton className="h-6 w-1/3" />
        <SkeletonText lines={2} />
    </div>
);

// Button skeleton - placeholder for buttons
interface SkeletonButtonProps {
    width?: 'sm' | 'md' | 'lg' | 'full';
}

export const SkeletonButton: React.FC<SkeletonButtonProps> = ({ 
    width = 'md' 
}) => {
    const widthClasses = {
        sm: 'w-20',
        md: 'w-32',
        lg: 'w-48',
        full: 'w-full'
    };

    return (
        <Skeleton 
            className={clsx('h-10 rounded-xl', widthClasses[width])} 
        />
    );
};
