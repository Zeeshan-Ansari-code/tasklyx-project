import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import mongoose from "mongoose";
import { createActivity } from "@/lib/activity";

export async function POST(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let id = resolvedParams?.id;
    if (Array.isArray(id)) id = id[0];
    id = String(id || "").trim();

    if (!id || id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid board ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { userId, archived = true } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id);

    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Check if user is owner or admin
    const isOwner = board.owner.toString() === userId;
    const isAdmin = board.members.some(
      (m) => m.user.toString() === userId && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { message: "Only board owners and admins can archive boards" },
        { status: 403 }
      );
    }

    board.archived = archived;
    await board.save();

    await board.populate("owner", "name email avatar");
    await board.populate("members.user", "name email avatar");

    // Log activity
    await createActivity({
      boardId: board._id,
      userId,
      type: archived ? "board_archived" : "board_unarchived",
      description: archived
        ? `archived board "${board.title}"`
        : `unarchived board "${board.title}"`,
      metadata: { boardId: board._id.toString() },
    });

    return NextResponse.json(
      {
        message: archived ? "Board archived successfully" : "Board unarchived successfully",
        board,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

