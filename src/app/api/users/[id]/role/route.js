import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import User from "@/models/User";

// PUT - Update user role (Admin only)
export async function PUT(request, { params }) {
  try {
    await connectDB();

    // Get params
    let resolvedParams = params;
    if (params && typeof params.then === 'function') {
      resolvedParams = await params;
    }
    
    let userId = resolvedParams?.id;
    if (Array.isArray(userId)) {
      userId = userId[0];
    }

    const body = await request.json();
    const { newRole, adminUserId } = body;

    // Validation
    if (!userId || !newRole || !adminUserId) {
      return NextResponse.json(
        { message: "User ID, new role, and admin user ID are required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "manager", "team_member", "viewer"];
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { message: "Invalid role. Must be one of: admin, manager, team_member, viewer" },
        { status: 400 }
      );
    }

    // Check if admin user exists and is actually an admin
    const adminUser = await User.findById(adminUserId);
    if (!adminUser) {
      return NextResponse.json(
        { message: "Admin user not found" },
        { status: 404 }
      );
    }

    if (adminUser.role !== "admin") {
      return NextResponse.json(
        { message: "Only admins can change user roles" },
        { status: 403 }
      );
    }

    // Check if target user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404 }
      );
    }

    // Prevent admin from changing their own role
    if (userId === adminUserId && newRole !== "admin") {
      return NextResponse.json(
        { message: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Update user role
    targetUser.role = newRole;
    await targetUser.save();

    return NextResponse.json(
      {
        message: "User role updated successfully",
        user: {
          id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[Update User Role] Error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}

