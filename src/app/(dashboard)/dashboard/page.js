"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LayoutDashboard, TrendingUp, Users, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { RecentBoardsSkeleton, RecentActivitySkeleton, UpcomingDeadlinesSkeleton } from "@/components/ui/DashboardSkeletons";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBoards: 0,
    activeTasks: 0,
    teamMembers: 0,
    completionRate: 0,
  });
  const [recentBoards, setRecentBoards] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only depend on user.id, not entire user object

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/dashboard?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setStats(data.stats || stats);
        setRecentBoards(data.recentBoards || []);
        setRecentActivity(data.recentActivity || []);
        setUpcomingDeadlines(data.upcomingDeadlines || []);
      } else {
        toast.error(data.message || "Failed to fetch dashboard data");
      }
    } catch (error) {
      toast.error("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      title: "Total Boards",
      value: stats.totalBoards.toString(),
      change: `${stats.totalBoards} board${stats.totalBoards !== 1 ? "s" : ""}`,
      icon: LayoutDashboard,
      color: "text-blue-500",
    },
    {
      title: "Active Tasks",
      value: stats.activeTasks.toString(),
      change: `${stats.activeTasks} task${stats.activeTasks !== 1 ? "s" : ""} in progress`,
      icon: CheckCircle,
      color: "text-green-500",
    },
    {
      title: "Team Members",
      value: stats.teamMembers.toString(),
      change: `${stats.teamMembers} member${stats.teamMembers !== 1 ? "s" : ""}`,
      icon: Users,
      color: "text-purple-500",
    },
    {
      title: "Completion Rate",
      value: `${stats.completionRate}%`,
      change: `${stats.completionRate}% tasks completed`,
      icon: TrendingUp,
      color: "text-orange-500",
    },
  ];

  const priorityColors = {
    low: "default",
    medium: "warning",
    high: "info",
    urgent: "destructive",
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.change}
                </p>
              </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Boards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="lg:col-span-1"
        >
          {loading ? (
            <RecentBoardsSkeleton />
          ) : (
          <Card className="h-auto sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex flex-col">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Recent Boards</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden flex flex-col space-y-3">
            {recentBoards.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                No boards yet. Create your first board!
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {recentBoards.map((board) => (
                  <Link
                    key={board._id}
                    href={`/boards/${board._id}`}
                    className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                  >
                    <div
                      className={`h-12 w-12 sm:h-16 sm:w-16 rounded-lg ${board.background} shrink-0`}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{board.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5">
                        {board.description}
                      </p>
                      <div className="flex items-center gap-3 sm:gap-4 mt-1.5 sm:mt-2 text-xs text-muted-foreground">
                        <span>{board.tasks} tasks</span>
                        <span>•</span>
                        <span>{board.members} members</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            <div className="pt-2 shrink-0">
              <Link href="/boards">
                <Button variant="outline" className="w-full text-sm sm:text-base">
                  View All Boards
                </Button>
              </Link>
            </div>
          </CardContent>
          </Card>
          )}
        </motion.div>

        {/* Recent Activity - Fixed height and scrollable */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
          className="lg:col-span-1"
        >
        {loading ? (
          <RecentActivitySkeleton />
        ) : (
        <Card className="h-auto sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex flex-col">
          <CardHeader className="shrink-0 pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="text-center py-4 text-sm sm:text-base text-muted-foreground">
                No recent activity
              </div>
            ) : (
              <div className="h-full max-h-[500px] overflow-y-auto pr-2 space-y-3 sm:space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {recentActivity.map((activity) => (
                  <div key={activity._id} className="flex items-start gap-2 sm:gap-3">
                    <Avatar
                      name={activity.userData?.name || activity.user}
                      src={activity.userData?.avatar}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs sm:text-sm leading-relaxed">
                        <span className="font-semibold">
                          {activity.userData?.name || activity.user}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {activity.action}
                        </span>{" "}
                        <span className="font-medium break-words">{activity.task}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
        </motion.div>

        {/* Upcoming Deadlines - Fixed height and scrollable */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.26, ease: "easeOut" }}
          className="lg:col-span-1"
        >
        {loading ? (
          <UpcomingDeadlinesSkeleton />
        ) : (
        <Card className="h-auto sm:h-[50vh] min-h-[300px] sm:min-h-[400px] flex flex-col">
          <CardHeader className="shrink-0 pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl">Upcoming Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            {upcomingDeadlines.length === 0 ? (
              <div className="text-center py-4 text-sm sm:text-base text-muted-foreground">
                No upcoming deadlines
              </div>
            ) : (
              <div className="h-full max-h-[500px] overflow-y-auto pr-2 space-y-2 sm:space-y-3 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {upcomingDeadlines.map((task) => (
                  <div
                    key={task._id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start sm:items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base truncate flex-1 min-w-0">{task.title}</h4>
                        <Badge
                          variant={priorityColors[task.priority]}
                          className="capitalize shrink-0 text-xs"
                        >
                          {task.priority}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 truncate">
                        {task.board} • Due {formatDate(task.dueDate)}
                      </p>
                    </div>
                    {task.boardId && (
                      <Link href={`/boards/${task.boardId}`} className="shrink-0 w-full sm:w-auto">
                        <Button size="sm" className="w-full sm:w-auto text-xs sm:text-sm">View</Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
        </motion.div>
      </div>
    </div>
  );
}