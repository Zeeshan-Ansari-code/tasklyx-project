import mongoose from "mongoose";

const MeetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    participants: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
        leftAt: {
          type: Date,
        },
        status: {
          type: String,
          enum: ["invited", "joined", "left"],
          default: "invited",
        },
      },
    ],
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      default: null,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "ended"],
      default: "active",
    },
    meetingId: {
      type: String,
      required: true,
    },
    settings: {
      allowCamera: {
        type: Boolean,
        default: true,
      },
      allowScreenShare: {
        type: Boolean,
        default: true,
      },
      allowChat: {
        type: Boolean,
        default: true,
      },
      allowMic: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
MeetingSchema.index({ host: 1, status: 1 });
MeetingSchema.index({ "participants.user": 1, status: 1 });
MeetingSchema.index({ meetingId: 1 }, { unique: true });
MeetingSchema.index({ conversation: 1 });
MeetingSchema.index({ board: 1 });

export default mongoose.models.Meeting || mongoose.model("Meeting", MeetingSchema);

