"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import Button from "../ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { canCreateTasks } from "@/lib/permissions";

const ListColumn = ({
  list,
  tasks,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onDuplicateTask,
  onDeleteList,
  onEditList,
  boardId,
  boardTitle = "",
  availableLists = [],
  onRefresh,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  const userCanCreateTasks = canCreateTasks(user);
  const tasksContainerRef = useRef(null);

  // Scroll to bottom when tasks change (to show latest tasks at bottom, which are newest)
  useEffect(() => {
    if (tasksContainerRef.current && tasks?.length > 0) {
      // Scroll to bottom to show latest tasks (newest tasks are added at the end)
      tasksContainerRef.current.scrollTop = tasksContainerRef.current.scrollHeight;
    }
  }, [tasks?.length]);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list?._id,
    data: {
      type: "list",
      list,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };


  const taskIds = tasks.map((task) => task?._id).filter(Boolean);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group shrink-0 w-80 bg-muted/40 backdrop-blur-sm rounded-xl p-5",
        "border border-border/50 shadow-sm",
        "hover:shadow-md transition-all duration-200",
        isDragging && "ring-2 ring-primary shadow-lg"
      )}
    >
      {/* List Header - Enhanced with better spacing */}
      <div className="flex items-center justify-between mb-5 pb-4 border-b border-border/50">
        <div
          {...attributes}
          {...listeners}
          className="flex-1 cursor-grab active:cursor-grabbing"
        >
          <h3 className="font-semibold text-base text-foreground mb-1">{list?.title}</h3>
          <p className="text-xs text-muted-foreground font-medium">
            {tasks?.length || 0} {(tasks?.length || 0) === 1 ? "task" : "tasks"}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-accent rounded opacity-60 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 top-8 bg-card border border-border rounded-lg shadow-lg z-10 min-w-[120px]">
              <button
                onClick={() => {
                  onEditList && onEditList(list);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded-t-lg"
              >
                Edit
              </button>
              <button
                onClick={() => {
                  onDeleteList && onDeleteList(list);
                  setShowMenu(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-accent text-destructive rounded-b-lg flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks - Fixed height and scrollable with latest tasks on top */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col h-[calc(100vh-300px)] min-h-[400px] max-h-[600px]">
          <div 
            ref={tasksContainerRef}
            className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
          >
            {!tasks || tasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <p>No tasks yet</p>
                <p className="text-xs mt-1">Add a task to get started</p>
              </div>
            ) : (
              // Display tasks in order (latest at bottom, scroll to bottom to see them)
              tasks.map((task) => (
                <TaskCard
                  key={task?._id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onUpdate={onRefresh}
                />
              ))
            )}
          </div>
        </div>
      </SortableContext>

      {/* Add Task Button */}
      {userCanCreateTasks && (
        <div className="mt-4 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full hover:bg-accent/50 transition-colors font-medium"
            onClick={() => onAddTask && onAddTask(list?._id)}
            data-add-task-button
            data-list-id={list?._id}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add a task
          </Button>
        </div>
      )}

    </div>
  );
};

export default ListColumn;