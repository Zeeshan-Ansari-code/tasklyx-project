import mongoose from "mongoose";

const WebhookSchema = new mongoose.Schema(
  {
    board: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    secret: {
      type: String,
      required: true,
    },
    events: [
      {
        type: String,
        enum: [
          "task.created",
          "task.updated",
          "task.deleted",
          "task.completed",
          "task.moved",
          "list.created",
          "list.updated",
          "list.deleted",
          "board.updated",
          "member.added",
          "member.removed",
        ],
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastTriggered: {
      type: Date,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
WebhookSchema.index({ board: 1, active: 1 });

export default mongoose.models.Webhook || mongoose.model("Webhook", WebhookSchema);

