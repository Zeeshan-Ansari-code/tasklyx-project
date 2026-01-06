import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import mongoose from "mongoose";

// GET all conversations for a user
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

    // Get all conversations where user is a participant
    const conversations = await Conversation.find({
      participants: userId,
      archivedBy: { $ne: userId },
    })
      .populate("participants", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("board", "title")
      .populate("lastMessage")
      .sort({ lastMessageAt: -1 })
      .lean();

    // Format conversations with unread count and last message preview
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await Message.findById(conv.lastMessage)
          .populate("sender", "name avatar")
          .lean();

        // Count unread messages
        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          seenBy: { $ne: userId },
        });

        return {
          ...conv,
          lastMessage: lastMessage,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations: formattedConversations });
  } catch (error) {
    console.error("[Get Conversations] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new conversation (direct or group)
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { participants, type = "direct", name, description, boardId, createdBy } = body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { message: "At least one participant is required" },
        { status: 400 }
      );
    }

    if (!createdBy || !mongoose.Types.ObjectId.isValid(createdBy)) {
      return NextResponse.json(
        { message: "Valid creator ID is required" },
        { status: 400 }
      );
    }

    // Validate all participant IDs
    const validParticipants = participants.filter((id) =>
      mongoose.Types.ObjectId.isValid(id)
    );

    if (validParticipants.length === 0) {
      return NextResponse.json(
        { message: "No valid participants provided" },
        { status: 400 }
      );
    }

    // For direct messages, check if conversation already exists
    if (type === "direct" && validParticipants.length === 2) {
      const existingConv = await Conversation.findOne({
        type: "direct",
        participants: { $all: validParticipants, $size: 2 },
      });

      if (existingConv) {
        await existingConv.populate("participants", "name email avatar");
        await existingConv.populate("lastMessage");
        return NextResponse.json({ conversation: existingConv });
      }
    }

    // Create new conversation
    const conversation = await Conversation.create({
      participants: validParticipants,
      type,
      name: type === "group" ? name : null,
      description: type === "group" ? description : null,
      createdBy,
      board: boardId || null,
    });

    await conversation.populate("participants", "name email avatar");
    await conversation.populate("createdBy", "name email avatar");
    if (boardId) {
      await conversation.populate("board", "title");
    }

    return NextResponse.json(
      { conversation },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Create Conversation] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

