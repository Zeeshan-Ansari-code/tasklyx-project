import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Meeting from "@/models/Meeting";
import User from "@/models/User";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";

// GET single meeting
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
        { message: "Invalid meeting ID" },
        { status: 400 }
      );
    }

    const meeting = await Meeting.findById(id)
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
    console.error("[Get Meeting] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT update meeting (join, leave, end)
export async function PUT(request, { params }) {
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
        { message: "Invalid meeting ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { action, userId, addParticipants, title } = body;

    const meeting = await Meeting.findById(id);
    if (!meeting) {
      return NextResponse.json(
        { message: "Meeting not found" },
        { status: 404 }
      );
    }

    if (action === "join") {
      // Check if this is the first person joining (no joined participants)
      const joinedCount = meeting.participants?.filter(
        (p) => p.status === "joined"
      ).length || 0;
      
      // If first person and title is provided, update meeting title
      if (joinedCount === 0 && title && title.trim()) {
        meeting.title = title.trim();
      }
      
      const participant = meeting.participants.find(
        (p) => p.user.toString() === userId
      );
      if (participant) {
        participant.status = "joined";
        participant.joinedAt = new Date();
        participant.leftAt = null;
      } else {
        meeting.participants.push({
          user: userId,
          status: "joined",
          joinedAt: new Date(),
        });
      }
    } else if (action === "leave") {
      const participant = meeting.participants.find(
        (p) => p.user.toString() === userId
      );
      if (participant) {
        participant.status = "left";
        participant.leftAt = new Date();
      }
      
      // Check if this was the last participant - if so, end the meeting
      const remainingJoined = meeting.participants.filter(
        (p) => p.status === "joined"
      );
      if (remainingJoined.length === 0) {
        meeting.status = "ended";
        meeting.endTime = new Date();
      }
    } else if (action === "end") {
      if (meeting.host.toString() !== userId) {
        return NextResponse.json(
          { message: "Only the host can end the meeting" },
          { status: 403 }
        );
      }
      meeting.status = "ended";
      meeting.endTime = new Date();
    } else if (action === "addParticipants" && addParticipants) {
      addParticipants.forEach((pid) => {
        const exists = meeting.participants.some(
          (p) => p.user.toString() === pid
        );
        if (!exists) {
          meeting.participants.push({
            user: pid,
            status: "invited",
          });
        }
      });
    }

    await meeting.save();
    await meeting.populate("host", "name email avatar");
    await meeting.populate("participants.user", "name email avatar");

    // Trigger Pusher event for real-time updates
    await triggerPusherEvent(`meeting-${id}`, "meeting:updated", {
      meeting,
      action,
    });
    
    // Also notify all participants about the update
    meeting.participants.forEach((p) => {
      if (p.user && p.user._id) {
        triggerPusherEvent(`user-${p.user._id}`, "meeting:updated", {
          meeting,
          action,
        });
      }
    });

    // Also trigger specific participant events
    if (action === "join") {
      const joinedUser = await User.findById(userId).select("name email avatar").lean();
      await triggerPusherEvent(`meeting-${id}`, "participant:joined", {
        user: joinedUser,
        meetingId: id,
        meeting, // Include full meeting data
      });
    } else if (action === "leave") {
      const leftUser = await User.findById(userId).select("name email avatar").lean();
      await triggerPusherEvent(`meeting-${id}`, "participant:left", {
        user: leftUser,
        meetingId: id,
        meeting, // Include full meeting data
      });
    }

    return NextResponse.json({ meeting });
  } catch (error) {
    console.error("[Update Meeting] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

