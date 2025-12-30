import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import User from "@/models/User";
import mongoose from "mongoose";
import { createActivity } from "@/lib/activity";

// GET all boards for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const includeArchived = searchParams.get("archived") === "true";

    if (!userId) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      // Return empty array for invalid ObjectId (e.g., "temp-user-id")
      // This allows the UI to work before real authentication is implemented
      return NextResponse.json({ boards: [] }, { status: 200 });
    }

    const query = {
      $or: [
        { owner: userId },
        { "members.user": userId },
      ],
    };

    // Explicitly filter archived status
    if (includeArchived) {
      query.archived = true;
    } else {
      query.archived = { $ne: true };
    }

    const boards = await Board.find(query)
      .select("_id title description background owner members isFavorite visibility archived updatedAt createdAt")
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ updatedAt: -1 })
      .lean(); // Use lean() for better performance

    return NextResponse.json(
      { boards },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, max-age=10", // Cache for 10 seconds
        },
      }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new board
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { title, description, background, ownerId } = body;

    if (!title || !ownerId) {
      return NextResponse.json(
        { message: "Title and owner ID are required" },
        { status: 400 }
      );
    }

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return NextResponse.json(
        { message: "Invalid user ID format. Please log in to create boards." },
        { status: 400 }
      );
    }

    const owner = await User.findById(ownerId);
    if (!owner) {
      return NextResponse.json(
        { message: "Owner not found" },
        { status: 404 }
      );
    }

    const board = await Board.create({
      title,
      description: description || "",
      background: background || "bg-blue-500",
      owner: ownerId,
      members: [
        {
          user: ownerId,
          role: "admin",
        },
      ],
    });

    await board.populate("owner", "name email avatar");
    await board.populate("members.user", "name email avatar");

    await User.findByIdAndUpdate(ownerId, {
      $push: { boards: board._id },
    });

    // Log activity
    await createActivity({
      boardId: board._id,
      userId: ownerId,
      type: "board_created",
      description: `created board "${title}"`,
      metadata: { boardId: board._id.toString() },
    });

    return NextResponse.json(
      {
        message: "Board created successfully",
        board,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}