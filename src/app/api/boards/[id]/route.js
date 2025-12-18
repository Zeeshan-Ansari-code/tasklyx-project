import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import List from "@/models/List";
import Task from "@/models/Task";
import User from "@/models/User";
import mongoose from "mongoose";

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
    const { title, description, background, isFavorite, visibility } = body;

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

    const board = await Board.findByIdAndDelete(id);

    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    await User.findByIdAndUpdate(board.owner, {
      $pull: { boards: board._id },
    });

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