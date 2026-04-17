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
        <div className="aspect-[286/208] rounded-xl bg-card p-2 shadow-card sm:rounded-2xl sm:p-3">
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-muted sm:gap-3">
            <Skeleton className="h-5 w-5 rounded-full sm:h-6 sm:w-6" />
            <Skeleton className="h-3 w-12 sm:w-14" />
          </div>
        </div>
      ) : null}

      {/* Project card skeletons */}
      {Array.from({ length: projectCount }, (_, i) => (
        <div
          key={i}
          className="aspect-[286/208] rounded-lg bg-card p-2 shadow-card sm:p-3"
        >
          <Skeleton className="aspect-[395/227] w-full rounded-lg" />
          <div className="mt-2 space-y-1 sm:mt-3 sm:space-y-1.5">
            <Skeleton className="h-3 w-3/4 sm:h-3.5" />
            <Skeleton className="h-2 w-1/2 sm:h-2.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
