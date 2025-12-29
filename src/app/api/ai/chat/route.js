import { NextResponse } from "next/server";
import { isAIEnabled, callAI } from "@/lib/ai";

// Call AI for chat (Hugging Face API)
async function callAIChat(message, conversationHistory = []) {
  // Build conversation context
  const systemMessage = `You are a helpful AI assistant for a project management application called Tasklyx. You help users with:
- Creating and managing tasks
- Project planning and organization
- Productivity tips and best practices
- Answering questions about the application
- Providing guidance on task management

Be concise, helpful, and friendly. If asked about creating tasks, you can guide users to use the "AI Create" feature in the boards.`;

  // Build messages array
  const messages = [
    { role: "system", content: systemMessage },
    ...conversationHistory.slice(-10), // Last 10 messages for context
    { role: "user", content: message },
  ];

  try {
    const response = await callAI(messages, {
      temperature: 0.7,
      max_tokens: 1000,
    });
    
    return response || "I'm sorry, I couldn't generate a response.";
  } catch (error) {
    console.error("[AI Chat] Error calling AI:", error);
    throw error;
  }
}

export async function POST(request) {
  try {
    // Check if AI is enabled
    const aiEnabled = isAIEnabled();
    if (!aiEnabled) {
      return NextResponse.json(
        {
          message: "AI is not enabled. Please set HUGGINGFACE_API_KEY in environment variables.",
          enabled: false,
          error: "AI service not configured",
        },
        { status: 503 }
      );
    }

    // Parse request body with timeout protection
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        {
          message: "Invalid request format",
          error: "Failed to parse request body",
        },
        { status: 400 }
      );
    }
    const { message, conversationHistory = [] } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { message: "Message is required" },
        { status: 400 }
      );
    }

    const response = await callAIChat(message, conversationHistory);

    return NextResponse.json(
      {
        success: true,
        response,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[AI Chat] Error:", error);
    console.error("[AI Chat] Error details:", {
      message: error.message,
      name: error.name,
      stack: error.stack,
    });
    
    // Handle quota/rate limit errors
    if (error.isQuotaError) {
      return NextResponse.json(
        {
          message: "API quota exceeded",
          error: error.message,
          enabled: isAIEnabled(),
          isQuotaError: true,
          retryAfter: error.retryAfter,
        },
        { status: 429 } // 429 Too Many Requests
      );
    }
    
    // Handle network/timeout errors
    const errorMessage = error.message || "Unknown error";
    let userFriendlyMessage = "Failed to get AI response";
    
    if (errorMessage.includes("timeout") || errorMessage.includes("AbortError")) {
      userFriendlyMessage = "Request timeout: The AI service took too long to respond. Please try again.";
    } else if (errorMessage.includes("fetch failed") || errorMessage.includes("network") || errorMessage.includes("ECONNREFUSED") || errorMessage.includes("ENOTFOUND")) {
      userFriendlyMessage = "Network error: Unable to connect to AI service. Please check your internet connection and API configuration.";
    } else if (errorMessage.includes("API key") || errorMessage.includes("authentication")) {
      userFriendlyMessage = "Authentication error: Please check your API key configuration.";
    }
    
    return NextResponse.json(
      {
        message: userFriendlyMessage,
        error: errorMessage,
        enabled: isAIEnabled(),
      },
      { status: 500 }
    );
  }
}

