"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Grid, List, Star, Users, Copy, Archive, Download } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Textarea from "@/components/ui/Textarea";
import { Card, CardContent } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import BoardTemplates from "@/components/boards/BoardTemplates";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import BoardCardSkeleton from "@/components/ui/BoardCardSkeleton";
import Skeleton from "@/components/ui/Skeleton";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";

export default function BoardsPage() {
  const { user } = useAuth();
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [boardToDuplicate, setBoardToDuplicate] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // Check URL params for create modal
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("create") === "true") {
      setShowCreateModal(true);
      // Clean up URL
      window.history.replaceState({}, "", "/boards");
    }
  }, []);
  const [newBoard, setNewBoard] = useState({
    title: "",
    description: "",
    background: "bg-blue-500",
    templateLists: [],
  });


  useEffect(() => {
    if (user?.id) {
      fetchBoards();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, showArchived]); // Only depend on user.id, not entire user object

  // Keyboard shortcut: N for new board
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

      // N key for new board
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        setShowCreateModal(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const fetchBoards = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const url = showArchived
        ? `/api/boards?userId=${user.id}&archived=true`
        : `/api/boards?userId=${user.id}`;
      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setBoards(data.boards || []);
      } else {
        toast.error(data.message || "Failed to fetch boards");
      }
    } catch (error) {
      toast.error("Failed to fetch boards");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBoard = async (e) => {
    e.preventDefault();

    if (!newBoard.title.trim()) {
      toast.error("Board title is required");
      return;
    }

    if (!user?.id) {
      toast.error("Please login to create boards");
      return;
    }

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...newBoard,
          ownerId: user.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        const boardId = data.board._id;
        
        // If template was selected, create lists
        if (newBoard.templateLists && newBoard.templateLists.length > 0) {
          for (let i = 0; i < newBoard.templateLists.length; i++) {
            await fetch(`/api/boards/${boardId}/lists`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                title: newBoard.templateLists[i],
                userId: user.id,
              }),
            });
          }
        }

        toast.success("Board created successfully!");
        setShowCreateModal(false);
        setShowTemplates(false);
        setNewBoard({ title: "", description: "", background: "bg-blue-500", templateLists: [] });
        fetchBoards();
      } else {
        toast.error(data.message || "Failed to create board");
      }
    } catch (error) {
      toast.error("Failed to create board");
    }
  };

  const handleDuplicateBoard = async () => {
    if (!user?.id || !boardToDuplicate) return;

    try {
      const res = await fetch(`/api/boards/${boardToDuplicate}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Board duplicated successfully");
        setShowDuplicateDialog(false);
        setBoardToDuplicate(null);
        fetchBoards();
      } else {
        toast.error(data.message || "Failed to duplicate board");
      }
    } catch (error) {
      toast.error("Failed to duplicate board");
    }
  };

  const handleExportBoard = async (board) => {
    if (!board?._id) return;

    try {
      const res = await fetch(`/api/boards/${board._id}/export`);
      const data = await res.json();

      if (res.ok) {
        // Create a blob and download
        const blob = new Blob([JSON.stringify(data, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${board.title.replace(/[^a-z0-9]/gi, "_")}_export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Board exported successfully");
      } else {
        toast.error(data.message || "Failed to export board");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export board");
    }
  };

  const handleArchiveBoard = async (boardId, archived) => {
    if (!user?.id || !boardId) return;

    try {
      const res = await fetch(`/api/boards/${boardId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, archived }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(
          archived ? "Board archived successfully" : "Board unarchived successfully"
        );
        fetchBoards();
      } else {
        toast.error(data.message || "Failed to archive board");
      }
    } catch (error) {
      console.error("Archive error:", error);
      toast.error("Failed to archive board");
    }
  };

  const filteredBoards = boards.filter((board) =>
    board.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const backgroundColors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-pink-500",
    "bg-orange-500",
    "bg-indigo-500",
    "bg-red-500",
    "bg-yellow-500",
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-48 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <BoardCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Boards</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Manage your project boards and collaborate with your team
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)} 
          className="shadow-sm hover:shadow-md transition-shadow w-full sm:w-auto text-sm sm:text-base"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Board
        </Button>
      </div>

      {/* Search and View Toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
        <div className="flex-1 relative max-w-full sm:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200 text-sm sm:text-base"
          />
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
            className="shadow-sm hover:shadow-md transition-shadow flex-1 sm:flex-initial text-xs sm:text-sm"
          >
            <Archive className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{showArchived ? "Hide Archived" : "Show Archived"}</span>
            <span className="sm:hidden">{showArchived ? "Hide" : "Archived"}</span>
          </Button>
          <div className="flex items-center gap-1 border border-border/50 rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "grid" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <Grid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 sm:h-9 sm:w-9"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Boards Grid/List */}
      {filteredBoards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center mb-4">
              <Grid className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No boards found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchQuery
                ? "Try adjusting your search query"
                : "Create your first board to get started"}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Board
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div
          className={
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6"
              : "space-y-3 sm:space-y-4"
          }
        >
          {filteredBoards.map((board, index) => (
            <motion.div
              key={board._id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: index * 0.03, ease: "easeOut" }}
              className="relative group"
            >
              <Link href={`/boards/${String(board._id)}`}>
                <Card className="h-full cursor-pointer border-border/50 hover:shadow-lg hover:border-primary/20 transition-all duration-200 group overflow-hidden">
                  <div className="relative border-b border-border/30 bg-gradient-to-br from-muted/30 to-muted/10">
                    <div className="p-4 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                          <span className="text-lg font-semibold text-primary">
                            {board.title?.[0]?.toUpperCase() || "B"}
                          </span>
                        </div>
                      </div>
                      {board.isFavorite && (
                        <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                      )}
                    </div>
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg mb-2 truncate group-hover:text-primary transition-colors">
                      {board.title}
                    </h3>
                    {board.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
                        {board.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs pt-3 border-t border-border/50">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          <span className="font-medium">{board.members?.length || 0}</span>
                        </div>
                        <span className="text-muted-foreground font-medium">{formatDate(board.updatedAt)}</span>
                      </div>
                      <Badge variant="outline" className="capitalize font-medium">
                        {board.visibility || "private"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
              {/* Action buttons on hover */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 flex gap-2 transition-all duration-200 z-10">
                {!board.archived && (
                  <>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleExportBoard(board);
                      }}
                      className="p-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl hover:bg-accent hover:scale-110 transition-all duration-200"
                      title="Export board"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setBoardToDuplicate(board._id);
                        setShowDuplicateDialog(true);
                      }}
                      className="p-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl hover:bg-accent hover:scale-110 transition-all duration-200"
                      title="Duplicate board"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    await handleArchiveBoard(board._id, !board.archived);
                  }}
                  className="p-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl hover:bg-accent hover:scale-110 transition-all duration-200"
                  title={board.archived ? "Unarchive board" : "Archive board"}
                >
                  <Archive className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setShowTemplates(false);
          setNewBoard({ title: "", description: "", background: "bg-blue-500", templateLists: [] });
        }}
        title={showTemplates ? "Choose a Template" : "Create New Board"}
      >
        {showTemplates ? (
          <BoardTemplates
            onSelectTemplate={(template) => {
              setNewBoard({
                title: template.name,
                description: template.description,
                background: template.color,
                templateLists: template.lists,
              });
              setShowTemplates(false);
            }}
            onClose={() => {
              setShowTemplates(false);
              setShowCreateModal(false);
            }}
          />
        ) : (
          <form onSubmit={handleCreateBoard} className="space-y-4">
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowTemplates(true)}
                className="flex-1"
              >
                Use Template
              </Button>
            </div>
            <div>
              <Label required>Board Title</Label>
              <Input
                placeholder="e.g., Website Redesign"
                value={newBoard.title}
                onChange={(e) =>
                  setNewBoard({ ...newBoard, title: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                placeholder="What's this board about?"
                value={newBoard.description}
                onChange={(e) =>
                  setNewBoard({ ...newBoard, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label>Background Color</Label>
              <div className="flex gap-2 flex-wrap mt-2">
                {backgroundColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewBoard({ ...newBoard, background: color })}
                    className={`h-10 w-10 rounded-lg ${color} border-2 transition-all ${
                      newBoard.background === color
                        ? "border-foreground scale-110"
                        : "border-transparent hover:scale-105"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewBoard({ title: "", description: "", background: "bg-blue-500", templateLists: [] });
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Create Board</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Duplicate Board Dialog */}
      <ConfirmDialog
        isOpen={showDuplicateDialog}
        onClose={() => {
          setShowDuplicateDialog(false);
          setBoardToDuplicate(null);
        }}
        onConfirm={handleDuplicateBoard}
        title="Duplicate Board"
        message="This will create a copy of this board with all lists and tasks. Assignees will not be copied."
        confirmText="Duplicate"
        cancelText="Cancel"
      />
    </div>
  );
}