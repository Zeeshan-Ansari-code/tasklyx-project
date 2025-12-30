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

    // Optimize: Use aggregation to get all task data at once
    const [taskData, timeEntryData, userData] = await Promise.all([
      // Aggregate tasks by assignee
      Task.aggregate([
        {
          $match: {
            board: { $in: boardIds },
            assignees: { $in: memberIds },
            completed: false,
          },
        },
        { $unwind: "$assignees" },
        {
          $group: {
            _id: "$assignees",
            tasks: { $push: "$$ROOT" },
            totalEstimatedHours: { $sum: { $ifNull: ["$estimatedHours", 0] } },
            urgent: { $sum: { $cond: [{ $eq: ["$priority", "urgent"] }, 1, 0] } },
            high: { $sum: { $cond: [{ $eq: ["$priority", "high"] }, 1, 0] } },
            medium: { $sum: { $cond: [{ $eq: ["$priority", "medium"] }, 1, 0] } },
            low: { $sum: { $cond: [{ $eq: ["$priority", "low"] }, 1, 0] } },
          },
        },
      ]),
      // Aggregate time entries
      TimeEntry.aggregate([
        {
          $match: {
            board: { $in: boardIds },
            user: { $in: memberIds },
          },
        },
        {
          $group: {
            _id: "$user",
            totalLoggedHours: { $sum: "$hours" },
          },
        },
      ]),
      // Get all users at once
      User.find({ _id: { $in: memberIds } }).select("_id name email avatar").lean(),
    ]);

    // Create maps for quick lookup
    const taskMap = new Map();
    taskData.forEach((item) => {
      const overdueCount = item.tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < new Date()
      ).length;
      taskMap.set(item._id.toString(), {
        ...item,
        overdueCount,
      });
    });

    const timeEntryMap = new Map(
      timeEntryData.map((item) => [item._id.toString(), item.totalLoggedHours])
    );

    const userMap = new Map(
      userData.map((u) => [u._id.toString(), u])
    );

    // Build workload data
    const workloadData = memberIds.map((memberId) => {
      const memberIdStr = memberId.toString();
      const member = userMap.get(memberIdStr);
      const taskInfo = taskMap.get(memberIdStr);
      const totalLoggedHours = timeEntryMap.get(memberIdStr) || 0;

      const totalTasks = taskInfo?.tasks?.length || 0;
      const totalEstimatedHours = taskInfo?.totalEstimatedHours || 0;
      const tasksByPriority = taskInfo
        ? {
            urgent: taskInfo.urgent || 0,
            high: taskInfo.high || 0,
            medium: taskInfo.medium || 0,
            low: taskInfo.low || 0,
          }
        : { urgent: 0, high: 0, medium: 0, low: 0 };
      const overdueTasks = taskInfo?.overdueCount || 0;

      const weeklyCapacity = 40;
      const currentLoad = totalEstimatedHours || totalTasks * 2;
      const capacityPercentage = (currentLoad / weeklyCapacity) * 100;

      return {
        userId: memberId,
        userName: member?.name || "Unknown",
        userEmail: member?.email || "",
        userAvatar: member?.avatar || null,
        totalTasks,
        tasksByPriority,
        overdueTasks,
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
    });

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


