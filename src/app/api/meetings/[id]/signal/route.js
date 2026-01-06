import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Meeting from "@/models/Meeting";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";

// POST - Send WebRTC signal
export async function POST(request, { params }) {
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
        { message: "Invalid meeting ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { signal, fromUserId, toUserId } = body;

    if (!signal || !fromUserId || !toUserId) {
      return NextResponse.json(
        { message: "Signal, fromUserId, and toUserId are required" },
        { status: 400 }
      );
    }

    // Verify meeting exists
    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return NextResponse.json(
        { message: "Meeting not found" },
        { status: 404 }
      );
    }

    // Send signal via Pusher to the target user
    await triggerPusherEvent(`meeting-${id}`, "signal", {
      signal,
      fromUserId,
      toUserId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Signal] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}


