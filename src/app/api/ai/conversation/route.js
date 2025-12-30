import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import mongoose from "mongoose";

// GET - Get or create AI conversation for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get or create AI user
    let aiUser = await User.findOne({ email: "ai@assistant.com" });
    if (!aiUser) {
      aiUser = await User.create({
        name: "AI Assistant",
        email: "ai@assistant.com",
        password: "ai-assistant-no-password",
        recoveryAnswer: "ai-assistant",
      });
    }

    // Get or create conversation
    const userIdObj = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId)
      : userId;

    let conversation = await Conversation.findOne({
      participants: { $all: [userIdObj, aiUser._id] },
    }).populate("participants", "name email avatar");

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userIdObj, aiUser._id],
      });
      await conversation.populate("participants", "name email avatar");
    }

    return NextResponse.json({
      conversation: {
        _id: conversation._id,
        participants: conversation.participants,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
      },
    });
  } catch (error) {
    console.error("[Get AI Conversation] Error:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}

