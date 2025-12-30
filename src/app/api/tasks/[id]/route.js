import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Task from "@/models/Task";
import List from "@/models/List";
import Board from "@/models/Board";
import User from "@/models/User";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { 
  notifyTaskAssigned, 
  notifyTaskCompleted, 
  notifyTaskReopened,
  notifyTaskUpdated,
  notifyTaskDeleted,
  notifyTaskPaused
} from "@/lib/notifications";
import { createActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";
import { canAssignTaskTo, canEditTasks, canDeleteTasks } from "@/lib/permissions";

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
      status,
      pauseReason,
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
    if (assignees !== undefined) {
      updateData.assignees = assignees;
      // Update assignedBy when assignees change
      if (userId && assignees && assignees.length > 0) {
        updateData.assignedBy = userId;
      }
    }
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (completed !== undefined) {
      updateData.completed = completed;
      // Update status based on completed
      updateData.status = completed ? "done" : "pending";
    }
    if (labels !== undefined) updateData.labels = labels;
    if (customFields !== undefined) updateData.customFields = customFields;
    
    // Handle status field separately (can be ongoing, paused, etc.)
    if (status !== undefined) {
      updateData.status = status;
      if (status === "paused" && pauseReason !== undefined) {
        updateData.pauseReason = pauseReason;
      } else if (status !== "paused") {
        updateData.pauseReason = undefined;
      }
    }

    const task = await Task.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("assignees", "name email avatar")
      .populate("board", "title owner members")
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
      // Check permissions: Verify user can assign tasks
      if (userId) {
        const currentUser = await User.findById(userId);
        if (!currentUser) {
          return NextResponse.json(
            { message: "User not found" },
            { status: 404 }
          );
        }

        // Check if user can edit this task
        if (!canEditTasks(currentUser, oldTask)) {
          return NextResponse.json(
            { message: "You don't have permission to edit this task" },
            { status: 403 }
          );
        }

        // Check if user can assign to each new assignee
        const newAssignees = (assignees || []).map((a) => {
          const id = a._id || a;
          return id.toString();
        });

        // Get all assignee users to check permissions
        const assigneeUsers = await User.find({
          _id: { $in: newAssignees },
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

    // Handle task completion/reopening notifications
    if (completed !== undefined && completed !== oldTask.completed && userId) {
      // Ensure task has board populated
      if (!task.board || typeof task.board === 'string') {
        await task.populate('board', 'title owner members');
      }

      const boardId = task.board?._id?.toString() || task.board?.toString() || task.board;

      if (!boardId) {
        console.error(`[Task Update] No board ID found for task ${id}`);
      } else {
        // Log activity
        try {
          await createActivity({
            boardId,
            userId,
            type: completed ? "task_completed" : "task_reopened",
            description: completed
              ? `completed task "${task.title}"`
              : `reopened task "${task.title}"`,
            metadata: { taskId: id },
          });
          console.log(`[Task Update] Activity logged: ${completed ? 'completed' : 'reopened'} task ${id}`);
        } catch (error) {
          console.error(`[Task Update] Failed to log activity:`, error);
        }

        // Notify all board members
        try {
          if (completed) {
            console.log(`[Task Update] Sending completion notifications for task ${id}`);
            await notifyTaskCompleted(task, userId, boardId);
          } else {
            console.log(`[Task Update] Sending reopening notifications for task ${id}`);
            await notifyTaskReopened(task, userId, boardId);
          }
        } catch (error) {
          console.error(`[Task Update] Failed to send completion/reopening notifications:`, error);
        }
      }
    }

    // Handle status changes (paused, ongoing, etc.)
    if (status !== undefined && status !== oldTask.status && userId) {
      // Ensure task has board populated
      if (!task.board || typeof task.board === 'string') {
        await task.populate('board', 'title owner members');
      }

      const boardId = task.board?.toString() || task.board;

      if (status === "paused") {
        // Log activity for paused
        try {
          await createActivity({
            boardId,
            userId,
            type: "task_updated",
            description: `paused task "${task.title}"${pauseReason ? `: ${pauseReason}` : ''}`,
            metadata: { taskId: id, status: "paused", pauseReason },
          });
        } catch (error) {
          console.error(`[Task Update] Failed to log paused activity:`, error);
        }

        // Notify admin/assigner about pause
        try {
          await notifyTaskPaused(task, userId, boardId, pauseReason);
        } catch (error) {
          console.error(`[Task Update] Failed to send pause notifications:`, error);
        }
      }
    }

    // Notify about other task updates (if task was updated but not completed/reopened/status change)
    const hasOtherUpdates = 
      (title !== undefined && title !== oldTask.title) ||
      (description !== undefined && description !== oldTask.description) ||
      (priority !== undefined && priority !== oldTask.priority) ||
      (dueDate !== undefined && dueDate !== oldTask.dueDate) ||
      (list !== undefined && list !== oldTask.list?.toString());

    if (hasOtherUpdates && userId && completed === undefined && status === undefined) {
      // Ensure task has board populated
      if (!task.board || typeof task.board === 'string') {
        await task.populate('board', 'title owner members');
      }

      const boardId = task.board?.toString() || task.board;

      try {
        await notifyTaskUpdated(task, userId, boardId);
      } catch (error) {
        console.error(`[Task Update] Failed to send update notifications:`, error);
      }
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

    const task = await Task.findById(id).populate("board", "title owner members");
    if (!task) {
      return NextResponse.json(
        { message: "Task not found" },
        { status: 404 }
      );
    }

    const boardId = task.board?.toString() || task.board;
    const taskTitle = task.title;

    // Get userId from request body or headers if available
    let userId = null;
    try {
      const body = await request.json().catch(() => ({}));
      userId = body.userId || null;
    } catch {
      // If no body, try to get from headers or use null
      userId = null;
    }

    // Remove task from list
    await List.findByIdAndUpdate(task.list, {
      $pull: { tasks: id },
    });

    // Delete the task
    await Task.findByIdAndDelete(id);

    // Notify all board members about task deletion
    if (userId) {
      try {
        await notifyTaskDeleted(taskTitle, userId, boardId);
      } catch (error) {
        console.error(`[Task Delete] Failed to send deletion notifications:`, error);
      }
    }

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