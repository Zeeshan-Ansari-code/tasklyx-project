import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import List from "@/models/List";
import User from "@/models/User";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { createActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";
import { canCreateTasks, canAssignTaskTo } from "@/lib/permissions";

// GET all tasks for a list
export async function GET(request, { params }) {
  try {
    await connectDB();
    
    // In Next.js 16, params should be synchronous, but handle both cases
    let resolvedParams = params;
    if (params && typeof params.then === 'function') {
      resolvedParams = await params;
    }
    
    let id = resolvedParams?.id;
    
    // Handle array case (shouldn't happen but be safe)
    if (Array.isArray(id)) {
      id = id[0];
    }
    
    // Ensure id is a string and trim whitespace
    if (!id) {
      return NextResponse.json(
        { message: "List ID is required" },
        { status: 400 }
      );
    }
    
    id = String(id).trim();

    // Validate ObjectId - must be exactly 24 hex characters
    if (id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid list ID format" },
        { status: 400 }
      );
    }

    const tasks = await Task.find({ list: id })
      .populate("assignees", "name email avatar")
      .sort({ position: 1 });

    return NextResponse.json({ tasks }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new task
export async function POST(request, { params }) {
  try {
    await connectDB();
    
    // In Next.js 16, params should be synchronous, but handle both cases
    let resolvedParams = params;
    if (params && typeof params.then === 'function') {
      resolvedParams = await params;
    }
    
    let id = resolvedParams?.id;
    
    // Handle array case (shouldn't happen but be safe)
    if (Array.isArray(id)) {
      id = id[0];
    }
    
    // Ensure id is a string and trim whitespace
    if (!id) {
      return NextResponse.json(
        { message: "List ID is required" },
        { status: 400 }
      );
    }
    
    id = String(id).trim();

    // Validate ObjectId - must be exactly 24 hex characters
    if (id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid list ID format" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { title, description, boardId, priority, dueDate, userId } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { message: "Task title is required" },
        { status: 400 }
      );
    }

    if (!boardId || !mongoose.Types.ObjectId.isValid(boardId)) {
      return NextResponse.json(
        { message: "Valid board ID is required" },
        { status: 400 }
      );
    }

    // Check permissions: Verify user can create tasks
    if (userId) {
      const currentUser = await User.findById(userId);
      if (!currentUser) {
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      if (!canCreateTasks(currentUser)) {
        return NextResponse.json(
          { message: "You don't have permission to create tasks" },
          { status: 403 }
        );
      }

      // Check if user can assign to each assignee (if provided)
      if (assignees && Array.isArray(assignees) && assignees.length > 0) {
        const assigneeUsers = await User.find({
          _id: { $in: assignees },
        });

        for (const assigneeUser of assigneeUsers) {
          if (!canAssignTaskTo(currentUser, assigneeUser)) {
            return NextResponse.json(
              {
                message: `You don't have permission to assign tasks to ${assigneeUser.name} (${assigneeUser.role})`,
              },
              { status: 403 }
            );
          }
        }
      }
    }

    // Get current max position in the list
    const maxPosition = await Task.findOne({ list: id })
      .sort({ position: -1 })
      .select("position");

    const position = maxPosition ? maxPosition.position + 1 : 0;

    const task = await Task.create({
      title: title.trim(),
      description: description || "",
      list: id,
      board: boardId,
      position,
      priority: priority || "medium",
      dueDate: dueDate || null,
      assignees: assignees || [],
    });

    // Add task to list
    await List.findByIdAndUpdate(id, {
      $push: { tasks: task._id },
    });

    await task.populate("assignees", "name email avatar");

    // Trigger Pusher event
    await triggerPusherEvent(`board-${boardId}`, "task:created", {
      task,
    });

    // Log activity
    if (userId) {
      await createActivity({
        boardId,
        userId,
        type: "task_created",
        description: `created task "${title.trim()}"`,
        metadata: { taskId: task._id.toString() },
      });
    }

    // Trigger webhooks
    await triggerWebhooks(boardId, "task.created", {
      taskId: task._id.toString(),
      boardId: boardId,
      title: task.title,
      listId: id,
    });

    return NextResponse.json(
      {
        message: "Task created successfully",
        task,
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