import { Resend } from "resend";

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Email templates
export const emailTemplates = {
  taskAssigned: (task, assignee, assignedBy) => {
    // Ensure board ID and task ID are strings
    const boardId = task.board?._id?.toString() || task.board?.toString() || task.board;
    const taskId = task._id?.toString() || task._id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    return {
      subject: `You've been assigned to "${task.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .task-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Task Assigned</h1>
              </div>
              <div class="content">
                <p>Hi ${assignee.name},</p>
                <p><strong>${assignedBy.name}</strong> has assigned you to a new task:</p>
                <div class="task-info">
                  <h2>${task.title}</h2>
                  ${task.description ? `<p>${task.description}</p>` : ""}
                  ${task.dueDate ? `<p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>` : ""}
                  ${task.priority ? `<p><strong>Priority:</strong> ${task.priority}</p>` : ""}
                </div>
                <a href="${appUrl}/boards/${boardId}?task=${taskId}" class="button">View Task</a>
                <div class="footer">
                  <p>This is an automated email from Tasklyx. You can manage your notification preferences in settings.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  },

  taskDeadline: (task, assignee) => {
    // Ensure board ID and task ID are strings
    const boardId = task.board?._id?.toString() || task.board?.toString() || task.board;
    const taskId = task._id?.toString() || task._id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    return {
      subject: `Deadline Approaching: "${task.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #ef4444; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .task-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Deadline Approaching</h1>
              </div>
              <div class="content">
                <p>Hi ${assignee.name},</p>
                <p>This is a reminder that your task <strong>"${task.title}"</strong> is due soon:</p>
                <div class="task-info">
                  <h2>${task.title}</h2>
                  <p><strong>Due Date:</strong> ${new Date(task.dueDate).toLocaleDateString()}</p>
                  ${task.description ? `<p>${task.description}</p>` : ""}
                </div>
                <a href="${appUrl}/boards/${boardId}?task=${taskId}" class="button">View Task</a>
                <div class="footer">
                  <p>This is an automated email from Tasklyx. You can manage your notification preferences in settings.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  },

  taskComment: (task, commenter, assignee) => {
    // Ensure board ID and task ID are strings
    const boardId = task.board?._id?.toString() || task.board?.toString() || task.board;
    const taskId = task._id?.toString() || task._id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    return {
      subject: `New comment on "${task.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .task-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>New Comment</h1>
              </div>
              <div class="content">
                <p>Hi ${assignee.name},</p>
                <p><strong>${commenter.name}</strong> commented on task <strong>"${task.title}"</strong>:</p>
                <div class="task-info">
                  <h2>${task.title}</h2>
                </div>
                <a href="${appUrl}/boards/${boardId}?task=${taskId}" class="button">View Comment</a>
                <div class="footer">
                  <p>This is an automated email from Tasklyx. You can manage your notification preferences in settings.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  },

  boardInvite: (board, inviter, invitee) => {
    // Ensure board ID is a string
    const boardId = board._id?.toString() || board._id;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    return {
      subject: `You've been invited to "${board.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: #8b5cf6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
              .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
              .button { display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
              .board-info { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Board Invitation</h1>
              </div>
              <div class="content">
                <p>Hi ${invitee.name},</p>
                <p><strong>${inviter.name}</strong> has invited you to collaborate on a board:</p>
                <div class="board-info">
                  <h2>${board.title}</h2>
                  ${board.description ? `<p>${board.description}</p>` : ""}
                </div>
                <a href="${appUrl}/boards/${boardId}" class="button">View Board</a>
                <div class="footer">
                  <p>This is an automated email from Tasklyx. You can manage your notification preferences in settings.</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    };
  },

  dailyDigest: (user, tasks, boards) => ({
    subject: `Your Daily Task Summary - ${new Date().toLocaleDateString()}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #3b82f6; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
            .section { background: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
            .task-item { padding: 10px; border-left: 3px solid #3b82f6; margin: 10px 0; background: #f9fafb; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Daily Task Summary</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>Here's your task summary for today:</p>
              
              ${tasks.overdue.length > 0 ? `
                <div class="section">
                  <h2>⚠️ Overdue Tasks (${tasks.overdue.length})</h2>
                  ${tasks.overdue.map(task => `
                    <div class="task-item">
                      <strong>${task.title}</strong> - Due ${new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              
              ${tasks.dueToday.length > 0 ? `
                <div class="section">
                  <h2>📅 Due Today (${tasks.dueToday.length})</h2>
                  ${tasks.dueToday.map(task => `
                    <div class="task-item">
                      <strong>${task.title}</strong>
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              
              ${tasks.dueThisWeek.length > 0 ? `
                <div class="section">
                  <h2>📆 Due This Week (${tasks.dueThisWeek.length})</h2>
                  ${tasks.dueThisWeek.map(task => `
                    <div class="task-item">
                      <strong>${task.title}</strong> - Due ${new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  `).join("")}
                </div>
              ` : ""}
              
              <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard" class="button">View Dashboard</a>
              <div class="footer">
                <p>This is an automated email from Tasklyx. You can manage your notification preferences in settings.</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `,
  }),
};

// Send email function
export async function sendEmail(to, subject, html) {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not configured. Skipping email send.");
    return { success: false, error: "Email service not configured - RESEND_API_KEY missing" };
  }

  if (!resend) {
    console.warn("[Email] Resend client not initialized. Skipping email send.");
    return { success: false, error: "Email service not configured - Resend client not initialized" };
  }

  try {
    const fromEmail = process.env.RESEND_FROM_EMAIL || "Tasklyx <noreply@tasklyx.com>";
    console.log(`[Email] Attempting to send email to: ${to}, from: ${fromEmail}, subject: ${subject}`);
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
    });

    if (error) {
      console.error("[Email] Resend API error:", error);
      return { success: false, error: error.message || JSON.stringify(error) };
    }

    console.log(`[Email] Successfully sent email to: ${to}, message ID: ${data?.id || 'unknown'}`);
    return { success: true, data };
  } catch (error) {
    console.error("[Email] Exception while sending email:", error);
    return { success: false, error: error.message };
  }
}

// Helper functions for sending specific notification types
export async function sendTaskAssignedEmail(task, assignee, assignedBy) {
  if (!assignee.email) return { success: false, error: "No email for assignee" };
  
  const template = emailTemplates.taskAssigned(task, assignee, assignedBy);
  return await sendEmail(assignee.email, template.subject, template.html);
}

export async function sendTaskDeadlineEmail(task, assignee) {
  if (!assignee.email) return { success: false, error: "No email for assignee" };
  
  const template = emailTemplates.taskDeadline(task, assignee);
  return await sendEmail(assignee.email, template.subject, template.html);
}

export async function sendTaskCommentEmail(task, commenter, assignee) {
  if (!assignee.email) return { success: false, error: "No email for assignee" };
  
  const template = emailTemplates.taskComment(task, commenter, assignee);
  return await sendEmail(assignee.email, template.subject, template.html);
}

export async function sendBoardInviteEmail(board, inviter, invitee) {
  if (!invitee.email) return { success: false, error: "No email for invitee" };
  
  const template = emailTemplates.boardInvite(board, inviter, invitee);
  return await sendEmail(invitee.email, template.subject, template.html);
}

export async function sendDailyDigestEmail(user, tasks, boards) {
  if (!user.email) return { success: false, error: "No email for user" };
  
  const template = emailTemplates.dailyDigest(user, tasks, boards);
  return await sendEmail(user.email, template.subject, template.html);
}

