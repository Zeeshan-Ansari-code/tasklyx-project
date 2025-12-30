import mongoose from "mongoose";

const ConversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    archivedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
ConversationSchema.index({ participants: 1, createdAt: -1 });

export default mongoose.models.Conversation ||
  mongoose.model("Conversation", ConversationSchema);

