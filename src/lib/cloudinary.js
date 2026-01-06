import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(buffer, mimetype, filename, folder = "chat") {
  try {
    // Convert buffer to base64
    const base64File = buffer.toString("base64");
    const dataURI = `data:${mimetype || "application/octet-stream"};base64,${base64File}`;

    const result = await cloudinary.uploader.upload(dataURI, {
      folder: `tasklyx/${folder}`,
      resource_type: "auto", // Automatically detect image, video, raw
      use_filename: true,
      unique_filename: true,
      public_id: filename ? filename.replace(/\.[^/.]+$/, "") : undefined,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      filename: result.original_filename || filename || "file",
      fileType: getFileType(result.resource_type, result.format),
      size: result.bytes,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw new Error("Failed to upload file to Cloudinary");
  }
}

export async function deleteFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    return false;
  }
}

function getFileType(resourceType, format) {
  if (resourceType === "image") return "image";
  if (resourceType === "video") return "video";
  if (resourceType === "raw") {
    const audioFormats = ["mp3", "wav", "ogg", "aac", "m4a"];
    if (audioFormats.includes(format?.toLowerCase())) return "audio";
    return "document";
  }
  return "other";
}

export default cloudinary;

