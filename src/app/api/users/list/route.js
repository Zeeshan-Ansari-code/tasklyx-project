import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

// GET - List all users (Admin only)
export async function GET(request) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const adminUserId = searchParams.get("adminUserId");

    if (!adminUserId) {
      return NextResponse.json(
        { message: "Admin user ID is required" },
        { status: 400 }
      );
    }

    // Verify admin user
    const adminUser = await User.findById(adminUserId);
    if (!adminUser) {
      return NextResponse.json(
        { message: "Admin user not found" },
        { status: 404 }
      );
    }

    if (adminUser.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can view all users" },
        { status: 403 }
      );
    }

    // Get all users
    const users = await User.find({})
      .select("-password -recoveryAnswer")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        users: users.map((user) => ({
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
          createdAt: user.createdAt,
        })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[List Users] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

