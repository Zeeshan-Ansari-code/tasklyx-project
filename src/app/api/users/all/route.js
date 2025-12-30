import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

// GET - Get all users (for team/resource pages - no admin check needed)
export async function GET(request) {
  try {
    await connectDB();

    // Get all users (for team management, everyone should see all users)
    // Exclude AI user
    const users = await User.find({ email: { $ne: "ai@assistant.com" } })
      .select("name email avatar role")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        users: users.map((user) => ({
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Get All Users] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

