import Skeleton from "./Skeleton";

const TaskCardSkeleton = () => {
  return (
    <div className="bg-card border border-border rounded-lg p-3 mb-2">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <div className="flex items-center gap-2 mb-2">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-1">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      </div>
    </div>
  );
};

export default TaskCardSkeleton;

