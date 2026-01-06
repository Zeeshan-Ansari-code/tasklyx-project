import { NextResponse } from "next/server";
import { uploadToCloudinary } from "@/lib/cloudinary";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Convert File to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileObj = {
      name: file.name,
      mimetype: file.type,
      size: file.size,
    };

    // Upload to Cloudinary
    const result = await uploadToCloudinary(buffer, file.type, file.name, "chat");

    return NextResponse.json({
      success: true,
      file: result,
    });
  } catch (error) {
    console.error("[File Upload] Error:", error);
    return NextResponse.json(
      { error: "Failed to upload file", details: error.message },
      { status: 500 }
    );
  }
}

