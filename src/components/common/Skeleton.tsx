import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className }) => {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
};

export const ContentSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto w-full">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-14 h-14 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <Skeleton className="h-11 w-40 rounded-xl" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
        <Skeleton className="h-10 w-24 rounded-full" />
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="p-5 border-2 border-border rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3 flex-1">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/5" />
              </div>
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-full" />
              <Skeleton className="h-7 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const VocabBookImmersiveSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-4 sm:space-y-5">
    <div className="rounded-[28px] border-[3px] border-border bg-card shadow-[0_20px_80px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="p-5 sm:p-8 space-y-4 sm:space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-40 sm:h-12 sm:w-56" />
            <Skeleton className="h-4 w-24 sm:w-28" />
          </div>
          <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl" />
        </div>
        <Skeleton className="h-5 sm:h-6 w-4/5 sm:w-2/3" />
        <div className="rounded-2xl border-2 border-border p-4 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="hidden sm:block h-4 w-2/3" />
        </div>
      </div>
    </div>

    <div className="px-4 sm:px-8 py-4 sm:py-5 border-[3px] border-border rounded-[24px] bg-card flex items-center justify-between gap-2 sm:gap-3">
      <Skeleton className="h-10 sm:h-11 w-20 sm:w-28 rounded-2xl" />
      <Skeleton className="h-10 sm:h-11 w-20 sm:w-28 rounded-2xl" />
      <Skeleton className="h-10 sm:h-11 w-20 sm:w-28 rounded-2xl" />
    </div>

    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 sm:h-9 w-24 sm:w-28 rounded-2xl" />
    </div>
  </div>
);

export const VocabBookListenSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[1, 2].map(i => (
        <div key={i} className="p-4 rounded-3xl border-[3px] border-border bg-card">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-[28px] bg-card border-[3px] border-border shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6 space-y-8">
      <div className="text-center space-y-2">
        <Skeleton className="h-10 sm:h-12 w-48 sm:w-64 mx-auto" />
        <Skeleton className="h-4 sm:h-5 w-28 sm:w-40 mx-auto" />
      </div>

      <div className="flex items-center justify-center gap-4 sm:gap-6">
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
        <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-[32px]" />
        <Skeleton className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl" />
      </div>

      <div className="rounded-2xl border-2 border-border p-5 space-y-2">
        <Skeleton className="h-4 w-4/5 sm:w-2/3" />
        <Skeleton className="h-3 w-full sm:w-5/6" />
        <Skeleton className="hidden sm:block h-3 w-2/3" />
      </div>
    </div>
  </div>
);

export const VocabBookDictationSkeleton: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {[1, 2].map(i => (
        <div key={i} className="p-5 rounded-3xl border-[3px] border-border bg-card">
          <div className="flex items-center gap-3">
            <Skeleton className="w-11 h-11 rounded-2xl" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>
      ))}
    </div>

    <div className="rounded-[28px] bg-card border-[3px] border-border shadow-[0_10px_35px_rgba(0,0,0,0.06)] p-6 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-11 rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-11 rounded-2xl" />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-border p-4 flex items-center justify-between">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-12 rounded-full" />
      </div>

      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  </div>
);

export const VocabBookSpellingSkeleton: React.FC = () => (
  <div className="max-w-5xl mx-auto px-4 py-8 space-y-5 sm:space-y-6">
    <div className="rounded-[24px] border-[3px] border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-6 w-28 sm:w-36" />
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <Skeleton className="h-10 sm:h-12 w-5/6 sm:w-2/3 mx-auto rounded-2xl" />
      <Skeleton className="h-16 w-full rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-14 rounded-2xl" />
        ))}
      </div>
      <div className="hidden sm:grid grid-cols-3 gap-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);

export const VocabModuleSkeleton = () => (
  <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
    <div className="flex justify-between items-center">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <Skeleton className="w-48 h-10 rounded-xl" />
      <Skeleton className="w-32 h-10 rounded-xl" />
    </div>
    <div className="grid grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => (
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
    <div className="border-2 border-border rounded-xl p-8 space-y-6 h-[500px]">
      <Skeleton className="w-48 h-8 rounded-lg mb-6" />
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="space-y-2">
          <Skeleton className="w-full h-16 rounded-xl" />
        </div>
      ))}
    </div>

    {/* Player Bar */}
    <div className="fixed bottom-0 left-0 right-0 h-20 bg-card border-t-2 border-border p-4 flex items-center justify-between">
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
      <div className="h-8 bg-muted rounded w-1/4 animate-pulse"></div>
      <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="bg-card rounded-xl overflow-hidden border-2 border-border">
          <div className="aspect-video bg-muted animate-pulse"></div>
          <div className="p-4 space-y-3">
            <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const AdminDashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <div
          key={i}
          className="bg-card p-6 rounded-2xl border-2 border-border h-32 animate-pulse"
        ></div>
      ))}
    </div>
    <div className="bg-card p-6 rounded-2xl border-2 border-border h-96 animate-pulse"></div>
  </div>
);
