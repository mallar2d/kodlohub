import { SkeletonGallery } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-12">
          <div className="h-3 bg-hairline-dark/40 rounded w-24 mb-3 animate-pulse" />
          <div className="h-8 bg-hairline-dark/40 rounded w-48 animate-pulse" />
        </div>
        <SkeletonGallery />
      </div>
    </div>
  );
}
