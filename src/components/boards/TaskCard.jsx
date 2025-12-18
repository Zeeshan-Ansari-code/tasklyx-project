"use client";

import { useState } from "react";
import { Calendar, Users, MoreVertical, Clock, Copy } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const TaskCard = ({ task, onEdit, onDelete, onDuplicate }) => {
  const { user } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task._id,
    data: {
      type: "task",
      task,
      listId: task.list,
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
    task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group bg-card border border-border rounded-xl p-4 mb-3 cursor-pointer",
        "hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5",
        "transition-all duration-200 ease-out",
        "backdrop-blur-sm",
        task.completed && "opacity-60",
        isDragging && "ring-2 ring-primary shadow-xl scale-105"
      )}
      {...attributes}
      {...listeners}
      onClick={() => onEdit && onEdit(task)}
    >
      {/* Task Header - Enhanced typography */}
      <div className="flex items-start justify-between mb-3">
        <h4
          className={cn(
            "text-sm font-semibold flex-1 leading-snug",
            "text-foreground",
            task.completed && "line-through text-muted-foreground"
          )}
        >
          {task.title}
        </h4>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-accent rounded-md transition-all duration-200 hover:scale-110"
            aria-label="Task options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-xl z-10 min-w-[140px] animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit && onEdit(task);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-t-lg"
              >
                Edit
              </button>
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  if (onDuplicate) {
                    onDuplicate(task);
                  } else if (user?.id) {
                    try {
                      const res = await fetch(`/api/tasks/${task._id}/duplicate`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ userId: user.id }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        toast.success("Task duplicated");
                        onDuplicate && onDuplicate();
                      } else {
                        toast.error(data.message || "Failed to duplicate task");
                      }
                    } catch (error) {
                      toast.error("Failed to duplicate task");
                    }
                  }
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent flex items-center gap-2"
              >
                <Copy className="h-3 w-3" />
                Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete && onDelete(task);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-destructive rounded-b-lg"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex gap-1 mb-2 flex-wrap">
          {task.labels.map((label, idx) => (
            <div
              key={idx}
              className="h-2 w-12 rounded-full"
              style={{ backgroundColor: label.color }}
            />
          ))}
        </div>
      )}

      {/* Task Meta - Enhanced spacing and visual hierarchy */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-3 border-t border-border/50">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Priority */}
          {task.priority && (
            <Badge 
              variant={priorityColors[task.priority]} 
              className="text-xs capitalize font-medium px-2 py-0.5"
            >
              {task.priority}
            </Badge>
          )}

          {/* Due Date */}
          {task.dueDate && (
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
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}
        </div>

        {/* Assignees */}
        {task.assignees && task.assignees.length > 0 && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <div className="flex -space-x-2">
              {task.assignees.slice(0, 3).map((assignee) => (
                <Avatar
                  key={assignee._id || assignee.id}
                  name={assignee.name}
                  src={assignee.avatar}
                  size="sm"
                  className="border-2 border-background"
                />
              ))}
              {task.assignees.length > 3 && (
                <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs">
                  +{task.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;