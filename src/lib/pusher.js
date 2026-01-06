import Pusher from "pusher";
import PusherClient from "pusher-js";

// Check if Pusher is configured
const isPusherConfigured = () => {
  return !!(
    process.env.PUSHER_APP_ID &&
    process.env.NEXT_PUBLIC_PUSHER_KEY &&
    process.env.PUSHER_SECRET &&
    process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  );
};

// Server-side Pusher instance
export const pusherServer = isPusherConfigured()
  ? new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.NEXT_PUBLIC_PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
      useTLS: true,
    })
  : null;

// Client-side Pusher instance with optimizations
export const pusherClient =
  typeof window !== "undefined" &&
  process.env.NEXT_PUBLIC_PUSHER_KEY &&
  process.env.NEXT_PUBLIC_PUSHER_CLUSTER
    ? new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
        enabledTransports: ['ws', 'wss'], // Prefer WebSocket for lower latency
        forceTLS: true, // Force secure connection
        authEndpoint: '/api/pusher/auth', // Auth endpoint if needed
        // Connection optimization
        disableStats: true, // Disable stats collection for better performance
        enableLogging: false, // Disable logging in production
      })
    : null;

// Trigger event helper
export async function triggerPusherEvent(channel, event, data) {
  if (!pusherServer) {
    // Pusher not configured, silently skip
    return;
  }

  try {
    await pusherServer.trigger(channel, event, data);
  } catch (error) {
    // Pusher trigger error handled silently
  }
}