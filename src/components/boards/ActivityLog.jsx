"use client";

import { useState, useEffect } from "react";
import { Activity, Clock } from "lucide-react";
import Avatar from "../ui/Avatar";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ActivityLog = ({ boardId }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (boardId) {
      fetchActivities();
    }
  }, [boardId]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/boards/${boardId}/activities?limit=50`);
      const data = await res.json();

      if (res.ok) {
        setActivities(data.activities || []);
      }
    } catch (error) {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "board_created":
      case "board_updated":
        return <Activity className={iconClass} />;
      case "task_created":
      case "task_updated":
      case "task_completed":
      case "task_moved":
        return <Activity className={iconClass} />;
      case "comment_added":
        return <Activity className={iconClass} />;
      case "member_added":
      case "member_removed":
        return <Activity className={iconClass} />;
      default:
        return <Activity className={iconClass} />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case "board_created":
      case "task_created":
      case "list_created":
        return "bg-blue-500";
      case "task_completed":
        return "bg-green-500";
      case "task_assigned":
        return "bg-purple-500";
      case "comment_added":
        return "bg-yellow-500";
      case "member_added":
        return "bg-green-500";
      case "member_removed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="spinner h-8 w-8 mx-auto mb-4"></div>
        <p className="text-sm text-muted-foreground">Loading activity...</p>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground">No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="h-5 w-5" />
        <h3 className="font-semibold">Activity Log</h3>
      </div>
      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={activity._id || index} className="flex gap-3">
            {/* Timeline */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-white shrink-0",
                  getActivityColor(activity.type)
                )}
              >
                {getActivityIcon(activity.type)}
              </div>
              {index < activities.length - 1 && (
                <div className="w-0.5 h-full bg-border mt-2" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-start gap-2">
                <Avatar
                  name={activity.user?.name || "User"}
                  src={activity.user?.avatar}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {activity.user?.name || "Unknown"}
                    </span>{" "}
                    <span className="text-muted-foreground">
                      {activity.description}
                    </span>
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatDateTime(activity.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityLog;

