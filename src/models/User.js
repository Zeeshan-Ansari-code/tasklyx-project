import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please provide a name"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Please provide an email"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    emailNotifications: {
      type: Boolean,
      default: true,
    },
    notificationPreferences: {
      taskAssigned: { type: Boolean, default: true },
      taskDeadline: { type: Boolean, default: true },
      taskComment: { type: Boolean, default: true },
      boardInvite: { type: Boolean, default: true },
      dailyDigest: { type: Boolean, default: false },
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: 6,
      select: false, // Don't include password in queries by default
    },
    // Simple security answer used for password reset (e.g. school or child name)
    recoveryAnswer: {
      type: String,
      required: [true, "Please provide a recovery answer"],
      trim: true,
      lowercase: true,
    },
    avatar: {
      type: String,
      default: null,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "team_member", "viewer"],
      default: "team_member",
    },
    boards: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Board",
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);