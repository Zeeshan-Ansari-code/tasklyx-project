import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

// POST - Mark messages as seen
export async function POST(request, { params }) {
  try {
    await connectDB();

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

    const body = await request.json();
    const { userId } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Mark all unread messages in this conversation as seen
    await Message.updateMany(
      {
        conversation: conversationId,
        sender: { $ne: userId },
        seenBy: { $ne: userId },
      },
      {
        $addToSet: { seenBy: userId },
      }
    );

    return NextResponse.json({ message: "Messages marked as seen" });
  } catch (error) {
    console.error("[Mark Seen] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

