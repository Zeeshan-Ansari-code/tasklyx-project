import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Task from "@/models/Task";
import Board from "@/models/Board";
import { sendDailyDigestEmail } from "@/lib/email";
import mongoose from "mongoose";

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions, etc.)
export async function POST(request) {
  try {
    await connectDB();

    // Verify cron secret if provided
    const authHeader = request.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get all users who have daily digest enabled
    const users = await User.find({
      "notificationPreferences.dailyDigest": true,
      emailNotifications: { $ne: false },
    });

    const results = [];

    for (const user of users) {
      try {
        // Get user's boards
        const boards = await Board.find({
          $or: [{ owner: user._id }, { "members.user": user._id }],
        }).select("_id title");

        const boardIds = boards.map((b) => b._id);

        // Get tasks assigned to user
        const tasks = await Task.find({
          board: { $in: boardIds },
          assignees: user._id,
          completed: false,
        })
          .populate("board", "title")
          .populate("list", "title")
          .sort({ dueDate: 1 });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);

        const taskGroups = {
          overdue: tasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < today
          ),
          dueToday: tasks.filter((t) => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            due.setHours(0, 0, 0, 0);
            return due.getTime() === today.getTime();
          }),
          dueThisWeek: tasks.filter((t) => {
            if (!t.dueDate) return false;
            const due = new Date(t.dueDate);
            return due > today && due <= weekFromNow;
          }),
        };

        // Only send if there are tasks
        if (
          taskGroups.overdue.length > 0 ||
          taskGroups.dueToday.length > 0 ||
          taskGroups.dueThisWeek.length > 0
        ) {
          const result = await sendDailyDigestEmail(
            user,
            taskGroups,
            boards
          );
          results.push({
            userId: user._id,
            email: user.email,
            success: result.success,
            error: result.error,
          });
        }
      } catch (error) {
        results.push({
          userId: user._id,
          email: user.email,
          success: false,
          error: error.message,
        });
      }
    }

    return NextResponse.json(
      {
        message: "Daily digest emails processed",
        sent: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
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

