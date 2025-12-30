import Skeleton from "./Skeleton";
import { Card, CardContent, CardHeader } from "./Card";

export function RecentBoardsSkeleton() {
  return (
    <Card className="h-[50vh]">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
            <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center gap-4 mt-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-1" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          </div>
        ))}
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

export function RecentActivitySkeleton() {
  return (
    <Card className="h-[50vh] flex flex-col">
      <CardHeader className="shrink-0">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full max-h-[500px] overflow-y-auto pr-2 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 min-w-0 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
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
    <Card className="h-[50vh] flex flex-col">
      <CardHeader className="shrink-0">
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="h-full max-h-[500px] overflow-y-auto pr-2 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

