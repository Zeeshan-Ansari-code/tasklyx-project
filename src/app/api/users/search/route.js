import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import mongoose from "mongoose";

export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { message: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    // Search users by name or email (exclude AI user)
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
      ],
      email: { $ne: "ai@assistant.com" },
    })
      .select("name email avatar")
      .limit(10);

    return NextResponse.json({ users }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

