"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Shield, Search, Loader2, Edit2, Check, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import Avatar from "@/components/ui/Avatar";

export default function AdminUsersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUserId, setEditingUserId] = useState(null);
  const [editingRole, setEditingRole] = useState("");

  useEffect(() => {
    // Check if user is admin
    if (!user) {
      router.push("/login");
      return;
    }

    if (user.role !== "admin") {
      toast.error("Access denied. Admin privileges required.");
      router.push("/dashboard");
      return;
    }

    fetchUsers();
  }, [user, router]);

  const fetchUsers = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/users/list?adminUserId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setUsers(data.users || []);
      } else {
        toast.error(data.message || "Failed to load users");
      }
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (userId, currentRole) => {
    setEditingUserId(userId);
    setEditingRole(currentRole);
  };

  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditingRole("");
  };

  const handleSaveRole = async (userId) => {
    if (!user?.id) return;

    if (editingRole === users.find((u) => u.id === userId)?.role) {
      handleCancelEdit();
      return;
    }

    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newRole: editingRole,
          adminUserId: user.id,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`User role updated to ${editingRole}`);
        setUsers(
          users.map((u) =>
            u.id === userId ? { ...u, role: editingRole } : u
          )
        );
        handleCancelEdit();
      } else {
        toast.error(data.message || "Failed to update role");
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      case "manager":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "team_member":
        return "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20";
      case "viewer":
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "team_member":
        return "Team Member";
      case "viewer":
        return "Viewer";
      default:
        return role;
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">User Management</CardTitle>
              <CardDescription>
                Manage user roles and permissions. Only admins can access this page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Users List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No users found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map((userItem) => (
                <div
                  key={userItem.id}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar
                      name={userItem.name}
                      src={userItem.avatar}
                      size="default"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        {userItem.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {userItem.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {editingUserId === userItem.id ? (
                      <>
                        <Select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value)}
                          className="w-40"
                        >
                          <option value="admin">Admin</option>
                          <option value="manager">Manager</option>
                          <option value="team_member">Team Member</option>
                          <option value="viewer">Viewer</option>
                        </Select>
                        <Button
                          size="sm"
                          onClick={() => handleSaveRole(userItem.id)}
                          className="h-9"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancelEdit}
                          className="h-9"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleBadgeColor(
                            userItem.role
                          )}`}
                        >
                          {getRoleLabel(userItem.role)}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleEditRole(userItem.id, userItem.role)
                          }
                          disabled={userItem.id === user.id}
                          title={
                            userItem.id === user.id
                              ? "Cannot change your own role"
                              : "Edit role"
                          }
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Role Permissions Info */}
          <div className="mt-8 p-4 bg-muted/30 rounded-lg border border-border/50">
            <h3 className="font-semibold mb-3 text-foreground">Role Permissions</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong className="text-foreground">Admin:</strong> Full access,
                can manage users, boards, and all settings
              </p>
              <p>
                <strong className="text-foreground">Manager:</strong> Can create
                boards, assign tasks, manage team members
              </p>
              <p>
                <strong className="text-foreground">Team Member:</strong> Can
                create tasks, update assigned tasks, comment on tasks
              </p>
              <p>
                <strong className="text-foreground">Viewer:</strong> Read-only
                access, can view boards and tasks but cannot make changes
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

