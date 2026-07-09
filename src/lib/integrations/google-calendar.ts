/**
 * Google Calendar Integration
 *
 * Creates, updates, and cancels calendar events when site visits are booked.
 *
 * SETUP REQUIRED:
 * 1. Go to https://console.cloud.google.com
 * 2. Create project → Enable "Google Calendar API"
 * 3. Create OAuth 2.0 credentials (Web application)
 * 4. Set redirect URI: https://your-domain.com/api/integrations/google/callback
 * 5. Add to .env.local:
 *    GOOGLE_CLIENT_ID=your_client_id
 *    GOOGLE_CLIENT_SECRET=your_client_secret
 *    GOOGLE_REDIRECT_URI=https://your-domain.com/api/integrations/google/callback
 *
 * The integration stores refresh tokens in the businesses table (google_tokens JSONB).
 * Access tokens are refreshed automatically before each API call.
 */

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3";

interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix ms
}

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  attendees?: Array<{ email: string; displayName?: string }>;
  reminders?: { useDefault: boolean; overrides?: Array<{ method: string; minutes: number }> };
}

// ─── OAuth Flow ─────────────────────────────────────────────────────────────

/**
 * Generate the Google OAuth authorization URL.
 * Redirects user to Google to grant calendar access.
 */
export function getGoogleAuthUrl(state: string): string | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    console.warn("[GCal] GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI not configured");
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 * Called by the OAuth callback route.
 */
export async function exchangeCodeForTokens(code: string): Promise<GoogleTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[GCal] Token exchange failed:", err);
    return null;
  }

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Refresh an expired access token using the refresh token.
 */
async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) return null;

  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) return null;

  const data = await res.json();
  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Refresh token doesn't change
    expires_at: Date.now() + (data.expires_in * 1000),
  };
}

/**
 * Get a valid access token, refreshing if needed.
 */
async function getValidToken(tokens: GoogleTokens): Promise<string | null> {
  if (Date.now() < tokens.expires_at - 60000) {
    return tokens.access_token; // Still valid (with 1-min buffer)
  }

  const refreshed = await refreshAccessToken(tokens.refresh_token);
  if (!refreshed) return null;

  // Note: caller should persist the new tokens
  return refreshed.access_token;
}

// ─── Calendar Operations ────────────────────────────────────────────────────

/**
 * Create a Google Calendar event for a site visit.
 */
export async function createCalendarEvent(
  tokens: GoogleTokens,
  event: {
    title: string;
    description?: string;
    location?: string;
    startTime: string;   // ISO string
    endTime: string;     // ISO string
    attendeeEmail?: string;
    attendeeName?: string;
    timeZone?: string;
  }
): Promise<{ eventId: string; htmlLink: string } | null> {
  const accessToken = await getValidToken(tokens);
  if (!accessToken) {
    console.error("[GCal] Cannot get valid access token");
    return null;
  }

  const tz = event.timeZone || "Asia/Kolkata";

  const calendarEvent: CalendarEvent = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startTime, timeZone: tz },
    end: { dateTime: event.endTime, timeZone: tz },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 60 },    // 1 hour before
        { method: "popup", minutes: 1440 },  // 1 day before
      ],
    },
  };

  if (event.attendeeEmail) {
    calendarEvent.attendees = [{ email: event.attendeeEmail, displayName: event.attendeeName }];
  }

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(calendarEvent),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("[GCal] Create event failed:", err);
    return null;
  }

  const data = await res.json();
  return { eventId: data.id, htmlLink: data.htmlLink };
}

/**
 * Update (reschedule) an existing calendar event.
 */
export async function updateCalendarEvent(
  tokens: GoogleTokens,
  eventId: string,
  updates: {
    title?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    description?: string;
    timeZone?: string;
  }
): Promise<boolean> {
  const accessToken = await getValidToken(tokens);
  if (!accessToken) return false;

  const tz = updates.timeZone || "Asia/Kolkata";
  const patch: Record<string, unknown> = {};

  if (updates.title) patch.summary = updates.title;
  if (updates.location) patch.location = updates.location;
  if (updates.description) patch.description = updates.description;
  if (updates.startTime) patch.start = { dateTime: updates.startTime, timeZone: tz };
  if (updates.endTime) patch.end = { dateTime: updates.endTime, timeZone: tz };

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(patch),
  });

  return res.ok;
}

/**
 * Cancel (delete) a calendar event.
 */
export async function cancelCalendarEvent(
  tokens: GoogleTokens,
  eventId: string
): Promise<boolean> {
  const accessToken = await getValidToken(tokens);
  if (!accessToken) return false;

  const res = await fetch(`${GOOGLE_CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.ok || res.status === 410; // 410 = already deleted
}

/**
 * Check if Google Calendar is configured and connected for a business.
 */
export function isCalendarConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export type { GoogleTokens };
