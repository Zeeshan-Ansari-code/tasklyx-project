import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import List from "@/models/List";
import Board from "@/models/Board";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { createActivity } from "@/lib/activity";
import { triggerWebhooks } from "@/lib/webhooks";

// GET all lists for a board
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

    const lists = await List.find({ board: id })
      .populate({
        path: "tasks",
        populate: {
          path: "assignees",
          select: "name email avatar",
        },
      })
      .sort({ position: 1 });

    return NextResponse.json({ lists }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new list
export async function POST(request, { params }) {
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
    
    const body = await request.json();
    const { title } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { message: "List title is required" },
        { status: 400 }
      );
    }

    // Get current max position
    const maxPosition = await List.findOne({ board: id })
      .sort({ position: -1 })
      .select("position");

    const position = maxPosition ? maxPosition.position + 1 : 0;

    const list = await List.create({
      title: title.trim(),
      board: id,
      position,
    });

    // Add list to board
    await Board.findByIdAndUpdate(id, {
      $push: { lists: list._id },
    });

    // Trigger Pusher event
    await triggerPusherEvent(`board-${id}`, "list:created", {
      list,
    });

    // Log activity (get userId from request body if available)
    const { userId } = body;
    if (userId) {
      await createActivity({
        boardId: id,
        userId,
        type: "list_created",
        description: `created list "${title.trim()}"`,
        metadata: { listId: list._id.toString() },
      });
    }

    // Trigger webhooks
    await triggerWebhooks(id, "list.created", {
      listId: list._id.toString(),
      boardId: id,
      title: list.title,
    });

    return NextResponse.json(
      {
        message: "List created successfully",
        list,
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