import React from 'react';
import { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard } from './Skeleton';

// Dashboard Skeleton - mimics Bento Grid layout
export const DashboardSkeleton: React.FC = () => (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Welcome section skeleton */}
        <div className="flex items-center gap-4">
            <SkeletonAvatar size="lg" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-8 w-64" />
                <Skeleton className="h-5 w-40" />
            </div>
        </div>
        
        {/* Bento Grid skeleton - mimicking dashboard card layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-48 md:col-span-2" />
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-64 md:col-span-2" />
            <SkeletonCard className="h-64" />
        </div>
    </div>
);

// Course/Textbook List Skeleton
export const CourseListSkeleton: React.FC = () => (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header skeleton */}
        <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
        </div>
        
        {/* Filter/tabs skeleton */}
        <div className="flex gap-3">
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
            <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
        
        {/* Grid of course cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} className="h-56" />
            ))}
        </div>
    </div>
);

// Video Library Skeleton
export const VideoLibrarySkeleton: React.FC = () => (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="space-y-3">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-5 w-80" />
        </div>
        
        {/* Level filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
            {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 rounded-xl flex-shrink-0" />
            ))}
        </div>
        
        {/* Video grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-3">
                    {/* Video thumbnail */}
                    <Skeleton className="w-full aspect-video rounded-xl" />
                    {/* Video title and metadata */}
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

// Vocab Module Skeleton
export const VocabModuleSkeleton: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center py-6 px-4">
        <div className="w-full max-w-4xl space-y-6">
            {/* Header */}
            <div className="space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-5 w-64" />
            </div>
            
            {/* Mode selection tabs */}
            <div className="flex gap-3 justify-center">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-28 rounded-2xl" />
                ))}
            </div>
            
            {/* Main content card */}
            <SkeletonCard className="h-96" />
        </div>
    </div>
);

// Listening/Reading Module Skeleton
export const ListeningModuleSkeleton: React.FC = () => (
    <div className="min-h-[60vh] p-6 space-y-6 max-w-6xl mx-auto">
        {/* Top controls */}
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-40 rounded-xl" />
        </div>
        
        {/* Main player/content area */}
        <SkeletonCard className="h-[400px]" />
        
        {/* Bottom controls/transcript */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-64" />
        </div>
    </div>
);

// Admin Dashboard Skeleton
export const AdminDashboardSkeleton: React.FC = () => (
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="space-y-2">
            <Skeleton className="h-10 w-56" />
            <Skeleton className="h-5 w-80" />
        </div>
        
        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} className="h-32" />
            ))}
        </div>
        
        {/* Charts area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonCard className="h-80" />
            <SkeletonCard className="h-80" />
        </div>
    </div>
);

// Generic Content Skeleton - fallback for routes
export const ContentSkeleton: React.FC = () => (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-5 w-96" />
        </div>
        
        {/* Content cards */}
        <div className="space-y-4">
            <SkeletonCard className="h-48" />
            <SkeletonCard className="h-64" />
            <SkeletonCard className="h-48" />
        </div>
    </div>
);

// Small card skeleton for dashboard widgets
export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={className}>
        <div className="animate-pulse space-y-4">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-12 w-32" />
            <SkeletonText lines={2} />
        </div>
    </div>
);
