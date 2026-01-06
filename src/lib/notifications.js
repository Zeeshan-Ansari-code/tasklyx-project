import Notification from "@/models/Notification";
import User from "@/models/User";
import Task from "@/models/Task";
import Board from "@/models/Board";
import connectDB from "./db";
import {
  sendTaskAssignedEmail,
  sendTaskDeadlineEmail,
  sendTaskCommentEmail,
  sendBoardInviteEmail,
} from "./email";
import { triggerPusherEvent } from "./pusher";

export async function createNotification(data) {
  try {
    await connectDB();
    console.log(`[Notification] Creating notification: type=${data?.type}, user=${data?.user}`);
    const notification = await Notification.create(data);
    
    // Trigger Pusher event for real-time notification
    if (data?.user) {
      try {
        await triggerPusherEvent(`user-${data.user}`, "notification:new", {
          notification: await Notification.findById(notification._id)
            .populate("relatedUser", "name email avatar")
            .populate("relatedTask", "title")
            .populate("relatedBoard", "title")
            .lean(),
        });
      } catch (pusherError) {
        console.error("[Notification] Pusher error:", pusherError);
      }
    }
    
    // Send email notification if user has email notifications enabled
    if (data?.user) {
      const user = await User.findById(data.user);
      console.log(`[Notification] User found: ${user ? 'yes' : 'no'}, emailNotifications: ${user?.emailNotifications}, email: ${user?.email || 'none'}`);
      
      if (user && user?.emailNotifications !== false && user?.email) {
        const prefs = user?.notificationPreferences || {};
        console.log(`[Notification] User preferences:`, prefs);
        
        // Send email based on notification type and user preferences
        switch (data?.type) {
          case "task_assigned":
            if (prefs?.taskAssigned !== false && data?.relatedTask && data?.relatedUser) {
              console.log(`[Notification] Sending task_assigned email to ${user?.email}`);
              const task = await Task.findById(data.relatedTask).populate("board", "title");
              const assignedBy = await User.findById(data.relatedUser).select("name email");
              if (task && assignedBy) {
                const result = await sendTaskAssignedEmail(task, user, assignedBy);
                if (!result?.success) {
                  console.error(`[Notification] Failed to send task_assigned email to ${user?.email}:`, result?.error);
                } else {
                  console.log(`[Notification] Successfully sent task_assigned email to ${user?.email}`);
                }
              } else {
                console.warn(`[Notification] Missing task or assignedBy: task=${!!task}, assignedBy=${!!assignedBy}`);
              }
            } else {
              console.log(`[Notification] Email skipped: taskAssigned=${prefs?.taskAssigned}, relatedTask=${!!data?.relatedTask}, relatedUser=${!!data?.relatedUser}`);
            }
            break;
          case "task_deadline":
            if (prefs?.taskDeadline !== false && data?.relatedTask) {
              const task = await Task.findById(data.relatedTask).populate("board", "title");
              if (task) {
                const result = await sendTaskDeadlineEmail(task, user);
                if (!result?.success) {
                  console.error(`[Notification] Failed to send task_deadline email to ${user?.email}:`, result?.error);
                }
              }
            }
            break;
          case "task_comment":
            if (prefs?.taskComment !== false && data?.relatedTask && data?.relatedUser) {
              const task = await Task.findById(data.relatedTask).populate("board", "title");
              const commenter = await User.findById(data.relatedUser).select("name email");
              if (task && commenter) {
                const result = await sendTaskCommentEmail(task, commenter, user);
                if (!result?.success) {
                  console.error(`[Notification] Failed to send task_comment email to ${user?.email}:`, result?.error);
                }
              }
            }
            break;
          case "board_invite":
            if (prefs?.boardInvite !== false && data?.relatedBoard && data?.relatedUser) {
              const board = await Board.findById(data.relatedBoard);
              const inviter = await User.findById(data.relatedUser).select("name email");
              if (board && inviter) {
                const result = await sendBoardInviteEmail(board, inviter, user);
                if (!result?.success) {
                  console.error(`[Notification] Failed to send board_invite email to ${user?.email}:`, result?.error);
                }
              }
            }
            break;
        }
      }
    }
    
    return notification;
  } catch (error) {
    // Don't throw - notifications are non-critical
    return null;
  }
}

export async function notifyTaskAssigned(task, assigneeId, assignedBy) {
  if (!assigneeId || !task) return;

  // Ensure board ID is a string, not an object
  const boardId = task?.board?._id?.toString() || task?.board?.toString() || task?.board;
  const taskId = task?._id?.toString() || task?._id;

  return createNotification({
    user: assigneeId,
    type: "task_assigned",
    title: "Task Assigned",
    message: `You've been assigned to "${task?.title || "a task"}"`,
    link: `/boards/${boardId}?task=${taskId}`,
    relatedUser: assignedBy,
    relatedTask: taskId,
    relatedBoard: boardId,
  });
}

export async function notifyTaskComment(task, commentUserId, boardId) {
  if (!task || !commentUserId) return;

  // Ensure IDs are strings
  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;
  const commentUserIdStr = commentUserId?.toString() || commentUserId;

  // Notify all assignees except the commenter
  const assigneeIds = (task?.assignees || [])
    .map((a) => a?._id || a)
    .filter((id) => id?.toString() !== commentUserIdStr);

  const notifications = assigneeIds.map((assigneeId) =>
    createNotification({
      user: assigneeId,
      type: "task_comment",
      title: "New Comment",
      message: `New comment on task "${task?.title || "a task"}"`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: commentUserIdStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

export async function notifyDeadlineApproaching(task, boardId) {
  if (!task || !task?.dueDate) return;

  // Ensure IDs are strings
  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;

  const assigneeIds = (task?.assignees || []).map((a) => a?._id || a);

  const notifications = assigneeIds.map((assigneeId) =>
    createNotification({
      user: assigneeId,
      type: "task_deadline",
      title: "Deadline Approaching",
      message: `Task "${task?.title || "a task"}" is due soon`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

/**
 * Notify all board members about task completion
 */
export async function notifyTaskCompleted(task, completedBy, boardId) {
  if (!task || !completedBy) return;

  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;

  // Get all board members (owner + members)
  const board = await Board.findById(boardIdStr)
    .populate("owner", "_id")
    .populate("members.user", "_id");

  if (!board) return;

  const userIds = new Set();
  
  // Add owner
  if (board?.owner?._id) {
    userIds.add(board.owner._id.toString());
  }
  
  // Add members
  if (board?.members) {
    board.members.forEach((member) => {
      if (member?.user?._id) {
        userIds.add(member.user._id.toString());
      }
    });
  }

  // Add assigner if task has one
  if (task?.assignedBy) {
    const assignerId = task.assignedBy?._id?.toString() || task.assignedBy?.toString() || task.assignedBy;
    if (assignerId) {
      userIds.add(assignerId);
    }
  }

  // Remove the user who completed the task (they don't need a notification)
  const completedByStr = completedBy?.toString() || completedBy;
  userIds.delete(completedByStr);

  const notifications = Array.from(userIds).map((userId) =>
    createNotification({
      user: userId,
      type: "task_completed",
      title: "Task Completed",
      message: `Task "${task?.title || "a task"}" has been marked as done`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: completedByStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

/**
 * Notify all board members about task being reopened
 */
export async function notifyTaskReopened(task, reopenedBy, boardId) {
  if (!task || !reopenedBy) return;

  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;

  // Get all board members (owner + members)
  const board = await Board.findById(boardIdStr)
    .populate("owner", "_id")
    .populate("members.user", "_id");

  if (!board) return;

  const userIds = new Set();
  
  // Add owner
  if (board?.owner?._id) {
    userIds.add(board.owner._id.toString());
  }
  
  // Add members
  if (board?.members) {
    board.members.forEach((member) => {
      if (member?.user?._id) {
        userIds.add(member.user._id.toString());
      }
    });
  }

  // Remove the user who reopened the task
  const reopenedByStr = reopenedBy?.toString() || reopenedBy;
  userIds.delete(reopenedByStr);

  const notifications = Array.from(userIds).map((userId) =>
    createNotification({
      user: userId,
      type: "task_updated",
      title: "Task Reopened",
      message: `Task "${task?.title || "a task"}" has been reopened`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: reopenedByStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

/**
 * Notify all board members about task creation
 */
export async function notifyTaskCreated(task, createdBy, boardId) {
  if (!task || !createdBy) return;

  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;

  // Get all board members (owner + members)
  const board = await Board.findById(boardIdStr)
    .populate("owner", "_id")
    .populate("members.user", "_id");

  if (!board) return;

  const userIds = new Set();
  
  // Add owner
  if (board?.owner?._id) {
    userIds.add(board.owner._id.toString());
  }
  
  // Add members
  if (board?.members) {
    board.members.forEach((member) => {
      if (member?.user?._id) {
        userIds.add(member.user._id.toString());
      }
    });
  }

  // Remove the user who created the task
  const createdByStr = createdBy?.toString() || createdBy;
  userIds.delete(createdByStr);

  const notifications = Array.from(userIds).map((userId) =>
    createNotification({
      user: userId,
      type: "task_created",
      title: "New Task Created",
      message: `A new task "${task?.title || "Untitled"}" has been created`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: createdByStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

/**
 * Notify all board members about task update (excluding completion/reopening)
 */
export async function notifyTaskUpdated(task, updatedBy, boardId) {
  if (!task || !updatedBy) return;

  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;

  // Get all board members (owner + members)
  const board = await Board.findById(boardIdStr)
    .populate("owner", "_id")
    .populate("members.user", "_id");

  if (!board) return;

  const userIds = new Set();
  
  // Add owner
  if (board?.owner?._id) {
    userIds.add(board.owner._id.toString());
  }
  
  // Add members
  if (board?.members) {
    board.members.forEach((member) => {
      if (member?.user?._id) {
        userIds.add(member.user._id.toString());
      }
    });
  }

  // Add assignees
  if (task?.assignees) {
    task.assignees.forEach((assignee) => {
      const assigneeId = assignee?._id?.toString() || assignee?.toString();
      if (assigneeId) {
        userIds.add(assigneeId);
      }
    });
  }

  // Add assigner if task has one
  if (task?.assignedBy) {
    const assignerId = task.assignedBy?._id?.toString() || task.assignedBy?.toString() || task.assignedBy;
    if (assignerId) {
      userIds.add(assignerId);
    }
  }

  // Remove the user who updated the task
  const updatedByStr = updatedBy?.toString() || updatedBy;
  userIds.delete(updatedByStr);

  const notifications = Array.from(userIds).map((userId) =>
    createNotification({
      user: userId,
      type: "task_updated",
      title: "Task Updated",
      message: `Task "${task?.title || "a task"}" has been updated`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: updatedByStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

/**
 * Notify all board members about task deletion
 */
export async function notifyTaskDeleted(taskTitle, deletedBy, boardId) {
  if (!taskTitle || !deletedBy || !boardId) return;

  const boardIdStr = boardId?.toString() || boardId;
  const deletedByStr = deletedBy?.toString() || deletedBy;

  // Get all board members (owner + members)
  const board = await Board.findById(boardIdStr)
    .populate("owner", "_id")
    .populate("members.user", "_id");

  if (!board) return;

  const userIds = new Set();
  
  // Add owner
  if (board?.owner?._id) {
    userIds.add(board.owner._id.toString());
  }
  
  // Add members
  if (board?.members) {
    board.members.forEach((member) => {
      if (member?.user?._id) {
        userIds.add(member.user._id.toString());
      }
    });
  }

  // Remove the user who deleted the task
  userIds.delete(deletedByStr);

  const notifications = Array.from(userIds).map((userId) =>
    createNotification({
      user: userId,
      type: "task_deleted",
      title: "Task Deleted",
      message: `Task "${taskTitle}" has been deleted`,
      link: `/boards/${boardIdStr}`,
      relatedUser: deletedByStr,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

/**
 * Notify admin/assigner when task is paused
 */
export async function notifyTaskPaused(task, pausedBy, boardId, pauseReason) {
  if (!task || !pausedBy || !boardId) return;

  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task?._id?.toString() || task?._id;

  // Get board to find admins
  const board = await Board.findById(boardIdStr)
    .populate("owner", "_id role")
    .populate("members.user", "_id role");

  if (!board) return;

  const userIds = new Set();
  
  // Add owner (admin)
  if (board?.owner?._id) {
    userIds.add(board.owner._id.toString());
  }
  
  // Add admin members
  if (board?.members) {
    board.members.forEach((member) => {
      if (member?.user?._id && (member?.role === "admin" || member?.user?.role === "admin")) {
        userIds.add(member.user._id.toString());
      }
    });
  }

  // Add assigner if task has one
  if (task?.assignedBy) {
    const assignerId = task.assignedBy?._id?.toString() || task.assignedBy?.toString() || task.assignedBy;
    if (assignerId) {
      userIds.add(assignerId);
    }
  }

  // Remove the user who paused the task
  const pausedByStr = pausedBy?.toString() || pausedBy;
  userIds.delete(pausedByStr);

  const reasonText = pauseReason ? ` Reason: ${pauseReason}` : "";
  const notifications = Array.from(userIds).map((userId) =>
    createNotification({
      user: userId,
      type: "task_paused",
      title: "Task Paused",
      message: `Task "${task?.title || "a task"}" has been paused.${reasonText}`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: pausedByStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}
