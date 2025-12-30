"use client";

import { useState, useEffect } from "react";
import { Users, AlertTriangle, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Avatar from "@/components/ui/Avatar";
import Select from "@/components/ui/Select";
import Label from "@/components/ui/Label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function ResourcePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [workload, setWorkload] = useState(null);
  const [selectedBoard, setSelectedBoard] = useState("all");
  const [boards, setBoards] = useState([]);

  useEffect(() => {
    if (user?.id) {
      fetchBoards();
      fetchWorkload();
    }
  }, [user, selectedBoard]);

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

  const fetchWorkload = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const boardParam = selectedBoard !== "all" ? `&boardId=${selectedBoard}` : "";
      const res = await fetch(
        `/api/resource/workload?userId=${user.id}${boardParam}`
      );
      const data = await res.json();

      if (res.ok) {
        setWorkload(data);
      } else {
        toast.error(data.message || "Failed to fetch workload data");
      }
    } catch (error) {
      toast.error("Failed to fetch workload data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "overloaded":
        return "destructive";
      case "high":
        return "warning";
      case "medium":
        return "info";
      case "low":
        return "default";
      default:
        return "default";
    }
  };

  if (loading && !workload) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="spinner h-12 w-12 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading resource data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-2 sm:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">Resource Management</h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Monitor team workload and capacity planning
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border/50 shadow-sm relative z-10">
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative z-10">
              <Label className="font-semibold mb-2">Board</Label>
              <Select
                value={selectedBoard}
                onChange={(e) => setSelectedBoard(e.target.value)}
              >
                <option value="all">All Boards</option>
                {boards.map((board) => (
                  <option key={board._id} value={board._id}>
                    {board.title}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Statistics */}
      {workload && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card className="border-border/50 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold">Team Members</CardTitle>
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{workload.teamStats.totalMembers}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">
                {workload.teamStats.overloaded}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">High Load</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">
                {workload.teamStats.highLoad}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Medium Load</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">
                {workload.teamStats.mediumLoad}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Avg Capacity</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {workload.teamStats.averageCapacity}%
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workload Details */}
      {workload && workload.workload.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Team Workload</CardTitle>
            <CardDescription>
              Individual capacity and task distribution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {workload.workload.map((member) => (
                <div
                  key={member.userId}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.userName}
                        src={member.userAvatar}
                        size="sm"
                      />
                      <div>
                        <p className="font-semibold">{member.userName}</p>
                        <p className="text-sm text-muted-foreground">
                          {member.userEmail}
                        </p>
                      </div>
                    </div>
                    <Badge variant={getStatusColor(member.status)}>
                      {member.status === "overloaded"
                        ? "Overloaded"
                        : member.status === "high"
                        ? "High Load"
                        : member.status === "medium"
                        ? "Medium Load"
                        : "Low Load"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Tasks</p>
                      <p className="text-lg font-semibold">{member.totalTasks}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue</p>
                      <p className="text-lg font-semibold text-red-500">
                        {member.overdueTasks}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Est. Hours</p>
                      <p className="text-lg font-semibold">
                        {member.totalEstimatedHours}h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Capacity</p>
                      <p className="text-lg font-semibold">
                        {member.capacityPercentage}%
                      </p>
                    </div>
                  </div>

                  {/* Capacity Bar */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span>Capacity Usage</span>
                      <span>{member.currentLoad}h / {member.weeklyCapacity}h</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          member.capacityPercentage > 100
                            ? "bg-red-500"
                            : member.capacityPercentage > 80
                            ? "bg-orange-500"
                            : member.capacityPercentage > 50
                            ? "bg-yellow-500"
                            : "bg-green-500"
                        }`}
                        style={{
                          width: `${Math.min(member.capacityPercentage, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Tasks by Priority */}
                  {member.totalTasks > 0 && (
                    <div className="flex gap-2 text-xs">
                      {member.tasksByPriority.urgent > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          Urgent: {member.tasksByPriority.urgent}
                        </Badge>
                      )}
                      {member.tasksByPriority.high > 0 && (
                        <Badge variant="warning" className="text-xs">
                          High: {member.tasksByPriority.high}
                        </Badge>
                      )}
                      {member.tasksByPriority.medium > 0 && (
                        <Badge variant="info" className="text-xs">
                          Medium: {member.tasksByPriority.medium}
                        </Badge>
                      )}
                      {member.tasksByPriority.low > 0 && (
                        <Badge variant="default" className="text-xs">
                          Low: {member.tasksByPriority.low}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


