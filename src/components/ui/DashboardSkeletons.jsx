import Skeleton from "./Skeleton";
import { Card, CardContent, CardHeader } from "./Card";

export function RecentBoardsSkeleton() {
  return (
    <Card className="h-auto sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex flex-col">
      <CardHeader className="pb-3 sm:pb-4">
        <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden flex flex-col space-y-3">
        <div className="flex-1 overflow-y-auto pr-2 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border">
              <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 sm:h-5 w-3/4" />
                <Skeleton className="h-3 sm:h-4 w-full" />
                <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2">
                  <Skeleton className="h-3 w-12 sm:w-16" />
                  <Skeleton className="h-3 w-1" />
                  <Skeleton className="h-3 w-16 sm:w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-2 shrink-0">
          <Skeleton className="h-9 sm:h-10 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card className="h-auto sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex flex-col">
      <CardHeader className="shrink-0 pb-3 sm:pb-4">
        <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full max-h-[500px] overflow-y-auto pr-2 space-y-3 sm:space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-2 sm:gap-3">
              <Skeleton className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-3 sm:h-4 w-full" />
                <Skeleton className="h-3 w-20 sm:w-24" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function UpcomingDeadlinesSkeleton() {
  return (
    <Card className="h-auto sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex flex-col">
      <CardHeader className="shrink-0 pb-3 sm:pb-4">
        <Skeleton className="h-5 sm:h-6 w-32 sm:w-40" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full max-h-[500px] overflow-y-auto pr-2 space-y-2 sm:space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start sm:items-center gap-2 flex-wrap">
                  <Skeleton className="h-4 sm:h-5 w-32 sm:w-48 flex-1 min-w-0" />
                  <Skeleton className="h-4 sm:h-5 w-12 sm:w-16 rounded-full shrink-0" />
                </div>
                <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
              </div>
              <Skeleton className="h-8 sm:h-9 w-full sm:w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

