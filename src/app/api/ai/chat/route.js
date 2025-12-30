import { NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Message from "@/models/Message";
import Conversation from "@/models/Conversation";
import User from "@/models/User";
import mongoose from "mongoose";
import axios from "axios";

export async function POST(request) {
  try {
    await connectDB();
    const { conversationId, message, userId } = await request.json();

    if (!message || !userId) {
      return NextResponse.json(
        { error: "message and userId required" },
        { status: 400 }
      );
    }

    // Get or create AI user
    let aiUser = await User.findOne({ email: "ai@assistant.com" });
    if (!aiUser) {
      aiUser = await User.create({
        name: "AI Assistant",
        email: "ai@assistant.com",
        password: "ai-assistant-no-password",
        recoveryAnswer: "ai-assistant",
      });
    }

    // Get or create conversation
    let conversation;
    if (
      conversationId &&
      conversationId !== "ai-chat" &&
      mongoose.Types.ObjectId.isValid(conversationId)
    ) {
      conversation = await Conversation.findById(conversationId);
    } else {
      const userIdObj = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : userId;

      conversation = await Conversation.findOne({
        participants: { $all: [userIdObj, aiUser._id] },
      });

      if (!conversation) {
        conversation = await Conversation.create({
          participants: [userIdObj, aiUser._id],
        });
      }
    }

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Save user message
    const userMessage = await Message.create({
      conversation: conversation._id,
      sender: userId,
      text: message,
      seenBy: [userId],
    });
    await userMessage.populate("sender", "name email");

    // Get conversation history (last 10 messages) - optimized query
    const recentMessages = await Message.find({
      conversation: conversation._id,
    })
      .select("text sender createdAt")
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("sender", "name email _id")
      .lean();

    // Format messages for Hugging Face API
    const messageHistory = recentMessages.reverse().map((msg) => ({
      role: msg.sender._id.toString() === userId.toString() ? "user" : "assistant",
      content: msg.text || "",
    }));

    // Add system message at the beginning - respond in the same language as the user
    const systemMessage = {
      role: "system",
      content: "You are a helpful AI assistant for a project management application. Always respond in the same language that the user uses in their message. If the user writes in Hindi, respond in Hindi. If they write in English, respond in English. If they write in any other language, respond in that same language. Be concise, professional, and helpful.",
    };

    // Reconstruct message history with system message at the start
    const fullMessageHistory = [systemMessage, ...messageHistory, { role: "user", content: message }];

    // Call Hugging Face API
    const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
    const huggingFaceModel =
      process.env.HUGGINGFACE_MODEL || "deepseek-ai/DeepSeek-V3.2";

    if (!huggingFaceApiKey) {
      const fallbackMessage = await Message.create({
        conversation: conversation._id,
        sender: aiUser._id,
        text: "AI service is not configured. Please set HUGGINGFACE_API_KEY in your environment variables.",
        seenBy: [userId],
      });
      await fallbackMessage.populate("sender", "name email");

      return NextResponse.json({
        userMessage,
        aiMessage: fallbackMessage,
        conversationId: conversation._id,
        error: "AI service not configured",
      });
    }

    try {
      const response = await axios.post(
        `https://router.huggingface.co/v1/chat/completions`,
        {
          model: huggingFaceModel,
          messages: fullMessageHistory,
          max_tokens: 1000,
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${huggingFaceApiKey}`,
            "Content-Type": "application/json",
          },
          timeout: 20000, // Reduced timeout from 30s to 20s
        }
      );

      const aiResponse =
        response.data?.choices?.[0]?.message?.content ||
        "I'm sorry, I couldn't generate a response.";

      const aiMessage = await Message.create({
        conversation: conversation._id,
        sender: aiUser._id,
        text: aiResponse,
        seenBy: [userId],
      });
      await aiMessage.populate("sender", "name email");

      return NextResponse.json({
        userMessage,
        aiMessage,
        conversationId: conversation._id,
      });
    } catch (hfError) {
      console.error("Hugging Face API Error:", hfError.response?.data || hfError.message);

      // Fallback response
      const fallbackText =
        hfError.response?.data?.error?.message ||
        "I'm currently experiencing technical difficulties. Please try again in a moment.";

      const aiMessage = await Message.create({
        conversation: conversation._id,
        sender: aiUser._id,
        text: fallbackText,
        seenBy: [userId],
      });
      await aiMessage.populate("sender", "name email");

      return NextResponse.json({
        userMessage,
        aiMessage,
        conversationId: conversation._id,
        error: "AI service temporarily unavailable",
      });
    }
  } catch (error) {
    console.error("[AI Chat API] Error:", error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

