"use client";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-shimmer bg-gradient-to-r from-canvas-night-soft via-hairline-dark/30 to-canvas-night-soft bg-[length:200%_100%] rounded ${className}`} />
  );
}

export function SkeletonCard() {
  return (
    <div className="card-dark p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

export function SkeletonImage() {
  return (
    <div className="rounded-lg overflow-hidden bg-canvas-night-soft border border-hairline-dark">
      <Skeleton className="w-full h-48" />
      <div className="p-3">
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export function SkeletonGallery() {
  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <SkeletonImage key={i} />
      ))}
    </div>
  );
}

export function SkeletonBlog() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
