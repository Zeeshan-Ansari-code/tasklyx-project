import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import List from "@/models/List";
import Task from "@/models/Task";
import User from "@/models/User";
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
    const { userId } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Get original board with all data
    const originalBoard = await Board.findById(id)
      .populate("lists")
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar");

    if (!originalBoard) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Create new board
    const newBoard = await Board.create({
      title: `${originalBoard.title} (Copy)`,
      description: originalBoard.description,
      background: originalBoard.background,
      owner: userId,
      members: [
        {
          user: userId,
          role: "admin",
        },
      ],
      visibility: originalBoard.visibility,
    });

    // Duplicate lists and tasks
    const listMap = new Map();
    for (const list of originalBoard.lists || []) {
      const newList = await List.create({
        title: list.title,
        board: newBoard._id,
        position: list.position,
      });

      listMap.set(list._id.toString(), newList._id);

      // Duplicate tasks
      const tasks = await Task.find({ list: list._id });
      for (const task of tasks) {
        await Task.create({
          title: task.title,
          description: task.description,
          list: newList._id,
          board: newBoard._id,
          position: task.position,
          priority: task.priority,
          dueDate: task.dueDate,
          labels: task.labels,
          assignees: [], // Don't copy assignees
        });
      }
    }

    await newBoard.populate("owner", "name email avatar");
    await newBoard.populate("members.user", "name email avatar");

    await User.findByIdAndUpdate(userId, {
      $push: { boards: newBoard._id },
    });

    // Log activity
    await createActivity({
      boardId: newBoard._id,
      userId,
      type: "board_created",
      description: `duplicated board "${originalBoard.title}"`,
      metadata: { boardId: newBoard._id.toString(), originalBoardId: id },
    });

    return NextResponse.json(
      {
        message: "Board duplicated successfully",
        board: newBoard,
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

