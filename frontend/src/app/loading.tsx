import { Skeleton } from "@/components/ui/skeleton";

export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-10 sm:px-6" role="status" aria-label="Loading page">
      <Skeleton className="h-14 w-64" />
      <div className="grid grid-cols-1 gap-5 md:grid-cols-12">
        <Skeleton className="h-44 rounded-[20px] md:col-span-6" />
        <Skeleton className="h-44 rounded-[20px] md:col-span-6" />
      </div>
      <Skeleton className="h-64 rounded-[20px]" />
    </div>
  );
}
