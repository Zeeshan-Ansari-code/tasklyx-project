import mongoose from "mongoose";

const ActivitySchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: [
        "board_created",
        "board_updated",
        "board_deleted",
        "list_created",
        "list_updated",
        "list_deleted",
        "task_created",
        "task_updated",
        "task_deleted",
        "task_moved",
        "task_assigned",
        "task_completed",
        "comment_added",
        "member_added",
        "member_removed",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
ActivitySchema.index({ board: 1, createdAt: -1 });
ActivitySchema.index({ user: 1, createdAt: -1 });

export default mongoose.models.Activity || mongoose.model("Activity", ActivitySchema);

