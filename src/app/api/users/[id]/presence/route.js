import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";

// PUT - Update user presence (online/offline)
export async function PUT(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let id = resolvedParams?.id;
    if (Array.isArray(id)) {
      id = id[0];
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body; // 'online' or 'offline'

    if (!status || !["online", "offline"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'online' or 'offline'" },
        { status: 400 }
      );
    }

    // Trigger presence event to all user's conversations
    // In a production app, you'd track which conversations the user is in
    // For now, we'll trigger to a general presence channel
    await triggerPusherEvent("presence", "user:presence", {
      userId: id,
      status,
      timestamp: new Date(),
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[Presence] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

// GET - Get user presence
export async function GET(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let id = resolvedParams?.id;
    if (Array.isArray(id)) {
      id = id[0];
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "Invalid user ID" },
        { status: 400 }
      );
    }

    // In a real implementation, you'd check a presence store (Redis, etc.)
    // For now, we'll return a default status
    // You can enhance this with actual presence tracking
    return NextResponse.json({ status: "online" });
  } catch (error) {
    console.error("[Get Presence] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

