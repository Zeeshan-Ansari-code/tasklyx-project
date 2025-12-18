import crypto from "crypto";
import Webhook from "@/models/Webhook";

/**
 * Generate a webhook secret
 */
export function generateWebhookSecret() {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Create a webhook signature
 */
export function createWebhookSignature(payload, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

/**
 * Trigger webhooks for a given event
 */
export async function triggerWebhooks(boardId, event, data) {
  try {
    const webhooks = await Webhook.find({
      board: boardId,
      active: true,
      events: event,
    });

    if (webhooks.length === 0) {
      return;
    }

    const payload = {
      event,
      data,
      timestamp: new Date().toISOString(),
    };

    // Trigger all matching webhooks
    const promises = webhooks.map(async (webhook) => {
      try {
        const signature = createWebhookSignature(payload, webhook.secret);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event,
          },
          body: JSON.stringify(payload),
        });

        // Update webhook status
        if (response.ok) {
          await Webhook.findByIdAndUpdate(webhook._id, {
            lastTriggered: new Date(),
            failureCount: 0,
          });
        } else {
          // Increment failure count
          const newFailureCount = (webhook.failureCount || 0) + 1;
          await Webhook.findByIdAndUpdate(webhook._id, {
            failureCount: newFailureCount,
            // Deactivate after 5 consecutive failures
            active: newFailureCount < 5,
          });
        }
      } catch (error) {
        // Increment failure count on error
        const newFailureCount = (webhook.failureCount || 0) + 1;
        await Webhook.findByIdAndUpdate(webhook._id, {
          failureCount: newFailureCount,
          active: newFailureCount < 5,
        });
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    // Silently fail - webhooks should not break the main flow
    console.error("Error triggering webhooks:", error);
  }
}

