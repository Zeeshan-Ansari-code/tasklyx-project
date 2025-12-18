import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Board from "@/models/Board";
import Task from "@/models/Task";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const userId = searchParams.get("userId");
    const type = searchParams.get("type"); // "all", "boards", "tasks"

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { message: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { boards: [], tasks: [] },
        { status: 200 }
      );
    }

    const searchRegex = { $regex: query, $options: "i" };
    const results = {
      boards: [],
      tasks: [],
    };

    // Search boards
    if (!type || type === "all" || type === "boards") {
      const boards = await Board.find({
        $and: [
          {
            $or: [
              { owner: userId },
              { "members.user": userId },
            ],
          },
          {
            $or: [
              { title: searchRegex },
              { description: searchRegex },
            ],
          },
        ],
      })
        .populate("owner", "name email avatar")
        .populate("members.user", "name email avatar")
        .limit(10);

      results.boards = boards;
    }

    // Search tasks
    if (!type || type === "all" || type === "tasks") {
      // First get user's board IDs
      const userBoards = await Board.find({
        $or: [
          { owner: userId },
          { "members.user": userId },
        ],
      }).select("_id");

      const boardIds = userBoards.map((b) => b._id);

      const tasks = await Task.find({
        board: { $in: boardIds },
        $or: [
          { title: searchRegex },
          { description: searchRegex },
        ],
      })
        .populate("assignees", "name email avatar")
        .populate("board", "title")
        .populate("list", "title")
        .limit(20);

      results.tasks = tasks;
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

