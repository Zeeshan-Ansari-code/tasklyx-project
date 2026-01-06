import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import User from "@/models/User";
import mongoose from "mongoose";
import { triggerPusherEvent } from "@/lib/pusher";
import { createActivity } from "@/lib/activity";
import { createNotification } from "@/lib/notifications";
import { triggerWebhooks } from "@/lib/webhooks";
import { syncBoardGroupMembers, removeUserFromBoardGroup } from "@/lib/chat";

// POST add member to board
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
    const { userId, role = "member", addedBy } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id);
    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const existingMember = board.members.find(
      (m) => m.user.toString() === userId
    );

    if (existingMember) {
      return NextResponse.json(
        { message: "User is already a member of this board" },
        { status: 400 }
      );
    }

    // Check if user is the owner
    if (board.owner.toString() === userId) {
      return NextResponse.json(
        { message: "User is already the owner of this board" },
        { status: 400 }
      );
    }

    // Add member
    board.members.push({
      user: userId,
      role: role,
    });

    await board.save();

    await board.populate("members.user", "name email avatar");

    // Trigger Pusher event
    await triggerPusherEvent(`board-${id}`, "board:member:added", {
      boardId: id,
      member: board.members[board.members.length - 1],
    });

    // Log activity
    if (addedBy) {
      const addedUser = await User.findById(userId).select("name");
      await createActivity({
        boardId: id,
        userId: addedBy,
        type: "member_added",
        description: `added ${addedUser?.name || "a member"} to the board`,
        metadata: { memberId: userId },
      });

      // Send notification to the added user
      // Ensure id is a string
      const boardIdStr = id?.toString() || id;
      await createNotification({
        user: userId,
        type: "board_invite",
        title: "Board Invitation",
        message: `You've been added to board "${board.title}"`,
        link: `/boards/${boardIdStr}`,
        relatedUser: addedBy,
        relatedBoard: id,
      });
    }

    // Trigger webhooks
    await triggerWebhooks(id, "member.added", {
      boardId: id,
      memberId: userId,
      role: role,
    });

    // Sync group members
    try {
      await syncBoardGroupMembers(id);
    } catch (error) {
      console.error("Failed to sync board group members:", error);
      // Don't fail member addition if group sync fails
    }

    return NextResponse.json(
      {
        message: "Member added successfully",
        board,
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

// DELETE remove member from board
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

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const removedBy = searchParams.get("removedBy");

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    const board = await Board.findById(id);
    if (!board) {
      return NextResponse.json(
        { message: "Board not found" },
        { status: 404 }
      );
    }

    // Cannot remove owner
    if (board.owner.toString() === userId) {
      return NextResponse.json(
        { message: "Cannot remove board owner" },
        { status: 400 }
      );
    }

    // Remove member
    board.members = board.members.filter(
      (m) => m.user.toString() !== userId
    );

    await board.save();

    // Trigger Pusher event
    await triggerPusherEvent(`board-${id}`, "board:member:removed", {
      boardId: id,
      userId,
    });

    // Log activity
    if (removedBy) {
      const removedUser = await User.findById(userId).select("name");
      await createActivity({
        boardId: id,
        userId: removedBy,
        type: "member_removed",
        description: `removed ${removedUser?.name || "a member"} from the board`,
        metadata: { memberId: userId },
      });
    }

    // Trigger webhooks
    await triggerWebhooks(id, "member.removed", {
      boardId: id,
      memberId: userId,
    });

    // Remove user from board group
    try {
      await removeUserFromBoardGroup(id, userId);
    } catch (error) {
      console.error("Failed to remove user from board group:", error);
      // Don't fail member removal if group sync fails
    }

    return NextResponse.json(
      {
        message: "Member removed successfully",
        board,
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

