"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Video, Users, Plus, Search, Clock, User, Play } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { pusherClient } from "@/lib/pusher";

export default function MeetingsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchMeetings();
      
      // Set up real-time updates
      if (pusherClient) {
        const userChannel = pusherClient.subscribe(`user-${user.id}`);
        
        userChannel.bind("meeting:invited", () => {
          fetchMeetings();
        });
        
        userChannel.bind("meeting:updated", (data) => {
          // Refresh meetings when any meeting is updated
          fetchMeetings();
        });
        
        return () => {
          try {
            pusherClient.unsubscribe(`user-${user.id}`);
          } catch (error) {
            // Ignore
          }
        };
      }
    }
  }, [user?.id]);
  
  // Set up meeting-specific channels when meetings change
  useEffect(() => {
    if (!pusherClient || !user?.id || meetings.length === 0) return;
    
    const meetingIds = meetings.map((m) => m._id).filter(Boolean);
    const meetingChannels = new Set();
    
    meetingIds.forEach((meetingId) => {
      if (!meetingChannels.has(meetingId)) {
        const channel = pusherClient.subscribe(`meeting-${meetingId}`);
        channel.bind("meeting:updated", () => {
          fetchMeetings();
        });
        channel.bind("participant:joined", () => {
          fetchMeetings();
        });
        channel.bind("participant:left", () => {
          fetchMeetings();
        });
        meetingChannels.add(meetingId);
      }
    });
    
    return () => {
      meetingChannels.forEach((meetingId) => {
        try {
          pusherClient.unsubscribe(`meeting-${meetingId}`);
        } catch (error) {
          // Ignore
        }
      });
    };
  }, [meetings.length, user?.id]);

  const fetchMeetings = async () => {
    try {
      const res = await fetch(`/api/meetings?userId=${user.id}&status=active`);
      const data = await res.json();
      if (res.ok) {
        setMeetings(data.meetings || []);
      }
    } catch (error) {
      toast.error("Failed to load meetings");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeetingTitle.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newMeetingTitle,
          host: user.id,
          participants: [],
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setNewMeetingTitle("");
        router.push(`/meetings/${data.meeting.meetingId}`);
      } else {
        toast.error(data.message || "Failed to create meeting");
      }
    } catch (error) {
      toast.error("Failed to create meeting");
    }
  };

  const handleJoinMeeting = (meetingId) => {
    router.push(`/meetings/${meetingId}`);
  };

  const filteredMeetings = meetings.filter((meeting) =>
    meeting.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Meetings</h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Join active meetings or create a new one
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          New Meeting
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search meetings..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Meetings List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading meetings...</p>
        </div>
      ) : filteredMeetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Video className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">No active meetings found</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Meeting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMeetings.map((meeting) => (
            <MeetingCard
              key={meeting._id}
              meeting={meeting}
              currentUser={user}
              onJoin={handleJoinMeeting}
            />
          ))}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Meeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Meeting Title
                </label>
                <Input
                  placeholder="Enter meeting title..."
                  value={newMeetingTitle}
                  onChange={(e) => setNewMeetingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCreateMeeting();
                    }
                  }}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewMeetingTitle("");
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateMeeting}>Create</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

// Meeting Card Component
function MeetingCard({ meeting, currentUser, onJoin }) {
  const [participants, setParticipants] = useState(meeting.participants || []);

  useEffect(() => {
    if (!pusherClient || !meeting?._id) return;

    const channel = pusherClient.subscribe(`meeting-${meeting._id}`);

    channel.bind("meeting:updated", (data) => {
      if (data.meeting?.participants) {
        setParticipants(data.meeting.participants);
      }
    });

    channel.bind("participant:joined", () => {
      fetch(`/api/meetings/by-id/${meeting.meetingId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.meeting) {
            setParticipants(data.meeting.participants || []);
          }
        })
        .catch(() => {});
    });

    channel.bind("participant:left", () => {
      fetch(`/api/meetings/by-id/${meeting.meetingId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.meeting) {
            setParticipants(data.meeting.participants || []);
          }
        })
        .catch(() => {});
    });

    return () => {
      try {
        pusherClient.unsubscribe(`meeting-${meeting._id}`);
      } catch (error) {
        // Ignore
      }
    };
  }, [meeting?._id, meeting?.meetingId]);

  const joinedParticipants = participants.filter((p) => p.status === "joined");
  const isHost = meeting.host?._id === currentUser?.id || meeting.host === currentUser?.id;
  const isParticipant = participants.some((p) => {
    const participantId = typeof p.user === 'object' ? p.user?._id : p.user;
    return participantId && participantId.toString() === currentUser?.id?.toString() && p.status === "joined";
  });

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{meeting.title}</CardTitle>
            {meeting.description && (
              <p className="text-sm text-muted-foreground mt-1">
                {meeting.description}
              </p>
            )}
          </div>
          {isHost && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              Host
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Participants List */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              Participants ({joinedParticipants.length})
            </span>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {joinedParticipants.length === 0 ? (
              <p className="text-sm text-muted-foreground">No participants yet</p>
            ) : (
              joinedParticipants.map((participant, idx) => {
                const participantId = typeof participant.user === 'object' ? participant.user?._id : participant.user;
                const participantName = typeof participant.user === 'object' ? participant.user?.name : "Unknown";
                const participantAvatar = typeof participant.user === 'object' ? participant.user?.avatar : null;
                const isCurrentUser = participantId && participantId.toString() === currentUser?.id?.toString();
                
                return (
                  <div
                    key={participantId || idx}
                    className="flex items-center gap-2 text-sm"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {participantAvatar ? (
                        <img
                          src={participantAvatar}
                          alt={participantName}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-xs">
                          {participantName?.[0]?.toUpperCase() || "U"}
                        </span>
                      )}
                    </div>
                    <span className="flex-1">
                      {participantName}
                      {isCurrentUser && " (You)"}
                      {participantId && participantId.toString() === meeting.host?._id?.toString() && " 👑"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Join Button */}
        <Button
          className="w-full"
          onClick={() => onJoin(meeting.meetingId)}
          variant={isParticipant ? "outline" : "default"}
        >
          <Play className="h-4 w-4 mr-2" />
          {isParticipant ? "Rejoin Meeting" : "Join Meeting"}
        </Button>
      </CardContent>
    </Card>
  );
}

