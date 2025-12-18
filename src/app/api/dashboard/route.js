import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Task from "@/models/Task";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        {
          stats: {
            totalBoards: 0,
            activeTasks: 0,
            teamMembers: 0,
            completionRate: 0,
          },
          recentBoards: [],
          upcomingDeadlines: [],
          recentActivity: [],
        },
        { status: 200 }
      );
    }

    // Get all boards user is part of
    const boards = await Board.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    })
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ updatedAt: -1 });

    const boardIds = boards.map((b) => b._id);

    // Get all tasks from user's boards
    const allTasks = await Task.find({ board: { $in: boardIds } })
      .populate("assignees", "name email avatar")
      .populate({
        path: "comments.user",
        select: "name email avatar",
      });

    // Calculate stats
    const totalBoards = boards.length;
    const activeTasks = allTasks.filter((t) => !t.completed).length;
    const completedTasks = allTasks.filter((t) => t.completed).length;
    const totalTasks = allTasks.length;
    const completionRate =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Get unique team members (from all boards)
    const memberSet = new Set();
    boards.forEach((board) => {
      if (board.owner) {
        memberSet.add(board.owner._id.toString());
      }
      board.members?.forEach((member) => {
        if (member.user) {
          memberSet.add(member.user._id.toString());
        }
      });
    });
    const teamMembers = memberSet.size;

    // Get recent boards (last 3)
    const recentBoards = boards.slice(0, 3).map((board) => {
      const boardTasks = allTasks.filter(
        (t) => t.board.toString() === board._id.toString()
      );
      return {
        _id: board._id,
        name: board.title,
        description: board.description || "",
        background: board.background || "bg-blue-500",
        tasks: boardTasks.length,
        members: (board.members?.length || 0) + (board.owner ? 1 : 0),
        updatedAt: board.updatedAt,
      };
    });

    // Get upcoming deadlines (next 7 days, not completed)
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const upcomingDeadlines = allTasks
      .filter(
        (task) =>
          task.dueDate &&
          !task.completed &&
          new Date(task.dueDate) >= now &&
          new Date(task.dueDate) <= nextWeek
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
      .map((task) => {
        const board = boards.find(
          (b) => b._id.toString() === task.board.toString()
        );
        return {
          _id: task._id,
          title: task.title,
          board: board?.title || "Unknown Board",
          boardId: board?._id,
          dueDate: task.dueDate,
          priority: task.priority || "medium",
        };
      });

    // Get recent activity (from comments and task updates)
    // For now, we'll use comments as activity
    const activityMap = new Map();

    allTasks.forEach((task) => {
      if (task.comments && task.comments.length > 0) {
        task.comments.forEach((comment) => {
          if (comment.user && comment.createdAt) {
            const activityKey = `${comment.user._id}-${comment.createdAt}`;
            if (!activityMap.has(activityKey)) {
              const board = boards.find(
                (b) => b._id.toString() === task.board.toString()
              );
              activityMap.set(activityKey, {
                user: {
                  _id: comment.user._id,
                  name: comment.user.name,
                  email: comment.user.email,
                  avatar: comment.user.avatar,
                },
                action: "added comment to",
                task: task.title,
                board: board?.title || "Unknown Board",
                time: comment.createdAt,
                type: "comment",
              });
            }
          }
        });
      }

      // Add task completion activity
      if (task.completed && task.updatedAt) {
        const assignee = task.assignees?.[0];
        if (assignee) {
          const activityKey = `${assignee._id}-${task.updatedAt}-completed`;
          if (!activityMap.has(activityKey)) {
            const board = boards.find(
              (b) => b._id.toString() === task.board.toString()
            );
            activityMap.set(activityKey, {
              user: {
                _id: assignee._id,
                name: assignee.name,
                email: assignee.email,
                avatar: assignee.avatar,
              },
              action: "completed task",
              task: task.title,
              board: board?.title || "Unknown Board",
              time: task.updatedAt,
              type: "completion",
            });
          }
        }
      }
    });

    // Convert to array and sort by time
    const activities = Array.from(activityMap.values()).sort(
      (a, b) => new Date(b.time) - new Date(a.time)
    );

    // Format time ago
    const formatTimeAgo = (date) => {
      const now = new Date();
      const diff = now - new Date(date);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Just now";
      if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
      if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
      if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;
      return new Date(date).toLocaleDateString();
    };

    const formattedRecentActivity = activities.slice(0, 10).map((activity) => ({
      _id: `${activity.user._id}-${activity.time}`,
      user: activity.user.name,
      userData: activity.user,
      action: activity.action,
      task: activity.task,
      board: activity.board,
      time: formatTimeAgo(activity.time),
      timestamp: activity.time,
    }));

    return NextResponse.json(
      {
        stats: {
          totalBoards,
          activeTasks,
          teamMembers,
          completionRate,
        },
        recentBoards,
        upcomingDeadlines,
        recentActivity: formattedRecentActivity,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

