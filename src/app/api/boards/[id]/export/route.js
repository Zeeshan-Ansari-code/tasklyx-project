import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import List from "@/models/List";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function GET(request, { params }) {
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

    const board = await Board.findById(id)
      .populate("owner", "name email")
      .populate("members.user", "name email");

    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Get all lists
    const lists = await List.find({ board: id }).sort({ position: 1 });

    // Get all tasks for all lists
    const listIds = lists.map((l) => l._id);
    const tasks = await Task.find({ board: id })
      .populate("assignees", "name email")
      .sort({ position: 1 });

    // Organize tasks by list
    const tasksByList = {};
    tasks.forEach((task) => {
      const listId = task.list.toString();
      if (!tasksByList[listId]) {
        tasksByList[listId] = [];
      }
      tasksByList[listId].push({
        _id: task._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        dueDate: task.dueDate,
        completed: task.completed,
        position: task.position,
        assignees: task.assignees.map((a) => ({
          name: a.name,
          email: a.email,
        })),
        labels: task.labels,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      });
    });

    // Build export structure
    const exportData = {
      board: {
        _id: board._id,
        title: board.title,
        description: board.description,
        background: board.background,
        visibility: board.visibility,
        owner: {
          name: board.owner.name,
          email: board.owner.email,
        },
        members: board.members.map((m) => ({
          name: m.user.name,
          email: m.user.email,
          role: m.role,
        })),
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
        lists: lists.map((list) => ({
          _id: list._id,
          title: list.title,
          position: list.position,
          tasks: tasksByList[list._id.toString()] || [],
        })),
      },
      exportedAt: new Date().toISOString(),
      version: "1.0",
    };

    return NextResponse.json(exportData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

