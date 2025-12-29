"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Sparkles, Loader2, Bot, User, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export default function AIChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I'm your AI assistant. I can help you with:\n\n• Creating tasks from natural language\n• Suggesting task assignments\n• Enhancing task descriptions\n• Answering questions about your projects\n• Providing productivity tips\n\nHow can I help you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when page loads
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle errors gracefully without throwing to prevent Next.js error overlay
        let errorContent = "I'm sorry, I encountered an error.";
        let toastMessage = data.message || "Failed to get AI response";
        
        // Check if it's a quota error (429 status or isQuotaError flag)
        if (response.status === 429 || data.isQuotaError) {
          const retryAfter = data.retryAfter;
          const retryTime = retryAfter ? ` Please try again in ${Math.ceil(retryAfter)} seconds.` : "";
          
          errorContent = `I'm sorry, but the Gemini API quota has been exceeded. This usually happens when you've used up your free tier limit.${retryTime}\n\nTo continue using AI features, you can:\n1. Wait for the quota to reset (usually 24 hours)\n2. Upgrade your Gemini API plan at https://ai.google.dev/pricing\n3. Check your usage at https://ai.dev/usage`;
          
          toastMessage = `API Quota Exceeded${retryTime}`;
        } else if (data.error?.includes("HUGGINGFACE_API_KEY") || data.message?.includes("not enabled")) {
          errorContent = "I'm sorry, I encountered an error. Please make sure HUGGINGFACE_API_KEY is set in your .env.local file and restart your development server.";
          toastMessage = "AI is not enabled. Please check your API key configuration.";
        } else if (data.error?.includes("DNS resolution failed") || data.error?.includes("ENOTFOUND")) {
          errorContent = data.error + "\n\nSee FIX_DNS_WINDOWS.md for detailed instructions to fix Windows DNS issues.";
          toastMessage = "DNS Resolution Failed";
        } else if (data.error) {
          errorContent = `I'm sorry, I encountered an error: ${data.error}`;
          toastMessage = data.message || "Failed to get AI response";
        }
        
        toast.error(toastMessage);
        
        // Add error message to chat
        const errorMessage = {
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
          error: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      const assistantMessage = {
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("[AI Chat] Error:", error);
      
      // Handle network errors or other unexpected errors
      let errorContent = "I'm sorry, I encountered an error. Please check your connection and try again.";
      let toastMessage = "Failed to get AI response";
      
      // Check for specific error types
      if (error.message?.includes("fetch failed") || error.message?.includes("Failed to fetch") || error.name === "TypeError") {
        errorContent = "I'm sorry, I couldn't connect to the server. This could be due to:\n\n• Network connectivity issues\n• Server timeout (if deployed, check your hosting platform's timeout limits)\n• API configuration issues\n\nPlease check:\n1. Your internet connection\n2. That API keys are set in your production environment variables\n3. Your hosting platform's timeout settings (Vercel: 10s Hobby, 60s Pro)\n\nTry again in a moment.";
        toastMessage = "Connection Error - Check Configuration";
      } else if (error.message?.includes("timeout") || error.message?.includes("AbortError")) {
        errorContent = "I'm sorry, the request timed out. The AI service took too long to respond. This might happen if:\n\n• The AI service is slow or overloaded\n• Your hosting platform has a short timeout limit\n\nPlease try again, or consider using a faster AI model.";
        toastMessage = "Request Timeout";
      } else if (error.message?.includes("network") || error.message?.includes("ECONNREFUSED")) {
        errorContent = "I'm sorry, I couldn't connect to the AI service. Please check:\n\n• Your internet connection\n• That the AI API service is accessible\n• Your API key configuration";
        toastMessage = "Network Error";
      } else if (error.message) {
        errorContent = `I'm sorry, I encountered an error: ${error.message}\n\nIf this persists, please check:\n• Your API keys are correctly set\n• Your hosting platform allows external API calls\n• The AI service is operational`;
      }
      
      toast.error(toastMessage);
      
      // Add error message to chat
      const errorMessage = {
        role: "assistant",
        content: errorContent,
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Hello! I'm your AI assistant. How can I help you today?",
        timestamp: new Date(),
      },
    ]);
    toast.success("Chat cleared");
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] bg-background">
      {/* Header */}
      <div className="sticky top-16 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between pb-4 ">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">AI Assistant</h1>
                <p className="text-sm text-muted-foreground">Powered by Gemini</p>
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearChat}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Clear Chat</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "flex gap-3 max-w-4xl mx-auto",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-xl p-4 shadow-sm",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : message.error
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-muted text-foreground"
                )}
              >
                <div className="text-sm whitespace-pre-wrap wrap-break-word leading-relaxed">
                  {message.content}
                </div>
                <div className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              {message.role === "user" && (
                <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3 justify-start max-w-4xl mx-auto">
            <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="bg-muted rounded-xl p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-0 border-t border-border bg-background/80 backdrop-blur-xl pt-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              disabled={loading}
              className="flex-1 h-12 text-base"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="lg"
              className="h-12 px-6"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Send className="h-5 w-5 mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
}

