import { NextResponse } from "next/server";
import { triggerPusherEvent } from "@/lib/pusher";
import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

// POST - Send typing indicator
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { conversationId, userId, isTyping } = body;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Verify user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.participants.includes(userId)) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Trigger typing event to all other participants
    await triggerPusherEvent(`conversation-${conversationId}`, "user:typing", {
      userId,
      isTyping: isTyping !== false,
      conversationId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Typing Indicator] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

