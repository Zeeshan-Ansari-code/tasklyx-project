import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import TimeEntry from "@/models/TimeEntry";
import Task from "@/models/Task";
import mongoose from "mongoose";
import { createActivity } from "@/lib/activity";

// GET all time entries for a task
export async function GET(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let id = resolvedParams?.id;
    if (Array.isArray(id)) id = id[0];
    id = String(id || "").trim();

    if (!id || id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const query = { task: id };
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      query.user = userId;
    }

    const timeEntries = await TimeEntry.find(query)
      .populate("user", "name email avatar")
      .sort({ date: -1 });

    const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);

    return NextResponse.json(
      {
        timeEntries,
        totalHours,
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

// POST log time entry
export async function POST(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let id = resolvedParams?.id;
    if (Array.isArray(id)) id = id[0];
    id = String(id || "").trim();

    if (!id || id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid task ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, hours, description, date } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    if (!hours || hours <= 0) {
      return NextResponse.json(
        { message: "Hours must be greater than 0" },
        { status: 400 }
      );
    }

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    const timeEntry = await TimeEntry.create({
      task: id,
      board: task.board,
      user: userId,
      hours,
      description: description || "",
      date: date ? new Date(date) : new Date(),
    });

    await timeEntry.populate("user", "name email avatar");

    // Log activity
    await createActivity({
      boardId: task.board.toString(),
      userId,
      type: "time_logged",
      description: `logged ${hours} hour${hours !== 1 ? "s" : ""} on task "${task.title}"`,
      metadata: {
        taskId: id,
        timeEntryId: timeEntry._id.toString(),
        hours,
      },
    });

    return NextResponse.json(
      {
        message: "Time logged successfully",
        timeEntry,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

