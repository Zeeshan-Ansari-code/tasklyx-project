import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Task from "@/models/Task";
import mongoose from "mongoose";

// GET custom field definitions for a board
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
        { message: "Valid board ID is required" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id).select("customFieldDefinitions");
    if (!board) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    return NextResponse.json(
      { customFieldDefinitions: board.customFieldDefinitions || [] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST add custom field definition to board
export async function POST(request, { params }) {
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
        { message: "Valid board ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, type, required, options, defaultValue, userId } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { message: "Field name is required" },
        { status: 400 }
      );
    }

    if (!type || !["text", "number", "date", "select", "checkbox", "url"].includes(type)) {
      return NextResponse.json(
        { message: "Valid field type is required" },
        { status: 400 }
      );
    }

    if (type === "select" && (!options || !Array.isArray(options) || options.length === 0)) {
      return NextResponse.json(
        { message: "Options are required for select type" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id);
    if (!board) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    // Check if user has permission (owner or admin member)
    const isOwner = board.owner.toString() === userId;
    const isAdmin = board.members.some(
      (m) => m.user.toString() === userId && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized to modify board settings" },
        { status: 403 }
      );
    }

    // Generate unique field ID
    const fieldId = `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newField = {
      fieldId,
      name: name.trim(),
      type,
      required: required || false,
      options: type === "select" ? options : undefined,
      defaultValue,
    };

    board.customFieldDefinitions.push(newField);
    await board.save();

    return NextResponse.json(
      {
        message: "Custom field added successfully",
        customField: newField,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE remove custom field definition from board
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

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Valid board ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get("fieldId");
    const userId = searchParams.get("userId");

    if (!fieldId) {
      return NextResponse.json(
        { message: "Field ID is required" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id);
    if (!board) {
      return NextResponse.json({ message: "Board not found" }, { status: 404 });
    }

    // Check if user has permission
    const isOwner = board.owner.toString() === userId;
    const isAdmin = board.members.some(
      (m) => m.user.toString() === userId && m.role === "admin"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { message: "Unauthorized to modify board settings" },
        { status: 403 }
      );
    }

    // Remove field definition
    board.customFieldDefinitions = board.customFieldDefinitions.filter(
      (field) => field.fieldId !== fieldId
    );
    await board.save();

    // Remove custom field values from all tasks in this board
    await Task.updateMany(
      { board: id },
      { $unset: { [`customFields.${fieldId}`]: "" } }
    );

    return NextResponse.json(
      { message: "Custom field removed successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

