"use client";

import { useState, memo } from "react";
import { Users, MoreVertical, Clock, Edit2, Trash2, CheckCircle2, Circle } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const TaskCard = memo(({ task, onEdit, onDelete, onUpdate }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);
  const [togglingComplete, setTogglingComplete] = useState(false);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task?._id,
    data: {
      type: "task",
      task,
      listId: task?.list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const priorityColors = {
    low: "default",
    medium: "warning",
    high: "info",
    urgent: "destructive",
  };

  const isOverdue =
    task?.dueDate && new Date(task.dueDate) < new Date() && !task?.completed;

  const handleToggleComplete = async (e) => {
    e.stopPropagation();
    if (!user?.id || !task?._id) return;
    
    setTogglingComplete(true);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          completed: !task?.completed,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(task?.completed ? "Task reopened" : "Task marked as done");
        onUpdate && onUpdate();
      } else {
        toast.error(data?.message || "Failed to update task");
      }
    } catch (error) {
      toast.error("Failed to update task");
    } finally {
      setTogglingComplete(false);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-card border border-border rounded-xl p-4 mb-3 cursor-pointer",
        "hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5",
        "transition-all duration-200 ease-out",
        "backdrop-blur-sm",
        task?.completed && "opacity-60",
        isDragging && "ring-2 ring-primary shadow-xl scale-105"
      )}
      {...attributes}
      {...listeners}
      onClick={() => onEdit && onEdit(task)}
    >
      {/* Task Header - Enhanced typography */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Complete Toggle */}
          <button
            onClick={handleToggleComplete}
            disabled={togglingComplete}
            className="mt-0.5 shrink-0"
            aria-label={task?.completed ? "Mark as pending" : "Mark as done"}
            title={task?.completed ? "Mark as pending" : "Mark as done"}
          >
            {task?.completed ? (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
            )}
          </button>
          <h4
            className={cn(
              "text-sm font-semibold flex-1 leading-snug",
              "text-foreground",
              task?.completed && "line-through text-muted-foreground"
            )}
          >
            {task?.title}
          </h4>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-60 group-hover:opacity-100 p-1.5 hover:bg-accent rounded-md transition-all duration-200 hover:scale-110 text-muted-foreground hover:text-foreground"
            aria-label="Task options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-xl z-50 p-1 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit(task);
                    setShowMenu(false);
                  }}
                  className="p-2 hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                  aria-label="Edit task"
                  title="Edit"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete && onDelete(task);
                    setShowMenu(false);
                  }}
                  className="p-2 hover:bg-accent rounded transition-colors text-destructive hover:text-destructive"
                  aria-label="Delete task"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-2">
        <Badge
          variant={
            task?.status === "done" || task?.completed
              ? "default"
              : task?.status === "paused"
              ? "destructive"
              : task?.status === "ongoing"
              ? "info"
              : "outline"
          }
          className={cn(
            "text-xs font-medium",
            (task?.status === "done" || task?.completed) && "bg-green-500/10 text-green-600 border-green-500/20",
            task?.status === "paused" && "bg-red-500/10 text-red-600 border-red-500/20",
            task?.status === "ongoing" && "bg-blue-500/10 text-blue-600 border-blue-500/20"
          )}
        >
          {task?.status === "done" || task?.completed
            ? "Done"
            : task?.status === "paused"
            ? "Paused"
            : task?.status === "ongoing"
            ? "Ongoing"
            : "Pending"}
        </Badge>
      </div>

      {/* Labels */}
      {task?.labels && task?.labels?.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {task?.labels?.map((label, idx) => (
            <div
              key={idx}
              className="h-2 w-12 rounded-full"
              style={{ backgroundColor: label?.color }}
            />
          ))}
        </div>
      )}

      {/* Task Meta - Enhanced spacing and visual hierarchy */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Priority */}
          {task?.priority && (
            <Badge 
              variant={priorityColors[task?.priority] || "default"} 
              className="text-xs capitalize font-medium px-2 py-0.5"
            >
              {task?.priority}
            </Badge>
          )}

          {/* Due Date */}
          {task?.dueDate && (
            <div
              className={cn(
                "flex items-center gap-1.5 font-medium",
                isOverdue && "text-destructive font-semibold"
              )}
            >
              <Clock className={cn(
                "h-3.5 w-3.5",
                isOverdue && "text-destructive"
              )} />
              <span>{formatDate(task?.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Assignees */}
        {task?.assignees && task?.assignees?.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {task?.assignees?.slice(0, 3).map((assignee) => (
                <Avatar
                  key={assignee?._id || assignee?.id}
                  name={assignee?.name || "Unknown"}
                  src={assignee?.avatar}
                  size="sm"
                  className="border-2 border-background"
                  title={assignee?.name || "Unknown"}
                />
              ))}
              {task?.assignees?.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{task?.assignees?.length - 3}
                </div>
              )}
            </div>
            {/* Show assignee names */}
            <div className="flex items-center gap-1 text-xs">
              <Users className="h-3 w-3" />
              <span className="max-w-[100px] truncate">
                {task?.assignees?.slice(0, 2).map((assignee, idx) => (
                  <span key={assignee?._id || assignee?.id}>
                    {assignee?.name || "Unknown"}
                    {idx < Math.min(task?.assignees?.length || 0, 2) - 1 && ", "}
                  </span>
                ))}
                {task?.assignees?.length > 2 && ` +${task?.assignees?.length - 2}`}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

TaskCard.displayName = "TaskCard";

export default TaskCard;