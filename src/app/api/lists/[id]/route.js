import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import List from "@/models/List";
import Board from "@/models/Board";
import Task from "@/models/Task";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { createActivity } from "@/lib/activity";

// PUT update list
export async function PUT(request, { params }) {
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
        { message: "List ID is required" },
        { status: 400 }
      );
    }
    
    id = String(id).trim();

    // Validate ObjectId - must be exactly 24 hex characters
    if (id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid list ID format" },
        { status: 400 }
      );
    }
    
    const body = await request.json();
    const { title, position, userId } = body;

    const oldList = await List.findById(id);
    if (!oldList) {
      return NextResponse.json(
        { message: "List not found" },
        { status: 404 }
      );
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (position !== undefined) updateData.position = position;

    const list = await List.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate({
      path: "tasks",
      populate: {
        path: "assignees",
        select: "name email avatar",
      },
    });

    if (!list) {
      return NextResponse.json(
        { message: "List not found" },
        { status: 404 }
      );
    }

    // Log activity if title changed (not just position)
    if (userId && title !== undefined && title.trim() !== oldList.title) {
      await createActivity({
        boardId: list.board.toString(),
        userId,
        type: "list_updated",
        description: `renamed list to "${title.trim()}"`,
        metadata: { listId: id },
      });
    }

    // Trigger Pusher event
    await triggerPusherEvent(`board-${list.board}`, "list:updated", {
      list,
    });

    return NextResponse.json(
      {
        message: "List updated successfully",
        list,
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

// DELETE list
export async function DELETE(request, { params }) {
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
        { message: "List ID is required" },
        { status: 400 }
      );
    }
    
    id = String(id).trim();

    // Validate ObjectId - must be exactly 24 hex characters
    if (id.length !== 24 || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid list ID format" },
        { status: 400 }
      );
    }

    const list = await List.findById(id);
    if (!list) {
      return NextResponse.json(
        { message: "List not found" },
        { status: 404 }
      );
    }

    const boardId = list.board.toString();
    const listTitle = list.title;

    const body = await request.json().catch(() => ({}));
    const { userId } = body;

    // Delete all tasks in the list
    await Task.deleteMany({ list: id });

    // Remove list from board
    await Board.findByIdAndUpdate(list.board, {
      $pull: { lists: id },
    });

    // Delete the list
    await List.findByIdAndDelete(id);

    // Log activity
    if (userId) {
      await createActivity({
        boardId,
        userId,
        type: "list_deleted",
        description: `deleted list "${listTitle}"`,
        metadata: { listId: id },
      });
    }

    // Trigger Pusher event
    await triggerPusherEvent(`board-${boardId}`, "list:deleted", {
      listId: id,
    });

    return NextResponse.json(
      { message: "List deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}