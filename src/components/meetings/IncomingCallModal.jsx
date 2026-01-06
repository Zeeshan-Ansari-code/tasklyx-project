"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Video, Phone, X } from "lucide-react";
import Button from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import Avatar from "@/components/ui/Avatar";

export default function IncomingCallModal({ 
  call, 
  onAccept, 
  onReject, 
  onClose 
}) {
  const audioContextRef = useRef(null);
  const oscillatorRef = useRef(null);

  useEffect(() => {
    // Create and play ringtone using Web Audio API
    const playRingtone = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioContext();
        }
        
        // Resume audio context if suspended (browser autoplay policy)
        if (audioContextRef.current.state === 'suspended') {
          audioContextRef.current.resume().catch(() => {
            // User interaction required - will play on button click
          });
        }
        
        const oscillator = audioContextRef.current.createOscillator();
        const gainNode = audioContextRef.current.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContextRef.current.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContextRef.current.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.5);
        
        oscillator.start();
        oscillator.stop(audioContextRef.current.currentTime + 0.5);
      } catch (error) {
        console.log("Audio context not available:", error);
      }
    };
    
    // Try to play immediately
    playRingtone();
    
    // Repeat every 1 second
    const interval = setInterval(() => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        playRingtone();
      }
    }, 1000);
    
    oscillatorRef.current = interval;

    return () => {
      if (oscillatorRef.current) {
        clearInterval(oscillatorRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleAccept = () => {
    if (oscillatorRef.current) {
      clearInterval(oscillatorRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    onAccept();
  };

  const handleReject = () => {
    if (oscillatorRef.current) {
      clearInterval(oscillatorRef.current);
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    onReject();
  };

  const modalContent = (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-99999 p-4">
      <Card className="w-full max-w-md animate-pulse">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Avatar
              name={call?.caller?.name || "Unknown"}
              src={call?.caller?.avatar}
              size="lg"
              className="h-24 w-24"
            />
          </div>
          <CardTitle className="text-2xl">
            {call?.caller?.name || "Incoming Call"}
          </CardTitle>
          <p className="text-muted-foreground mt-2">
            {call?.type === "meeting" ? "Meeting Invitation" : "Video Call"}
          </p>
          {call?.meetingTitle && (
            <p className="text-sm font-medium mt-1">{call.meetingTitle}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <Button
              onClick={handleAccept}
              className="flex-1 bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Video className="h-5 w-5 mr-2" />
              Accept
            </Button>
            <Button
              onClick={handleReject}
              variant="destructive"
              className="flex-1"
              size="lg"
            >
              <X className="h-5 w-5 mr-2" />
              Reject
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Use portal to render at body level for proper centering
  if (typeof window !== "undefined") {
    return createPortal(modalContent, document.body);
  }
  
  return modalContent;
}

