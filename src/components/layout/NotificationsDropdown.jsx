"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import Button from "../ui/Button";
import Avatar from "../ui/Avatar";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const NotificationsDropdown = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      // Silently fail - notifications are non-critical
    }
  };

  const markAsRead = async (notificationId) => {
    if (!user?.id) return;

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          notificationIds: [notificationId],
        }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n._id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      // Silently fail
    }
  };

  const markAllAsRead = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });

      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      toast.error("Failed to mark notifications as read");
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification._id);
    }
    if (notification.link) {
      // Sanitize the link - extract board ID if it's malformed
      let link = notification.link;
      
      // Check if link is malformed (contains encoded object)
      if (link.includes('%') || link.includes('ObjectId') || link.includes('api/boards')) {
        // Try to extract board ID from relatedBoard if available
        if (notification.relatedBoard) {
          const boardId = notification.relatedBoard._id?.toString() || notification.relatedBoard.toString();
          
          // Reconstruct the link based on notification type
          if (notification.type === 'task_assigned' || notification.type === 'task_comment' || notification.type === 'task_deadline') {
            const taskId = notification.relatedTask?._id?.toString() || notification.relatedTask?.toString();
            link = `/boards/${boardId}${taskId ? `?task=${taskId}` : ''}`;
          } else if (notification.type === 'board_invite') {
            link = `/boards/${boardId}`;
          }
        } else {
          // If we can't fix it, don't navigate
          console.error('Malformed notification link:', link);
          return;
        }
      }
      
      router.push(link);
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        )}
      </Button>

      {showDropdown && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-[100] max-h-[calc(100vh-8rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs text-primary hover:underline"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No notifications
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <button
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-accent transition-colors ${
                      !notification.read ? "bg-accent/50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {notification.relatedUser && (
                        <Avatar
                          name={notification.relatedUser.name}
                          src={notification.relatedUser.avatar}
                          size="sm"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDateTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;

