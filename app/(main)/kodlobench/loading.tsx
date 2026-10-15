import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6" role="status" aria-label="Завантаження результатів">
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <div className="h-3 bg-hairline-dark/40 rounded w-56 mb-3 animate-pulse" />
          <div className="h-10 bg-hairline-dark/40 rounded w-64 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-12 rounded-2xl mb-4" />
        <Skeleton className="h-[420px] rounded-xl mb-4" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
