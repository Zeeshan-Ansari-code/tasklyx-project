import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Task from "@/models/Task";
import TimeEntry from "@/models/TimeEntry";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const boardId = searchParams.get("boardId");

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Build query for boards
    const boardQuery = {
      $or: [{ owner: userId }, { "members.user": userId }],
    };

    if (boardId && mongoose.Types.ObjectId.isValid(boardId)) {
      boardQuery._id = boardId;
    }

    const boards = await Board.find(boardQuery).select("_id title");
    const boardIds = boards.map((b) => b._id);

    // Get all unique team members across boards
    const allMembers = new Set();
    boards.forEach((board) => {
      if (board.owner) allMembers.add(board.owner.toString());
      board.members?.forEach((m) => {
        if (m.user) allMembers.add(m.user.toString());
      });
    });

    // Always include all users in the system for resource management
    // This ensures we show all users even if they're not in boards
    // Exclude AI user
    const allUsers = await User.find({ email: { $ne: "ai@assistant.com" } }).select("_id");
    allUsers.forEach((u) => allMembers.add(u._id.toString()));

    const memberIds = Array.from(allMembers);

    // Get workload for each member
    const workloadData = await Promise.all(
      memberIds.map(async (memberId) => {
        const member = await User.findById(memberId).select("name email avatar");

        // Get assigned tasks
        const assignedTasks = await Task.find({
          board: { $in: boardIds },
          assignees: memberId,
          completed: false,
        }).select("title priority dueDate estimatedHours");

        // Count tasks by priority
        const tasksByPriority = {
          urgent: assignedTasks.filter((t) => t.priority === "urgent").length,
          high: assignedTasks.filter((t) => t.priority === "high").length,
          medium: assignedTasks.filter((t) => t.priority === "medium").length,
          low: assignedTasks.filter((t) => t.priority === "low").length,
        };

        // Get overdue tasks
        const overdueTasks = assignedTasks.filter(
          (t) => t.dueDate && new Date(t.dueDate) < new Date()
        );

        // Calculate estimated hours
        const totalEstimatedHours = assignedTasks.reduce(
          (sum, task) => sum + (task.estimatedHours || 0),
          0
        );

        // Get logged hours for this user
        const timeEntries = await TimeEntry.find({
          board: { $in: boardIds },
          user: memberId,
        });

        const totalLoggedHours = timeEntries.reduce(
          (sum, entry) => sum + entry.hours,
          0
        );

        // Calculate capacity (assuming 40 hours/week standard)
        const weeklyCapacity = 40;
        const currentLoad = totalEstimatedHours || assignedTasks.length * 2; // Default 2h per task if no estimate
        const capacityPercentage = (currentLoad / weeklyCapacity) * 100;

        return {
          userId: memberId,
          userName: member?.name || "Unknown",
          userEmail: member?.email || "",
          userAvatar: member?.avatar || null,
          totalTasks: assignedTasks.length,
          tasksByPriority,
          overdueTasks: overdueTasks.length,
          totalEstimatedHours: parseFloat(totalEstimatedHours.toFixed(2)),
          totalLoggedHours: parseFloat(totalLoggedHours.toFixed(2)),
          weeklyCapacity,
          currentLoad: parseFloat(currentLoad.toFixed(2)),
          capacityPercentage: parseFloat(capacityPercentage.toFixed(1)),
          status:
            capacityPercentage > 100
              ? "overloaded"
              : capacityPercentage > 80
              ? "high"
              : capacityPercentage > 50
              ? "medium"
              : "low",
        };
      })
    );

    // Sort by capacity percentage (highest first)
    workloadData.sort((a, b) => b.capacityPercentage - a.capacityPercentage);

    // Calculate team statistics
    const teamStats = {
      totalMembers: workloadData.length,
      overloaded: workloadData.filter((w) => w.status === "overloaded").length,
      highLoad: workloadData.filter((w) => w.status === "high").length,
      mediumLoad: workloadData.filter((w) => w.status === "medium").length,
      lowLoad: workloadData.filter((w) => w.status === "low").length,
      averageCapacity: workloadData.length > 0
        ? parseFloat(
            (
              workloadData.reduce((sum, w) => sum + w.capacityPercentage, 0) /
              workloadData.length
            ).toFixed(1)
          )
        : 0,
    };

    return NextResponse.json(
      {
        workload: workloadData,
        teamStats,
        boards: boards.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}


