"use client";

import { useState, useEffect, useRef } from "react";
import { Search, Kanban, CheckSquare, ArrowRight } from "lucide-react";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const SearchDropdown = ({ isOpen, onClose, searchQuery }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState({ boards: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setResults({ boards: [], tasks: [] });
      return;
    }

    if (!user?.id) return;

    const searchTimeout = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchQuery)}&userId=${user.id}&type=${activeTab}`
        );
        const data = await res.json();

        if (res.ok) {
          setResults({
            boards: data.boards || [],
            tasks: data.tasks || [],
          });
        }
      } catch (error) {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, activeTab, user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleBoardClick = (boardId) => {
    router.push(`/boards/${boardId}`);
    onClose();
  };

  const handleTaskClick = (task) => {
    router.push(`/boards/${task.board._id}?task=${task._id}`);
    onClose();
  };

  const totalResults = results.boards.length + results.tasks.length;

  if (!isOpen || searchQuery.length < 2) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-xl z-100 max-h-[calc(100vh-8rem)] overflow-hidden flex flex-col w-full sm:w-auto min-w-full sm:min-w-[400px] max-w-[calc(100vw-2rem)]"
    >
      {/* Tabs */}
      <div className="flex gap-2 border-b border-border px-4 pt-3">
        <button
          onClick={() => setActiveTab("all")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "all"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          All ({totalResults})
        </button>
        <button
          onClick={() => setActiveTab("boards")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "boards"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Boards ({results.boards.length})
        </button>
        <button
          onClick={() => setActiveTab("tasks")}
          className={cn(
            "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
            activeTab === "tasks"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Tasks ({results.tasks.length})
        </button>
      </div>

      {/* Results */}
      <div className="overflow-y-auto flex-1">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="spinner h-8 w-8 mx-auto mb-4"></div>
            <p>Searching...</p>
          </div>
        ) : totalResults === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No results found for "{searchQuery}"</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {/* Boards Results */}
            {(activeTab === "all" || activeTab === "boards") &&
              results.boards.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1 px-2 py-1 uppercase">
                    Boards
                  </h3>
                  <div className="space-y-1">
                    {results.boards.map((board) => (
                      <button
                        key={board._id}
                        onClick={() => handleBoardClick(board._id)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <div
                          className={cn(
                            "h-10 w-10 rounded-lg shrink-0",
                            board.background || "bg-blue-500"
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{board.title}</p>
                          {board.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {board.description}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Tasks Results */}
            {(activeTab === "all" || activeTab === "tasks") &&
              results.tasks.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground mb-1 px-2 py-1 uppercase">
                    Tasks
                  </h3>
                  <div className="space-y-1">
                    {results.tasks.map((task) => (
                      <button
                        key={task._id}
                        onClick={() => handleTaskClick(task)}
                        className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-accent transition-colors text-left"
                      >
                        <CheckSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{task.title}</p>
                            {task.priority && (
                              <Badge
                                variant={
                                  task.priority === "urgent"
                                    ? "destructive"
                                    : task.priority === "high"
                                    ? "info"
                                    : task.priority === "medium"
                                    ? "warning"
                                    : "default"
                                }
                                className="capitalize text-xs"
                              >
                                {task.priority}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {task.board?.title} • {task.list?.title}
                          </p>
                          {task.dueDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Due {formatDate(task.dueDate)}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchDropdown;

