"use client";

import { useState, useEffect, useRef } from "react";
import { Settings, User, Bell, Lock, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Avatar from "@/components/ui/Avatar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { getRoleLabel, getRoleBadgeColor } from "@/lib/permissions";
import Badge from "@/components/ui/Badge";

export default function SettingsPage() {
  const { user, logout, login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    emailNotifications: true,
    taskAssigned: true,
    taskDeadline: true,
    taskComment: true,
    boardInvite: true,
    dailyDigest: false,
  });
  const avatarInputRef = useRef(null);
  const [userCreatedAt, setUserCreatedAt] = useState(null);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
      });
      fetchNotificationPrefs();
      fetchUserCreatedAt();
    }
  }, [user]);

  const fetchUserCreatedAt = async () => {
    if (!user?.id || user?.createdAt) {
      // If createdAt already present in auth user, just use it
      if (user?.createdAt) {
        setUserCreatedAt(user.createdAt);
      }
      return;
    }

    try {
      const res = await fetch(`/api/users/profile?userId=${user.id}`);
      const data = await res.json();

      if (res.ok && data.user?.createdAt) {
        setUserCreatedAt(data.user.createdAt);
        // Also patch auth context with createdAt so it's available everywhere
        login({
          ...user,
          createdAt: data.user.createdAt,
        });
      }
    } catch (error) {
      // Silent fail – we will just show N/A if it can't be loaded
    }
  };

  const fetchNotificationPrefs = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/users/notifications?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setNotificationPrefs({
          emailNotifications: data.emailNotifications ?? true,
          ...data.notificationPreferences,
        });
      }
    } catch (error) {
      // Silently fail
    }
  };

  const handleUpdateNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch("/api/users/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          emailNotifications: notificationPrefs.emailNotifications,
          notificationPreferences: {
            taskAssigned: notificationPrefs.taskAssigned,
            taskDeadline: notificationPrefs.taskDeadline,
            taskComment: notificationPrefs.taskComment,
            boardInvite: notificationPrefs.boardInvite,
            dailyDigest: notificationPrefs.dailyDigest,
          },
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Notification preferences updated");
      } else {
        toast.error(data.message || "Failed to update preferences");
      }
    } catch (error) {
      toast.error("Failed to update notification preferences");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          name: formData.name,
          email: formData.email,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Profile updated successfully");
        // Update auth context with new user data
        login({
          ...user,
          name: data.user.name,
          email: data.user.email,
        });
      } else {
        toast.error(data.message || "Failed to update profile");
      }
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user?.id) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Password changed successfully");
        setShowPasswordModal(false);
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        toast.error(data.message || "Failed to change password");
      }
    } catch (error) {
      toast.error("Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;

    if (!deletePassword) {
      toast.error("Please enter your password to confirm");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/users/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          password: deletePassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Account deleted successfully");
        logout();
        router.push("/login");
      } else {
        toast.error(data.message || "Failed to delete account");
      }
    } catch (error) {
      toast.error("Failed to delete account");
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
      setDeletePassword("");
    }
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Avatar size must be 2MB or less");
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("userId", user.id);
      formData.append("file", file);

      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Avatar updated successfully");
        login({
          ...user,
          avatar: data.avatar,
        });
      } else {
        toast.error(data.message || "Failed to update avatar");
      }
    } catch (error) {
      toast.error("Failed to update avatar");
    } finally {
      setAvatarUploading(false);
      // Clear file input so same file can be selected again if needed
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-lg">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription className="mt-1">
                    Update your personal information
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  <Avatar
                    name={user?.name || "User"}
                    src={user?.avatar}
                    size="lg"
                  />
                  <div>
                    <input
                      ref={avatarInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleAvatarChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAvatarClick}
                      disabled={avatarUploading}
                    >
                      {avatarUploading ? "Uploading..." : "Change Avatar"}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG or GIF. Max size 2MB
                    </p>
                  </div>
                </div>

                <div>
                  <Label required>Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Your name"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label required>Email</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="your.email@example.com"
                    required
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>Current Role</Label>
                  <div className="mt-2">
                    {user?.role ? (
                      <Badge
                        variant="outline"
                        className={getRoleBadgeColor(user.role)}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Not assigned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your role determines what actions you can perform. Contact an admin to change your role.
                  </p>
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Email Notifications</CardTitle>
                  <CardDescription className="mt-1">
                    Manage your email notification preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Enable or disable all email notifications
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationPrefs.emailNotifications}
                    onChange={(e) =>
                      setNotificationPrefs({
                        ...notificationPrefs,
                        emailNotifications: e.target.checked,
                      })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Assignments</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're assigned to a task
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.taskAssigned}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          taskAssigned: e.target.checked,
                        })
                      }
                      disabled={!notificationPrefs.emailNotifications}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Task Comments</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about new comments on your tasks
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.taskComment}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          taskComment: e.target.checked,
                        })
                      }
                      disabled={!notificationPrefs.emailNotifications}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Deadline Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified about upcoming deadlines
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.taskDeadline}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          taskDeadline: e.target.checked,
                        })
                      }
                      disabled={!notificationPrefs.emailNotifications}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Board Invitations</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when you're invited to a board
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.boardInvite}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          boardInvite: e.target.checked,
                        })
                      }
                      disabled={!notificationPrefs.emailNotifications}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Daily Digest</p>
                    <p className="text-sm text-muted-foreground">
                      Receive a daily summary of your tasks
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={notificationPrefs.dailyDigest}
                      onChange={(e) =>
                        setNotificationPrefs({
                          ...notificationPrefs,
                          dailyDigest: e.target.checked,
                        })
                      }
                      disabled={!notificationPrefs.emailNotifications}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button
                  onClick={handleUpdateNotifications}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Save Preferences"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Security</CardTitle>
                  <CardDescription className="mt-1">
                    Manage your password and security settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start hover:bg-accent transition-colors"
                onClick={() => setShowPasswordModal(true)}
              >
                <Lock className="h-4 w-4 mr-2" />
                Change Password
              </Button>
              <p className="text-sm text-muted-foreground">
                Last password change: Never
              </p>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/20 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-destructive">Danger Zone</CardTitle>
                  <CardDescription className="mt-1">
                    Irreversible and destructive actions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                disabled={loading}
                className="shadow-sm hover:shadow-md transition-shadow"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
              <p className="text-sm text-muted-foreground mt-3">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription className="mt-1">
                Your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Member since</p>
                <p className="font-semibold text-foreground">
                  {(user?.createdAt || userCreatedAt)
                    ? new Date(user?.createdAt || userCreatedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                    : "N/A"}
                </p>
              </div>
              <div className="space-y-1 pt-4 border-t border-border/50">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Account ID</p>
                <p className="font-mono text-xs break-all bg-muted/50 p-2 rounded-md">{user?.id || "N/A"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
        }}
        title="Change Password"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label required>Current Password</Label>
            <Input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  currentPassword: e.target.value,
                })
              }
              placeholder="Enter current password"
              required
              className="mt-2"
            />
          </div>

          <div>
            <Label required>New Password</Label>
            <Input
              type="password"
              value={passwordData.newPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  newPassword: e.target.value,
                })
              }
              placeholder="Enter new password (min 6 characters)"
              required
              className="mt-2"
              minLength={6}
            />
          </div>

          <div>
            <Label required>Confirm New Password</Label>
            <Input
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) =>
                setPasswordData({
                  ...passwordData,
                  confirmPassword: e.target.value,
                })
              }
              placeholder="Confirm new password"
              required
              className="mt-2"
              minLength={6}
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordModal(false);
                setPasswordData({
                  currentPassword: "",
                  newPassword: "",
                  confirmPassword: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Account Confirm Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setDeletePassword("");
        }}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        message="This action cannot be undone. This will permanently delete your account and all associated data. Please enter your password to confirm."
        confirmText="Delete Account"
        cancelText="Cancel"
        variant="destructive"
      >
        <div className="mt-4">
          <Label required>Password</Label>
          <Input
            type="password"
            value={deletePassword}
            onChange={(e) => setDeletePassword(e.target.value)}
            placeholder="Enter your password to confirm"
            className="mt-2"
            autoFocus
          />
        </div>
      </ConfirmDialog>
    </div>
  );
}

