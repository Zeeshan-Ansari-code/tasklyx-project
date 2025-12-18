import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";
import Board from "@/models/Board";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

// DELETE user account
export async function DELETE(request) {
  try {
    await connectDB();

    const body = await request.json();
    const { userId, password } = body;

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json(
        { message: "Valid user ID is required" },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { message: "Password is required to delete account" },
        { status: 400 }
      );
    }

    // Get user with password
    const user = await User.findById(userId).select("+password");

    if (!user) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: "Password is incorrect" },
        { status: 400 }
      );
    }

    // Delete all boards owned by user
    await Board.deleteMany({ owner: userId });

    // Remove user from all boards where they are members
    await Board.updateMany(
      { "members.user": userId },
      { $pull: { members: { user: userId } } }
    );

    // Delete user
    await User.findByIdAndDelete(userId);

    return NextResponse.json(
      {
        message: "Account deleted successfully",
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

