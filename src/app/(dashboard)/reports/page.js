"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Clock, Users, Calendar, Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Label from "@/components/ui/Label";
import Select from "@/components/ui/Select";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ReportsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [velocity, setVelocity] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [selectedBoard, setSelectedBoard] = useState("all");
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchBoards();
      fetchReports();
    }
  }, [user, dateRange, selectedBoard]);

  const fetchBoards = async () => {
    if (!user?.id) return;

    try {
      const res = await fetch(`/api/boards?userId=${user.id}`);
      const data = await res.json();

      if (res.ok) {
        setBoards(data.boards || []);
      }
    } catch (error) {
      // Silently fail
    }
  };

  const fetchReports = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const boardParam = selectedBoard !== "all" ? `&boardId=${selectedBoard}` : "";
      const overviewRes = await fetch(
        `/api/reports/overview?userId=${user.id}${boardParam}&startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`
      );
      const velocityRes = await fetch(
        `/api/reports/velocity?userId=${user.id}${boardParam}&weeks=4`
      );

      const overviewData = await overviewRes.json();
      const velocityData = await velocityRes.json();

      if (overviewRes.ok) {
        setOverview(overviewData);
      }
      if (velocityRes.ok) {
        setVelocity(velocityData);
      }
    } catch (error) {
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!overview || !velocity) {
      toast.error("No data to export");
      return;
    }

    const reportData = {
      generatedAt: new Date().toISOString(),
      dateRange,
      overview,
      velocity,
    };

    const jsonStr = JSON.stringify(reportData, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasklyx-report-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Report exported successfully");
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Reports & Analytics</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Track project performance and team productivity
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="shadow-sm hover:shadow-md transition-shadow">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm relative z-10">
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative z-10">
              <Label className="font-semibold">Board</Label>
              <Select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
                className="mt-2"
              >
                <option value="all">All Boards</option>
                {boards.map((board) => (
                  <option key={board._id} value={board._id}>
                    {board.title}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label className="font-semibold">Start Date</Label>
              <Input
                type="date"
                value={dateRange.startDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="mt-2 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div>
              <Label className="font-semibold">End Date</Label>
              <Input
                type="date"
                value={dateRange.endDate}
                onChange={(e) =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="mt-2 bg-muted/50 border-border/50 focus:bg-background focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={fetchReports} className="w-full shadow-sm hover:shadow-md transition-shadow">
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {overview && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Total Tasks</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.totalTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {overview?.overview?.activeTasks || 0} active, {overview?.overview?.completedTasks || 0} completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Completion Rate</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.completionRate || 0}%</div>
              <p className="text-xs text-muted-foreground mt-2">
                Tasks completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Time Logged</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-purple-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {overview?.timeTracking?.totalHoursLogged || 0}h
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {overview?.timeTracking?.totalEntries || 0} entries
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Overdue Tasks</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Calendar className="h-4 w-4 text-red-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{overview?.overview?.overdueTasks || 0}</div>
              <p className="text-xs text-muted-foreground mt-2">
                {overview?.overview?.tasksDueThisWeek || 0} due this week
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks by Priority */}
        {overview && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Tasks by Priority</CardTitle>
              <CardDescription className="mt-1">Distribution of tasks across priority levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(overview?.tasksByPriority || {}).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className="capitalize font-medium">{priority}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{
                            width: `${
                              ((count || 0) / (overview?.overview?.totalTasks || 1)) * 100
                            }%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-semibold w-8 text-right">{count || 0}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Velocity Chart */}
        {velocity && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Team Velocity</CardTitle>
              <CardDescription className="mt-1">
                Average: {velocity?.averageVelocity || 0} tasks/week
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(velocity?.weeklyData || []).map((week) => (
                  <div key={week?.week} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Week {week?.week}</span>
                      <span className="font-semibold">{week?.tasksCompleted || 0} tasks</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full"
                        style={{
                          width: `${
                            ((week?.tasksCompleted || 0) / Math.max(...(velocity?.weeklyData || []).map(w => w?.tasksCompleted || 0), 1)) * 100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Time by User */}
        {overview && (overview?.timeTracking?.timeByUser?.length || 0) > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Time by User</CardTitle>
              <CardDescription className="mt-1">Hours logged per team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(overview?.timeTracking?.timeByUser || []).map((user) => (
                  <div key={user?.userId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{user?.userName || "Unknown"}</p>
                      <p className="text-xs text-muted-foreground">{user?.entries || 0} entries</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{(user?.totalHours || 0).toFixed(1)}h</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Workload Distribution */}
        {overview && (overview?.workload?.tasksByAssignee?.length || 0) > 0 && (
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Workload Distribution</CardTitle>
              <CardDescription className="mt-1">Tasks assigned per team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(overview?.workload?.tasksByAssignee || []).map((assignee) => (
                  <div key={assignee?.userId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{assignee?.userName || "Unknown"}</span>
                      <span className="text-sm">
                        {assignee?.completedCount || 0}/{assignee?.taskCount || 0} completed
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full"
                        style={{
                          width: `${
                            (assignee?.taskCount || 0) > 0
                              ? ((assignee?.completedCount || 0) / (assignee?.taskCount || 1)) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}


