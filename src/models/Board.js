import mongoose from "mongoose";

const BoardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Please provide a board title"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    background: {
      type: String,
      default: "bg-blue-500",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        role: {
          type: String,
          enum: ["admin", "member", "viewer"],
          default: "member",
        },
      },
    ],
    lists: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "List",
      },
    ],
    isFavorite: {
      type: Boolean,
      default: false,
    },
    visibility: {
      type: String,
      enum: ["private", "team", "public"],
      default: "private",
    },
    archived: {
      type: Boolean,
      default: false,
    },
    customFieldDefinitions: [
      {
        fieldId: {
          type: String,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        type: {
          type: String,
          enum: ["text", "number", "date", "select", "checkbox", "url"],
          required: true,
        },
        required: {
          type: Boolean,
          default: false,
        },
        options: [String], // For select type
        defaultValue: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for performance optimization
BoardSchema.index({ owner: 1, updatedAt: -1 });
BoardSchema.index({ "members.user": 1, updatedAt: -1 });
BoardSchema.index({ archived: 1, updatedAt: -1 });
BoardSchema.index({ owner: 1, "members.user": 1, archived: 1 });

export default mongoose.models.Board || mongoose.model("Board", BoardSchema);