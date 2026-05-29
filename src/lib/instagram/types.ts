/**
 * Instagram Messaging API Types
 * Based on: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/messaging
 */

// ─── Incoming Webhook Payload ───────────────────────────────────────────────

export interface IGWebhookPayload {
  object: "instagram";
  entry: IGWebhookEntry[];
}

export interface IGWebhookEntry {
  id: string; // Instagram account ID or Page ID
  time: number;
  messaging?: IGMessagingEvent[];
}

export interface IGMessagingEvent {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: IGIncomingMessage;
  read?: { mid: string; watermark: number };
  reaction?: { mid: string; action: "react" | "unreact"; reaction?: string };
}

export interface IGIncomingMessage {
  mid: string; // Message ID
  text?: string;
  attachments?: IGAttachment[];
  reply_to?: { mid: string };
  is_echo?: boolean;
  is_deleted?: boolean;
}

export interface IGAttachment {
  type: "image" | "video" | "audio" | "file" | "share" | "story_mention";
  payload: {
    url?: string;
    title?: string;
  };
}

// ─── Outgoing Message Types ─────────────────────────────────────────────────

export interface IGSendMessagePayload {
  recipient: { id: string };
  message: IGOutgoingMessage;
  messaging_type?: "RESPONSE" | "UPDATE" | "MESSAGE_TAG";
}

export interface IGOutgoingMessage {
  text?: string;
  attachment?: {
    type: "image" | "video" | "audio" | "file" | "template";
    payload: { url?: string; template_type?: string; elements?: unknown[] };
  };
}

export interface IGSendMessageResponse {
  recipient_id: string;
  message_id: string;
}

// ─── Account Info ───────────────────────────────────────────────────────────

export interface IGAccountInfo {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
}

export interface IGUserProfile {
  id: string;
  username?: string;
  name?: string;
  profile_pic?: string;
}
