"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useAuth } from "@/context/AuthContext";
import { MessageSquare, Users, Plus, Search, Video, Phone, Pin, X } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { toast } from "sonner";
import { pusherClient } from "@/lib/pusher";
import IncomingCallModal from "@/components/meetings/IncomingCallModal";
import { useRouter } from "next/navigation";
import { debounce } from "@/lib/performance";
import { ChatSkeleton } from "@/components/ui/LoadingSkeleton";

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchingMembers, setSearchingMembers] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [showParticipants, setShowParticipants] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef({});
  const presenceIntervalRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    if (user?.id) {
      fetchConversations();
      updatePresence("online");
      
      // Update presence every 30 seconds
      presenceIntervalRef.current = setInterval(() => {
        updatePresence("online");
      }, 30000);

      // Listen for new messages across all conversations
      if (pusherClient) {
        const userChannel = pusherClient.subscribe(`user-${user.id}`);
        
        userChannel.bind("message:new", (data) => {
          if (data.message && data.conversationId) {
            // Update conversations list to refresh unread counts
            fetchConversations();
            
            // If this is the current conversation, add the message
            if (selectedConversation?._id === data.conversationId) {
              setMessages((prev) => [...prev, data.message]);
            }
          }
        });

        // Listen for meeting invitations
        userChannel.bind("meeting:invited", (data) => {
          if (data.meeting) {
            // Ensure host is populated (should be from API, but handle if not)
            const caller = data.meeting.host || { name: "Unknown", avatar: null };
            setIncomingCall({
              type: "meeting",
              meetingId: data.meeting.meetingId,
              meetingTitle: data.meeting.title || "Meeting Invitation",
              caller: typeof caller === 'object' && caller.name ? caller : { name: "Unknown", avatar: null },
              meeting: data.meeting,
            });
          }
        });
        
        return () => {
          if (presenceIntervalRef.current) {
            clearInterval(presenceIntervalRef.current);
          }
          try {
            pusherClient.unsubscribe(`user-${user.id}`);
          } catch (error) {
            // Ignore
          }
          updatePresence("offline");
        };
      } else {
        return () => {
          if (presenceIntervalRef.current) {
            clearInterval(presenceIntervalRef.current);
          }
          updatePresence("offline");
        };
      }
    }
  }, [user?.id, selectedConversation?._id]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation._id);
      fetchPinnedMessages(selectedConversation._id);
      setupPusherListeners(selectedConversation._id);
    }

    return () => {
      // Cleanup Pusher listeners
      if (selectedConversation && pusherClient) {
        try {
          pusherClient.unsubscribe(`conversation-${selectedConversation._id}`);
        } catch (error) {
          // Ignore unsubscribe errors
        }
      }
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) {
        setConversations(data.conversations || []);
      }
    } catch (error) {
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const res = await fetch(`/api/messages/${conversationId}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
        // Mark messages as seen when they are loaded
        if (user?.id && conversationId) {
          try {
            await fetch(`/api/messages/${conversationId}/seen`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: user.id }),
            });
            // Refresh conversations to update unread counts
            fetchConversations();
          } catch (error) {
            // Silently fail
          }
        }
      }
    } catch (error) {
      toast.error("Failed to load messages");
    }
  };

  const fetchPinnedMessages = async (conversationId) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      const data = await res.json();
      if (res.ok && data.conversation?.pinnedMessages) {
        const pinned = Array.isArray(data.conversation.pinnedMessages) 
          ? data.conversation.pinnedMessages 
          : [];
        setPinnedMessages(pinned);
      } else {
        setPinnedMessages([]);
      }
    } catch (error) {
      setPinnedMessages([]);
    }
  };

  const updatePresence = async (status) => {
    if (!user?.id) return;
    try {
      await fetch(`/api/users/${user.id}/presence`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      // Silently fail
    }
  };

  const setupPusherListeners = (conversationId) => {
    if (!pusherClient || !conversationId) return;

    try {
      const channel = pusherClient.subscribe(`conversation-${conversationId}`);

      // Listen for new messages
      channel.bind("message:sent", (data) => {
        if (data.message) {
          setMessages((prev) => [...prev, data.message]);
          fetchConversations(); // Update conversation list
        }
      });

      // Listen for typing indicators
      channel.bind("user:typing", (data) => {
        if (data.userId !== user.id) {
          setTypingUsers((prev) => ({
            ...prev,
            [data.userId]: data.isTyping,
          }));

          // Clear typing indicator after 3 seconds
          if (typingTimeoutRef.current[data.userId]) {
            clearTimeout(typingTimeoutRef.current[data.userId]);
          }
          typingTimeoutRef.current[data.userId] = setTimeout(() => {
            setTypingUsers((prev) => {
              const updated = { ...prev };
              delete updated[data.userId];
              return updated;
            });
          }, 3000);
        }
      });

      // Listen for pinned messages
      channel.bind("message:pinned", (data) => {
        fetchPinnedMessages(conversationId);
      });
    } catch (error) {
      console.error("Pusher subscription error:", error);
    }
  };

  // Debounced search functions for better performance
  const handleSearchDebounced = useMemo(
    () =>
      debounce(async (query) => {
        if (!query || query.trim().length < 2) {
          setMessageSearchResults([]);
          return;
        }

        try {
          const res = await fetch(
            `/api/messages/search?q=${encodeURIComponent(query.trim())}&conversationId=${selectedConversation?._id || ""}&userId=${user?.id}`
          );
          const data = await res.json();
          if (res.ok) {
            setMessageSearchResults(data.messages || []);
          } else {
            setMessageSearchResults([]);
            if (data.error) {
              toast.error(data.error);
            }
          }
        } catch (error) {
          console.error("Search error:", error);
          setMessageSearchResults([]);
          toast.error("Failed to search messages");
        }
      }, 300),
    [selectedConversation?._id, user?.id]
  );

  const handleSearch = useCallback((query) => {
    handleSearchDebounced(query);
  }, [handleSearchDebounced]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const searchMembersDebounced = useMemo(
    () =>
      debounce(async (query) => {
        if (!query.trim()) {
          setSearchResults([]);
          return;
        }

        setSearchingMembers(true);
        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&userId=${user?.id}`);
          const data = await res.json();
          if (res.ok) {
            setSearchResults(data.users || []);
          }
        } catch (error) {
          toast.error("Failed to search members");
        } finally {
          setSearchingMembers(false);
        }
      }, 300),
    [user?.id]
  );

  const searchMembers = useCallback((query) => {
    searchMembersDebounced(query);
  }, [searchMembersDebounced]);

  const searchUsersForDirectChatDebounced = useMemo(
    () =>
      debounce(async (query) => {
        if (!query.trim() || query.trim().length < 2) {
          setUserSearchResults([]);
          return;
        }

        try {
          const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&userId=${user?.id}`);
          const data = await res.json();
          if (res.ok) {
            setUserSearchResults(data.users || []);
          }
        } catch (error) {
          // Silently fail for user search
          setUserSearchResults([]);
        }
      }, 300),
    [user?.id]
  );

  const searchUsersForDirectChat = useCallback((query) => {
    searchUsersForDirectChatDebounced(query);
  }, [searchUsersForDirectChatDebounced]);

  const createDirectChat = async (otherUser) => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "direct",
          participants: [user.id, otherUser.id || otherUser._id],
          createdBy: user.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSearchQuery("");
        setUserSearchResults([]);
        fetchConversations();
        setSelectedConversation(data.conversation);
      } else {
        toast.error(data.message || "Failed to create conversation");
      }
    } catch (error) {
      toast.error("Failed to create conversation");
    }
  };

  const toggleMemberSelection = (member) => {
    const memberId = member.id || member._id;
    if (selectedMembers.some((m) => (m.id || m._id) === memberId)) {
      setSelectedMembers(selectedMembers.filter((m) => (m.id || m._id) !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, member]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "group",
          name: groupName,
          description: groupDescription,
          participants: [user.id, ...selectedMembers.map((m) => m.id || m._id)],
          createdBy: user.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateGroup(false);
        setGroupName("");
        setGroupDescription("");
        setSelectedMembers([]);
        setMemberSearchQuery("");
        setSearchResults([]);
        fetchConversations();
        setSelectedConversation(data.conversation);
        toast.success("Group created successfully");
      } else {
        toast.error(data.message || "Failed to create group");
      }
    } catch (error) {
      toast.error("Failed to create group");
    }
  };

  const filteredConversations = conversations.filter((conv) => {
    if (conv.type === "group") {
      return conv.name?.toLowerCase().includes(searchQuery.toLowerCase());
    } else {
      const otherParticipant = conv.participants?.find(
        (p) => p._id !== user.id
      );
      return (
        otherParticipant?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        otherParticipant?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
  });

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Conversations List - Hidden on mobile when conversation is selected */}
      <div className={`w-full md:w-80 border-r border-border bg-card p-4 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Messages</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowCreateGroup(true)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations or users..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              // If searching for users (not in existing conversations), search users
              if (e.target.value.trim().length >= 2) {
                searchUsersForDirectChat(e.target.value.trim());
              } else {
                setUserSearchResults([]);
              }
            }}
            className="pl-10"
          />
        </div>
        
        {/* User Search Results for Direct Chat */}
        {userSearchResults.length > 0 && searchQuery.trim().length >= 2 && (
          <div className="mb-4 border rounded-lg max-h-48 overflow-y-auto">
            <div className="p-2 text-xs font-semibold text-muted-foreground border-b">
              Start new conversation
            </div>
            {userSearchResults.map((userResult) => {
              const existingConv = conversations.find((conv) => 
                conv.type === "direct" && 
                conv.participants?.some((p) => (p._id || p) === userResult.id)
              );
              
              return (
                <div
                  key={userResult?.id || `user-${userResult?._id || Math.random()}`}
                  onClick={() => {
                    if (existingConv) {
                      setSelectedConversation(existingConv);
                      setSearchQuery("");
                      setUserSearchResults([]);
                    } else {
                      createDirectChat(userResult);
                    }
                  }}
                  className="p-3 cursor-pointer hover:bg-muted transition-colors flex items-center gap-3"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {userResult.avatar ? (
                      <img
                        src={userResult.avatar}
                        alt={userResult.name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {userResult.name?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{userResult.name}</div>
                    <div className="text-sm text-muted-foreground">{userResult.email}</div>
                  </div>
                  {existingConv && (
                    <span className="text-xs text-muted-foreground">Existing</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const otherParticipant = conv.participants?.find((p) => p?._id !== user?.id);
              const isOnline = onlineUsers[otherParticipant?._id] || false;
              
              return (
                <div
                  key={conv._id}
                  onClick={() => setSelectedConversation(conv)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?._id === conv._id
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {conv.type === "group" ? (
                          <Users className="h-5 w-5 text-primary" />
                        ) : (
                          <MessageSquare className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      {!conv.type && isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-background"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate flex items-center gap-2">
                        {conv?.type === "group"
                          ? conv?.name || "Unnamed Group"
                          : otherParticipant?.name || "Unknown"}
                        {conv?.type === "group" && (
                          <span className="text-xs text-muted-foreground">
                            ({conv?.participants?.length || 0})
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {conv.lastMessage?.text 
                          ? conv.lastMessage.text
                          : conv.lastMessage?.attachments && conv.lastMessage.attachments.length > 0
                          ? `📎 ${conv.lastMessage.attachments[0]?.name || "File"}`
                          : "No messages yet"}
                      </div>
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Chat Area - Full width on mobile when conversation is selected */}
      <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <ChatSkeleton />
          </div>
        ) : selectedConversation ? (
          <>
            {/* Back button for mobile */}
            <div className="md:hidden p-3 border-b border-border bg-card flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedConversation(null)}
              >
                <X className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h3 className="font-semibold truncate">
                  {selectedConversation?.type === "group"
                    ? selectedConversation?.name || "Unnamed Group"
                    : selectedConversation?.participants?.find((p) => (p?._id || p) !== user?.id)?.name || "Unknown"}
                </h3>
              </div>
            </div>
            <ChatWindow
              conversation={selectedConversation}
              messages={messages}
              currentUser={user}
              onMessageSent={() => fetchMessages(selectedConversation._id)}
              messagesEndRef={messagesEndRef}
              typingUsers={typingUsers}
              pinnedMessages={pinnedMessages}
              onPinMessage={async (messageId, action) => {
                try {
                  const res = await fetch(`/api/conversations/${selectedConversation._id}/pin`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      messageId,
                      userId: user.id,
                      action,
                    }),
                  });
                  if (res.ok) {
                    fetchPinnedMessages(selectedConversation._id);
                  }
                } catch (error) {
                  toast.error("Failed to pin message");
                }
              }}
              onSearch={handleSearch}
              searchResults={messageSearchResults}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border">
              <h2 className="text-2xl font-bold">Create New Group</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create a group chat and add team members
              </p>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Group Name *</label>
                <Input
                  placeholder="Enter group name..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description (Optional)</label>
                <textarea
                  placeholder="Enter group description..."
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Add Members</label>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search team members..."
                    value={memberSearchQuery}
                    onChange={(e) => {
                      setMemberSearchQuery(e.target.value);
                      searchMembers(e.target.value);
                    }}
                    className="pl-10"
                  />
                </div>
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id || member._id}
                        className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm"
                      >
                        <span>{member.name || member.email}</span>
                        <button
                          onClick={() => toggleMemberSelection(member)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {searchingMembers ? (
                    <div className="p-4 text-center text-muted-foreground">Searching...</div>
                  ) : searchResults.length === 0 && memberSearchQuery ? (
                    <div className="p-4 text-center text-muted-foreground">No members found</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Start typing to search for members
                    </div>
                  ) : (
                    <div className="divide-y">
                      {searchResults.map((member) => {
                        const memberId = member.id || member._id;
                        const isSelected = selectedMembers.some((m) => (m.id || m._id) === memberId);
                        return (
                          <div
                            key={memberId}
                            onClick={() => toggleMemberSelection(member)}
                            className={`p-3 cursor-pointer hover:bg-muted transition-colors ${
                              isSelected ? "bg-primary/10" : ""
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {member.avatar ? (
                                  <img
                                    src={member.avatar}
                                    alt={member.name}
                                    className="h-10 w-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-medium">
                                    {member.name?.[0]?.toUpperCase() || "U"}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium">{member.name}</div>
                                <div className="text-sm text-muted-foreground">{member.email}</div>
                              </div>
                              {isSelected && (
                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <X className="h-3 w-3 text-primary-foreground" />
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-border flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateGroup(false);
                  setGroupName("");
                  setGroupDescription("");
                  setSelectedMembers([]);
                  setMemberSearchQuery("");
                  setSearchResults([]);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleCreateGroup}>Create Group</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCallModal
          call={incomingCall}
          onAccept={() => {
            setIncomingCall(null);
            router.push(`/meetings/${incomingCall.meetingId}`);
          }}
          onReject={async () => {
            setIncomingCall(null);
            // Optionally notify the caller that call was rejected
          }}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}

// Chat Window Component - Memoized for performance
const ChatWindow = memo(function ChatWindow({
  conversation,
  messages,
  currentUser,
  onMessageSent,
  messagesEndRef,
  typingUsers,
  pinnedMessages,
  onPinMessage,
  onSearch,
  searchResults,
  showSearch,
  setShowSearch,
}) {
  const [showParticipants, setShowParticipants] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const typingTimeoutRef = useRef(null);

  const handleTyping = async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing indicator
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation?._id,
          userId: currentUser?.id,
          isTyping: true,
        }),
      });
    } catch (error) {
      // Silently fail
    }

    // Stop typing indicator after 1 second of no typing
    typingTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch("/api/chat/typing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversationId: conversation?._id,
            userId: currentUser?.id,
            isTyping: false,
          }),
        });
      } catch (error) {
        // Silently fail
      }
    }, 1000);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    // Stop typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    try {
      await fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation._id,
          userId: currentUser.id,
          isTyping: false,
        }),
      });
    } catch (error) {
      // Silently fail
    }

    setSending(true);
    try {
      const res = await fetch(`/api/messages/${conversation?._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: messageText,
          sender: currentUser?.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessageText("");
        onMessageSent();
        // Mark as seen
        try {
          await fetch(`/api/messages/${conversation?._id}/seen`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser?.id }),
          });
        } catch (error) {
          // Silently fail
        }
      } else {
        toast.error(data.error || "Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      if (uploadRes.ok) {
        // Send message with attachment
        const res = await fetch(`/api/messages/${conversation?._id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "",
            sender: currentUser?.id,
            attachments: [uploadData?.file],
          }),
        });

        if (res.ok) {
          onMessageSent();
        }
      } else {
        toast.error("Failed to upload file");
      }
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const startMeeting = async () => {
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: conversation?.type === "group" ? conversation?.name : "Direct Meeting",
          host: currentUser?.id,
          participants: conversation?.participants
            ?.filter((p) => (p?._id || p) !== currentUser?.id)
            ?.map((p) => p?._id || p) || [],
          conversationId: conversation?._id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect to meeting page
        window.location.href = `/meetings/${data.meeting.meetingId}`;
      } else {
        toast.error("Failed to start meeting");
      }
    } catch (error) {
      toast.error("Failed to start meeting");
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            {conversation?.type === "group" ? (
              <Users className="h-5 w-5 text-primary" />
            ) : (
              <MessageSquare className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <div className="font-semibold">
              {conversation?.type === "group"
                ? conversation?.name || "Unnamed Group"
                : conversation?.participants?.find((p) => p?._id !== currentUser?.id)
                    ?.name || "Unknown"}
            </div>
            {conversation?.type === "group" && (
              <div className="text-sm text-muted-foreground">
                {conversation?.participants?.length || 0} members
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {conversation?.type === "group" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowParticipants(!showParticipants)}
              title="View participants"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const newState = !showSearch;
              setShowSearch(newState);
              if (!newState) {
                // Clear search when closing
                setMessageSearchResults([]);
              }
            }}
            title="Search messages"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={startMeeting}>
            <Video className="h-4 w-4 mr-2" />
            Start Meeting
          </Button>
        </div>
      </div>

      {/* Participants List for Group */}
      {showParticipants && conversation?.type === "group" && (
        <div className="border-b border-border p-4 bg-muted/30">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold">Participants</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowParticipants(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {conversation.participants?.map((participant) => {
              const participantId = typeof participant === 'object' ? participant._id : participant;
              const participantName = typeof participant === 'object' ? participant.name : "Unknown";
              const participantAvatar = typeof participant === 'object' ? participant.avatar : null;
              const isCurrentUser = participantId && participantId.toString() === currentUser.id?.toString();
              
              return (
                <div
                  key={participantId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    {participantAvatar ? (
                      <img
                        src={participantAvatar}
                        alt={participantName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {participantName?.[0]?.toUpperCase() || "U"}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">
                      {participantName}
                      {isCurrentUser && " (You)"}
                    </div>
                    {typeof participant === 'object' && participant.email && (
                      <div className="text-sm text-muted-foreground">{participant.email}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Results */}
      {showSearch && (
        <div className="border-b border-border p-4 bg-muted/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                onSearch(e.target.value);
              }}
              className="pl-10"
            />
          </div>
          {messageSearchResults.length > 0 && (
            <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
              {messageSearchResults.map((msg, idx) => (
                <div
                  key={msg._id || `search-msg-${idx}`}
                  className="p-2 hover:bg-muted rounded text-sm cursor-pointer"
                  onClick={() => {
                    // Scroll to message
                    const element = document.getElementById(`message-${msg._id || idx}`);
                    if (element) {
                      element.scrollIntoView({ behavior: "smooth", block: "center" });
                      // Highlight the message briefly
                      element.classList.add("bg-yellow-500/20");
                      setTimeout(() => {
                        element.classList.remove("bg-yellow-500/20");
                      }, 2000);
                    }
                    setShowSearch(false);
                    setSearchQuery("");
                  }}
                >
                  <div className="font-semibold">{msg.sender?.name || "Unknown"}</div>
                  <div className="text-muted-foreground truncate">{msg.text || "No text"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pinned Messages */}
      {pinnedMessages.length > 0 && (
        <div className="border-b border-border p-2 bg-muted/30">
          <div className="flex items-center gap-2 text-sm">
            <Pin className="h-4 w-4" />
            <span className="font-semibold">Pinned Messages</span>
          </div>
          <div className="mt-1 space-y-1">
            {pinnedMessages?.slice(0, 2).map((msg) => (
              <div key={msg?._id || Math.random()} className="text-xs text-muted-foreground truncate">
                {msg?.text || "Pinned message"}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages?.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          </div>
        ) : (
          messages?.map((message, index) => {
          const isPinned = pinnedMessages?.some((pm) => 
            (typeof pm === 'object' ? pm?._id : pm) === message?._id
          );
          // Use combination of _id and index to ensure unique keys
          const uniqueKey = message?._id ? `${message._id}-${index}` : `msg-${index}-${Date.now()}`;
          return (
            <div
              key={uniqueKey}
              id={`message-${message?._id || index}`}
              className={`flex gap-3 ${
                message?.sender?._id === currentUser?.id ? "justify-end" : "justify-start"
              }`}
            >
            {message.sender?._id !== currentUser.id && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                {message.sender?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div
              className={`max-w-[70%] rounded-lg p-3 relative group ${
                message.sender?._id === currentUser.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}
            >
              {isPinned && (
                <Pin className="absolute top-1 right-1 h-3 w-3 opacity-50" />
              )}
              {message?.sender?._id !== currentUser?.id && (
                <div className="text-xs font-semibold mb-1">
                  {message?.sender?.name || "Unknown"}
                </div>
              )}
              {message?.text && <div>{message.text}</div>}
              {message?.sender?._id === currentUser?.id && onPinMessage && (
                <div className="absolute -left-8 top-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => onPinMessage(message?._id, isPinned ? "unpin" : "pin")}
                  >
                    <Pin className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {message?.attachments?.map((att, idx) => (
                <div key={idx} className="mt-2">
                  {att?.fileType === "image" ? (
                    <img
                      src={att?.url}
                      alt={att?.filename || "Attachment"}
                      className="max-w-full rounded max-h-64 object-contain"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <a
                      href={att?.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm underline"
                    >
                      {att?.filename || "File"}
                    </a>
                  )}
                </div>
              ))}
              <div className="text-xs opacity-70 mt-1">
                {message?.createdAt ? new Date(message.createdAt).toLocaleTimeString() : ""}
              </div>
            </div>
            {message?.sender?._id === currentUser?.id && (
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs">
                {message?.sender?.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
          </div>
          );
          })
        )}
        <div ref={messagesEndRef} />
        
        {/* Typing Indicators */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex gap-3 justify-start">
            <div className="bg-muted rounded-lg p-3 text-sm text-muted-foreground italic">
              {Object.keys(typingUsers).map((userId, idx) => {
                const user = conversation.participants?.find((p) => p._id === userId);
                return (
                  <span key={userId}>
                    {user?.name || "Someone"}
                    {idx < Object.keys(typingUsers).length - 1 && ", "}
                  </span>
                );
              })}{" "}
              {Object.keys(typingUsers).length === 1 ? "is" : "are"} typing...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="file"
            id={`file-upload-${conversation?._id || 'default'}`}
            className="hidden"
            onChange={handleFileUpload}
            disabled={uploading}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
            multiple={false}
          />
          <label 
            htmlFor={`file-upload-${conversation?._id || 'default'}`}
            className="cursor-pointer"
          >
            <Button 
              type="button" 
              size="sm" 
              variant="outline" 
              disabled={uploading}
              onClick={(e) => {
                e.preventDefault();
                const input = document.getElementById(`file-upload-${conversation?._id || 'default'}`);
                if (input) input.click();
              }}
            >
              {uploading ? "Uploading..." : "📎"}
            </Button>
          </label>
          <Input
            value={messageText}
            onChange={(e) => {
              setMessageText(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className="flex-1"
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !messageText.trim()}>
            Send
          </Button>
        </form>
      </div>
    </div>
  );
});

