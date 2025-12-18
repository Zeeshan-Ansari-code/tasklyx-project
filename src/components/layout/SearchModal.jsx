"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Kanban, CheckSquare, ArrowRight } from "lucide-react";
import Input from "../ui/Input";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";

const SearchModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState({ boards: [], tasks: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "boards", "tasks"
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setResults({ boards: [], tasks: [] });
      // Focus input when dropdown opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

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

  const handleBoardClick = (boardId) => {
    router.push(`/boards/${boardId}`);
    onClose();
  };

  const handleTaskClick = (task) => {
    router.push(`/boards/${task.board._id}?task=${task._id}`);
    onClose();
  };

  const totalResults = results.boards.length + results.tasks.length;

  if (!isOpen) return null;

  return (
    <div className="absolute left-0 right-0 top-16 z-40 px-4 md:px-0 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-2xl">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        {/* Header row with search input and close button (mobile) */}
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              placeholder="Search boards, tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onClose();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-lg hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        {searchQuery.length >= 2 && (
          <div className="flex gap-2 border-b border-border mb-3">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "all"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({totalResults})
            </button>
            <button
              onClick={() => setActiveTab("boards")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "boards"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Boards ({results.boards.length})
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "tasks"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasks ({results.tasks.length})
            </button>
          </div>
        )}

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Type at least 2 characters to search</p>
            </div>
          ) : loading ? (
            <div className="text-center py-6 text-muted-foreground">
              <div className="spinner h-8 w-8 mx-auto mb-3"></div>
              <p>Searching...</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <p>No results found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Boards Results */}
              {(activeTab === "all" || activeTab === "boards") &&
                results.boards.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">
                      BOARDS
                    </h3>
                    <div className="space-y-1">
                      {results.boards.map((board) => (
                        <button
                          key={board._id}
                          onClick={() => handleBoardClick(board._id)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
                        >
                          <div
                            className={`h-10 w-10 rounded-lg ${board.background || "bg-blue-500"} shrink-0`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{board.title}</p>
                            {board.description && (
                              <p className="text-sm text-muted-foreground truncate">
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
                    <h3 className="text-sm font-semibold text-muted-foreground mb-2 px-2">
                      TASKS
                    </h3>
                    <div className="space-y-1">
                      {results.tasks.map((task) => (
                        <button
                          key={task._id}
                          onClick={() => handleTaskClick(task)}
                          className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
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
    </div>
  );
};

export default SearchModal;

