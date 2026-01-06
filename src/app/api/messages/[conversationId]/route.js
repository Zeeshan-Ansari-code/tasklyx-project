import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";

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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;

    if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
      return NextResponse.json(
        { error: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    // Paginate messages
    const messages = await Message.find({
      conversation: conversationId,
    })
      .select("text sender createdAt seenBy attachments reactions replyTo edited editedAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("sender", "name email avatar")
      .populate("replyTo", "text sender")
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    const total = await Message.countDocuments({ conversation: conversationId });

    return NextResponse.json(
      {
        messages,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      {
        headers: {
          "Cache-Control": "private, max-age=5",
        },
      }
    );
  } catch (error) {
    console.error("[Get Messages] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

// POST - Send a new message
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
    const { text, sender, attachments, replyTo } = body;

    if (!sender || !mongoose.Types.ObjectId.isValid(sender)) {
      return NextResponse.json(
        { error: "Valid sender ID is required" },
        { status: 400 }
      );
    }

    // Verify conversation exists and user is a participant
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (!conversation.participants.includes(sender)) {
      return NextResponse.json(
        { error: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    // Create message
    const message = await Message.create({
      conversation: conversationId,
      sender,
      text: text || "",
      attachments: attachments || [],
      replyTo: replyTo || null,
    });

    // Update conversation's last message
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Populate message data
    await message.populate("sender", "name email avatar");
    if (replyTo) {
      await message.populate("replyTo", "text sender");
    }

    // Trigger Pusher event for real-time message delivery
    await triggerPusherEvent(`conversation-${conversationId}`, "message:sent", {
      message,
      conversationId,
    });

    // Also trigger to user-specific channels for notifications
    conversation.participants.forEach((participantId) => {
      if (participantId.toString() !== sender) {
        triggerPusherEvent(`user-${participantId}`, "message:new", {
          message,
          conversationId,
        });
      }
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("[Send Message] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}


