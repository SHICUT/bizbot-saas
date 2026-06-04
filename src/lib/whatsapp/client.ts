import type {
  SendMessagePayload,
  SendMessageResponse,
  WhatsAppAPIError,
  BusinessWhatsAppConfig,
} from "./types";

const WHATSAPP_API_BASE = "https://graph.facebook.com/v21.0";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000]; // exponential backoff in ms

// Rate limit: WhatsApp allows ~80 messages/second per phone number
// We implement a simple token bucket per business
const rateLimitMap = new Map<string, { tokens: number; lastRefill: number }>();
const RATE_LIMIT_TOKENS = 60; // messages per window
const RATE_LIMIT_WINDOW = 60000; // 1 minute

/**
 * WhatsApp Cloud API Client
 * Handles sending messages with retry logic and rate limiting.
 */
export class WhatsAppClient {
  private phoneNumberId: string;
  private accessToken: string;
  private businessId: string;

  constructor(config: BusinessWhatsAppConfig) {
    this.phoneNumberId = config.phone_number_id;
    this.accessToken = config.access_token;
    this.businessId = config.business_id;
  }

  /**
   * Send a text message to a WhatsApp number.
   */
  async sendTextMessage(
    to: string,
    text: string,
    replyToMessageId?: string
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    };

    if (replyToMessageId) {
      payload.context = { message_id: replyToMessageId };
    }

    return this.sendMessage(payload);
  }

  /**
   * Send an interactive button message.
   */
  async sendButtonMessage(
    to: string,
    body: string,
    buttons: Array<{ id: string; title: string }>,
    header?: string,
    footer?: string
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: body },
        ...(header && { header: { type: "text", text: header } }),
        ...(footer && { footer: { text: footer } }),
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: "reply" as const,
            reply: { id: btn.id, title: btn.title.slice(0, 20) },
          })),
        },
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Send a template message (for business-initiated conversations).
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "en",
    parameters?: Array<{ type: "text"; text: string }>
  ): Promise<SendMessageResponse> {
    const payload: SendMessagePayload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(parameters && {
          components: [{ type: "body", parameters }],
        }),
      },
    };

    return this.sendMessage(payload);
  }

  /**
   * Mark a message as read (shows blue ticks to sender).
   */
  async markAsRead(messageId: string): Promise<void> {
    const url = `${WHATSAPP_API_BASE}/${this.phoneNumberId}/messages`;

    await this.fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
      }),
    });
  }

  /**
   * Core send method with rate limiting and retry logic.
   */
  private async sendMessage(
    payload: SendMessagePayload
  ): Promise<SendMessageResponse> {
    // Check rate limit
    this.checkRateLimit();

    const url = `${WHATSAPP_API_BASE}/${this.phoneNumberId}/messages`;

    console.log(`[WA Send] To: ${payload.to} | Type: ${payload.type} | Business: ${this.businessId.substring(0, 8)}`);

    const response = await this.fetchWithRetry(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data as WhatsAppAPIError;
      console.error(`[WA Send] FAILED to ${payload.to}: ${error.error.message} (code: ${error.error.code})`);
      throw new WhatsAppSendError(
        error.error.message,
        error.error.code,
        error.error.error_subcode,
        payload.to
      );
    }

    console.log(`[WA Send] ✓ Sent to ${payload.to} | Message ID: ${(data as SendMessageResponse).messages?.[0]?.id}`);
    return data as SendMessageResponse;
  }

  /**
   * Fetch with exponential backoff retry.
   * Retries on: network errors, 429 (rate limit), 5xx (server errors).
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt: number = 0
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // Retry on rate limit or server error
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < MAX_RETRIES
      ) {
        const delay = this.getRetryDelay(response, attempt);
        await this.sleep(delay);
        return this.fetchWithRetry(url, options, attempt + 1);
      }

      return response;
    } catch (error) {
      // Network error — retry
      if (attempt < MAX_RETRIES) {
        await this.sleep(RETRY_DELAYS[attempt]);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Simple token bucket rate limiter per business.
   */
  private checkRateLimit(): void {
    const now = Date.now();
    let bucket = rateLimitMap.get(this.businessId);

    if (!bucket || now - bucket.lastRefill > RATE_LIMIT_WINDOW) {
      bucket = { tokens: RATE_LIMIT_TOKENS, lastRefill: now };
      rateLimitMap.set(this.businessId, bucket);
    }

    if (bucket.tokens <= 0) {
      throw new WhatsAppRateLimitError(
        `Rate limit exceeded for business ${this.businessId}. Try again in ${
          RATE_LIMIT_WINDOW - (now - bucket.lastRefill)
        }ms`
      );
    }

    bucket.tokens--;
  }

  /**
   * Get retry delay from response headers or use exponential backoff.
   */
  private getRetryDelay(response: Response, attempt: number): number {
    const retryAfter = response.headers.get("Retry-After");
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
    return RETRY_DELAYS[attempt] || 10000;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// ─── Custom Error Classes ───────────────────────────────────────────────────

export class WhatsAppSendError extends Error {
  code: number;
  subcode?: number;
  recipient: string;

  constructor(
    message: string,
    code: number,
    subcode: number | undefined,
    recipient: string
  ) {
    super(message);
    this.name = "WhatsAppSendError";
    this.code = code;
    this.subcode = subcode;
    this.recipient = recipient;
  }
}

export class WhatsAppRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WhatsAppRateLimitError";
  }
}
