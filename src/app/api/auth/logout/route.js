import { NextResponse } from "next/server";

export async function POST(request) {
  // In a real app, you'd invalidate the session/token here
  // For now, we'll just return success
  return NextResponse.json(
    { message: "Logged out successfully" },
    { status: 200 }
  );
}