import { Skeleton } from "@/components/ui/skeleton";

export function ListingSkeleton() {
  return (
    <div className="glass rounded-2xl overflow-hidden">
      <Skeleton className="aspect-[4/3] rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, i) => (
        <ListingSkeleton key={i} />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-8 w-24" />
      <div className="glass rounded-2xl overflow-hidden">
        <Skeleton className="w-full h-64 rounded-none" />
      </div>
      <div className="glass rounded-2xl">
        <div className="p-5 space-y-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-28 rounded-xl" />
          </div>
        </div>
      </div>
      <div className="glass rounded-2xl">
        <div className="p-5 space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="glass rounded-2xl">
            <div className="py-5 px-4 space-y-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl"><div className="p-5"><Skeleton className="h-40" /></div></div>
        <div className="glass rounded-2xl"><div className="p-5"><Skeleton className="h-40" /></div></div>
      </div>
    </div>
  );
}
