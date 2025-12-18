import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Webhook from "@/models/Webhook";
import mongoose from "mongoose";

// PUT update webhook
export async function PUT(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    const boardId = Array.isArray(resolvedParams?.id)
      ? resolvedParams.id[0]
      : resolvedParams?.id;
    const webhookId = Array.isArray(resolvedParams?.webhookId)
      ? resolvedParams.webhookId[0]
      : resolvedParams?.webhookId;

    if (!boardId || !mongoose.Types.ObjectId.isValid(boardId)) {
      return NextResponse.json(
        { message: "Valid board ID is required" },
        { status: 400 }
      );
    }

    if (!webhookId || !mongoose.Types.ObjectId.isValid(webhookId)) {
      return NextResponse.json(
        { message: "Valid webhook ID is required" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { url, events, active, userId } = body;

    const webhook = await Webhook.findOne({
      _id: webhookId,
      board: boardId,
    });

    if (!webhook) {
      return NextResponse.json(
        { message: "Webhook not found" },
        { status: 404 }
      );
    }

    const board = await Board.findById(boardId);
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
        { message: "Unauthorized to update webhooks" },
        { status: 403 }
      );
    }

    const updateData = {};
    if (url !== undefined) {
      try {
        new URL(url);
        updateData.url = url.trim();
      } catch (error) {
        return NextResponse.json(
          { message: "Invalid URL format" },
          { status: 400 }
        );
      }
    }
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { message: "At least one event is required" },
          { status: 400 }
        );
      }
      updateData.events = events;
    }
    if (active !== undefined) {
      updateData.active = active;
    }

    const updatedWebhook = await Webhook.findByIdAndUpdate(
      webhookId,
      { $set: updateData },
      { new: true }
    )
      .select("-secret")
      .populate("createdBy", "name email");

    return NextResponse.json(
      {
        message: "Webhook updated successfully",
        webhook: updatedWebhook,
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

// DELETE webhook
export async function DELETE(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    const boardId = Array.isArray(resolvedParams?.id)
      ? resolvedParams.id[0]
      : resolvedParams?.id;
    const webhookId = Array.isArray(resolvedParams?.webhookId)
      ? resolvedParams.webhookId[0]
      : resolvedParams?.webhookId;

    if (!boardId || !mongoose.Types.ObjectId.isValid(boardId)) {
      return NextResponse.json(
        { message: "Valid board ID is required" },
        { status: 400 }
      );
    }

    if (!webhookId || !mongoose.Types.ObjectId.isValid(webhookId)) {
      return NextResponse.json(
        { message: "Valid webhook ID is required" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const webhook = await Webhook.findOne({
      _id: webhookId,
      board: boardId,
    });

    if (!webhook) {
      return NextResponse.json(
        { message: "Webhook not found" },
        { status: 404 }
      );
    }

    const board = await Board.findById(boardId);
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
        { message: "Unauthorized to delete webhooks" },
        { status: 403 }
      );
    }

    await Webhook.findByIdAndDelete(webhookId);

    return NextResponse.json(
      { message: "Webhook deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

