import Skeleton from "./Skeleton";
import { Card, CardContent } from "./Card";

const BoardCardSkeleton = () => {
  return (
    <Card>
      <Skeleton className="h-32 w-full rounded-t-lg" />
      <CardContent className="p-4">
        <Skeleton className="h-6 w-3/4 mb-2" />
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-2/3 mb-4" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
};

export default BoardCardSkeleton;

