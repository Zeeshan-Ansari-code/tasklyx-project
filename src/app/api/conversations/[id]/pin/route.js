import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";

// POST - Pin/unpin a message
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
        { message: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { messageId, userId, action } = body; // action: 'pin' or 'unpin'

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { message: "Invalid message ID" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Verify message exists and belongs to conversation
    const message = await Message.findOne({
      _id: messageId,
      conversation: id,
    });

    if (!message) {
      return NextResponse.json(
        { message: "Message not found in this conversation" },
        { status: 404 }
      );
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    // Verify user is a participant
    if (!conversation.participants.includes(userId)) {
      return NextResponse.json(
        { message: "You are not a participant in this conversation" },
        { status: 403 }
      );
    }

    if (action === "pin") {
      // Add to pinned messages if not already pinned
      if (!conversation.pinnedMessages.includes(messageId)) {
        conversation.pinnedMessages.push(messageId);
        await conversation.save();
      }
    } else if (action === "unpin") {
      // Remove from pinned messages
      conversation.pinnedMessages = conversation.pinnedMessages.filter(
        (mid) => mid.toString() !== messageId
      );
      await conversation.save();
    } else {
      return NextResponse.json(
        { message: "Action must be 'pin' or 'unpin'" },
        { status: 400 }
      );
    }

    // Trigger Pusher event
    await triggerPusherEvent(`conversation-${id}`, "message:pinned", {
      messageId,
      action,
      conversationId: id,
    });

    await conversation.populate("pinnedMessages");

    return NextResponse.json({
      message: `Message ${action}ned successfully`,
      conversation,
    });
  } catch (error) {
    console.error("[Pin Message] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

