import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Meeting from "@/models/Meeting";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import mongoose from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { triggerPusherEvent } from "@/lib/pusher";

// GET all meetings for a user
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status"); // active, ended, scheduled

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const query = {
      $or: [
        { host: userId },
        { "participants.user": userId },
      ],
    };

    if (status) {
      query.status = status;
    }

    const meetings = await Meeting.find(query)
      .populate("host", "name email avatar")
      .populate("participants.user", "name email avatar")
      .populate("conversation", "name type")
      .populate("board", "title")
      .sort({ createdAt: -1 })
      .lean();

    // Filter out meetings with 0 participants (all left or none joined)
    const activeMeetings = meetings.filter((meeting) => {
      const joinedParticipants = meeting.participants?.filter(
        (p) => p.status === "joined"
      ) || [];
      return joinedParticipants.length > 0;
    });

    return NextResponse.json({ meetings: activeMeetings });
  } catch (error) {
    console.error("[Get Meetings] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST create new meeting
export async function POST(request) {
  try {
    await connectDB();

    const body = await request.json();
    const {
      title,
      description,
      host,
      participants,
      conversationId,
      boardId,
      settings,
    } = body;

    if (!title || !host || !mongoose.Types.ObjectId.isValid(host)) {
      return NextResponse.json(
        { message: "Title and valid host ID are required" },
        { status: 400 }
      );
    }

    // Generate unique meeting ID
    const meetingId = uuidv4().replace(/-/g, "").substring(0, 12);

    // Prepare participants array
    let participantsList = participants
      ? participants.map((p) => ({
          user: p,
          status: "invited",
        }))
      : [];
    
    // If no participants specified and no conversation/board, invite all team members
    if (participantsList.length === 0 && !conversationId && !boardId) {
      try {
        const allUsers = await User.find({
          _id: { $ne: host },
          email: { $ne: "ai@assistant.com" },
        })
          .select("_id")
          .lean();
        
        participantsList = allUsers.map((u) => ({
          user: u._id,
          status: "invited",
        }));
      } catch (error) {
        console.error("Error fetching all users:", error);
        // Continue with empty participants list
      }
    }

    // Add host as participant
    participantsList.push({
      user: host,
      status: "joined",
      joinedAt: new Date(),
    });

    const meeting = await Meeting.create({
      title,
      description: description || "",
      host,
      participants: participantsList,
      conversation: conversationId || null,
      board: boardId || null,
      meetingId,
      status: "active",
      settings: settings || {
        allowCamera: true,
        allowScreenShare: true,
        allowChat: true,
        allowMic: true,
      },
    });

    await meeting.populate("host", "name email avatar");
    await meeting.populate("participants.user", "name email avatar");
    if (conversationId) {
      await meeting.populate("conversation", "name type");
    }
    if (boardId) {
      await meeting.populate("board", "title");
    }

    // Trigger Pusher event
    await triggerPusherEvent(`meeting-${meeting._id}`, "meeting:created", {
      meeting,
    });

    // Notify participants (ensure meeting object is properly serialized)
    // The meeting object is already populated with host and participants
    participantsList.forEach((p) => {
      if (p.user.toString() !== host) {
        triggerPusherEvent(`user-${p.user}`, "meeting:invited", {
          meeting: {
            _id: meeting._id,
            meetingId: meeting.meetingId,
            title: meeting.title,
            description: meeting.description,
            host: meeting.host, // Already populated with name, email, avatar
            status: meeting.status,
            participants: meeting.participants,
            conversation: meeting.conversation,
            board: meeting.board,
            settings: meeting.settings,
            createdAt: meeting.createdAt,
          },
        });
      }
    });

    return NextResponse.json({ meeting }, { status: 201 });
  } catch (error) {
    console.error("[Create Meeting] Error:", error);
    return NextResponse.json(
      { message: "Internal server error", error: error.message },
      { status: 500 }
    );
  }
}

