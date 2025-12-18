import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import List from "@/models/List";
import mongoose from "mongoose";
import { createActivity } from "@/lib/activity";

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
    const { userId } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Get original task
    const originalTask = await Task.findById(id)
      .populate("list")
      .populate("board");

    if (!originalTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    // Get the list to find the last position
    const list = await List.findById(originalTask.list._id || originalTask.list);
    const tasksInList = await Task.find({ list: list._id }).sort({ position: -1 });
    const newPosition = tasksInList.length > 0 ? tasksInList[0].position + 1 : 0;

    // Create duplicate task
    const newTask = await Task.create({
      title: `${originalTask.title} (Copy)`,
      description: originalTask.description,
      list: originalTask.list._id || originalTask.list,
      board: originalTask.board._id || originalTask.board,
      position: newPosition,
      priority: originalTask.priority,
      dueDate: originalTask.dueDate,
      labels: originalTask.labels,
      // Don't copy assignees, comments, or attachments
      assignees: [],
      comments: [],
      attachments: [],
      completed: false,
    });

    await newTask.populate("list", "title");
    await newTask.populate("board", "title");
    await newTask.populate("assignees", "name email avatar");

    // Log activity
    await createActivity({
      boardId: originalTask.board._id || originalTask.board,
      userId,
      type: "task_created",
      description: `duplicated task "${originalTask.title}"`,
      metadata: {
        taskId: newTask._id.toString(),
        listId: list._id.toString(),
      },
    });

    return NextResponse.json(
      {
        message: "Task duplicated successfully",
        task: newTask,
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

