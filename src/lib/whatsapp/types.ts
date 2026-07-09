/**
 * WhatsApp Cloud API Types
 * Based on: https://developers.facebook.com/docs/whatsapp/cloud-api/reference
 */

// ─── Incoming Webhook Payload ───────────────────────────────────────────────

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string; // WABA ID
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: "messages";
}

export interface WebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IncomingMessage {
  from: string; // sender's phone number
  id: string; // message ID
  timestamp: string; // unix timestamp
  type: MessageType;
  text?: { body: string };
  image?: MediaMessage;
  audio?: MediaMessage;
  video?: MediaMessage;
  document?: MediaMessage & { filename?: string };
  location?: LocationMessage;
  button?: { text: string; payload: string };
  interactive?: InteractiveMessage;
  context?: { message_id: string }; // reply context
}

export type MessageType =
  | "text"
  | "image"
  | "audio"
  | "video"
  | "document"
  | "location"
  | "button"
  | "interactive"
  | "reaction"
  | "sticker";

export interface MediaMessage {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface LocationMessage {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}

export interface InteractiveMessage {
  type: "button_reply" | "list_reply";
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
}

// ─── Message Status Updates ─────────────────────────────────────────────────

export interface MessageStatus {
  id: string; // message ID
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  errors?: WebhookError[];
  conversation?: {
    id: string;
    origin: { type: string };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: string;
    category: string;
  };
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data?: { details: string };
}

// ─── Outgoing Message Types ─────────────────────────────────────────────────

export interface SendMessagePayload {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text" | "image" | "document" | "video" | "location" | "template" | "interactive";
  text?: { preview_url?: boolean; body: string };
  image?: { link: string; caption?: string };
  document?: { link: string; caption?: string; filename?: string };
  video?: { link: string; caption?: string };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  template?: TemplateMessage;
  interactive?: OutgoingInteractiveMessage;
  context?: { message_id: string }; // reply to specific message
}

export interface TemplateMessage {
  name: string;
  language: { code: string };
  components?: TemplateComponent[];
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type: "text" | "image" | "document";
  text?: string;
  image?: { link: string };
}

export interface OutgoingInteractiveMessage {
  type: "button" | "list";
  header?: { type: "text"; text: string };
  body: { text: string };
  footer?: { text: string };
  action: InteractiveAction;
}

export interface InteractiveAction {
  buttons?: Array<{
    type: "reply";
    reply: { id: string; title: string };
  }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
}

// ─── API Response Types ─────────────────────────────────────────────────────

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WhatsAppAPIError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    fbtrace_id: string;
  };
}

// ─── Internal Types ─────────────────────────────────────────────────────────

export interface BusinessWhatsAppConfig {
  phone_number_id: string;
  access_token: string;
  business_id: string;
}
