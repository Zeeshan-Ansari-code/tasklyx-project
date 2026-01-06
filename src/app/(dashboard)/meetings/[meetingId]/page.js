"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo } from "react";
import { useAuth } from "@/context/AuthContext";
import { useParams } from "next/navigation";
import { Video, VideoOff, Mic, MicOff, Monitor, MessageSquare, X, Users } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { toast } from "sonner";
import { pusherClient } from "@/lib/pusher";
import { useRouter } from "next/navigation";
import Peer from "simple-peer";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

// Remote Video Component
function RemoteVideo({ stream, participantId, participantName }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current || !stream) return;

    const video = videoRef.current;
    
    // Check if stream has video tracks
    const videoTracks = stream.getVideoTracks();
    const audioTracks = stream.getAudioTracks();
    
    if (videoTracks.length === 0 && audioTracks.length === 0) {
      return; // No tracks to display
    }

    // Verify tracks are live
    const hasLiveVideoTrack = videoTracks.some(track => track.readyState === 'live');
    const hasLiveAudioTrack = audioTracks.some(track => track.readyState === 'live');
    
    // Set srcObject (CRITICAL from guide)
    video.srcObject = stream;
    streamRef.current = stream;

    // Set video properties (from guide)
    video.autoplay = true;
    video.playsInline = true;
    video.muted = false;

    // Force play when metadata is loaded (from guide)
    const handleLoadedMetadata = () => {
      if (video && video.srcObject === stream) {
        if (video.videoWidth > 0 || hasLiveVideoTrack) {
          video.play().catch((err) => {
            if (err?.name !== 'AbortError') {
              console.error("Error playing remote video:", err);
            }
          });
        }
      }
    };

    // Force play when canplay event fires (from guide)
    const handleCanPlay = () => {
      if (video && video.srcObject === stream && video.paused) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);

    // Immediate play attempt (from guide)
    if (hasLiveVideoTrack) {
      video.play().catch(() => {});
    }

    // Fallback play attempts (from guide)
    const playTimeout = setTimeout(() => {
      if (video && video.srcObject === stream && video.paused) {
        video.play().catch(() => {});
      }
    }, 100);

    const playTimeout2 = setTimeout(() => {
      if (video && video.srcObject === stream && video.paused) {
        video.play().catch(() => {});
      }
    }, 500);

    const playTimeout3 = setTimeout(() => {
      if (video && video.srcObject === stream && video.paused) {
        video.play().catch(() => {});
      }
    }, 1000);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      clearTimeout(playTimeout);
      clearTimeout(playTimeout2);
      clearTimeout(playTimeout3);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      streamRef.current = null;
    };
  }, [stream, participantId]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={false}
      className="w-full h-full object-cover min-h-[200px]"
      style={{ backgroundColor: '#000' }}
    />
  );
}

export default function MeetingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const meetingId = params?.meetingId;

  const [meeting, setMeeting] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [sharedScreenStream, setSharedScreenStream] = useState(null);
  const [sharedScreenUserId, setSharedScreenUserId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const peerConnections = useRef({});
  const localStreamRef = useRef(null);
  const peersRef = useRef({});
  const pendingSignalsRef = useRef({}); // Store signals received before peer is created
  const processedSignalsRef = useRef({}); // Track processed signals to prevent duplicates
  const [remoteStreams, setRemoteStreams] = useState({});
  const [participants, setParticipants] = useState([]);

  const [showJoinScreen, setShowJoinScreen] = useState(true);
  const [meetingName, setMeetingName] = useState("");

  useEffect(() => {
    if (meetingId && user?.id) {
      fetchMeeting(true); // Check if already joined and auto-join if so
    }

    return () => {
      // Cleanup
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(peerConnections.current).forEach((pc) => pc.close());
      if (meeting?._id && pusherClient) {
        try {
          pusherClient.unsubscribe(`meeting-${meeting._id}`);
        } catch (error) {
          // Ignore
        }
      }
    };
  }, [meetingId, user?.id]);

  // Setup Pusher listeners when meeting is loaded
  useEffect(() => {
    if (meeting?._id) {
      setupPusherListeners();
    }
  }, [meeting?._id]);

  const setupPusherListeners = () => {
    if (!pusherClient || !meeting?._id || !user?.id) return;

    try {
      const channel = pusherClient.subscribe(`meeting-${meeting._id}`);

      channel.bind("meeting:updated", (data) => {
        if (data.meeting) {
          setMeeting(data.meeting);
          updateParticipantsList(data.meeting.participants || []);
        } else {
          fetchMeeting(false);
        }
      });

      channel.bind("meeting:created", (data) => {
        if (data.meeting) {
          setMeeting(data.meeting);
          updateParticipantsList(data.meeting.participants || []);
        }
      });

      let lastJoinedToast = null;
      let lastLeftToast = null;

      channel.bind("participant:joined", (data) => {
        // Don't show toast for current user's own join
        const joinedUserId = data.user?._id || data.userId;
        if (joinedUserId && joinedUserId.toString() === user?.id?.toString()) {
          // Update participants list but don't show toast
          if (data.meeting) {
            updateParticipantsList(data.meeting.participants || []);
          } else {
            fetchMeeting(false);
          }
          return;
        }
        
        // Prevent duplicate toasts
        if (lastJoinedToast) {
          toast.dismiss(lastJoinedToast);
        }
        lastJoinedToast = toast.success(`${data.user?.name || "Someone"} joined the meeting`);
        // Update participants list without fetching entire meeting
        if (data.meeting) {
          updateParticipantsList(data.meeting.participants || []);
        } else {
          fetchMeeting(false);
        }
      });

      channel.bind("participant:left", (data) => {
        // Don't show toast for current user's own leave
        const leftUserId = data.user?._id || data.userId;
        if (leftUserId && leftUserId.toString() === user?.id?.toString()) {
          // Cleanup peer connections but don't show toast
          if (leftUserId && peersRef.current[leftUserId]) {
            peersRef.current[leftUserId].destroy();
            delete peersRef.current[leftUserId];
            setRemoteStreams((prev) => {
              const updated = { ...prev };
              delete updated[leftUserId];
              return updated;
            });
          }
          // Update participants list but don't show toast
          if (data.meeting) {
            updateParticipantsList(data.meeting.participants || []);
          } else {
            fetchMeeting(false);
          }
          return;
        }
        
        // Prevent duplicate toasts
        if (lastLeftToast) {
          toast.dismiss(lastLeftToast);
        }
        lastLeftToast = toast.info(`${data.user?.name || "Someone"} left the meeting`);
        // Remove peer connection
        if (leftUserId && peersRef.current[leftUserId]) {
          peersRef.current[leftUserId].destroy();
          delete peersRef.current[leftUserId];
          setRemoteStreams((prev) => {
            const updated = { ...prev };
            delete updated[leftUserId];
            return updated;
          });
        }
        // Update participants list without fetching entire meeting
        if (data.meeting) {
          updateParticipantsList(data.meeting.participants || []);
        } else {
          fetchMeeting(false);
        }
      });

      // WebRTC signaling events
      channel.bind("signal", (data) => {
        if (data.fromUserId !== user.id && data.toUserId === user.id) {
          const fromUserId = data.fromUserId;
          
          // Create a unique key for this signal to prevent duplicates
          const signalKey = `${fromUserId}-${data.signal?.type || 'unknown'}-${JSON.stringify(data.signal).substring(0, 50)}`;
          
          // Check if we've already processed this signal
          if (!processedSignalsRef.current[fromUserId]) {
            processedSignalsRef.current[fromUserId] = new Set();
          }
          
          // Skip if we've already processed this exact signal
          if (processedSignalsRef.current[fromUserId].has(signalKey)) {
            return; // Skip duplicate signal
          }
          
          // If peer exists and is ready, signal it
          if (peersRef.current[fromUserId]) {
            try {
              const peer = peersRef.current[fromUserId];
              // Check if peer is in a valid state to receive signals
              if (peer && !peer.destroyed && peer._pc) {
                const pcState = peer._pc.signalingState;
                const signalType = data.signal?.type;
                
                // Validate signal type against current state
                // - stable: can only receive offers (start new negotiation) or ICE candidates
                // - have-local-offer: can receive answers or ICE candidates
                // - have-remote-offer: can receive offers (restart) or ICE candidates
                // - closed: cannot receive any signals
                let canProcess = false;
                
                // Strict validation: reject answer signals when in stable state
                if (pcState === 'stable' && signalType === 'answer') {
                  // Completely ignore answer signals in stable state - they're duplicates/out of order
                  return; // Don't process at all
                }
                
                if (pcState === 'closed') {
                  canProcess = false; // Never process when closed
                } else if (pcState === 'stable') {
                  // In stable state, only accept offers (new negotiation) or ICE candidates
                  canProcess = signalType === 'offer' || data.signal?.candidate;
                } else if (pcState === 'have-local-offer') {
                  // Waiting for answer, can accept answers or ICE candidates
                  canProcess = signalType === 'answer' || data.signal?.candidate;
                } else if (pcState === 'have-remote-offer') {
                  // Received offer, can accept offers (restart) or ICE candidates
                  canProcess = signalType === 'offer' || data.signal?.candidate;
                }
                
                if (canProcess) {
                  try {
                    peer.signal(data.signal);
                    // Mark signal as processed
                    processedSignalsRef.current[fromUserId].add(signalKey);
                  } catch (signalError) {
                    // If signaling fails, ignore if it's a state error (likely duplicate)
                    const errorMsg = signalError?.message || signalError?.toString() || '';
                    if (errorMsg.includes('InvalidStateError') || errorMsg.includes('wrong state')) {
                      // Silently ignore - this is expected for duplicate/out-of-order signals
                    } else {
                      console.error("Error signaling peer:", signalError);
                    }
                    // Don't queue if connection is stable - it's likely a duplicate
                    if (pcState !== 'stable') {
                      if (!pendingSignalsRef.current[fromUserId]) {
                        pendingSignalsRef.current[fromUserId] = [];
                      }
                      pendingSignalsRef.current[fromUserId].push(data.signal);
                    }
                  }
                } else {
                  // Signal arrived at wrong time - ignore if stable (likely duplicate)
                  // Otherwise queue for later
                  if (pcState !== 'stable') {
                    if (!pendingSignalsRef.current[fromUserId]) {
                      pendingSignalsRef.current[fromUserId] = [];
                    }
                    pendingSignalsRef.current[fromUserId].push(data.signal);
                  }
                }
              }
            } catch (error) {
              // Don't log InvalidStateError - it's expected during negotiation
              const errorMsg = error?.message || error?.toString() || '';
              if (!errorMsg.includes('InvalidStateError') && !errorMsg.includes('wrong state')) {
                console.error("Error signaling peer:", error);
              }
            }
          } else {
            // Store signal for when peer is created
            if (!pendingSignalsRef.current[fromUserId]) {
              pendingSignalsRef.current[fromUserId] = [];
            }
            pendingSignalsRef.current[fromUserId].push(data.signal);
            
            // Create peer as receiver (not initiator) if we have local stream
            if (localStreamRef.current && !peersRef.current[fromUserId]) {
              createPeer(fromUserId, false);
            }
          }
        }
      });

      channel.bind("user-joined", (data) => {
        if (data.userId !== user.id && localStreamRef.current && !peersRef.current[data.userId]) {
          // New user joined - determine initiator based on user ID comparison
          const currentUserId = user.id?.toString() || "";
          const otherUserId = data.userId.toString();
          const isInitiator = currentUserId < otherUserId;
          createPeer(data.userId, isInitiator);
        }
      });

      // Listen for meeting messages if conversation exists
      if (meeting.conversation) {
        const conversationChannel = pusherClient.subscribe(`conversation-${meeting.conversation}`);
        conversationChannel.bind("message:sent", (data) => {
          if (data.message) {
            setMessages((prev) => [...prev, data.message]);
          }
        });
      }

      return () => {
        try {
          pusherClient.unsubscribe(`meeting-${meeting._id}`);
        } catch (error) {
          // Ignore
        }
      };
    } catch (error) {
      console.error("Pusher subscription error:", error);
    }
  };

  const updateParticipantsList = (participantsList) => {
    const joined = participantsList.filter((p) => p.status === "joined");
    setParticipants(joined);
    
    // Create peer connections for existing participants when we join
    // Only if we just joined (localStreamRef exists but no peers yet)
    if (localStreamRef.current && Object.keys(peersRef.current).length === 0) {
      joined.forEach((participant) => {
        const participantId = typeof participant.user === 'object' ? participant.user?._id : participant.user;
        if (participantId && participantId.toString() !== user.id?.toString()) {
          if (!peersRef.current[participantId]) {
            // Determine initiator: user with smaller ID is initiator
            const currentUserId = user.id?.toString() || "";
            const otherUserId = participantId.toString();
            const isInitiator = currentUserId < otherUserId;
            createPeer(participantId, isInitiator);
          }
        }
      });
    }
  };

  const createPeer = (userId, initiator) => {
    if (!localStreamRef.current) return;

    // Don't create duplicate peer
    if (peersRef.current[userId]) {
      return;
    }

    const peer = new Peer({
      initiator,
      trickle: false,
      stream: localStreamRef.current,
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    let isSignaling = false;

    peer.on("signal", (signal) => {
      if (isSignaling) return; // Prevent duplicate signals
      isSignaling = true;
      
      // Send signal to other user via API
      if (meeting?._id) {
        fetch(`/api/meetings/${meeting._id}/signal`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            signal,
            fromUserId: user.id,
            toUserId: userId,
          }),
        })
        .then(() => {
          isSignaling = false;
        })
        .catch((err) => {
          // Don't log common network errors that are expected
          const errorMessage = err?.message || err?.toString() || '';
          if (!errorMessage.includes('Connection failed') && !errorMessage.includes('Failed to fetch')) {
            console.error("Failed to send signal:", err);
          }
          isSignaling = false;
        });
      }
    });

    peer.on("stream", (stream) => {
      // Verify stream has tracks (from guide)
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();
      
      if (videoTracks.length === 0 && audioTracks.length === 0) {
        return; // No tracks in stream
      }

      // Check if this is a screen share stream (has video track with specific characteristics)
      const videoTrack = videoTracks[0];
      if (videoTrack && videoTrack.label?.toLowerCase().includes('screen')) {
        // This is a screen share stream
        setSharedScreenStream(stream);
        setSharedScreenUserId(userId);
      } else {
        // Regular video stream - use the stream directly (simple-peer handles it)
        // But ensure we're setting it properly
        setRemoteStreams((prev) => {
          const updated = { ...prev };
          updated[userId] = stream;
          return updated;
        });
      }
    });

    // Also listen to RTCPeerConnection ontrack event directly (from guide approach)
    // This ensures we catch tracks even if simple-peer's stream event doesn't fire
    if (peer._pc) {
      peer._pc.ontrack = (evt) => {
        if (evt.streams && evt.streams.length > 0) {
          const trackStream = evt.streams[0];
          const videoTracks = trackStream.getVideoTracks();
          const audioTracks = trackStream.getAudioTracks();
          
          // Check if this is a screen share
          const videoTrack = videoTracks[0];
          if (videoTrack && videoTrack.label?.toLowerCase().includes('screen')) {
            setSharedScreenStream(trackStream);
            setSharedScreenUserId(userId);
          } else {
            // Regular video stream
            if (videoTracks.length > 0 || audioTracks.length > 0) {
              setRemoteStreams((prev) => {
                const updated = { ...prev };
                // Merge tracks if stream already exists
                if (updated[userId]) {
                  // Add new tracks to existing stream
                  videoTracks.forEach(track => {
                    if (!updated[userId].getVideoTracks().find(t => t.id === track.id)) {
                      updated[userId].addTrack(track);
                    }
                  });
                  audioTracks.forEach(track => {
                    if (!updated[userId].getAudioTracks().find(t => t.id === track.id)) {
                      updated[userId].addTrack(track);
                    }
                  });
                } else {
                  updated[userId] = trackStream;
                }
                return updated;
              });
            }
          }
        }
      };
    }

    peer.on("error", (err) => {
      // Don't log common connection errors that are expected during negotiation
      const errorMessage = err?.message || err?.toString() || '';
      const isCommonError = 
        errorMessage.includes('Connection failed') ||
        errorMessage.includes('ICE') ||
        errorMessage.includes('signaling') ||
        errorMessage.includes('InvalidStateError');
      
      if (!isCommonError) {
        console.error("Peer error:", err);
      }
      
      // Cleanup on error only if it's a fatal error
      if (err?.code === 'ERR_CONNECTION_FAILED' || err?.code === 'ERR_CONNECTION_CLOSED') {
        if (peersRef.current[userId]) {
          try {
            peersRef.current[userId].destroy();
          } catch (e) {
            // Ignore
          }
          delete peersRef.current[userId];
        }
      }
    });

    peer.on("close", () => {
      setRemoteStreams((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
      delete peersRef.current[userId];
      delete pendingSignalsRef.current[userId];
      delete processedSignalsRef.current[userId];
    });

    peer.on("connect", () => {
      isSignaling = false;
      // Verify connection is established
      if (peer._pc) {
        peer._pc.onconnectionstatechange = () => {
          if (peer._pc.connectionState === 'connected') {
            // Connection established - streams should be flowing
          } else if (peer._pc.connectionState === 'failed' || peer._pc.connectionState === 'disconnected') {
            // Connection failed - might need to recreate
          }
        };
      }
    });

    peersRef.current[userId] = peer;

    // Process any pending signals after a short delay to ensure peer is ready
    setTimeout(() => {
      if (pendingSignalsRef.current[userId] && pendingSignalsRef.current[userId].length > 0) {
        const signals = pendingSignalsRef.current[userId];
        pendingSignalsRef.current[userId] = [];
        
        // Apply pending signals one by one
        signals.forEach((signal, index) => {
          setTimeout(() => {
            try {
              if (peer && !peer.destroyed && peer._pc) {
                const pcState = peer._pc.signalingState;
                const signalType = signal?.type;
                
                // Strict validation: reject answer signals when in stable state
                if (pcState === 'stable' && signalType === 'answer') {
                  // Completely ignore answer signals in stable state - they're duplicates/out of order
                  return; // Don't process at all
                }
                
                // Validate signal type against current state (same logic as above)
                let canProcess = false;
                
                if (pcState === 'closed') {
                  canProcess = false;
                } else if (pcState === 'stable') {
                  canProcess = signalType === 'offer' || signal?.candidate;
                } else if (pcState === 'have-local-offer') {
                  canProcess = signalType === 'answer' || signal?.candidate;
                } else if (pcState === 'have-remote-offer') {
                  canProcess = signalType === 'offer' || signal?.candidate;
                }
                
                if (canProcess) {
                  try {
                    peer.signal(signal);
                  } catch (signalError) {
                    // Ignore state errors for pending signals
                    const errorMsg = signalError?.message || signalError?.toString() || '';
                    if (errorMsg.includes('InvalidStateError') || errorMsg.includes('wrong state')) {
                      // Silently ignore - this is expected for duplicate/out-of-order signals
                    } else {
                      console.error("Error applying pending signal:", signalError);
                    }
                  }
                }
              }
            } catch (error) {
              // Don't log InvalidStateError - it's expected during negotiation
              const errorMsg = error?.message || error?.toString() || '';
              if (!errorMsg.includes('InvalidStateError') && !errorMsg.includes('wrong state')) {
                console.error("Error applying pending signal:", error);
              }
            }
          }, index * 200); // Stagger signals more to avoid race conditions
        });
      }
    }, 500);
  };

  const fetchMeeting = async (autoJoin = false) => {
    try {
      // Try direct API first
      const res = await fetch(`/api/meetings/by-id/${meetingId}`);
      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeeting(data.meeting);
        updateParticipantsList(data.meeting.participants || []);
        
        // Load messages if conversation exists
        if (data.meeting.conversation) {
          try {
            const messagesRes = await fetch(`/api/messages/${data.meeting.conversation}`);
            const messagesData = await messagesRes.json();
            if (messagesRes.ok && messagesData.messages) {
              setMessages(messagesData.messages || []);
            }
          } catch (error) {
            console.error("Failed to load meeting messages:", error);
          }
        }
        
        // Check if user is already a participant with "joined" status
        const isAlreadyJoined = data.meeting.participants?.some(
          (p) => {
            const participantId = typeof p.user === 'object' ? p.user?._id : p.user;
            return participantId && participantId.toString() === user.id?.toString() && p.status === "joined";
          }
        );
        
        // If user is already joined (e.g., host who created the meeting), auto-join directly
        if (isAlreadyJoined) {
          setShowJoinScreen(false);
          // Initialize media and join directly
          initializeMedia().then(() => {
            // User is already in the meeting, no need to call joinMeeting API
            updateParticipantsList(data.meeting.participants || []);
          });
        } else if (autoJoin) {
          // User is not joined yet, so join them
          joinMeeting(data.meeting._id);
        }
      } else {
        // Fallback to searching all meetings
        const fallbackRes = await fetch(`/api/meetings?userId=${user.id}&status=active`);
        const fallbackData = await fallbackRes.json();
        if (fallbackRes.ok) {
          const foundMeeting = fallbackData.meetings?.find(
            (m) => m.meetingId === meetingId
          );
          if (foundMeeting) {
            setMeeting(foundMeeting);
            updateParticipantsList(foundMeeting.participants || []);
            // Check if user is already a participant with "joined" status
            const isAlreadyJoined = foundMeeting.participants?.some(
              (p) => {
                const participantId = typeof p.user === 'object' ? p.user?._id : p.user;
                return participantId && participantId.toString() === user.id?.toString() && p.status === "joined";
              }
            );
            
            // If user is already joined, auto-join directly
            if (isAlreadyJoined) {
              setShowJoinScreen(false);
              // Initialize media and join directly
              initializeMedia().then(() => {
                updateParticipantsList(foundMeeting.participants || []);
              });
            } else if (autoJoin) {
              // User is not joined yet, so join them
              joinMeeting(foundMeeting._id);
            }
          } else {
            toast.error("Meeting not found");
          }
        } else {
          toast.error("Failed to load meeting");
        }
      }
    } catch (error) {
      console.error("Failed to load meeting:", error);
      toast.error("Failed to load meeting");
    }
  };

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraOn,
        audio: micOn,
      });
      localStreamRef.current = stream;
      setLocalStream(stream);
      
      // Set up local video element properly
      if (localVideoRef.current) {
        const video = localVideoRef.current;
        
        // Stop any existing stream tracks first
        if (video.srcObject) {
          const oldStream = video.srcObject;
          oldStream.getTracks().forEach(track => track.stop());
        }
        
        // Set new stream
        video.srcObject = stream;
        video.muted = true; // Always mute local video to prevent feedback
        video.autoplay = true;
        video.playsInline = true;
        
        // Force video to be visible
        video.style.display = 'block';
        video.style.visibility = 'visible';
        video.style.opacity = '1';
        video.style.width = '100%';
        video.style.height = '100%';
        
        // Multiple play attempts to ensure it works
        const playVideo = () => {
          if (video && video.srcObject === stream && video.paused) {
            video.play().catch((err) => {
              if (err?.name !== 'AbortError') {
                // Retry after a short delay
                setTimeout(playVideo, 200);
              }
            });
          }
        };
        
        // Try playing immediately
        playVideo();
        
        // Also try on loadedmetadata
        const handleLoadedMetadata = () => {
          playVideo();
        };
        
        // Also try on canplay
        const handleCanPlay = () => {
          playVideo();
        };
        
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('canplay', handleCanPlay);
        
        // Fallback play attempts
        setTimeout(playVideo, 100);
        setTimeout(playVideo, 500);
        setTimeout(playVideo, 1000);
      }
      
      // Update all existing peer connections with new stream
      Object.values(peersRef.current).forEach((peer) => {
        if (peer && !peer.destroyed) {
          try {
            peer.removeStream(peer._pc?.getLocalStreams()[0]);
            peer.addStream(stream);
          } catch (error) {
            console.error("Error updating peer stream:", error);
          }
        }
      });
    } catch (error) {
      console.error("Failed to access camera/microphone:", error);
      toast.error("Failed to access camera/microphone");
    }
  };

  const joinMeeting = async (meetingDbId) => {
    try {
      // Initialize media before joining
      await initializeMedia();
      
      const res = await fetch(`/api/meetings/${meetingDbId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          userId: user.id,
          title: meetingName.trim() || undefined, // Only send if provided
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMeeting(data.meeting);
        setShowJoinScreen(false);
        setMeetingName(""); // Clear the name input
        updateParticipantsList(data.meeting.participants || []);
        
        // Notify other participants via API
        if (data.meeting._id) {
          fetch(`/api/meetings/${data.meeting._id}/notify-join`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id }),
          }).catch(() => {});
        }
        
        // Don't show toast here as it will be shown by the join screen handler
      } else {
        toast.error(data.message || "Failed to join meeting");
      }
    } catch (error) {
      console.error("Failed to join meeting:", error);
      toast.error("Failed to join meeting");
    }
  };

  const handleJoinClick = () => {
    if (meeting?._id) {
      const joinedParticipants = meeting.participants?.filter((p) => p.status === "joined") || [];
      const isFirstJoiner = joinedParticipants.length === 0;
      const hasDefaultTitle = !meeting.title || meeting.title === "Quick Meeting" || meeting.title.trim() === "";
      const needsName = isFirstJoiner && hasDefaultTitle;
      
      if (needsName && !meetingName.trim()) {
        toast.error("Please enter a meeting name");
        return;
      }
      
      joinMeeting(meeting._id);
    }
  };

  const toggleCamera = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !cameraOn;
        setCameraOn(!cameraOn);
      }
    }
  };

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !micOn;
        setMicOn(!micOn);
      }
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!screenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        
        // Keep original camera stream separate
        const originalVideoTrack = localStreamRef.current?.getVideoTracks()[0];
        
        // Replace video track in all peer connections with screen share
        const screenVideoTrack = stream.getVideoTracks()[0];
        Object.values(peersRef.current).forEach((peer) => {
          if (peer && !peer.destroyed && peer._pc) {
            const sender = peer._pc.getSenders().find((s) => 
              s.track && s.track.kind === "video"
            );
            if (sender) {
              sender.replaceTrack(screenVideoTrack).catch((err) => {
                console.error("Error replacing track:", err);
              });
            }
          }
        });
        
        // Set shared screen stream (don't replace local video - keep camera visible)
        setSharedScreenStream(stream);
        setSharedScreenUserId(user?.id);
        setScreenSharing(true);

        screenVideoTrack.onended = async () => {
          setScreenSharing(false);
          setSharedScreenStream(null);
          setSharedScreenUserId(null);
          // Restore original camera track
          if (originalVideoTrack) {
            Object.values(peersRef.current).forEach((peer) => {
              if (peer && !peer.destroyed && peer._pc) {
                const sender = peer._pc.getSenders().find((s) => 
                  s.track && s.track.kind === "video"
                );
                if (sender && originalVideoTrack) {
                  sender.replaceTrack(originalVideoTrack).catch((err) => {
                    console.error("Error restoring track:", err);
                  });
                }
              }
            });
          }
          // Stop screen share stream
          stream.getTracks().forEach((track) => track.stop());
        };
      } else {
        // Stop screen sharing manually
        if (sharedScreenStream) {
          sharedScreenStream.getTracks().forEach((track) => track.stop());
        }
        setScreenSharing(false);
        setSharedScreenStream(null);
        setSharedScreenUserId(null);
      }
    } catch (error) {
      console.error("Failed to share screen:", error);
      toast.error("Failed to share screen");
    }
  };

  const leaveMeeting = async () => {
    // Cleanup all peer connections
    Object.values(peersRef.current).forEach((peer) => {
      try {
        peer.destroy();
      } catch (error) {
        console.error("Error destroying peer:", error);
      }
    });
    peersRef.current = {};
    pendingSignalsRef.current = {};

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
    }

    // Cleanup peer connections
    Object.values(peerConnections.current).forEach((pc) => {
      try {
        pc.close();
      } catch (error) {
        console.error("Error closing peer connection:", error);
      }
    });

    if (meeting?._id) {
      try {
        await fetch(`/api/meetings/${meeting._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "leave",
            userId: user.id,
          }),
        });
      } catch (error) {
        console.error("Failed to leave meeting:", error);
      }
    }

    router.push("/chat");
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !meeting?._id) return;

    try {
      // If meeting has a conversation, send through conversation API
      if (meeting.conversation) {
        const res = await fetch(`/api/messages/${meeting.conversation}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: messageText,
            sender: user.id,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setMessageText("");
          // Message will be added via Pusher event
        } else {
          toast.error("Failed to send message");
        }
      } else {
        // Fallback: local message for meetings without conversation
        const newMessage = {
          text: messageText,
          sender: user,
          createdAt: new Date(),
        };
        setMessages([...messages, newMessage]);
        setMessageText("");
      }
    } catch (error) {
      console.error("Failed to send message:", error);
      toast.error("Failed to send message");
    }
  };

  if (!meeting) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading meeting...</p>
        </div>
      </div>
    );
  }

  // Show join screen before joining
  if (showJoinScreen) {
    const joinedParticipants = meeting.participants?.filter((p) => p.status === "joined") || [];
    const isParticipant = meeting.participants?.some(
      (p) => {
        const participantId = typeof p.user === 'object' ? p.user?._id : p.user;
        return participantId && participantId.toString() === user.id?.toString() && p.status === "joined";
      }
    );
    
    // Check if this is the first person joining (no one has joined yet)
    // Only show name input if truly the first person AND meeting has no proper title
    const isFirstJoiner = joinedParticipants.length === 0;
    const hasDefaultTitle = !meeting.title || meeting.title === "Quick Meeting" || meeting.title.trim() === "";
    const needsName = isFirstJoiner && hasDefaultTitle;

    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <Card className="w-full max-w-2xl m-4">
          <CardHeader>
            <CardTitle className="text-2xl">
              {meeting.title || "New Meeting"}
            </CardTitle>
            {meeting.description && (
              <p className="text-muted-foreground mt-2">{meeting.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meeting Name Input - Show if first joiner or no title */}
            {needsName && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Meeting Name {isFirstJoiner && "*"}
                </label>
                <Input
                  placeholder="Enter meeting name..."
                  value={meetingName}
                  onChange={(e) => setMeetingName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && meetingName.trim()) {
                      handleJoinClick();
                    }
                  }}
                  autoFocus
                />
                {isFirstJoiner && (
                  <p className="text-xs text-muted-foreground mt-1">
                    You're the first to join. Set a name for this meeting so others can find it.
                  </p>
                )}
              </div>
            )}
            {/* Participants List */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">
                  Participants ({joinedParticipants.length})
                </h3>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {joinedParticipants.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No participants yet
                  </p>
                ) : (
                  joinedParticipants.map((participant, idx) => {
                    const participantId = typeof participant.user === 'object' ? participant.user?._id : participant.user;
                    const participantName = typeof participant.user === 'object' ? participant.user?.name : "Unknown";
                    const participantAvatar = typeof participant.user === 'object' ? participant.user?.avatar : null;
                    const isCurrentUser = participantId && participantId.toString() === user.id?.toString();
                    const isHost = participantId && (participantId.toString() === meeting.host?._id?.toString() || participantId.toString() === meeting.host?.toString());
                    
                    return (
                      <div
                        key={participantId || idx}
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
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{participantName}</span>
                            {isCurrentUser && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                                You
                              </span>
                            )}
                            {isHost && (
                              <span className="text-xs bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">
                                👑 Host
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {participant.status === "joined" ? "In meeting" : participant.status}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Join Button */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => router.push("/chat")}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleJoinClick}
                disabled={needsName && !meetingName.trim()}
              >
                <Video className="h-4 w-4 mr-2" />
                {isParticipant ? "Rejoin Meeting" : "Join Meeting"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      {/* Main Video Area */}
      <div className={`flex-1 flex flex-col ${showChat ? "w-full md:w-2/3" : "w-full"}`}>
        {/* Header */}
        <div className="bg-card border-b border-border p-2 sm:p-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-xl font-bold truncate">{meeting.title}</h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {meeting.participants?.filter((p) => p?.status === "joined")?.length || 0} participants
            </p>
          </div>
          <Button variant="destructive" size="sm" className="shrink-0" onClick={leaveMeeting}>
            <X className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Leave</span>
          </Button>
        </div>

        {/* Shared Screen View (Fullscreen like Google Meet) */}
        {sharedScreenStream && (
          <div className="flex-1 relative bg-black">
            <video
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              ref={(el) => {
                if (el && sharedScreenStream) {
                  el.srcObject = sharedScreenStream;
                  // Wait a bit before playing to avoid interrupting load
                  setTimeout(() => {
                    if (el && el.srcObject === sharedScreenStream) {
                      el.play().catch((err) => {
                        // Ignore AbortError - it's expected if srcObject changes
                        if (err?.name !== 'AbortError') {
                          console.error("Error playing shared screen:", err);
                        }
                      });
                    }
                  }, 100);
                }
              }}
            />
            <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded text-sm">
              {sharedScreenUserId === user?.id ? "You are sharing" : `${participants.find(p => {
                const pid = typeof p.user === 'object' ? p.user?._id : p.user;
                return pid?.toString() === sharedScreenUserId?.toString();
              })?.user?.name || "Someone"} is sharing`}
            </div>
            {/* Local video thumbnail in corner */}
            <div className="absolute bottom-4 right-4 w-48 h-36 bg-black rounded-lg overflow-hidden border-2 border-white">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                  <VideoOff className="h-8 w-8 text-white" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Regular Video Grid (when no screen sharing) */}
        {!sharedScreenStream && (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 p-2 sm:p-4 overflow-y-auto">
            {/* Local Video */}
            <Card className="relative bg-black rounded-lg overflow-hidden aspect-video sm:aspect-auto sm:min-h-[200px]">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs sm:text-sm z-10">
                {user?.name || "You"} (You)
              </div>
              {!cameraOn && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                  <div className="text-white text-center">
                    <VideoOff className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2" />
                    <p className="text-xs sm:text-base">Camera Off</p>
                  </div>
                </div>
              )}
            </Card>

          {/* Remote Videos */}
          {participants
            .filter((p) => {
              const participantId = typeof p.user === 'object' ? p.user?._id : p.user;
              return participantId && participantId.toString() !== user.id?.toString();
            })
            .map((participant, idx) => {
              const participantId = typeof participant.user === 'object' ? participant.user?._id : participant.user;
              const participantName = typeof participant.user === 'object' ? participant.user?.name : "Unknown";
              const remoteStream = remoteStreams[participantId];
              
              // Check if stream has active tracks
              const hasActiveStream = remoteStream && (
                remoteStream.getVideoTracks().some(t => t.readyState === 'live') ||
                remoteStream.getAudioTracks().some(t => t.readyState === 'live')
              );
              
              return (
                <Card key={participantId || `participant-${idx}`} className="relative bg-black rounded-lg overflow-hidden aspect-video sm:aspect-auto sm:min-h-[200px]">
                  {hasActiveStream ? (
                    <RemoteVideo
                      stream={remoteStream}
                      participantId={participantId}
                      participantName={participantName}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center aspect-video sm:aspect-auto sm:min-h-[200px]">
                      <div className="text-white text-center">
                        <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-2">
                          <span className="text-xl sm:text-2xl font-medium">
                            {participantName?.[0]?.toUpperCase() || "U"}
                          </span>
                        </div>
                        <p className="font-medium text-sm sm:text-base">{participantName}</p>
                        <p className="text-xs text-gray-400 mt-1">Connecting...</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-xs sm:text-sm">
                    {participantName}
                  </div>
                </Card>
              );
            })}
          
          {/* Empty state if no other participants */}
          {participants.filter((p) => {
            const participantId = typeof p.user === 'object' ? p.user?._id : p.user;
            return participantId && participantId.toString() !== user.id?.toString();
          }).length === 0 && (
            <Card className="relative bg-black rounded-lg overflow-hidden aspect-video sm:aspect-auto sm:min-h-[200px]">
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-white text-center">
                  <Users className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-xs sm:text-sm opacity-75">Waiting for others to join...</p>
                </div>
              </div>
            </Card>
          )}
          </div>
        )}

        {/* Controls Section */}
        <div className="bg-card border-t border-border p-2 sm:p-4 flex items-center justify-center gap-2 sm:gap-4 flex-wrap" key="controls">
          <Button
            variant={cameraOn ? "default" : "destructive"}
            size="lg"
            onClick={toggleCamera}
          >
            {cameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
          </Button>
          <Button
            variant={micOn ? "default" : "destructive"}
            size="lg"
            onClick={toggleMic}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </Button>
          <Button
            variant={screenSharing ? "default" : "outline"}
            size="lg"
            onClick={toggleScreenShare}
          >
            <Monitor className="h-5 w-5" />
          </Button>
          <Button
            variant={showChat ? "default" : "outline"}
            size="lg"
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Chat Sidebar */}
      {showChat && (
        <div className="w-full md:w-1/3 border-l border-border bg-card flex flex-col fixed md:relative right-0 top-0 h-full z-40">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold">Meeting Chat</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((msg, idx) => (
              <div key={idx} className="text-sm">
                <div className="font-semibold">{msg.sender?.name}</div>
                <div className="text-muted-foreground">{msg.text}</div>
              </div>
            ))}
          </div>
          <form onSubmit={sendMessage} className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background"
              />
              <Button type="submit" size="sm">
                Send
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

