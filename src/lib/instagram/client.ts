import type {
  IGSendMessagePayload,
  IGSendMessageResponse,
  IGAccountInfo,
  IGUserProfile,
} from "./types";

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 10000];

/**
 * Instagram Messaging API Client
 *
 * Uses the Instagram Graph API via Facebook Page tokens.
 * Instagram DMs are accessed through the Page that's linked to the IG account.
 */
export class InstagramClient {
  private pageId: string;
  private accessToken: string;
  private businessId: string;

  constructor(config: { page_id: string; access_token: string; business_id: string }) {
    this.pageId = config.page_id;
    this.accessToken = config.access_token;
    this.businessId = config.business_id;
  }

  /**
   * Send a text message to an Instagram user.
   */
  async sendTextMessage(recipientId: string, text: string): Promise<IGSendMessageResponse> {
    const payload: IGSendMessagePayload = {
      recipient: { id: recipientId },
      message: { text },
      messaging_type: "RESPONSE",
    };

    return this.sendMessage(payload);
  }

  /**
   * Send an image message.
   */
  async sendImageMessage(recipientId: string, imageUrl: string): Promise<IGSendMessageResponse> {
    const payload: IGSendMessagePayload = {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: "image",
          payload: { url: imageUrl },
        },
      },
      messaging_type: "RESPONSE",
    };

    return this.sendMessage(payload);
  }

  /**
   * Get Instagram account info.
   */
  async getAccountInfo(igAccountId: string): Promise<IGAccountInfo> {
    const url = `${GRAPH_API_BASE}/${igAccountId}?fields=id,username,name,profile_picture_url,followers_count`;
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    return response.json();
  }

  /**
   * Get user profile who sent a message.
   */
  async getUserProfile(userId: string): Promise<IGUserProfile> {
    const url = `${GRAPH_API_BASE}/${userId}?fields=id,username,name,profile_pic`;
    const response = await this.fetchWithRetry(url, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const data = await response.json();
    return data;
  }

  /**
   * Core send method with retry logic.
   */
  private async sendMessage(payload: IGSendMessagePayload): Promise<IGSendMessageResponse> {
    const url = `${GRAPH_API_BASE}/${this.pageId}/messages`;

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
      throw new Error(`Instagram API error: ${JSON.stringify(data.error || data)}`);
    }

    return data as IGSendMessageResponse;
  }

  /**
   * Fetch with exponential backoff retry.
   */
  private async fetchWithRetry(url: string, options: RequestInit, attempt: number = 0): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
        await this.sleep(RETRY_DELAYS[attempt]);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      return response;
    } catch (error) {
      if (attempt < MAX_RETRIES) {
        await this.sleep(RETRY_DELAYS[attempt]);
        return this.fetchWithRetry(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
