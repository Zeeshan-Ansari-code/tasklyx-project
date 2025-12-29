"use client";

import { useState } from "react";
import { Plus, MoreVertical, Trash2 } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TaskCard from "./TaskCard";
import Button from "../ui/Button";
import Input from "../ui/Input";
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
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [showMenu, setShowMenu] = useState(false);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: list._id,
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

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    await onAddTask(list._id, newTaskTitle.trim());
    setNewTaskTitle("");
    setIsAddingTask(false);
  };

  const taskIds = tasks.map((task) => task._id);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "shrink-0 w-80 bg-muted/40 backdrop-blur-sm rounded-xl p-5",
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
          <h3 className="font-semibold text-base text-foreground mb-1">{list.title}</h3>
          <p className="text-xs text-muted-foreground font-medium">
            {tasks.length} {tasks.length === 1 ? "task" : "tasks"}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-accent rounded opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Tasks - Enhanced scrollbar */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div className="space-y-3 min-h-[100px] max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <p>No tasks yet</p>
              <p className="text-xs mt-1">Add a task to get started</p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task._id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onDuplicate={onDuplicateTask}
              />
            ))
          )}
        </div>
      </SortableContext>

      {/* Add Task - Enhanced with better styling */}
      {isAddingTask ? (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg border border-border/50 animate-in fade-in duration-200">
          <Input
            placeholder="Enter task title..."
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAddTask();
              } else if (e.key === "Escape") {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }
            }}
            autoFocus
            className="mb-3 bg-background"
            data-task-input
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddTask} className="flex-1">
              Add Task
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setIsAddingTask(false);
                setNewTaskTitle("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        canCreate && (
          <div className="mt-4 space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full hover:bg-accent/50 transition-colors font-medium"
              onClick={() => setIsAddingTask(true)}
              data-add-task-button
              data-list-id={list._id}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add a task
            </Button>
          </div>
        )
      )}

    </div>
  );
};

export default ListColumn;