"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { Users, Search, X, UserPlus, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import Input from "../ui/Input";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import Badge from "../ui/Badge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";

const BoardMembersModal = ({ isOpen, onClose, board, onUpdate }) => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchRef = useRef(null);

  // Memoize board members to prevent infinite loops
  const boardMembers = useMemo(() => {
    if (!board) return [];
    
    const ownerId = board.owner?._id?.toString() || board.owner?.toString();
    const members = [];
    
    // Add owner (exclude AI user)
    if (board.owner && board.owner.email !== "ai@assistant.com") {
      members.push({
        _id: board.owner._id || board.owner,
        name: board.owner.name || "Unknown",
        email: board.owner.email || "",
        avatar: board.owner.avatar,
        role: "owner",
      });
    }
    
    // Add other members (excluding owner if they're also in members, and exclude AI user)
    if (board.members && Array.isArray(board.members)) {
      board.members.forEach((member) => {
        if (member.user && member.user.email !== "ai@assistant.com") {
          const userId = (member.user._id || member.user).toString();
          // Avoid duplicates (owner might also be in members)
          if (userId !== ownerId && !members.find((m) => {
            const memberId = (m._id?.toString() || String(m._id));
            return memberId === userId;
          })) {
            members.push({
              _id: member.user._id || member.user,
              name: member.user.name || "Unknown",
              email: member.user.email || "",
              avatar: member.user.avatar,
              role: member.role || "member",
            });
          }
        }
      });
    }
    
    return members;
  }, [board]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [isOpen]);

  // Memoize existing member IDs to prevent dependency issues
  const existingMemberIds = useMemo(() => {
    return boardMembers.map((m) => {
      const id = m._id?.toString() || m._id?.toString() || String(m._id);
      return id;
    });
  }, [boardMembers]);

  // Search users
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();

        if (res.ok) {
          // Filter out users who are already members
          const filtered = (data.users || []).filter(
            (u) => {
              const userId = u._id?.toString() || String(u._id);
              return !existingMemberIds.includes(userId);
            }
          );
          setSearchResults(filtered);
        }
      } catch (error) {
        toast.error("Failed to search users");
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery, existingMemberIds]);

  const handleAddMember = async (userId) => {
    if (!board?._id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/boards/${board._id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: "member" }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Member added successfully");
        setSearchQuery("");
        setSearchResults([]);
        setShowSearch(false);
        onUpdate && onUpdate();
      } else {
        toast.error(data.message || "Failed to add member");
      }
    } catch (error) {
      toast.error("Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!board?._id) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/boards/${board._id}/members?userId=${userId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success("Member removed successfully");
        onUpdate && onUpdate();
      } else {
        toast.error(data.message || "Failed to remove member");
      }
    } catch (error) {
      toast.error("Failed to remove member");
    } finally {
      setLoading(false);
    }
  };

  const isOwner = currentUser?.id === (board?.owner?._id || board?.owner);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Board Members" size="lg">
      <div className="space-y-4">
        {/* Add Member Section */}
        {isOwner && (
          <div className="pb-4 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4" />
              <h3 className="font-semibold">Add Member</h3>
            </div>
            <div className="relative" ref={searchRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(e.target.value.length >= 2);
                  }}
                  className="pl-10"
                />
              </div>

              {/* Search Results Dropdown */}
              {showSearch && (
                <div className="absolute z-[100] w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-60 overflow-y-auto top-full left-0 right-0">
                  {searching ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                      {searchQuery.length >= 2
                        ? "No users found"
                        : "Type at least 2 characters to search"}
                    </div>
                  ) : (
                    <div className="p-1">
                      {searchResults.map((user) => (
                        <button
                          key={user._id}
                          type="button"
                          onClick={() => handleAddMember(user._id)}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-accent transition-colors text-left"
                        >
                          <Avatar
                            name={user.name}
                            src={user.avatar}
                            size="sm"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {user.name}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Members List */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4" />
            <h3 className="font-semibold">
              Members ({boardMembers.length})
            </h3>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {boardMembers.map((member, index) => {
              const memberId = member._id?.toString() || String(member._id) || `member-${index}`;
              const isCurrentUser = currentUser?.id === memberId;
              const canRemove = isOwner && member.role !== "owner" && !isCurrentUser;

              return (
                <div
                  key={`${memberId}-${member.role}-${index}`}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar
                      name={member.name}
                      src={member.avatar}
                      size="default"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{member.name}</p>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                    <Badge
                      variant={member.role === "owner" ? "default" : "outline"}
                      className="capitalize"
                    >
                      {member.role}
                    </Badge>
                  </div>
                  {canRemove && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveMember(member._id)}
                      disabled={loading}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BoardMembersModal;

