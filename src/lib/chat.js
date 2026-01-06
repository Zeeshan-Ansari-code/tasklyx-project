import Conversation from "@/models/Conversation";
import Board from "@/models/Board";
import mongoose from "mongoose";

/**
 * Create a group conversation for a board
 */
export async function createBoardGroup(boardId) {
  try {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Check if group already exists
    const existingGroup = await Conversation.findOne({
      board: boardId,
      type: "group",
    });

    if (existingGroup) {
      return existingGroup;
    }

    // Get all board members (owner + members)
    const participants = [
      board.owner,
      ...board.members.map((m) => m.user),
    ];

    // Create group conversation
    const group = await Conversation.create({
      participants,
      type: "group",
      name: board.title,
      description: board.description || `Group chat for ${board.title}`,
      createdBy: board.owner,
      board: boardId,
    });

    await group.populate("participants", "name email avatar");
    await group.populate("createdBy", "name email avatar");

    return group;
  } catch (error) {
    console.error("[Create Board Group] Error:", error);
    throw error;
  }
}

/**
 * Sync board members with group participants
 */
export async function syncBoardGroupMembers(boardId) {
  try {
    const board = await Board.findById(boardId);
    if (!board) {
      throw new Error("Board not found");
    }

    // Find the group for this board
    const group = await Conversation.findOne({
      board: boardId,
      type: "group",
    });

    if (!group) {
      // Create group if it doesn't exist
      return await createBoardGroup(boardId);
    }

    // Get all board members (owner + members)
    const boardMemberIds = [
      board.owner.toString(),
      ...board.members.map((m) => m.user.toString()),
    ];

    // Get current group participants
    const currentParticipantIds = group.participants.map((p) => p.toString());

    // Add new members
    const newMembers = boardMemberIds.filter(
      (id) => !currentParticipantIds.includes(id)
    );
    if (newMembers.length > 0) {
      group.participants.push(...newMembers);
    }

    // Remove members who are no longer in the board
    group.participants = group.participants.filter((p) =>
      boardMemberIds.includes(p.toString())
    );

    await group.save();
    await group.populate("participants", "name email avatar");

    return group;
  } catch (error) {
    console.error("[Sync Board Group Members] Error:", error);
    throw error;
  }
}

/**
 * Remove user from board group
 */
export async function removeUserFromBoardGroup(boardId, userId) {
  try {
    const group = await Conversation.findOne({
      board: boardId,
      type: "group",
    });

    if (!group) {
      return;
    }

    group.participants = group.participants.filter(
      (p) => p.toString() !== userId.toString()
    );

    await group.save();
  } catch (error) {
    console.error("[Remove User From Board Group] Error:", error);
  }
}

