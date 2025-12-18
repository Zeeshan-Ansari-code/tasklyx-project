import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Webhook from "@/models/Webhook";
import { generateWebhookSecret } from "@/lib/webhooks";
import mongoose from "mongoose";

// GET all webhooks for a board
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

    const webhooks = await Webhook.find({ board: id })
      .select("-secret") // Don't return secret
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ webhooks }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

// POST create new webhook
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
    const { url, events, userId } = body;

    if (!url || !url.trim()) {
      return NextResponse.json(
        { message: "Webhook URL is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { message: "Invalid URL format" },
        { status: 400 }
      );
    }

    if (!events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { message: "At least one event is required" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
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
        { message: "Unauthorized to create webhooks" },
        { status: 403 }
      );
    }

    const secret = generateWebhookSecret();

    const webhook = await Webhook.create({
      board: id,
      url: url.trim(),
      secret,
      events,
      createdBy: userId,
      active: true,
    });

    // Return webhook without secret (for security)
    const webhookResponse = await Webhook.findById(webhook._id)
      .select("-secret")
      .populate("createdBy", "name email");

    return NextResponse.json(
      {
        message: "Webhook created successfully",
        webhook: webhookResponse,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

