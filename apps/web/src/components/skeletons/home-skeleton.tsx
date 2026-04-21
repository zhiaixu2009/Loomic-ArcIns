import { Skeleton } from "@/components/ui/skeleton";

type HomeProjectsSkeletonProps = {
  includeNewProjectPlaceholder?: boolean;
  projectCount?: number;
};

/** Skeleton placeholder for the recent projects section on the home page. */
export function HomeProjectsSkeleton({
  includeNewProjectPlaceholder = true,
  projectCount = 4,
}: HomeProjectsSkeletonProps) {
  return (
    <div data-testid="home-projects-skeleton" className="contents">
      {includeNewProjectPlaceholder ? (
        <div
          data-testid="home-project-skeleton-new"
          className="flex aspect-square flex-col justify-between rounded-[10px] border border-dashed border-slate-200 bg-slate-50 px-5 py-5"
        >
          <Skeleton className="h-12 w-12 rounded-[10px]" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-28 rounded-md" />
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-4 w-24 rounded-md" />
          </div>
        </div>
      ) : null}

      {/* Project card skeletons */}
      {Array.from({ length: projectCount }, (_, i) => (
        <div
          key={i}
          data-testid={`home-project-skeleton-card-${i}`}
          className="flex aspect-square flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white"
        >
          <div className="flex min-h-0 flex-[0_0_58%] px-4 pb-2 pt-4">
            <Skeleton className="h-full w-full rounded-[8px]" />
          </div>
          <div className="flex min-h-0 flex-1 items-end gap-3 px-4 pb-4 pt-2">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
            </div>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
