import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import mongoose from "mongoose";

// PUT - Update message (edit)
export async function PUT(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let messageId = resolvedParams?.messageId;
    if (Array.isArray(messageId)) {
      messageId = messageId[0];
    }

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: "Invalid message ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { text, userId } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { error: "Message text is required" },
        { status: 400 }
      );
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify user is the sender
    if (message.sender.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own messages" },
        { status: 403 }
      );
    }

    message.text = text.trim();
    message.edited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate("sender", "name email avatar");

    return NextResponse.json({ message });
  } catch (error) {
    console.error("[Edit Message] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete message
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let messageId = resolvedParams?.messageId;
    if (Array.isArray(messageId)) {
      messageId = messageId[0];
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!messageId || !mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { error: "Invalid message ID" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { error: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return NextResponse.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Verify user is the sender
    if (message.sender.toString() !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own messages" },
        { status: 403 }
      );
    }

    await Message.findByIdAndDelete(messageId);

    return NextResponse.json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("[Delete Message] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

