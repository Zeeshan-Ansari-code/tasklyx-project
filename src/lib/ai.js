/**
 * AI Utility Functions
 * Provides AI-powered features for the project management tool
 * Supports Google Gemini API and Hugging Face Chat Completions API
 * 
 * Hugging Face uses the Chat Completions API (2024-2025):
 * - Endpoint: https://api.huggingface.co/v1/chat/completions
 * - Works with: Llama 3.1, Mistral, Qwen, Zephyr, Phi-3
 * - Free models available (no Pro account required for recommended models)
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY;
// Default to stable free tier model: gemini-2.0-flash-001 (stable) or gemini-2.5-flash (newer stable)
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash-001";
// Hugging Face model - use Chat Completions API compatible models
// Recommended free models: meta-llama/Llama-3.1-8B-Instruct, mistralai/Mistral-7B-Instruct, Qwen/Qwen2.5-7B-Instruct
const HUGGINGFACE_MODEL = process.env.HUGGINGFACE_MODEL || "meta-llama/Llama-3.1-8B-Instruct";

/**
 * Check if AI is enabled (Hugging Face only)
 */
export function isAIEnabled() {
  return !!HUGGINGFACE_API_KEY;
}

/**
 * Get the active AI provider
 */
function getAIProvider() {
  if (HUGGINGFACE_API_KEY) return "huggingface";
  return null;
}

/**
 * Convert OpenAI messages format to Gemini format
 */
function convertMessagesToGeminiFormat(messages) {
  // Gemini uses a simple text format or parts array
  // Combine system and user messages
  let text = "";
  for (const msg of messages) {
    if (msg.role === "system") {
      text += `System: ${msg.content}\n\n`;
    } else if (msg.role === "user") {
      text += `User: ${msg.content}\n\n`;
    } else if (msg.role === "assistant") {
      text += `Assistant: ${msg.content}\n\n`;
    }
  }
  return text.trim();
}

/**
 * Call Gemini API
 */
async function callGemini(messages, options = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error("Gemini API key is not set");
  }

  try {
    // Convert messages to text format for Gemini
    const prompt = convertMessagesToGeminiFormat(messages);
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${options.model || GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.max_tokens || 1000,
            topP: 0.8,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
      const errorMessage = errorData.error?.message || "Gemini API error";
      
      // Check for quota/rate limit errors
      if (errorMessage.includes("quota") || errorMessage.includes("Quota exceeded") || errorMessage.includes("rate limit")) {
        const retryMatch = errorMessage.match(/retry in ([\d.]+)s/i);
        const retrySeconds = retryMatch ? parseFloat(retryMatch[1]) : null;
        
        const quotaError = new Error(errorMessage);
        quotaError.isQuotaError = true;
        quotaError.retryAfter = retrySeconds;
        throw quotaError;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("[AI] Error calling Gemini:", error);
    throw error;
  }
}

/**
 * Call Hugging Face Chat Completions API (2024-2025)
 * Uses the official Chat Completions endpoint: https://api.huggingface.co/v1/chat/completions
 * 
 * Supported models:
 * - meta-llama/Llama-3.1-8B-Instruct
 * - mistralai/Mistral-7B-Instruct
 * - Qwen/Qwen2.5-7B-Instruct
 * - HuggingFaceH4/zephyr-7b-beta
 */
async function callHuggingFace(messages, options = {}) {
  if (!HUGGINGFACE_API_KEY) {
    throw new Error("Hugging Face API key is not set");
  }

  const model = options.model || HUGGINGFACE_MODEL;
  
  // Use the official Chat Completions API endpoint
  // This is the correct endpoint for chat models (2024-2025)
  const endpoint = "https://api.huggingface.co/v1/chat/completions";
  
  try {
    // Filter and format messages for the API
    // Remove system messages from the array (they'll be handled separately if needed)
    const apiMessages = messages
      .filter(msg => msg.role !== "system" || msg.content) // Keep system messages
      .map(msg => ({
        role: msg.role === "system" ? "user" : msg.role, // Some models don't support "system", use "user"
        content: msg.content,
      }));
    
    // Extract system message if present
    const systemMessage = messages.find(msg => msg.role === "system");
    
    // Build request body
    const requestBody = {
      model: model,
      messages: apiMessages,
      max_tokens: options.max_tokens || 1000,
      temperature: options.temperature || 0.7,
    };
    
    // Some models support system messages in the messages array
    // If we have a system message, prepend it
    if (systemMessage && apiMessages.length > 0 && apiMessages[0].role !== "system") {
      requestBody.messages = [
        { role: "system", content: systemMessage.content },
        ...apiMessages,
      ];
    }
    
    // Make request to Hugging Face Chat Completions API with timeout
    // Vercel Hobby: 10s max, Pro: 60s max
    // Using 25s to be safe on Pro plan (adjust to 8s for Hobby plan)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout (safe for Vercel Pro)
    
    let response;
    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${HUGGINGFACE_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("[AI] Hugging Face fetch error:", {
        name: fetchError.name,
        message: fetchError.message,
        cause: fetchError.cause,
      });
      
      if (fetchError.name === 'AbortError') {
        throw new Error("Request timeout: The AI service took too long to respond. Please try again.");
      }
      
      // Check for DNS resolution errors (Windows-specific issue)
      if (fetchError.cause?.code === 'ENOTFOUND' || fetchError.cause?.code === 'ENODATA') {
        throw new Error(`DNS resolution failed for Hugging Face API. This is a Windows DNS issue.\n\n🔧 To fix:\n1. Open Command Prompt as Administrator\n2. Run: ipconfig /flushdns\n3. Run: netsh winsock reset\n4. Change DNS to 8.8.8.8 (Google DNS) or 1.1.1.1 (Cloudflare DNS)\n5. Restart your computer\n\nSee FIX_DNS_WINDOWS.md for detailed instructions.\n\nError: ${fetchError.cause.message}`);
      }
      
      // More specific error messages
      if (fetchError.message?.includes("fetch failed") || fetchError.message?.includes("network") || fetchError.cause) {
        const causeInfo = fetchError.cause ? ` (${fetchError.cause.message || fetchError.cause})` : '';
        throw new Error(`Network error: Unable to connect to Hugging Face API.${causeInfo}\n\nPlease check:\n1. Your server can reach https://api.huggingface.co\n2. Your API key is correct\n3. DNS resolution is working (try: nslookup api.huggingface.co)\n4. Your firewall/antivirus is not blocking the connection`);
      }
      
      throw new Error(`Connection error: ${fetchError.message || "Failed to connect to AI service"}`);
    }
    
    // Handle response
    if (!response.ok) {
      let errorMessage = `Hugging Face API error (${response.status})`;
      
      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorData.error || errorData.message || errorData.msg || JSON.stringify(errorData) || errorMessage;
      } catch (e) {
        // If response is not JSON, try to get text
        try {
          const text = await response.text();
          errorMessage = text || errorMessage;
        } catch (e2) {
          // Keep default error message
        }
      }
      
      // Check for 404 - model not found or endpoint issue
      if (response.status === 404) {
        throw new Error(`Model "${model}" not found or Chat Completions API not available. Please verify:\n1. The model name is correct\n2. The model supports Chat Completions API\n3. You have access to the model (some require Pro account)\n\nRecommended free models: meta-llama/Llama-3.1-8B-Instruct, mistralai/Mistral-7B-Instruct`);
      }
      
      // Check for 401 - authentication error
      if (response.status === 401) {
        throw new Error(`Hugging Face API authentication failed. Please check your HUGGINGFACE_API_KEY is correct.`);
      }
      
      // Check for 403 - forbidden (model requires Pro account)
      if (response.status === 403) {
        throw new Error(`Access denied to model "${model}". This model may require a Hugging Face Pro account. Try using a free model like meta-llama/Llama-3.1-8B-Instruct or mistralai/Mistral-7B-Instruct`);
      }
      
      // Check for rate limit errors
      if (response.status === 429 || errorMessage.includes("rate limit") || errorMessage.includes("quota")) {
        const quotaError = new Error(`Hugging Face API rate limit: ${errorMessage}`);
        quotaError.isQuotaError = true;
        throw quotaError;
      }
      
      throw new Error(errorMessage);
    }
    
    // Parse successful response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse Hugging Face response: ${e.message}`);
    }
    
    // Check for errors in response (some APIs return errors in 200 response)
    if (data.error) {
      throw new Error(data.error.message || data.error || "Unknown error from Hugging Face API");
    }
    
    // Chat Completions API returns: { "choices": [{ "message": { "content": "..." } }] }
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      const content = data.choices[0]?.message?.content;
      if (content) {
        return content.trim();
      }
    }
    
    // Fallback: check for direct content field
    if (data.content) {
      return data.content.trim();
    }
    
    // Log unexpected format for debugging
    console.error("[AI] Unexpected Hugging Face response format:", JSON.stringify(data, null, 2));
    throw new Error("Unexpected response format from Hugging Face Chat Completions API");
  } catch (error) {
    console.error("[AI] Error calling Hugging Face:", error);
    // Preserve original error message
    if (error instanceof Error) {
      throw error;
    }
    // If it's not an Error object, wrap it
    throw new Error(`Hugging Face API error: ${error?.message || String(error) || "Unknown error"}`);
  }
}


/**
 * Unified AI call function - uses Hugging Face API
 */
export async function callAI(messages, options = {}) {
  if (!isAIEnabled()) {
    throw new Error("AI is not enabled. Please set HUGGINGFACE_API_KEY in environment variables.");
  }

  const provider = getAIProvider();
  
  if (provider === "huggingface") {
    return await callHuggingFace(messages, options);
  }
  
  throw new Error("No AI provider available. Please set HUGGINGFACE_API_KEY in environment variables.");
}

/**
 * Parse natural language task description into structured data
 * Example: "Create login page with email and password fields, high priority, due tomorrow"
 */
export async function parseTaskFromNaturalLanguage(input, context = {}) {
  if (!isAIEnabled()) {
    return null;
  }

  const systemPrompt = `You are a task management assistant. Parse the user's natural language input into structured task data.

Return ONLY a valid JSON object with these fields:
{
  "title": "string (required, concise task title)",
  "description": "string (optional, detailed description)",
  "priority": "low" | "medium" | "high" | "urgent" (default: "medium"),
  "dueDate": "YYYY-MM-DD" | null (extract dates like "tomorrow", "next week", "in 3 days"),
  "labels": ["string"] (extract relevant tags/categories),
  "estimatedHours": number | null (if mentioned)
}

Context:
- Available lists: ${context.availableLists?.map(l => l.title).join(", ") || "none"}
- Board: ${context.boardTitle || "unknown"}

Examples:
Input: "Fix bug in login page, urgent, due tomorrow"
Output: {"title": "Fix bug in login page", "priority": "urgent", "dueDate": "2024-12-19", "labels": ["bug"]}

Input: "Create user dashboard with charts and stats"
Output: {"title": "Create user dashboard", "description": "Include charts and statistics", "priority": "medium", "labels": ["feature", "dashboard"]}

Now parse this input:`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: input },
      ],
      { temperature: 0.3, max_tokens: 500 }
    );

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Invalid response format");
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and clean
    if (!parsed.title) {
      parsed.title = input.substring(0, 100); // Fallback to input
    }

    // Convert date strings to proper format
    if (parsed.dueDate) {
      const date = new Date(parsed.dueDate);
      if (isNaN(date.getTime())) {
        parsed.dueDate = null;
      } else {
        parsed.dueDate = date.toISOString().split("T")[0];
      }
    }

    return parsed;
  } catch (error) {
    console.error("[AI] Error parsing task:", error);
    // Fallback: return basic structure
    return {
      title: input.substring(0, 100),
      description: input.length > 100 ? input.substring(100) : "",
      priority: "medium",
      dueDate: null,
      labels: [],
    };
  }
}

/**
 * Suggest best assignee for a task based on workload and history
 */
export async function suggestTaskAssignee(task, boardMembers, recentTasks = []) {
  if (!isAIEnabled() || !boardMembers?.length) {
    return null;
  }

  const systemPrompt = `You are a task assignment assistant. Analyze the task and team members to suggest the best assignee.

Task: ${task.title}
Description: ${task.description || "none"}
Priority: ${task.priority}
Due Date: ${task.dueDate || "none"}

Team Members:
${boardMembers.map((m, i) => `${i + 1}. ${m.name || m.email} (ID: ${m._id || m.id})`).join("\n")}

Recent Task Assignments (for context):
${recentTasks.slice(0, 10).map(t => `- ${t.title} → ${t.assigneeName || "unassigned"}`).join("\n") || "none"}

Return ONLY a JSON object:
{
  "suggestedAssigneeId": "string (member ID)",
  "reason": "string (brief explanation)"
}

If you cannot determine a good match, return null for suggestedAssigneeId.`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Suggest the best assignee for this task." },
      ],
      { temperature: 0.5, max_tokens: 300 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate the suggested ID exists in board members
    const isValid = boardMembers.some(
      m => (m._id || m.id)?.toString() === parsed.suggestedAssigneeId
    );

    if (!isValid) return null;

    return parsed;
  } catch (error) {
    console.error("[AI] Error suggesting assignee:", error);
    return null;
  }
}

/**
 * Auto-categorize task: suggest labels, priority, and list placement
 */
export async function autoCategorizeTask(task, availableLists = [], existingLabels = []) {
  if (!isAIEnabled()) {
    return null;
  }

  const systemPrompt = `You are a task categorization assistant. Analyze the task and suggest:
1. Appropriate labels/tags
2. Priority level
3. Best list/column placement

Task: ${task.title}
Description: ${task.description || "none"}

Available Lists: ${availableLists.map(l => l.title).join(", ") || "none"}
Existing Labels: ${existingLabels.map(l => l.name).join(", ") || "none"}

Return ONLY a JSON object:
{
  "suggestedPriority": "low" | "medium" | "high" | "urgent",
  "suggestedLabels": ["string"] (2-5 relevant labels),
  "suggestedListTitle": "string" (best matching list title or null),
  "reasoning": "string (brief explanation)"
}`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Categorize this task." },
      ],
      { temperature: 0.6, max_tokens: 400 }
    );

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error("[AI] Error auto-categorizing:", error);
    return null;
  }
}

/**
 * Generate smart summary of board activity
 */
export async function generateBoardSummary(activities, tasks, timeRange = "week") {
  if (!isAIEnabled()) {
    return null;
  }

  const systemPrompt = `You are a project management assistant. Generate a concise, actionable summary of board activity.

Activities (last ${timeRange}):
${activities.slice(0, 50).map(a => `- ${a.description} (${a.createdAt})`).join("\n") || "none"}

Tasks Status:
- Total: ${tasks.total || 0}
- Completed: ${tasks.completed || 0}
- In Progress: ${tasks.inProgress || 0}
- Overdue: ${tasks.overdue || 0}

Generate a summary (2-3 paragraphs) highlighting:
1. Key accomplishments
2. Current focus areas
3. Potential blockers or risks
4. Recommendations

Return ONLY the summary text, no JSON.`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate the summary." },
      ],
      { temperature: 0.7, max_tokens: 500 }
    );

    return response.trim();
  } catch (error) {
    console.error("[AI] Error generating summary:", error);
    return null;
  }
}

/**
 * Enhance task description with AI
 */
export async function enhanceTaskDescription(basicDescription) {
  if (!isAIEnabled() || !basicDescription) {
    return basicDescription;
  }

  const systemPrompt = `You are a technical writing assistant. Enhance the task description to be more detailed, clear, and actionable.

Keep the same meaning but add:
- Clear acceptance criteria
- Technical details if mentioned
- Better structure

Return ONLY the enhanced description, no JSON or extra text.`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: basicDescription },
      ],
      { temperature: 0.5, max_tokens: 300 }
    );

    return response.trim();
  } catch (error) {
    console.error("[AI] Error enhancing description:", error);
    return basicDescription; // Return original on error
  }
}

/**
 * Semantic search - find tasks by meaning, not just keywords
 */
export async function semanticSearch(query, tasks, limit = 10) {
  if (!isAIEnabled()) {
    return tasks; // Fallback to regular search
  }

  const systemPrompt = `You are a search assistant. Find tasks that match the user's intent, not just keywords.

User Query: "${query}"

Tasks:
${tasks.map((t, i) => `${i + 1}. Title: "${t.title}" | Description: "${t.description || "none"}" | ID: ${t._id || t.id}`).join("\n")}

Return ONLY a JSON array of task IDs (as strings) that match the query, ordered by relevance:
["id1", "id2", "id3", ...]

If no tasks match, return an empty array [].`;

  try {
    const response = await callAI(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Find matching tasks." },
      ],
      { temperature: 0.3, max_tokens: 200 }
    );

    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];

    const taskIds = JSON.parse(jsonMatch[0]);
    return tasks.filter(t => taskIds.includes((t._id || t.id)?.toString()));
  } catch (error) {
    console.error("[AI] Error in semantic search:", error);
    return tasks; // Fallback to all tasks
  }
}

