"use client";

import { useState, useEffect } from "react";
import { Users, Mail, UserPlus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function TeamPage() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchTeamMembers();
    }
  }, [user]);

  const fetchTeamMembers = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // First, get all boards user is part of to get board members
      const boardsRes = await fetch(`/api/boards?userId=${user.id}`);
      const boardsData = await boardsRes.json();

      // Get all users in the system (for team page, show everyone)
      let allUsers = [];
      try {
        const usersRes = await fetch(`/api/users/all`);
        const usersData = await usersRes.json();
        if (usersRes.ok && usersData.users) {
          allUsers = usersData.users;
        }
      } catch (error) {
        console.error("Failed to fetch all users:", error);
        // Continue with board members only if this fails
      }

      // Extract unique team members from all boards
      const memberMap = new Map();
      
      if (boardsRes.ok && boardsData.boards) {
        (boardsData.boards || []).forEach((board) => {
          // Add owner
          if (board.owner) {
            const ownerId = board.owner._id?.toString() || board.owner.toString();
            if (!memberMap.has(ownerId)) {
              memberMap.set(ownerId, {
                _id: board.owner._id || board.owner,
                name: board.owner.name,
                email: board.owner.email,
                avatar: board.owner.avatar,
                boards: [],
              });
            }
            memberMap.get(ownerId).boards.push({
              _id: board._id,
              title: board.title,
              role: "owner",
            });
          }

          // Add members
          (board.members || []).forEach((member) => {
            if (member.user) {
              const userId = (member.user._id || member.user).toString();
              if (!memberMap.has(userId)) {
                memberMap.set(userId, {
                  _id: member.user._id || member.user,
                  name: member.user.name,
                  email: member.user.email,
                  avatar: member.user.avatar,
                  boards: [],
                });
              }
              memberMap.get(userId).boards.push({
                _id: board._id,
                title: board.title,
                role: member.role || "member",
              });
            }
          });
        });
      }

      // If we got all users, add any that aren't in boards yet
      // Filter out AI user
      if (allUsers.length > 0) {
        allUsers
          .filter((userData) => userData.email !== "ai@assistant.com")
          .forEach((userData) => {
            const userId = userData.id?.toString() || userData._id?.toString();
            if (!memberMap.has(userId)) {
              memberMap.set(userId, {
                _id: userData.id || userData._id,
                name: userData.name,
                email: userData.email,
                avatar: userData.avatar,
                boards: [],
              });
            }
          });
      }

      setTeamMembers(Array.from(memberMap.values()));
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      toast.error("Failed to fetch team members");
    } finally {
      setLoading(false);
    }
  };

  const filteredMembers = teamMembers.filter(
    (member) =>
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground text-lg">
            Manage your team members and collaborations
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search team members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-10 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
        />
      </div>

      {/* Team Members */}
      {loading ? (
        <div className="text-center py-12">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading team members...</p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No team members found</h3>
            <p className="text-muted-foreground text-center">
              {searchQuery
                ? "Try adjusting your search query"
                : "Team members will appear here when you collaborate on boards"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredMembers.map((member) => {
            const isCurrentUser = user?.id === (member._id?.toString() || member._id);
            
            return (
              <Card key={member._id} className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar
                      name={member.name}
                      src={member.avatar}
                      size="default"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{member.name}</h3>
                        {isCurrentUser && (
                          <Badge variant="outline" className="text-xs">
                            You
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate mb-3">
                        {member.email}
                      </p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Projects ({member.boards.length})
                        </p>
                        <div className="space-y-1">
                          {member.boards.slice(0, 3).map((board, boardIndex) => (
                            <div
                              key={`${member._id}-${board._id}-${boardIndex}`}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="truncate">{board.title}</span>
                              <Badge
                                variant={board.role === "owner" ? "default" : "outline"}
                                className="capitalize text-xs"
                              >
                                {board.role}
                              </Badge>
                            </div>
                          ))}
                          {member.boards.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              +{member.boards.length - 3} more
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

