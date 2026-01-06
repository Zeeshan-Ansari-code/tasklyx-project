import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";

// GET - Search users for chat/group creation
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const currentUserId = searchParams.get("userId");

    if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    // Build search query
    const searchQuery = {
      _id: { $ne: currentUserId }, // Exclude current user
      email: { $ne: "ai@assistant.com" }, // Exclude AI user
    };

    if (query.trim()) {
      searchQuery.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ];
    }

    const users = await User.find(searchQuery)
      .select("name email avatar role")
      .limit(20)
      .lean();

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    console.error("[Search Users] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
