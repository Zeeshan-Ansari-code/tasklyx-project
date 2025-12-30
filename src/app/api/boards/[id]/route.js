import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import List from "@/models/List";
import Task from "@/models/Task";
import User from "@/models/User";
import mongoose from "mongoose";
import { createActivity } from "@/lib/activity";

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    // In Next.js 16, params should be synchronous, but handle both cases
    let resolvedParams = params;
    if (params && typeof params.then === 'function') {
      resolvedParams = await params;
    }
    
    let id = resolvedParams?.id;
    
    // Handle array case (shouldn't happen but be safe)
    if (Array.isArray(id)) {
      id = id[0];
    }
    
    // Ensure id is a string and trim whitespace
    if (!id) {
      return NextResponse.json(
        { message: "Board ID is required" },
        { status: 400 }
      );
    }
    
    id = String(id).trim();

    // Validate ObjectId - must be exactly 24 hex characters
    if (id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid board ID format" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .populate({
        path: "lists",
        options: { sort: { position: 1 } },
        populate: {
          path: "tasks",
          options: { sort: { position: 1 } },
          populate: {
            path: "assignees",
            select: "name email avatar",
          },
        },
      });

    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Convert Mongoose document to plain object to ensure proper JSON serialization
    const boardData = board.toObject ? board.toObject() : board;
    
    return NextResponse.json({ board: boardData }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    await connectDB();
    let id = params.id;
    
    if (Array.isArray(id)) id = id[0];
    id = String(id || "").trim();

    // Validate ObjectId
    if (!id || id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid board ID" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { title, description, background, isFavorite, visibility, userId } = body;

    const oldBoard = await Board.findById(id);
    if (!oldBoard) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (background !== undefined) updateData.background = background;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (visibility !== undefined) updateData.visibility = visibility;

    const board = await Board.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Log activity if board was updated (not just favorite toggle)
    if (userId && (title !== undefined || description !== undefined || background !== undefined || visibility !== undefined)) {
      const changes = [];
      if (title !== undefined && title !== oldBoard.title) changes.push("title");
      if (description !== undefined && description !== oldBoard.description) changes.push("description");
      if (background !== undefined && background !== oldBoard.background) changes.push("background");
      if (visibility !== undefined && visibility !== oldBoard.visibility) changes.push("visibility");

      if (changes.length > 0) {
        await createActivity({
          boardId: id,
          userId,
          type: "board_updated",
          description: `updated board "${board.title}"`,
          metadata: { changes },
        });
      }
    }

    return NextResponse.json(
      {
        message: "Board updated successfully",
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

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    let id = params.id;
    
    if (Array.isArray(id)) id = id[0];
    id = String(id || "").trim();

    // Validate ObjectId
    if (!id || id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid board ID" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    const board = await Board.findById(id);

    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    const boardTitle = board.title;
    const boardOwner = board.owner.toString();

    await Board.findByIdAndDelete(id);

    await User.findByIdAndUpdate(board.owner, {
      $pull: { boards: board._id },
    });

    // Log activity (use userId from request or board owner)
    if (userId || boardOwner) {
      await createActivity({
        boardId: id,
        userId: userId || boardOwner,
        type: "board_deleted",
        description: `deleted board "${boardTitle}"`,
        metadata: { boardId: id },
      });
    }

    return NextResponse.json(
      { message: "Board deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}