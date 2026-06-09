import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/webhooks/test-flow
 * Tests the complete WhatsApp reply flow without sending a real message.
 * Shows exactly where it would fail.
 */
export async function GET() {
  const results: string[] = [];
  const supabase = createAdminClient();

  // Step 1: Find a connected business
  results.push("=== TESTING WHATSAPP REPLY FLOW ===");

  const { data: businesses, error: bizErr } = await supabase
    .from("businesses")
    .select("id, name, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_connected, ai_enabled, business_context")
    .eq("whatsapp_connected", true)
    .limit(1);

  if (bizErr) {
    results.push(`❌ DB Error: ${bizErr.message}`);
    return NextResponse.json({ results });
  }

  if (!businesses || businesses.length === 0) {
    results.push("❌ No connected WhatsApp businesses found");
    results.push("Fix: Connect WhatsApp in Settings page");
    return NextResponse.json({ results });
  }

  const biz = businesses[0];
  results.push(`✓ Business: ${biz.name} (${biz.id.substring(0, 8)})`);
  results.push(`  Phone Number ID: ${biz.whatsapp_phone_number_id}`);
  results.push(`  Token: ${biz.whatsapp_access_token ? biz.whatsapp_access_token.substring(0, 20) + "... (" + biz.whatsapp_access_token.length + " chars)" : "❌ NO TOKEN"}`);
  results.push(`  AI Enabled: ${biz.ai_enabled}`);
  results.push(`  Context length: ${biz.business_context?.length || 0} chars`);

  // Step 2: Check subscription
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, messages_used, message_limit, current_period_end")
    .eq("business_id", biz.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub) {
    results.push("❌ No active subscription found");
    results.push("Fix: Activate trial or upgrade plan");
    return NextResponse.json({ results });
  }

  results.push(`✓ Subscription: ${sub.status} | ${sub.messages_used}/${sub.message_limit} AI replies used`);

  const expired = sub.current_period_end && new Date(sub.current_period_end) < new Date();
  if (expired) {
    results.push("❌ Subscription EXPIRED");
    return NextResponse.json({ results });
  }

  if (sub.messages_used >= sub.message_limit) {
    results.push("❌ AI reply limit reached");
    return NextResponse.json({ results });
  }

  results.push("✓ Can send messages");

  // Step 3: Test WhatsApp API access
  results.push("");
  results.push("=== TESTING WHATSAPP API ===");

  const testUrl = `https://graph.facebook.com/v23.0/${biz.whatsapp_phone_number_id}`;
  results.push(`Testing: GET ${testUrl}`);

  try {
    const res = await fetch(testUrl, {
      headers: { Authorization: `Bearer ${biz.whatsapp_access_token}` },
    });
    const data = await res.json();

    if (res.ok) {
      results.push(`✓ Phone number accessible: ${data.display_phone_number || data.verified_name || "OK"}`);
    } else {
      results.push(`❌ API Error (${res.status}): ${data?.error?.message || JSON.stringify(data)}`);
      results.push("");
      results.push("=== DIAGNOSIS ===");
      if (data?.error?.code === 100) {
        results.push("The access token CANNOT access this Phone Number ID.");
        results.push("Possible causes:");
        results.push("1. Token was generated from a DIFFERENT Meta App");
        results.push("2. Token is a User token, not a System User token");
        results.push("3. System User doesn't have the WABA asset assigned");
        results.push("");
        results.push("FIX: In Meta Business Suite → Business Settings → System Users:");
        results.push("1. Select your System User");
        results.push("2. Click 'Add Assets'");
        results.push("3. Add your WhatsApp Business Account");
        results.push("4. Regenerate the token");
        results.push("5. Update in BizBot Settings");
      }
    }
  } catch (err) {
    results.push(`❌ Network error: ${err}`);
  }

  return NextResponse.json({ results });
}
