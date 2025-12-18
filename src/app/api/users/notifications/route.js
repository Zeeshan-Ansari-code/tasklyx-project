import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).select(
      "emailNotifications notificationPreferences"
    );

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        emailNotifications: user.emailNotifications ?? true,
        notificationPreferences: user.notificationPreferences || {
          taskAssigned: true,
          taskDeadline: true,
          taskComment: true,
          boardInvite: true,
          dailyDigest: false,
        },
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

export async function PUT(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, emailNotifications, notificationPreferences } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const updateData = {};

    if (emailNotifications !== undefined) {
      updateData.emailNotifications = emailNotifications;
    }

    if (notificationPreferences) {
      updateData.notificationPreferences = {
        taskAssigned:
          notificationPreferences.taskAssigned !== undefined
            ? notificationPreferences.taskAssigned
            : true,
        taskDeadline:
          notificationPreferences.taskDeadline !== undefined
            ? notificationPreferences.taskDeadline
            : true,
        taskComment:
          notificationPreferences.taskComment !== undefined
            ? notificationPreferences.taskComment
            : true,
        boardInvite:
          notificationPreferences.boardInvite !== undefined
            ? notificationPreferences.boardInvite
            : true,
        dailyDigest:
          notificationPreferences.dailyDigest !== undefined
            ? notificationPreferences.dailyDigest
            : false,
      };
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true }
    ).select("emailNotifications notificationPreferences");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        message: "Notification preferences updated",
        emailNotifications: user.emailNotifications,
        notificationPreferences: user.notificationPreferences,
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

