import type { AutomationEvent } from "./types";

/**
 * Automation Event Emitter
 *
 * Sends events to n8n webhook endpoints.
 * n8n workflows are triggered by these webhook calls.
 *
 * Architecture:
 * - Our app detects events (new lead, appointment due, etc.)
 * - We send a webhook to n8n with the event payload
 * - n8n executes the workflow (send WhatsApp, update DB, etc.)
 * - n8n calls back to our API with the result
 *
 * Why n8n instead of doing everything in-app?
 * - Visual workflow builder (non-technical users can modify)
 * - Built-in retry, error handling, logging
 * - Easy to add new automations without code changes
 * - Separates automation logic from core app
 */

const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 15000];

/**
 * Send an automation event to n8n.
 */
export async function emitAutomationEvent(event: AutomationEvent): Promise<boolean> {
  const n8nWebhookBase = process.env.N8N_WEBHOOK_URL;

  if (!n8nWebhookBase) {
    console.warn("[Automation] N8N_WEBHOOK_URL not configured — skipping event:", event.type);
    return false;
  }

  // Route to the correct n8n webhook based on event type
  const webhookUrl = `${n8nWebhookBase}/${event.type}`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Webhook-Secret": process.env.N8N_WEBHOOK_SECRET || "",
          "X-Event-Type": event.type,
          "X-Timestamp": event.timestamp,
        },
        body: JSON.stringify(event),
      });

      if (response.ok) {
        console.log(`[Automation] Event sent: ${event.type} (attempt ${attempt + 1})`);
        return true;
      }

      // Don't retry on 4xx (client error — our payload is wrong)
      if (response.status >= 400 && response.status < 500) {
        console.error(
          `[Automation] Client error ${response.status} for ${event.type}:`,
          await response.text()
        );
        return false;
      }

      // Retry on 5xx
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    } catch (error) {
      console.error(`[Automation] Network error for ${event.type} (attempt ${attempt + 1}):`, error);
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS[attempt]);
      }
    }
  }

  console.error(`[Automation] Failed to send event after ${MAX_RETRIES + 1} attempts: ${event.type}`);
  return false;
}

/**
 * Emit multiple events in parallel (with concurrency limit).
 */
export async function emitBatchEvents(
  events: AutomationEvent[],
  concurrency: number = 5
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Process in batches
  for (let i = 0; i < events.length; i += concurrency) {
    const batch = events.slice(i, i + concurrency);
    const results = await Promise.allSettled(
      batch.map((event) => emitAutomationEvent(event))
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        sent++;
      } else {
        failed++;
      }
    }
  }

  return { sent, failed };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
