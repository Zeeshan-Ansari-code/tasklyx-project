import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";

// GET - Search messages
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const conversationId = searchParams.get("conversationId");
    const userId = searchParams.get("userId");
    const limit = parseInt(searchParams.get("limit")) || 20;

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const searchQuery = {
      text: { $regex: query, $options: "i" },
    };

    // If conversationId is provided, search only in that conversation
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
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

      searchQuery.conversation = conversationId;
    } else {
      // Search across all user's conversations
      const userConversations = await Conversation.find({
        participants: userId,
      }).select("_id");

      const conversationIds = userConversations.map((c) => c._id);
      searchQuery.conversation = { $in: conversationIds };
    }

    const messages = await Message.find(searchQuery)
      .populate("sender", "name email avatar")
      .populate("conversation", "name type")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ messages, count: messages.length });
  } catch (error) {
    console.error("[Search Messages] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

