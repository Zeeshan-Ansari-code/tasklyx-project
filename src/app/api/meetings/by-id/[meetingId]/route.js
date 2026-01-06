import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Meeting from "@/models/Meeting";
import mongoose from "mongoose";

// GET meeting by meetingId (string ID, not MongoDB _id)
export async function GET(request, { params }) {
  try {
    await connectDB();

    let resolvedParams = params;
    if (params && typeof params.then === "function") {
      resolvedParams = await params;
    }

    let meetingId = resolvedParams?.meetingId;
    if (Array.isArray(meetingId)) {
      meetingId = meetingId[0];
    }

    if (!meetingId) {
      return NextResponse.json(
        { message: "Meeting ID is required" },
        { status: 400 }
      );
    }

    const meeting = await Meeting.findOne({ meetingId })
      .populate("host", "name email avatar")
      .populate("participants.user", "name email avatar")
      .populate("conversation", "name type")
      .populate("board", "title")
      .lean();

    if (!meeting) {
      return NextResponse.json(
        { message: "Meeting not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error("[Get Meeting by ID] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}


