import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { assignLead } from "@/lib/crm/lead-assignment";
import { sendNotification } from "@/lib/crm/notification-engine";
import { checkRateLimit, RATE_LIMITS, getClientIdentifier, getRateLimitHeaders } from "@/lib/security/rate-limiter";
import crypto from "crypto";

/**
 * Website Lead API — Public endpoint for external lead submission
 *
 * POST /api/leads/inbound
 * Headers: x-api-key: fn_xxxxxxxxxxxxxxxx
 * Body: { name, phone, email?, source?, budget?, location?, property_type?, message? }
 *
 * Security:
 * - API key authentication (hashed, rate-limited)
 * - Input validation & sanitization
 * - Rate limiting (100/day per key)
 * - Spam protection (duplicate phone within 1 hour)
 */

export async function POST(request: NextRequest) {
  // Rate limit by IP (prevents brute-force key guessing)
  const clientId = getClientIdentifier(request);
  const rateCheck = checkRateLimit(`inbound:${clientId}`, RATE_LIMITS.api);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: getRateLimitHeaders(rateCheck) }
    );
  }

  const apiKey = request.headers.get("x-api-key");
  if (!apiKey) {
    return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 1. Validate API key
  const keyHash = crypto.createHash("sha256").update(apiKey).digest("hex");
  const { data: keyRecord } = await admin
    .from("api_keys")
    .select("id, business_id, is_active, requests_today, rate_limit")
    .eq("key_hash", keyHash)
    .single();

  if (!keyRecord || !keyRecord.is_active) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // 2. Rate limit check
  if (keyRecord.requests_today >= keyRecord.rate_limit) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again tomorrow." }, { status: 429 });
  }

  // 3. Parse and validate body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const phone = sanitize(body.phone as string);
  const name = sanitize(body.name as string);

  if (!phone || phone.length < 10) {
    return NextResponse.json({ error: "Valid phone number is required" }, { status: 400 });
  }

  // 4. Spam protection — no duplicate phone within 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing } = await admin
    .from("leads")
    .select("id")
    .eq("business_id", keyRecord.business_id)
    .eq("phone", phone)
    .gte("created_at", oneHourAgo)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "Lead already submitted recently", lead_id: existing[0].id }, { status: 409 });
  }

  // 5. Create lead
  const metadata: Record<string, unknown> = {};
  if (body.budget) metadata.budget = sanitize(body.budget as string);
  if (body.location) metadata.location = sanitize(body.location as string);
  if (body.property_type) metadata.property_type = sanitize(body.property_type as string);
  if (body.message) metadata.initial_message = sanitize(body.message as string);
  if (body.utm_source) metadata.utm_source = sanitize(body.utm_source as string);
  if (body.utm_campaign) metadata.utm_campaign = sanitize(body.utm_campaign as string);
  if (body.page_url) metadata.page_url = sanitize(body.page_url as string);

  const source = sanitize(body.source as string) || "website";

  const { data: lead, error } = await admin.from("leads").insert({
    business_id: keyRecord.business_id,
    phone,
    name: name || null,
    email: body.email ? sanitize(body.email as string) : null,
    source,
    status: "new",
    score: 30,
    lead_temperature: "warm",
    metadata,
    wa_id: phone, // use phone as wa_id for website leads
    first_message_at: new Date().toISOString(),
    last_message_at: new Date().toISOString(),
  }).select("id").single();

  if (error) {
    // Duplicate — upsert the existing lead instead
    if (error.code === "23505") {
      const { data: existingLead } = await admin.from("leads")
        .select("id").eq("business_id", keyRecord.business_id).eq("phone", phone).single();
      if (existingLead) {
        // Update metadata with new info
        await admin.from("leads").update({
          metadata, last_message_at: new Date().toISOString(),
        }).eq("id", existingLead.id);

        return NextResponse.json({ success: true, lead_id: existingLead.id, status: "updated" });
      }
    }
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }

  // 6. Increment API key usage
  await admin.from("api_keys").update({
    requests_today: keyRecord.requests_today + 1,
    last_used_at: new Date().toISOString(),
  }).eq("id", keyRecord.id);

  // 7. Auto-assign lead (non-blocking)
  assignLead(keyRecord.business_id, lead.id, metadata).catch((e) =>
    console.error("[WebLead] Assignment failed:", e)
  );

  // 8. Send notification (non-blocking)
  sendNotification({
    businessId: keyRecord.business_id,
    type: "new_lead",
    title: `New lead from ${source}`,
    body: `${name || phone} — ${metadata.budget || ""}${metadata.location ? ` in ${metadata.location}` : ""}`,
    metadata: { lead_id: lead.id, source, phone },
  }).catch((e) => console.error("[WebLead] Notification failed:", e));

  return NextResponse.json({ success: true, lead_id: lead.id, status: "created" }, { status: 201 });
}

/** CORS preflight for cross-origin website forms */
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      "Access-Control-Max-Age": "86400",
    },
  });
}

function sanitize(value: string | undefined | null): string {
  if (!value) return "";
  return String(value).trim().slice(0, 500);
}
