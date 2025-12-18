import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const boardId = searchParams.get("boardId");
    const weeks = parseInt(searchParams.get("weeks") || "4");

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

    const boards = await Board.find(boardQuery).select("_id");
    const boardIds = boards.map((b) => b._id);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    // Get completed tasks grouped by week
    const completedTasks = await Task.find({
      board: { $in: boardIds },
      completed: true,
      updatedAt: {
        $gte: startDate,
        $lte: endDate,
      },
    }).select("updatedAt priority");

    // Group by week
    const weeklyData = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekTasks = completedTasks.filter((task) => {
        const taskDate = new Date(task.updatedAt);
        return taskDate >= weekStart && taskDate < weekEnd;
      });

      weeklyData.push({
        week: i + 1,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        tasksCompleted: weekTasks.length,
        byPriority: {
          low: weekTasks.filter((t) => t.priority === "low").length,
          medium: weekTasks.filter((t) => t.priority === "medium").length,
          high: weekTasks.filter((t) => t.priority === "high").length,
          urgent: weekTasks.filter((t) => t.priority === "urgent").length,
        },
      });
    }

    // Calculate average velocity
    const totalCompleted = completedTasks.length;
    const averageVelocity = totalCompleted / weeks;

    return NextResponse.json(
      {
        weeks,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalTasksCompleted: totalCompleted,
        averageVelocity: parseFloat(averageVelocity.toFixed(2)),
        weeklyData,
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


