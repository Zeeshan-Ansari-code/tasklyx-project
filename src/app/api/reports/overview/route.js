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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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

    // Build task query
    const taskQuery = { board: { $in: boardIds } };

    if (startDate || endDate) {
      taskQuery.createdAt = {};
      if (startDate) {
        taskQuery.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        taskQuery.createdAt.$lte = new Date(endDate);
      }
    }

    // Get task statistics
    const totalTasks = await Task.countDocuments(taskQuery);
    const completedTasks = await Task.countDocuments({
      ...taskQuery,
      completed: true,
    });
    const activeTasks = await Task.countDocuments({
      ...taskQuery,
      completed: false,
    });

    // Tasks by priority
    const tasksByPriority = await Task.aggregate([
      { $match: taskQuery },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ]);

    // Tasks by status (completed vs active)
    const completionRate =
      totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(1) : 0;

    // Time tracking statistics
    const timeEntries = await TimeEntry.find({
      board: { $in: boardIds },
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate ? { $gte: new Date(startDate) } : {}),
              ...(endDate ? { $lte: new Date(endDate) } : {}),
            },
          }
        : {}),
    });

    const totalHoursLogged = timeEntries.reduce(
      (sum, entry) => sum + entry.hours,
      0
    );

    // Time by user
    const timeByUser = await TimeEntry.aggregate([
      {
        $match: {
          board: { $in: boardIds },
          ...(startDate || endDate
            ? {
                date: {
                  ...(startDate ? { $gte: new Date(startDate) } : {}),
                  ...(endDate ? { $lte: new Date(endDate) } : {}),
                },
              }
            : {}),
        },
      },
      {
        $group: {
          _id: "$user",
          totalHours: { $sum: "$hours" },
          entries: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          userId: "$_id",
          userName: "$userInfo.name",
          userEmail: "$userInfo.email",
          totalHours: 1,
          entries: 1,
        },
      },
      { $sort: { totalHours: -1 } },
    ]);

    // Tasks by assignee
    const tasksByAssignee = await Task.aggregate([
      { $match: taskQuery },
      { $unwind: "$assignees" },
      {
        $group: {
          _id: "$assignees",
          taskCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: ["$completed", 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      {
        $unwind: "$userInfo",
      },
      {
        $project: {
          userId: "$_id",
          userName: "$userInfo.name",
          userEmail: "$userInfo.email",
          taskCount: 1,
          completedCount: 1,
        },
      },
      { $sort: { taskCount: -1 } },
    ]);

    // Overdue tasks
    const overdueTasks = await Task.countDocuments({
      ...taskQuery,
      completed: false,
      dueDate: { $lt: new Date() },
    });

    // Tasks due this week
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    const tasksDueThisWeek = await Task.countDocuments({
      ...taskQuery,
      completed: false,
      dueDate: {
        $gte: new Date(),
        $lte: weekFromNow,
      },
    });

    return NextResponse.json(
      {
        overview: {
          totalTasks,
          completedTasks,
          activeTasks,
          completionRate: parseFloat(completionRate),
          overdueTasks,
          tasksDueThisWeek,
        },
        tasksByPriority: tasksByPriority.reduce((acc, item) => {
          acc[item._id || "medium"] = item.count;
          return acc;
        }, {}),
        timeTracking: {
          totalHoursLogged: parseFloat(totalHoursLogged.toFixed(2)),
          totalEntries: timeEntries.length,
          timeByUser,
        },
        workload: {
          tasksByAssignee,
        },
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


