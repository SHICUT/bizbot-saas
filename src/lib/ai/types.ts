/**
 * AI Sales Assistant — Type Definitions
 */

// ─── Conversation Context ───────────────────────────────────────────────────

export interface ConversationContext {
  businessId: string;
  leadId: string;
  conversationId: string;

  // Business info
  businessName: string;
  businessContext: string;
  businessType: string;
  businessHours: Record<string, { open: string; close: string; closed: boolean }>;

  // AI config
  tone: "friendly" | "casual" | "formal";
  language: "english" | "hindi" | "hinglish";

  // Lead info
  leadName: string | null;
  leadPhone: string;
  leadStatus: string;
  leadMetadata: Record<string, unknown>;

  // Conversation state
  conversationHistory: ChatMessage[];
  currentIntent: ConversationIntent | null;
  collectedInfo: CollectedInfo;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  name?: string; // for tool messages
}

// ─── Intent Detection ───────────────────────────────────────────────────────

export type ConversationIntent =
  | "greeting"
  | "pricing_inquiry"
  | "service_inquiry"
  | "booking_request"
  | "timing_inquiry"
  | "location_inquiry"
  | "complaint"
  | "follow_up"
  | "general_question"
  | "ready_to_buy"
  | "needs_human"
  | "unknown";

// ─── Lead Qualification ─────────────────────────────────────────────────────

export interface CollectedInfo {
  name?: string;
  email?: string;
  preferredService?: string;
  preferredDate?: string;
  preferredTime?: string;
  budget?: string;
  urgency?: "high" | "medium" | "low";
  notes?: string;
}

export type LeadScore = 0 | 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;

export interface QualificationResult {
  score: LeadScore;
  status: "new" | "contacted" | "qualified" | "converted" | "lost";
  reasoning: string;
}

// ─── AI Actions ─────────────────────────────────────────────────────────────

export type AIAction =
  | { type: "reply"; content: string }
  | { type: "book_appointment"; details: AppointmentDetails }
  | { type: "escalate"; reason: string }
  | { type: "update_lead"; data: Partial<CollectedInfo> }
  | { type: "qualify_lead"; result: QualificationResult }
  | { type: "send_follow_up"; delay_hours: number; message: string };

export interface AppointmentDetails {
  title: string;
  service: string;
  scheduledAt: string; // ISO datetime
  durationMinutes: number;
  notes?: string;
}

// ─── AI Response ────────────────────────────────────────────────────────────

export interface AIResponse {
  reply: string;
  actions: AIAction[];
  intent: ConversationIntent;
  confidence: number; // 0-1
  shouldEscalate: boolean;
  tokensUsed: number;
}
