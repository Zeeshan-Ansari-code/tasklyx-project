import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import List from "@/models/List";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { notifyTaskAssigned } from "@/lib/notifications";
import { createActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

// GET single task
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

    const task = await Task.findById(id)
      .populate("assignees", "name email avatar")
      .populate({
        path: "comments.user",
        select: "name email avatar",
      });

    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ task }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update task
export async function PUT(request, { params }) {
  console.log(`[Task Update] PUT request received`);
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
    const {
      title,
      description,
      list,
      position,
      assignees,
      priority,
      dueDate,
      completed,
      labels,
      customFields,
      userId,
    } = body;

    console.log(`[Task Update] PUT /api/tasks/${id}`);
    console.log(`[Task Update] Request body assignees:`, assignees);
    console.log(`[Task Update] userId:`, userId);

    const oldTask = await Task.findById(id).populate("assignees", "_id");
    if (!oldTask) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    console.log(`[Task Update] Old task assignees (raw):`, oldTask.assignees);
    console.log(`[Task Update] Old task assignees (mapped):`, (oldTask.assignees || []).map((a) => {
      const id = a._id || a;
      return id.toString();
    }));

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description;
    if (list !== undefined) updateData.list = list;
    if (position !== undefined) updateData.position = position;
    if (assignees !== undefined) updateData.assignees = assignees;
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (completed !== undefined) updateData.completed = completed;
    if (labels !== undefined) updateData.labels = labels;
    if (customFields !== undefined) updateData.customFields = customFields;

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("assignees", "name email avatar")
      .populate("board", "title owner")
      .populate({
        path: "comments.user",
        select: "name email avatar",
      });

    // If list changed, update both lists and log activity
    if (list && oldTask.list.toString() !== list) {
      const oldList = await List.findById(oldTask.list);
      const newList = await List.findById(list);

      if (oldList) {
        await List.findByIdAndUpdate(oldList._id, {
          $pull: { tasks: id },
        });
      }

      if (newList) {
        await List.findByIdAndUpdate(newList._id, {
          $push: { tasks: id },
        });
      }

      // Log activity for task move
      if (userId) {
        await createActivity({
          boardId: task.board.toString(),
          userId,
          type: "task_moved",
          description: `moved task "${task.title}"`,
          metadata: {
            taskId: id,
            fromList: oldList?._id.toString(),
            toList: newList?._id.toString(),
          },
        });
      }
    }

    // Check if assignees changed and notify new assignees
    console.log(`[Task Update] Checking assignees: assignees !== undefined = ${assignees !== undefined}`);
    if (assignees !== undefined) {
      // Handle both populated objects and ObjectIds
      const oldAssignees = (oldTask.assignees || []).map((a) => {
        const id = a._id || a;
        return id.toString();
      });
      const newAssignees = (assignees || []).map((a) => {
        const id = a._id || a;
        return id.toString();
      });
      const addedAssignees = newAssignees.filter(
        (a) => !oldAssignees.includes(a)
      );

      console.log(`[Task Update] Old assignees (normalized):`, oldAssignees);
      console.log(`[Task Update] New assignees (normalized):`, newAssignees);
      console.log(`[Task Update] Added assignees:`, addedAssignees);
      
      if (addedAssignees.length === 0 && newAssignees.length > 0) {
        console.log(`[Task Update] ⚠️ No new assignees - all assignees already existed`);
      }

      // Notify newly assigned users
      if (addedAssignees.length > 0) {
        // Ensure task has board populated for notifications
        if (!task.board || typeof task.board === 'string') {
          await task.populate('board', 'title owner');
        }
        
        const assignedByUserId = userId || (task.board?.owner?.toString() || task.board?.owner);
        
        console.log(`[Task Update] Notifying ${addedAssignees.length} new assignee(s) for task ${task._id}`);
        
        for (const assigneeId of addedAssignees) {
          try {
            await notifyTaskAssigned(task, assigneeId, assignedByUserId);
            console.log(`[Task Update] Notification sent to assignee: ${assigneeId}`);
          } catch (error) {
            console.error(`[Task Update] Failed to notify assignee ${assigneeId}:`, error);
          }
        }
      }

      // Log activity for assignment
      if (userId && addedAssignees.length > 0) {
        await createActivity({
          boardId: task.board.toString(),
          userId,
          type: "task_assigned",
          description: `assigned task "${task.title}"`,
          metadata: { taskId: id, assignees: addedAssignees },
        });
      }
    }

    // Log activity for task completion
    if (completed !== undefined && completed !== oldTask.completed && userId) {
      await createActivity({
        boardId: task.board.toString(),
        userId,
        type: completed ? "task_completed" : "task_updated",
        description: completed
          ? `completed task "${task.title}"`
          : `reopened task "${task.title}"`,
        metadata: { taskId: id },
      });
    }

    // Trigger Pusher event
    await triggerPusherEvent(`board-${task.board}`, "task:updated", {
      task,
    });

    // Trigger webhooks
    await triggerWebhooks(task.board.toString(), "task.updated", {
      taskId: task._id.toString(),
      boardId: task.board.toString(),
      title: task.title,
      completed: task.completed,
    });

    // Trigger webhook for task completion
    if (completed !== undefined && completed !== oldTask.completed && completed) {
      await triggerWebhooks(task.board.toString(), "task.completed", {
        taskId: task._id.toString(),
        boardId: task.board.toString(),
        title: task.title,
      });
    }

    console.log(`[Task Update] Task updated successfully: ${task._id}`);
    return NextResponse.json(
      {
        message: "Task updated successfully",
        task,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[Task Update] Error in PUT /api/tasks:`, error);
    console.error(`[Task Update] Error stack:`, error.stack);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE task
export async function DELETE(request, { params }) {
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

    const task = await Task.findById(id);
    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    const boardId = task.board.toString();

    // Remove task from list
    await List.findByIdAndUpdate(task.list, {
      $pull: { tasks: id },
    });

    // Delete the task
    await Task.findByIdAndDelete(id);

    // Trigger Pusher event
    await triggerPusherEvent(`board-${boardId}`, "task:deleted", {
      taskId: id,
      listId: task.list.toString(),
    });

    // Trigger webhooks
    await triggerWebhooks(boardId, "task.deleted", {
      taskId: id,
      boardId: boardId,
      title: task.title,
    });

    return NextResponse.json(
      { message: "Task deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}