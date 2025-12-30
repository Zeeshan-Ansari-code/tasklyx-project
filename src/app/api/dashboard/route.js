import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Task from "@/models/Task";
import User from "@/models/User";
import Activity from "@/models/Activity";
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

    // Get all boards user is part of (limit fields for performance)
    const boards = await Board.find({
      $or: [{ owner: userId }, { "members.user": userId }],
    })
      .select("_id title description background owner members updatedAt")
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ updatedAt: -1 })
      .lean();

    const boardIds = boards.map((b) => b._id);

    // Use database aggregation for stats instead of loading all tasks
    const [taskStats, allTasksForDeadlines] = await Promise.all([
      // Get task statistics using aggregation (much faster)
      Task.aggregate([
        { $match: { board: { $in: boardIds } } },
        {
          $group: {
            _id: null,
            totalTasks: { $sum: 1 },
            completedTasks: {
              $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] }
            },
            activeTasks: {
              $sum: { $cond: [{ $eq: ["$completed", false] }, 1, 0] }
            },
          },
        },
      ]),
      // Only get tasks needed for upcoming deadlines (with dueDate, not completed)
      Task.find({
        board: { $in: boardIds },
        dueDate: { $exists: true, $ne: null },
        completed: false,
      })
        .select("_id title board dueDate priority")
        .lean(),
    ]);

    const stats = taskStats[0] || {
      totalTasks: 0,
      completedTasks: 0,
      activeTasks: 0,
    };

    const totalBoards = boards.length;
    const activeTasks = stats.activeTasks;
    const completedTasks = stats.completedTasks;
    const totalTasks = stats.totalTasks;
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

    // Get task counts per board using aggregation (more efficient)
    const boardTaskCounts = await Task.aggregate([
      { $match: { board: { $in: boardIds } } },
      {
        $group: {
          _id: "$board",
          taskCount: { $sum: 1 },
        },
      },
    ]);

    const taskCountMap = new Map(
      boardTaskCounts.map((item) => [item._id.toString(), item.taskCount])
    );

    // Get recent boards (last 3)
    const recentBoards = boards.slice(0, 3).map((board) => ({
      _id: board._id,
      name: board.title,
      description: board.description || "",
      background: board.background || "bg-blue-500",
      tasks: taskCountMap.get(board._id.toString()) || 0,
      members: (board.members?.length || 0) + (board.owner ? 1 : 0),
      updatedAt: board.updatedAt,
    }));

    // Get upcoming deadlines (next 7 days, not completed) - already filtered in query
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setHours(23, 59, 59, 999);

    const boardMap = new Map(
      boards.map((b) => [b._id.toString(), { _id: b._id, title: b.title }])
    );

    const upcomingDeadlines = allTasksForDeadlines
      .filter((task) => {
        if (!task?.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate >= now && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
      .map((task) => {
        const board = boardMap.get(task.board.toString());
        return {
          _id: task._id,
          title: task.title || "Untitled Task",
          board: board?.title || "Unknown Board",
          boardId: board?._id,
          dueDate: task.dueDate,
          priority: task.priority || "medium",
        };
      });

    // Helper function to get activity action text
    const getActivityAction = (type, description) => {
      switch (type) {
        case "task_created":
          return "created";
        case "task_updated":
          return "updated";
        case "task_completed":
          return "completed";
        case "task_reopened":
          return "reopened";
        case "task_assigned":
          return "assigned";
        case "task_deleted":
          return "deleted";
        case "task_moved":
          return "moved";
        case "comment_added":
          return "added comment to";
        case "board_created":
          return "created board";
        case "board_updated":
          return "updated board";
        case "list_created":
          return "created list";
        case "list_updated":
          return "updated list";
        case "member_added":
          return "added member to";
        case "member_removed":
          return "removed member from";
        default:
          // Extract action from description if available
          if (description) {
            const match = description.match(/^(\w+)/);
            return match ? match[1] : "performed action on";
          }
          return "performed action on";
      }
    };

    // Helper function to extract task title from description
    const extractTaskTitle = (description) => {
      if (!description) return null;
      const match = description.match(/"([^"]+)"/);
      return match ? match[1] : null;
    };

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

    // Get recent activity from Activity model for all user's boards (use lean for performance)
    const activities = await Activity.find({
      board: { $in: boardIds },
    })
      .populate("user", "name email avatar")
      .populate("board", "title")
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Get recent comments as activity (more efficient query)
    const recentComments = await Task.aggregate([
      { $match: { board: { $in: boardIds }, comments: { $exists: true, $ne: [] } } },
      { $unwind: "$comments" },
      { $sort: { "comments.createdAt": -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "users",
          localField: "comments.user",
          foreignField: "_id",
          as: "commentUser",
        },
      },
      { $unwind: { path: "$commentUser", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: { $concat: ["comment-", { $toString: "$comments._id" }] },
          user: {
            _id: "$commentUser._id",
            name: "$commentUser.name",
            email: "$commentUser.email",
            avatar: "$commentUser.avatar",
          },
          taskTitle: "$title",
          boardId: "$board",
          createdAt: "$comments.createdAt",
        },
      },
    ]);

    const boardMapForComments = new Map(
      boards.map((b) => [b._id.toString(), b.title])
    );

    const commentActivities = recentComments
      .filter((item) => item.user?._id)
      .map((item) => ({
        _id: item._id,
        user: item.user,
        action: "added comment to",
        task: item.taskTitle || "Untitled Task",
        board: boardMapForComments.get(item.boardId.toString()) || "Unknown Board",
        time: item.createdAt,
        createdAt: item.createdAt,
        type: "comment_added",
      }));

    // Combine activities and comments, then sort by time
    const allActivities = [
      ...activities.map((activity) => ({
        _id: activity._id,
        user: activity.user
          ? {
              _id: activity.user._id,
              name: activity.user.name,
              email: activity.user.email,
              avatar: activity.user.avatar,
            }
          : null,
        action: getActivityAction(activity.type, activity.description),
        task: extractTaskTitle(activity.description) || "task",
        board: activity.board?.title || "Unknown Board",
        time: activity.createdAt,
        createdAt: activity.createdAt,
        type: activity.type,
      })),
      ...commentActivities,
    ]
      .filter((activity) => activity.user) // Filter out activities without users
      .sort((a, b) => new Date(b.createdAt || b.time) - new Date(a.createdAt || a.time));

    const formattedRecentActivity = allActivities.slice(0, 10).map((activity) => ({
      _id: activity._id || `${activity.user?._id}-${activity.time}`,
      user: activity.user?.name || "Unknown User",
      userData: activity.user || {},
      action: activity.action || "performed action on",
      task: activity.task || "task",
      board: activity.board || "Unknown Board",
      time: formatTimeAgo(activity.createdAt || activity.time),
      timestamp: activity.createdAt || activity.time,
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

