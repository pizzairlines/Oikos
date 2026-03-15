import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export function ListingSkeleton() {
  return (
    <Card className="overflow-hidden py-0">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-4 space-y-2.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-4 pt-1">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </Card>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
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
      <Card className="overflow-hidden py-0">
        <Skeleton className="w-full h-64 rounded-none" />
      </Card>
      <Card>
        <div className="p-6 space-y-4">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-16 rounded-lg" />
          </div>
          <div className="flex gap-2.5">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </Card>
      <Card>
        <div className="p-6 space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </Card>
    </div>
  );
}

export function StatsSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <div className="py-4 px-6 space-y-2">
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card><div className="p-6"><Skeleton className="h-40" /></div></Card>
        <Card><div className="p-6"><Skeleton className="h-40" /></div></Card>
      </div>
    </div>
  );
}
