import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import mongoose from "mongoose";

// GET single conversation details
export async function GET(request, { params }) {
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

    const conversation = await Conversation.findById(id)
      .populate("participants", "name email avatar")
      .populate("createdBy", "name email avatar")
      .populate("board", "title description")
      .populate("lastMessage")
      .populate("pinnedMessages", "text sender createdAt")
      .lean();

    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("[Get Conversation] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update conversation (name, description, add/remove participants)
export async function PUT(request, { params }) {
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
    const { name, description, addParticipants, removeParticipants } = body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update name and description
    if (name !== undefined) conversation.name = name;
    if (description !== undefined) conversation.description = description;

    // Add participants
    if (addParticipants && Array.isArray(addParticipants)) {
      const validIds = addParticipants.filter((pid) =>
        mongoose.Types.ObjectId.isValid(pid)
      );
      validIds.forEach((pid) => {
        if (!conversation.participants.includes(pid)) {
          conversation.participants.push(pid);
        }
      });
    }

    // Remove participants
    if (removeParticipants && Array.isArray(removeParticipants)) {
      conversation.participants = conversation.participants.filter(
        (pid) => !removeParticipants.includes(pid.toString())
      );
    }

    await conversation.save();
    await conversation.populate("participants", "name email avatar");
    await conversation.populate("createdBy", "name email avatar");

    return NextResponse.json({ conversation });
  } catch (error) {
    console.error("[Update Conversation] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE archive conversation
export async function DELETE(request, { params }) {
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid conversation ID" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return NextResponse.json(
        { message: "Conversation not found" },
        { status: 404 }
      );
    }

    // Add user to archivedBy array
    if (!conversation.archivedBy.includes(userId)) {
      conversation.archivedBy.push(userId);
      await conversation.save();
    }

    return NextResponse.json({ message: "Conversation archived" });
  } catch (error) {
    console.error("[Archive Conversation] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

