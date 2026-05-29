import type { ConversationIntent } from "../types";

/**
 * Intent Classification Prompt
 *
 * Lightweight classifier that runs BEFORE the main reply generation.
 * Determines what the customer wants so we can:
 * 1. Route to the right response strategy
 * 2. Trigger appropriate actions (booking, escalation, etc.)
 * 3. Update lead qualification score
 *
 * Uses a cheaper/faster model call with structured output.
 */
export const INTENT_CLASSIFICATION_PROMPT = `Classify the customer's intent from their latest message. Consider the conversation history for context.

Possible intents:
- greeting: First message, hello, hi
- pricing_inquiry: Asking about costs, fees, plans, rates
- service_inquiry: Asking what services/products are available
- booking_request: Wants to schedule, book, reserve, visit
- timing_inquiry: Asking about hours, availability, schedule
- location_inquiry: Asking where the business is, directions
- complaint: Unhappy, problem, issue, bad experience
- follow_up: Responding to a previous conversation
- general_question: Other questions about the business
- ready_to_buy: Expressing clear intent to purchase/sign up
- needs_human: Explicitly asking for human/manager/owner
- unknown: Can't determine intent

Respond with ONLY the intent label (one word from the list above).`;

/**
 * Classify intent from a message using pattern matching (fast, no API call).
 * Falls back to AI classification for ambiguous messages.
 */
export function classifyIntentLocal(message: string): ConversationIntent | null {
  const lower = message.toLowerCase().trim();

  // Greeting patterns
  if (/^(hi|hello|hey|hii+|good\s*(morning|afternoon|evening)|namaste|namaskar)\b/i.test(lower)) {
    return "greeting";
  }

  // Pricing patterns
  if (/\b(price|cost|fee|rate|charge|kitna|kharcha|plan|package|membership)\b/i.test(lower)) {
    return "pricing_inquiry";
  }

  // Booking patterns
  if (/\b(book|appointment|schedule|reserve|slot|visit|come|aana|milna)\b/i.test(lower)) {
    return "booking_request";
  }

  // Timing patterns
  if (/\b(time|timing|hour|open|close|kab|schedule|available|slot)\b/i.test(lower)) {
    if (/\b(book|appointment)\b/i.test(lower)) return "booking_request";
    return "timing_inquiry";
  }

  // Location patterns
  if (/\b(where|location|address|direction|map|kahan|jagah)\b/i.test(lower)) {
    return "location_inquiry";
  }

  // Complaint patterns
  if (/\b(complaint|problem|issue|bad|worst|terrible|angry|refund|disappointed)\b/i.test(lower)) {
    return "complaint";
  }

  // Ready to buy patterns
  if (/\b(sign\s*up|join|register|start|enroll|subscribe|buy|purchase|lena|chahiye)\b/i.test(lower)) {
    return "ready_to_buy";
  }

  // Needs human patterns
  if (/\b(human|person|manager|owner|speak\s*to|talk\s*to|real\s*person|someone\s*else)\b/i.test(lower)) {
    return "needs_human";
  }

  // Service inquiry patterns
  if (/\b(service|offer|provide|do\s*you|what\s*all|facility|kya\s*kya)\b/i.test(lower)) {
    return "service_inquiry";
  }

  // Can't determine locally
  return null;
}
