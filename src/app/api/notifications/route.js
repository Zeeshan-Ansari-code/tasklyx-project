import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Notification from "@/models/Notification";
import mongoose from "mongoose";

// GET all notifications for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ notifications: [] }, { status: 200 });
    }

    const query = { user: userId };
    if (unreadOnly) {
      query.read = false;
    }

    const notifications = await Notification.find(query)
      .populate("relatedUser", "name email avatar")
      .populate("relatedTask", "title")
      .populate("relatedBoard", "title")
      .sort({ createdAt: -1 })
      .limit(50);

    // Fix malformed links in notifications
    const fixedNotifications = notifications.map((notification) => {
      if (notification.link) {
        // If link contains encoded object, try to extract the board ID from relatedBoard
        if (notification.link.includes('%') || notification.link.includes('ObjectId')) {
          let fixedLink = notification.link;
          
          // Try to extract board ID from relatedBoard if available
          if (notification.relatedBoard) {
            const boardId = notification.relatedBoard._id?.toString() || notification.relatedBoard.toString();
            
            // Reconstruct the link based on notification type
            if (notification.type === 'task_assigned' || notification.type === 'task_comment' || notification.type === 'task_deadline') {
              const taskId = notification.relatedTask?._id?.toString() || notification.relatedTask?.toString();
              fixedLink = `/boards/${boardId}${taskId ? `?task=${taskId}` : ''}`;
            } else if (notification.type === 'board_invite') {
              fixedLink = `/boards/${boardId}`;
            }
          }
          
          // Update the notification in database if link was fixed
          if (fixedLink !== notification.link) {
            Notification.findByIdAndUpdate(notification._id, { link: fixedLink }).catch(() => {});
          }
          
          return { ...notification.toObject(), link: fixedLink };
        }
      }
      return notification;
    });

    const unreadCount = await Notification.countDocuments({
      user: userId,
      read: false,
    });

    return NextResponse.json(
      {
        notifications: fixedNotifications,
        unreadCount,
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

// POST mark notifications as read
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, notificationIds } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await Notification.updateMany(
        {
          _id: { $in: notificationIds },
          user: userId,
        },
        { read: true }
      );
    } else {
      // Mark all notifications as read
      await Notification.updateMany(
        { user: userId, read: false },
        { read: true }
      );
    }

    return NextResponse.json(
      { message: "Notifications marked as read" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

