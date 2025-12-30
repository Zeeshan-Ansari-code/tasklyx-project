"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import ListColumn from "./ListColumn";
import TaskCard from "./TaskCard";
import TaskEditModal from "./TaskEditModal";
import ListEditModal from "./ListEditModal";
import TaskFilters from "./TaskFilters";
import ConfirmDialog from "../ui/ConfirmDialog";
import { pusherClient } from "@/lib/pusher";
import { toast } from "sonner";
import Button from "../ui/Button";
import Input from "../ui/Input";
import { Plus } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

const KanbanBoard = ({ boardId, initialLists = [], boardMembers = [], board = null }) => {
  const { user } = useAuth();
  const [lists, setLists] = useState(initialLists);
  const [activeId, setActiveId] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [isAddingList, setIsAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [editingTask, setEditingTask] = useState(null);
  const [creatingTask, setCreatingTask] = useState(null); // { listId, list }
  const [editingList, setEditingList] = useState(null);
  const [filters, setFilters] = useState({
    priority: null,
    assignee: null,
    dueDate: null,
    completed: null,
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchLists();
  }, [boardId]);

  // Keyboard shortcut: T for new task
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only trigger if not typing in an input/textarea
      if (
        e.target.tagName === "INPUT" ||
        e.target.tagName === "TEXTAREA" ||
        e.target.isContentEditable
      ) {
        return;
      }

      // T key for new task - trigger add task on first list
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        // Find the first list and trigger add task
        if (lists.length > 0) {
          // This will be handled by ListColumn component
          // We'll use a custom event to trigger it
          const firstListElement = document.querySelector(`[data-list-id="${lists[0]._id}"]`);
          if (firstListElement) {
            const addTaskButton = firstListElement.querySelector('[data-add-task-button]');
            if (addTaskButton) {
              addTaskButton.click();
            }
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lists]);

  // Pusher real-time updates
  useEffect(() => {
    if (!boardId || !pusherClient) {
      // Pusher not configured, continue without real-time updates
      return;
    }

    let channel;
    try {
      channel = pusherClient.subscribe(`board-${boardId}`);
    } catch (error) {
      return;
    }

    // Listen for list events
    channel.bind("list:created", (data) => {
      toast.success("New list created");
      fetchLists();
    });

    channel.bind("list:updated", (data) => {
      fetchLists();
    });

    channel.bind("list:deleted", (data) => {
      toast.info("List deleted");
      fetchLists();
    });

    // Listen for task events
    channel.bind("task:created", (data) => {
      toast.success("New task created");
      fetchLists();
    });

    channel.bind("task:updated", (data) => {
      fetchLists();
    });

    channel.bind("task:deleted", (data) => {
      toast.info("Task deleted");
      fetchLists();
    });

    channel.bind("task:comment:added", (data) => {
      toast.success("New comment added");
      fetchLists();
    });

    return () => {
      pusherClient.unsubscribe(`board-${boardId}`);
    };
  }, [boardId]);

  const fetchLists = async () => {
    try {
      const res = await fetch(`/api/boards/${boardId}/lists`);
      const data = await res.json();
      if (res.ok) {
        setLists(data.lists || []);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    
    if (event.active.data.current?.type === "task") {
      const task = event.active.data.current.task;
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveTask(null);

    if (!over) return;

    if (active.data.current?.type === "list") {
      const oldIndex = lists.findIndex((list) => list?._id === active?.id);
      const newIndex = lists.findIndex((list) => list?._id === over?.id);

      if (oldIndex !== newIndex) {
        const newLists = arrayMove(lists, oldIndex, newIndex);
        setLists(newLists);
        await updateListPositions(newLists);
      }
    }

    if (active.data.current?.type === "task") {
      const taskId = active.id;
      const sourceListId = active.data.current.listId;
      const targetListId = over.data.current?.listId || over.id;

      const targetList = lists.find((l) => l?._id === targetListId);
      const targetTask = targetList?.tasks?.find((t) => t?._id === over?.id);

      if (sourceListId === targetListId) {
        const sourceList = lists.find((l) => l?._id === sourceListId);
        const oldIndex = sourceList?.tasks?.findIndex((t) => t?._id === taskId) ?? -1;
        const newIndex = targetTask
          ? sourceList?.tasks?.findIndex((t) => t?._id === targetTask?._id) ?? sourceList?.tasks?.length ?? 0
          : sourceList?.tasks?.length ?? 0;

        if (oldIndex !== newIndex && oldIndex >= 0 && sourceList?.tasks) {
          const newTasks = arrayMove(sourceList.tasks, oldIndex, newIndex);
          const updatedLists = lists.map((list) =>
            list?._id === sourceListId
              ? { ...list, tasks: newTasks }
              : list
          );
          setLists(updatedLists);
          await updateTaskPositions(sourceListId, newTasks);
        }
      } else {
        await moveTask(taskId, sourceListId, targetListId, targetTask?._id);
      }
    }
  };

  const updateListPositions = async (newLists) => {
    try {
      for (let i = 0; i < newLists.length; i++) {
        await fetch(`/api/lists/${newLists[i]._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: i }),
        });
      }
    } catch (error) {
      toast.error("Failed to update list positions");
      fetchLists();
    }
  };

  const updateTaskPositions = async (listId, tasks) => {
    try {
      for (let i = 0; i < tasks.length; i++) {
        await fetch(`/api/tasks/${tasks[i]._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: i }),
        });
      }
    } catch (error) {
      toast.error("Failed to update task positions");
      fetchLists();
    }
  };

  const moveTask = async (taskId, sourceListId, targetListId, targetTaskId) => {
    try {
      const targetList = lists.find((l) => l?._id === targetListId);
      const newPosition = targetTaskId
        ? targetList?.tasks?.findIndex((t) => t?._id === targetTaskId) ?? targetList?.tasks?.length ?? 0
        : targetList?.tasks?.length ?? 0;

      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          list: targetListId,
          position: newPosition,
        }),
      });

      if (res.ok) {
        toast.success("Task moved");
        fetchLists();
      } else {
        toast.error("Failed to move task");
        fetchLists();
      }
    } catch (error) {
      toast.error("Failed to move task");
      fetchLists();
    }
  };

  const handleAddList = async () => {
    if (!newListTitle.trim()) return;

    try {
      const res = await fetch(`/api/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newListTitle.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("List created");
        setNewListTitle("");
        setIsAddingList(false);
        fetchLists();
      } else {
        toast.error(data.message || "Failed to create list");
      }
    } catch (error) {
      toast.error("Failed to create list");
    }
  };

  const handleAddTaskClick = (listId) => {
    const list = lists.find((l) => l._id === listId);
    if (list) {
      setCreatingTask({ listId, list });
    }
  };

  const handleCreateTask = async (taskData) => {
    if (!user?.id) {
      toast.error("You must be logged in to create tasks");
      return;
    }

    try {
      const res = await fetch(`/api/lists/${creatingTask.listId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...taskData,
          boardId,
          userId: user?.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Task created");
        setCreatingTask(null);
        fetchLists();
      } else {
        toast.error(data.message || "Failed to create task");
      }
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
  };

  const handleDuplicateTask = async (task) => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/tasks/${task?._id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.id }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Task duplicated successfully");
        fetchLists();
      } else {
        toast.error(data.message || "Failed to duplicate task");
      }
    } catch (error) {
      toast.error("Failed to duplicate task");
    }
  };

  const handleEditList = (list) => {
    setEditingList(list);
  };

  const handleUpdateTask = () => {
    fetchLists();
  };

  const handleUpdateList = () => {
    fetchLists();
  };

  const handleDeleteTask = (task) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete Task",
      message: `Are you sure you want to delete "${task?.title || "this task"}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/tasks/${task?._id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user?.id }),
          });

          if (res.ok) {
            toast.success("Task deleted");
            fetchLists();
          } else {
            toast.error("Failed to delete task");
          }
        } catch (error) {
          toast.error("Failed to delete task");
        }
      },
    });
  };

  const handleDeleteList = (list) => {
    setConfirmDialog({
      isOpen: true,
      title: "Delete List",
      message: `Are you sure you want to delete "${list?.title || "this list"}"? This will also delete all tasks in this list. This action cannot be undone.`,
      variant: "destructive",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/lists/${list?._id}`, {
            method: "DELETE",
          });

          if (res.ok) {
            toast.success("List deleted");
            fetchLists();
          } else {
            toast.error("Failed to delete list");
          }
        } catch (error) {
          toast.error("Failed to delete list");
        }
      },
    });
  };

  const filterTasks = (tasks) => {
    if (!tasks || tasks.length === 0) return tasks;

    return tasks.filter((task) => {
      // Filter by priority
      if (filters?.priority && task?.priority !== filters.priority) {
        return false;
      }

      // Filter by assignee
      if (filters?.assignee) {
        const assigneeIds = (task?.assignees || []).map((a) =>
          a?._id ? a._id.toString() : a?.toString()
        );
        if (!assigneeIds.includes(filters.assignee)) {
          return false;
        }
      }

      // Filter by due date
      if (filters?.dueDate && task?.dueDate) {
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        switch (filters.dueDate) {
          case "overdue":
            if (dueDate >= today) return false;
            break;
          case "today":
            const dueDateOnly = new Date(dueDate);
            dueDateOnly.setHours(0, 0, 0, 0);
            if (dueDateOnly.getTime() !== today.getTime()) return false;
            break;
          case "thisWeek":
            if (dueDate < today || dueDate > weekFromNow) return false;
            break;
          case "upcoming":
            if (dueDate <= weekFromNow) return false;
            break;
        }
      } else if (filters?.dueDate && !task?.dueDate) {
        // If filtering by due date but task has no due date, exclude it
        return false;
      }

      // Filter by completed status
      if (filters?.completed !== null && filters?.completed !== undefined) {
        if (task?.completed !== filters.completed) {
          return false;
        }
      }

      return true;
    });
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  return (
    <div className="h-full">
      <div className="mb-4">
        <TaskFilters
          onFilterChange={handleFilterChange}
          boardMembers={boardMembers}
        />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-6 overflow-x-auto pb-6 px-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          <SortableContext
            items={lists.map((l) => l._id)}
            strategy={horizontalListSortingStrategy}
          >
            {lists.map((list) => {
              const listTasks = list?.tasks || [];
              const filteredListTasks = filterTasks(listTasks);
              return (
                <ListColumn
                  key={list?._id}
                  list={list}
                  tasks={filteredListTasks}
                  onAddTask={handleAddTaskClick}
                  onEditTask={handleEditTask}
                  onDeleteTask={handleDeleteTask}
                  onEditList={handleEditList}
                  onDeleteList={handleDeleteList}
                  boardId={boardId}
                  boardTitle={board?.title || ""}
                  availableLists={lists}
                  onRefresh={fetchLists}
                />
              );
            })}
          </SortableContext>

          {isAddingList ? (
            <div className="shrink-0 w-72 bg-muted/30 rounded-lg p-4" data-add-section>
              <Input
                placeholder="Enter list title..."
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAddList();
                  } else if (e.key === "Escape") {
                    setIsAddingList(false);
                    setNewListTitle("");
                  }
                }}
                autoFocus
                className="mb-2"
                data-list-input
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleAddList}>
                  Add
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingList(false);
                    setNewListTitle("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingList(true)}
              className="shrink-0 w-72 h-fit bg-muted/30 hover:bg-muted/50 rounded-lg p-4 border-2 border-dashed border-border transition-colors"
            >
              <Plus className="h-5 w-5 mr-2 inline" />
              Add another list
            </button>
          )}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="w-72">
              <TaskCard task={activeTask} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Create Modal */}
      {creatingTask && (
        <TaskEditModal
          isOpen={!!creatingTask}
          onClose={() => setCreatingTask(null)}
          task={null}
          boardId={boardId}
          lists={lists}
          boardMembers={boardMembers}
          onUpdate={handleCreateTask}
          isCreating={true}
          defaultListId={creatingTask.listId}
        />
      )}

      {/* Task Edit Modal */}
      <TaskEditModal
        isOpen={!!editingTask}
        onClose={() => setEditingTask(null)}
        task={editingTask}
        boardId={boardId}
        lists={lists}
        boardMembers={boardMembers}
        onUpdate={handleUpdateTask}
      />

      {/* List Edit Modal */}
      <ListEditModal
        isOpen={!!editingList}
        onClose={() => setEditingList(null)}
        list={editingList}
        onUpdate={handleUpdateList}
      />

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() =>
          setConfirmDialog({ isOpen: false, title: "", message: "", onConfirm: null })
        }
        onConfirm={confirmDialog.onConfirm || (() => {})}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant || "destructive"}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  );
};

export default KanbanBoard;