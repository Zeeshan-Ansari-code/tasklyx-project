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
    now.setHours(0, 0, 0, 0); // Set to start of today
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    nextWeek.setHours(23, 59, 59, 999); // Set to end of the day

    const upcomingDeadlines = allTasks
      .filter((task) => {
        if (!task?.dueDate || task?.completed) return false;
        
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        // Include tasks due today or in the next 7 days
        return dueDate >= now && dueDate <= nextWeek;
      })
      .sort((a, b) => {
        const dateA = new Date(a.dueDate);
        const dateB = new Date(b.dueDate);
        return dateA - dateB;
      })
      .slice(0, 5)
      .map((task) => {
        const board = boards.find(
          (b) => b?._id?.toString() === task?.board?.toString()
        );
        return {
          _id: task?._id,
          title: task?.title || "Untitled Task",
          board: board?.title || "Unknown Board",
          boardId: board?._id,
          dueDate: task?.dueDate,
          priority: task?.priority || "medium",
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

    // Get recent activity from Activity model for all user's boards
    const activities = await Activity.find({
      board: { $in: boardIds },
    })
      .populate("user", "name email avatar")
      .populate("board", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    // Also include comments from tasks as activity
    const commentActivities = [];
    allTasks.forEach((task) => {
      if (task?.comments && task.comments.length > 0) {
        task.comments.forEach((comment) => {
          if (comment?.user && comment?.createdAt) {
            const board = boards.find(
              (b) => b?._id?.toString() === task?.board?.toString()
            );
            commentActivities.push({
              _id: `comment-${comment._id || comment.createdAt}`,
              user: {
                _id: comment.user._id,
                name: comment.user.name,
                email: comment.user.email,
                avatar: comment.user.avatar,
              },
              action: "added comment to",
              task: task?.title || "Untitled Task",
              board: board?.title || "Unknown Board",
              time: comment.createdAt,
              createdAt: comment.createdAt,
              type: "comment_added",
            });
          }
        });
      }
    });

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

