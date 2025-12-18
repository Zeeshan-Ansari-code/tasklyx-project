import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { createActivity } from "@/lib/activity";
import { notifyTaskComment } from "@/lib/notifications";

// POST add comment to task
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
        { message: "Task ID is required" },
        { status: 400 }
      );
    }
    
    id = String(id).trim();

    // Validate ObjectId - must be exactly 24 hex characters
    if (id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid task ID format" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { text, userId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { message: "Comment text is required" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
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

    // Add comment to task
    const comment = {
      user: userId,
      text: text.trim(),
      createdAt: new Date(),
    };

    task.comments.push(comment);
    await task.save();

    // Populate comment user data
    await task.populate({
      path: "comments.user",
      select: "name email avatar",
    });

    // Get the newly added comment (last one)
    const newComment = task.comments[task.comments.length - 1];

    // Notify assignees about the comment
    await notifyTaskComment(task, userId, task.board.toString());

    // Trigger Pusher event
    await triggerPusherEvent(`board-${task.board}`, "task:comment:added", {
      taskId: id,
      comment: newComment,
    });

    return NextResponse.json(
      {
        message: "Comment added successfully",
        comment: newComment,
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

