"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Bot, Send, Loader2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

export default function AIChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [conversationId, setConversationId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      loadConversation();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversation = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingMessages(true);
      // Get or create AI conversation
      const convRes = await fetch(
        `/api/ai/conversation?userId=${user.id}`
      );
      const convData = await convRes.json();

      if (convRes.ok && convData.conversation) {
        setConversationId(convData.conversation._id);

        // Load messages
        const messagesRes = await fetch(
          `/api/messages/${convData.conversation._id}`
        );
        const messagesData = await messagesRes.json();

        if (messagesRes.ok) {
          setMessages(messagesData || []);
        }
      }
    } catch (error) {
      console.error("Failed to load conversation:", error);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || isLoading || !user?.id) return;

    const messageText = newMessage.trim();
    setNewMessage("");
    setIsLoading(true);

    try {
      // Optimistic update - add user message immediately
      const tempUserMessage = {
        _id: `temp-${Date.now()}`,
        text: messageText,
        sender: {
          _id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
        },
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, tempUserMessage]);

      // Call AI API
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversationId: conversationId || "ai-chat",
          message: messageText,
          userId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Replace temp message with real messages
        setMessages((prev) => {
          const filtered = prev.filter(
            (m) => m._id !== tempUserMessage._id
          );
          return [...filtered, data.userMessage, data.aiMessage];
        });

        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      } else {
        // Remove temp message on error
        setMessages((prev) =>
          prev.filter((m) => m._id !== tempUserMessage._id)
        );
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.filter((m) => !m._id?.startsWith("temp-"))
      );
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const isAIMessage = (message) => {
    return message.sender?.email === "ai@assistant.com";
  };

  if (isLoadingMessages) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-12rem)]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] w-full -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 -mb-6">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border/50">
        <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">AI Assistant</h1>
          <p className="text-xs text-muted-foreground">
            Ask me anything about your projects and tasks
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-0 sm:pr-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center mb-4">
              <Bot className="h-8 w-8 text-primary-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
            <p className="text-muted-foreground max-w-md">
              Ask me anything about your projects, tasks, or get help with
              project management.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isAI = isAIMessage(message);
            return (
              <div
                key={message._id}
                className={cn(
                  "flex gap-3",
                  isAI ? "justify-start" : "justify-end"
                )}
              >
                {isAI && (
                  <Avatar
                    name="AI Assistant"
                    size="default"
                    className="bg-primary"
                  />
                )}
                <div
                  className={cn(
                    "max-w-[75%] rounded-lg px-4 py-2.5",
                    isAI
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground ml-auto"
                  )}
                >
                  <p className="text-sm whitespace-pre-wrap wrap-break-words">
                    {message.text}
                  </p>
                  <p
                    className={cn(
                      "text-xs mt-1.5",
                      isAI ? "text-muted-foreground" : "text-primary-foreground/70"
                    )}
                  >
                    {formatDistanceToNow(new Date(message.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!isAI && (
                  <Avatar
                    name={message.sender?.name || user?.name}
                    src={message.sender?.avatar || user?.avatar}
                    size="default"
                  />
                )}
              </div>
            );
          })
        )}

        {/* AI Generating Skeleton */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <Avatar
              name="AI Assistant"
              size="default"
              className="bg-primary"
            />
            <div className="max-w-[75%] rounded-lg px-4 py-2.5 bg-muted">
              <div className="space-y-2">
                <div className="h-4 bg-background/50 rounded animate-pulse w-3/4"></div>
                <div className="h-4 bg-background/50 rounded animate-pulse w-1/2"></div>
                <div className="h-4 bg-background/50 rounded animate-pulse w-2/3"></div>
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" />
                AI is thinking...
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2 border-t border-border/50 pt-4 pb-2">
        <Input
          ref={inputRef}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask AI anything..."
          disabled={isLoading}
          className="flex-1"
        />
        <Button
          onClick={sendMessage}
          disabled={!newMessage.trim() || isLoading}
          className="shrink-0"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

