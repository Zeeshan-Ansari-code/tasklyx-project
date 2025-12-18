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

export async function createNotification(data) {
  try {
    await connectDB();
    console.log(`[Notification] Creating notification: type=${data.type}, user=${data.user}`);
    const notification = await Notification.create(data);
    
    // Send email notification if user has email notifications enabled
    if (data.user) {
      const user = await User.findById(data.user);
      console.log(`[Notification] User found: ${user ? 'yes' : 'no'}, emailNotifications: ${user?.emailNotifications}, email: ${user?.email || 'none'}`);
      
      if (user && user.emailNotifications !== false && user.email) {
        const prefs = user.notificationPreferences || {};
        console.log(`[Notification] User preferences:`, prefs);
        
        // Send email based on notification type and user preferences
        switch (data.type) {
          case "task_assigned":
            if (prefs.taskAssigned !== false && data.relatedTask && data.relatedUser) {
              console.log(`[Notification] Sending task_assigned email to ${user.email}`);
              const task = await Task.findById(data.relatedTask).populate("board", "title");
              const assignedBy = await User.findById(data.relatedUser).select("name email");
              if (task && assignedBy) {
                const result = await sendTaskAssignedEmail(task, user, assignedBy);
                if (!result.success) {
                  console.error(`[Notification] Failed to send task_assigned email to ${user.email}:`, result.error);
                } else {
                  console.log(`[Notification] Successfully sent task_assigned email to ${user.email}`);
                }
              } else {
                console.warn(`[Notification] Missing task or assignedBy: task=${!!task}, assignedBy=${!!assignedBy}`);
              }
            } else {
              console.log(`[Notification] Email skipped: taskAssigned=${prefs.taskAssigned}, relatedTask=${!!data.relatedTask}, relatedUser=${!!data.relatedUser}`);
            }
            break;
          case "task_deadline":
            if (prefs.taskDeadline !== false && data.relatedTask) {
              const task = await Task.findById(data.relatedTask).populate("board", "title");
              if (task) {
                const result = await sendTaskDeadlineEmail(task, user);
                if (!result.success) {
                  console.error(`[Notification] Failed to send task_deadline email to ${user.email}:`, result.error);
                }
              }
            }
            break;
          case "task_comment":
            if (prefs.taskComment !== false && data.relatedTask && data.relatedUser) {
              const task = await Task.findById(data.relatedTask).populate("board", "title");
              const commenter = await User.findById(data.relatedUser).select("name email");
              if (task && commenter) {
                const result = await sendTaskCommentEmail(task, commenter, user);
                if (!result.success) {
                  console.error(`[Notification] Failed to send task_comment email to ${user.email}:`, result.error);
                }
              }
            }
            break;
          case "board_invite":
            if (prefs.boardInvite !== false && data.relatedBoard && data.relatedUser) {
              const board = await Board.findById(data.relatedBoard);
              const inviter = await User.findById(data.relatedUser).select("name email");
              if (board && inviter) {
                const result = await sendBoardInviteEmail(board, inviter, user);
                if (!result.success) {
                  console.error(`[Notification] Failed to send board_invite email to ${user.email}:`, result.error);
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
  const boardId = task.board?._id?.toString() || task.board?.toString() || task.board;
  const taskId = task._id?.toString() || task._id;

  return createNotification({
    user: assigneeId,
    type: "task_assigned",
    title: "Task Assigned",
    message: `You've been assigned to "${task.title}"`,
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
  const taskId = task._id?.toString() || task._id;
  const commentUserIdStr = commentUserId?.toString() || commentUserId;

  // Notify all assignees except the commenter
  const assigneeIds = (task.assignees || [])
    .map((a) => a._id || a)
    .filter((id) => id.toString() !== commentUserIdStr);

  const notifications = assigneeIds.map((assigneeId) =>
    createNotification({
      user: assigneeId,
      type: "task_comment",
      title: "New Comment",
      message: `New comment on task "${task.title}"`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedUser: commentUserIdStr,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

export async function notifyDeadlineApproaching(task, boardId) {
  if (!task || !task.dueDate) return;

  // Ensure IDs are strings
  const boardIdStr = boardId?.toString() || boardId;
  const taskId = task._id?.toString() || task._id;

  const assigneeIds = (task.assignees || []).map((a) => a._id || a);

  const notifications = assigneeIds.map((assigneeId) =>
    createNotification({
      user: assigneeId,
      type: "task_deadline",
      title: "Deadline Approaching",
      message: `Task "${task.title}" is due soon`,
      link: `/boards/${boardIdStr}?task=${taskId}`,
      relatedTask: taskId,
      relatedBoard: boardIdStr,
    })
  );

  return Promise.all(notifications);
}

