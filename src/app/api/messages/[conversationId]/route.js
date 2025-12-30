import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import mongoose from "mongoose";

// GET - Get all messages for a conversation
export async function GET(request, { params }) {
  try {
    await connectDB();

    // Get params
    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let conversationId = resolvedParams?.conversationId;
    if (Array.isArray(conversationId)) {
      conversationId = conversationId[0];
    }

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Paginate messages - only get last 50 for performance
    const messages = await Message.find({
      conversation: conversationId,
    })
      .select("text sender createdAt seenBy")
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "name email avatar")
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    return NextResponse.json(messages, {
      headers: {
        "Cache-Control": "private, max-age=5", // Cache for 5 seconds
      },
    });
  } catch (error) {
    console.error("[Get Messages] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

