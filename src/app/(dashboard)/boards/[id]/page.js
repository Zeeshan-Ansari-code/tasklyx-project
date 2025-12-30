"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Settings, Users, Star, Activity, Webhook, FileText } from "lucide-react";
import Button from "@/components/ui/Button";
import KanbanBoard from "@/components/boards/KanbanBoard";
import BoardMembersModal from "@/components/boards/BoardMembersModal";
import ActivityLog from "@/components/boards/ActivityLog";
import WebhooksManager from "@/components/boards/WebhooksManager";
import CustomFieldsManager from "@/components/boards/CustomFieldsManager";
import { Card, CardContent } from "@/components/ui/Card";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

export default function BoardDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const boardId = params.id;
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [showWebhooksModal, setShowWebhooksModal] = useState(false);
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const settingsMenuRef = useRef(null);

  useEffect(() => {
    fetchBoard();
  }, [boardId]);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target)) {
        setShowSettingsMenu(false);
      }
    };

    if (showSettingsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showSettingsMenu]);

  // Keyboard shortcut: E for edit board settings
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

      // E key for edit board (open settings menu)
      if (e.key === "e" || e.key === "E") {
        e.preventDefault();
        setShowSettingsMenu(!showSettingsMenu);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSettingsMenu]);

  const fetchBoard = async () => {
    if (!boardId) {
      setLoading(false);
      return;
    }
    
    // Ensure boardId is a string and trim whitespace
    let boardIdStr = String(boardId).trim();
    
    // Try to decode if it's URL encoded
    try {
      boardIdStr = decodeURIComponent(boardIdStr);
    } catch (e) {
      // If decoding fails, use original
    }
    
    // Check if boardId is malformed (contains ObjectId or encoded object)
    if (boardIdStr.includes('ObjectId') || boardIdStr.includes('%') || boardIdStr.length > 24) {
      // Try to extract the actual ID from the malformed string
      const objectIdMatch = boardIdStr.match(/ObjectId\(['"]([a-f0-9]{24})['"]\)/i);
      if (objectIdMatch && objectIdMatch[1]) {
        boardIdStr = objectIdMatch[1];
      } else {
        // If we can't extract a valid ID, redirect to boards page
        toast.error("Invalid board link. Redirecting to boards page.");
        setTimeout(() => router.push("/boards"), 2000);
        return;
      }
    }
    
    // Validate it's a proper ObjectId format (24 hex characters)
    if (!/^[a-f0-9]{24}$/i.test(boardIdStr)) {
      toast.error("Invalid board ID format. Redirecting to boards page.");
      setTimeout(() => router.push("/boards"), 2000);
      return;
    }
    
    try {
      setLoading(true);
      const res = await fetch(`/api/boards/${encodeURIComponent(boardIdStr)}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
        toast.error(errorData.message || "Board not found");
        setLoading(false);
        setTimeout(() => router.push("/boards"), 2000);
        return;
      }
      
      const data = await res.json();
      
      if (data.board) {
        setBoard(data.board);
        setLoading(false);
      } else {
        toast.error("Board data is missing");
        setLoading(false);
      }
    } catch (error) {
      toast.error("Failed to load board: " + error.message);
      setLoading(false);
      setTimeout(() => router.push("/boards"), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Board not found</p>
          <Button onClick={() => router.push("/boards")}>
            Back to Boards
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Board Header - Enhanced with better spacing and visual hierarchy */}
      <div
        className={` ${board.background} rounded-xl mb-8 p-8 text-white relative shadow-lg transition-all duration-300`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/boards")}
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
              aria-label="Back to boards"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="space-y-1">
              <h1 className="text-3xl font-bold tracking-tight">{board.title}</h1>
              {board.description && (
                <p className="text-white/90 mt-2 text-base leading-relaxed max-w-2xl">
                  {board.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
              title={board.isFavorite ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                className={`h-5 w-5 transition-all duration-200 ${
                  board.isFavorite ? "fill-yellow-400 text-yellow-400" : ""
                }`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
              onClick={() => setShowActivityLog(!showActivityLog)}
              title="Activity Log"
            >
              <Activity className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
              onClick={() => setShowMembersModal(true)}
              title="Board Members"
            >
              <Users className="h-5 w-5" />
            </Button>
            <div className="relative" ref={settingsMenuRef}>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 transition-all duration-200 hover:scale-110"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                title="Settings"
              >
                <Settings className="h-5 w-5" />
              </Button>
              {showSettingsMenu && (
                <div className="absolute right-0 top-full mt-2 w-52 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-100 animate-in fade-in slide-in-from-top-2 duration-200">
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-b-none rounded-t-lg hover:bg-accent/50 transition-colors text-foreground"
                    onClick={() => {
                      setShowWebhooksModal(true);
                      setShowSettingsMenu(false);
                    }}
                  >
                    <Webhook className="h-4 w-4 mr-2 text-foreground" />
                    <span className="font-medium text-foreground">Webhooks</span>
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start rounded-t-none rounded-b-lg hover:bg-accent/50 transition-colors text-foreground"
                    onClick={() => {
                      setShowCustomFieldsModal(true);
                      setShowSettingsMenu(false);
                    }}
                  >
                    <FileText className="h-4 w-4 mr-2 text-foreground" />
                    <span className="font-medium text-foreground">Custom Fields</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board - Enhanced with better spacing */}
      <div className={`flex-1 overflow-auto ${showActivityLog ? "mr-96" : ""} transition-all duration-300 ease-in-out`}>
        <div className="p-2">
          <KanbanBoard 
            boardId={boardId} 
            initialLists={board.lists || []}
            boardMembers={getBoardMembers(board)}
            board={board}
          />
        </div>
      </div>

      {/* Activity Log Sidebar - Enhanced with smooth animation */}
      {showActivityLog && (
        <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border z-40 overflow-y-auto p-6 shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
            <h2 className="text-xl font-semibold tracking-tight">Activity Log</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowActivityLog(false)}
              className="hover:bg-accent transition-colors"
              aria-label="Close activity log"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <ActivityLog boardId={boardId} />
        </div>
      )}

      {/* Board Members Modal */}
      <BoardMembersModal
        isOpen={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        board={board}
        onUpdate={fetchBoard}
      />

      {/* Webhooks Manager Modal */}
      {user && (
        <WebhooksManager
          boardId={boardId}
          userId={user.id}
          isOpen={showWebhooksModal}
          onClose={() => setShowWebhooksModal(false)}
        />
      )}

      {/* Custom Fields Manager Modal */}
      {user && (
        <CustomFieldsManager
          boardId={boardId}
          userId={user.id}
          isOpen={showCustomFieldsModal}
          onClose={() => setShowCustomFieldsModal(false)}
        />
      )}
    </div>
  );
}

// Helper function to get all board members (owner + members)
function getBoardMembers(board) {
  const members = [];
  
  // Add owner (exclude AI user)
  if (board.owner && board.owner.email !== "ai@assistant.com") {
    members.push({
      _id: board.owner._id || board.owner,
      name: board.owner.name,
      email: board.owner.email,
      avatar: board.owner.avatar,
    });
  }
  
  // Add other members (exclude AI user)
  if (board.members && Array.isArray(board.members)) {
    board.members.forEach((member) => {
      if (member.user && member.user.email !== "ai@assistant.com") {
        const userId = member.user._id || member.user;
        // Avoid duplicates (owner might also be in members)
        if (!members.find((m) => (m._id || m) === userId)) {
          members.push({
            _id: userId,
            name: member.user.name,
            email: member.user.email,
            avatar: member.user.avatar,
          });
        }
      }
    });
  }
  
  return members;
}