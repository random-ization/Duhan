import React from 'react';

interface SkeletonProps {
    className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
    return (
        <div className={`animate-pulse bg-slate-200 rounded-md ${className}`} />
    );
};

export const ContentSkeleton: React.FC = () => {
    return (
        <div className="p-6 space-y-6 max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </div>

            {/* Grid Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-4 border-2 border-slate-100 rounded-2xl space-y-3">
                        <Skeleton className="h-32 w-full rounded-xl" />
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                ))}
            </div>
        </div>
    );
};

export const VocabModuleSkeleton = () => (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex justify-between items-center">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <Skeleton className="w-48 h-10 rounded-xl" />
            <Skeleton className="w-32 h-10 rounded-xl" />
        </div>
        <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
        </div>
        <Skeleton className="h-[450px] rounded-[1.5rem] w-full" />
    </div>
);

export const ListeningModuleSkeleton = () => (
    <div className="w-full max-w-3xl mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="w-48 h-8 rounded-lg" />
            </div>
            <div className="flex gap-2">
                <Skeleton className="w-24 h-10 rounded-lg" />
                <Skeleton className="w-10 h-10 rounded-lg" />
            </div>
        </div>

        {/* Content Box */}
        <div className="border-2 border-slate-100 rounded-xl p-8 space-y-6 h-[500px]">
            <Skeleton className="w-48 h-8 rounded-lg mb-6" />
            {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="space-y-2">
                    <Skeleton className="w-full h-16 rounded-xl" />
                </div>
            ))}
        </div>

        {/* Player Bar */}
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-white border-t-2 border-slate-100 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 w-full max-w-3xl mx-auto">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="flex-1 h-2 rounded-full" />
                <Skeleton className="w-20 h-10 rounded-lg" />
            </div>
        </div>
    </div>
);

export const VideoLibrarySkeleton = () => (
    <div className="container mx-auto px-4 py-8">
        <div className="mb-8 space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl overflow-hidden border-2 border-gray-100">
                    <div className="aspect-video bg-gray-200 animate-pulse"></div>
                    <div className="p-4 space-y-3">
                        <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export const AdminDashboardSkeleton = () => (
    <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white p-6 rounded-2xl border-2 border-slate-100 h-32 animate-pulse"></div>
            ))}
        </div>
        <div className="bg-white p-6 rounded-2xl border-2 border-slate-100 h-96 animate-pulse"></div>
    </div>
);
