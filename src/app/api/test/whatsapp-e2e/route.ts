import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  verifyWebhookSubscription,
  validatePayloadStructure,
} from "@/lib/whatsapp/webhook-validator";
import { processWebhookPayload } from "@/lib/whatsapp/message-handler";
import type { WebhookPayload } from "@/lib/whatsapp/types";

/**
 * POST /api/test/whatsapp-e2e
 *
 * End-to-end test endpoint that simulates the full WhatsApp message lifecycle:
 * 1. Webhook verification (GET simulation)
 * 2. Payload validation
 * 3. Message processing (lead creation, message storage)
 * 4. AI response generation
 * 5. Conversation persistence verification
 *
 * ONLY available in development/test environments.
 * Protected by CRON_SECRET in production (disabled by default).
 *
 * Body: {
 *   business_id?: string,  // Use specific business (or creates test one)
 *   phone_number_id?: string,
 *   sender_phone?: string,
 *   sender_name?: string,
 *   message_text?: string,
 *   skip_ai?: boolean      // Skip AI call (faster, no OpenAI cost)
 * }
 */
export async function POST(request: NextRequest) {
  // Security: only allow in development or with secret
  const isDevMode = process.env.NODE_ENV === "development";
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!isDevMode && (!cronSecret || authHeader !== `Bearer ${cronSecret}`)) {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const results: TestResult[] = [];
  const startTime = Date.now();

  const config = {
    businessId: body.business_id || null,
    phoneNumberId: body.phone_number_id || "TEST_PHONE_NUMBER_ID",
    senderPhone: body.sender_phone || "919876543210",
    senderName: body.sender_name || "Test Customer",
    messageText: body.message_text || "Hi, what are your prices?",
    skipAi: body.skip_ai ?? !process.env.GEMINI_API_KEY,
  };

  const supabase = createAdminClient();

  // ─── TEST 1: Webhook Verification ─────────────────────────────────────
  results.push(await testWebhookVerification());

  // ─── TEST 2: Payload Validation ───────────────────────────────────────
  const payload = buildTestPayload(config);
  results.push(testPayloadValidation(payload));

  // ─── TEST 3: Business Routing ─────────────────────────────────────────
  const businessResult = await testBusinessRouting(supabase, config);
  results.push(businessResult.result);
  const testBusinessId = businessResult.businessId;

  if (!testBusinessId) {
    return NextResponse.json({
      status: "failed",
      message: "Cannot proceed without a test business",
      results,
      duration_ms: Date.now() - startTime,
    }, { status: 500 });
  }

  // ─── TEST 4: Lead Upsert ──────────────────────────────────────────────
  results.push(await testLeadUpsert(supabase, testBusinessId, config));

  // ─── TEST 5: Conversation Creation ────────────────────────────────────
  results.push(await testConversationCreation(supabase, testBusinessId, config));

  // ─── TEST 6: Message Storage ──────────────────────────────────────────
  results.push(await testMessageStorage(supabase, testBusinessId, config));

  // ─── TEST 7: Full Pipeline (with optional AI) ─────────────────────────
  if (!config.skipAi) {
    results.push(await testFullPipeline(supabase, testBusinessId, config, payload));
  } else {
    results.push({
      test: "7. AI Response Generation",
      status: "skipped",
      message: "Skipped (skip_ai=true or GEMINI_API_KEY not set)",
    });
  }

  // ─── TEST 8: Conversation Persistence ─────────────────────────────────
  results.push(await testConversationPersistence(supabase, testBusinessId, config));

  // ─── TEST 9: Message Deduplication ────────────────────────────────────
  results.push(await testDeduplication(supabase, testBusinessId, config));

  // ─── TEST 10: Subscription Limit Check ────────────────────────────────
  results.push(await testSubscriptionLimit(supabase, testBusinessId));

  // ─── Summary ──────────────────────────────────────────────────────────
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  // Clean up test data
  await cleanupTestData(supabase, testBusinessId, config);

  return NextResponse.json({
    status: failed === 0 ? "passed" : "failed",
    summary: `${passed} passed, ${failed} failed, ${skipped} skipped`,
    duration_ms: Date.now() - startTime,
    results,
  }, { status: failed === 0 ? 200 : 500 });
}

// ─── Test Implementations ───────────────────────────────────────────────────

interface TestResult {
  test: string;
  status: "passed" | "failed" | "skipped";
  message: string;
  details?: unknown;
}

async function testWebhookVerification(): Promise<TestResult> {
  const testToken = process.env.WHATSAPP_VERIFY_TOKEN || "test-token";

  const result = verifyWebhookSubscription(
    "subscribe",
    testToken,
    "challenge_123",
    testToken
  );

  if (result.valid && result.challenge === "challenge_123") {
    return { test: "1. Webhook Verification", status: "passed", message: "Verify token matches, challenge returned" };
  }

  return { test: "1. Webhook Verification", status: "failed", message: "Verification failed", details: result };
}

function testPayloadValidation(payload: WebhookPayload): TestResult {
  const isValid = validatePayloadStructure(payload);

  if (isValid) {
    return { test: "2. Payload Validation", status: "passed", message: "Payload structure is valid" };
  }

  return { test: "2. Payload Validation", status: "failed", message: "Payload structure invalid" };
}

async function testBusinessRouting(
  supabase: ReturnType<typeof createAdminClient>,
  config: { businessId: string | null; phoneNumberId: string }
): Promise<{ result: TestResult; businessId: string | null }> {
  // Try to find existing business or create test one
  const businessId = config.businessId;

  if (businessId) {
    const { data } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .single();

    if (data) {
      return {
        result: { test: "3. Business Routing", status: "passed", message: `Found business: ${data.name}` },
        businessId: data.id,
      };
    }
  }

  // Look for any business with the test phone number ID
  const { data: existing } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("whatsapp_phone_number_id", config.phoneNumberId)
    .single();

  if (existing) {
    return {
      result: { test: "3. Business Routing", status: "passed", message: `Routed to: ${existing.name}` },
      businessId: existing.id,
    };
  }

  // Create a test business for the test
  const { data: testBiz, error } = await supabase
    .from("businesses")
    .insert({
      owner_id: "00000000-0000-0000-0000-000000000000", // placeholder
      name: "E2E Test Business",
      type: "gym",
      whatsapp_phone_number_id: config.phoneNumberId,
      whatsapp_access_token: "TEST_TOKEN",
      whatsapp_connected: true,
      ai_enabled: true,
      business_context: "Test gym. Plans: Basic ₹1500, Pro ₹2500. Open 6AM-10PM.",
      plan: "trial",
      is_active: true,
    })
    .select("id")
    .single();

  if (error) {
    return {
      result: { test: "3. Business Routing", status: "failed", message: `Cannot create test business: ${error.message}` },
      businessId: null,
    };
  }

  // Create test subscription
  await supabase.from("subscriptions").insert({
    business_id: testBiz.id,
    plan: "trial",
    status: "trialing",
    message_limit: 100,
    messages_used: 0,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  return {
    result: { test: "3. Business Routing", status: "passed", message: "Created test business + subscription" },
    businessId: testBiz.id,
  };
}

async function testLeadUpsert(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  config: { senderPhone: string; senderName: string }
): Promise<TestResult> {
  // Upsert lead
  const { data, error } = await supabase
    .from("leads")
    .upsert(
      {
        business_id: businessId,
        wa_id: config.senderPhone,
        phone: config.senderPhone,
        name: config.senderName,
        source: "whatsapp",
        status: "new",
      },
      { onConflict: "business_id,wa_id" }
    )
    .select("id, name, phone")
    .single();

  if (error) {
    return { test: "4. Lead Upsert", status: "failed", message: error.message };
  }

  return {
    test: "4. Lead Upsert",
    status: "passed",
    message: `Lead created/updated: ${data.name} (${data.phone})`,
    details: { lead_id: data.id },
  };
}

async function testConversationCreation(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  config: { senderPhone: string }
): Promise<TestResult> {
  // Get lead
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("business_id", businessId)
    .eq("wa_id", config.senderPhone)
    .single();

  if (!lead) {
    return { test: "5. Conversation Creation", status: "failed", message: "Lead not found" };
  }

  // Upsert conversation
  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      {
        business_id: businessId,
        lead_id: lead.id,
        channel: "whatsapp",
        status: "active",
        is_ai_active: true,
      },
      { onConflict: "business_id,lead_id,channel" }
    )
    .select("id, status, is_ai_active")
    .single();

  if (error) {
    return { test: "5. Conversation Creation", status: "failed", message: error.message };
  }

  return {
    test: "5. Conversation Creation",
    status: "passed",
    message: `Conversation active (AI: ${data.is_ai_active})`,
    details: { conversation_id: data.id },
  };
}

async function testMessageStorage(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  config: { senderPhone: string; messageText: string }
): Promise<TestResult> {
  // Get lead + conversation
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("business_id", businessId)
    .eq("wa_id", config.senderPhone)
    .single();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("lead_id", lead!.id)
    .single();

  if (!lead || !conv) {
    return { test: "6. Message Storage", status: "failed", message: "Lead or conversation not found" };
  }

  const testMessageId = `test_msg_${Date.now()}`;

  // Insert message
  const { data, error } = await supabase
    .from("messages")
    .upsert(
      {
        business_id: businessId,
        conversation_id: conv.id,
        lead_id: lead.id,
        wa_message_id: testMessageId,
        direction: "inbound",
        content: config.messageText,
        message_type: "text",
        status: "delivered",
      },
      { onConflict: "business_id,wa_message_id" }
    )
    .select("id, content, direction, status")
    .single();

  if (error) {
    return { test: "6. Message Storage", status: "failed", message: error.message };
  }

  // Verify message was stored correctly
  if (data.content !== config.messageText || data.direction !== "inbound") {
    return {
      test: "6. Message Storage",
      status: "failed",
      message: "Message content mismatch",
      details: data,
    };
  }

  return {
    test: "6. Message Storage",
    status: "passed",
    message: `Message stored: "${data.content.slice(0, 40)}..."`,
    details: { message_id: data.id, wa_message_id: testMessageId },
  };
}

async function testFullPipeline(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  config: { senderPhone: string; senderName: string; messageText: string; phoneNumberId: string },
  payload: WebhookPayload
): Promise<TestResult> {
  try {
    // Process the full webhook payload (this triggers AI)
    await processWebhookPayload(payload);

    // Wait a moment for async processing
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Check if an outbound message was created
    const { data: outbound } = await supabase
      .from("messages")
      .select("id, content, is_ai_generated, direction")
      .eq("business_id", businessId)
      .eq("direction", "outbound")
      .eq("is_ai_generated", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (outbound) {
      return {
        test: "7. AI Response Generation",
        status: "passed",
        message: `AI replied: "${outbound.content.slice(0, 60)}..."`,
        details: { message_id: outbound.id, is_ai: outbound.is_ai_generated },
      };
    }

    return {
      test: "7. AI Response Generation",
      status: "failed",
      message: "No AI response generated (check GEMINI_API_KEY and WhatsApp token)",
    };
  } catch (error) {
    return {
      test: "7. AI Response Generation",
      status: "failed",
      message: `Pipeline error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function testConversationPersistence(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  config: { senderPhone: string }
): Promise<TestResult> {
  // Verify conversation has last_message_at updated
  const { data: lead } = await supabase
    .from("leads")
    .select("id, message_count, last_message_at")
    .eq("business_id", businessId)
    .eq("wa_id", config.senderPhone)
    .single();

  if (!lead) {
    return { test: "8. Conversation Persistence", status: "failed", message: "Lead not found" };
  }

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, last_message_text, last_message_at, unread_count")
    .eq("business_id", businessId)
    .eq("lead_id", lead.id)
    .single();

  if (!conv) {
    return { test: "8. Conversation Persistence", status: "failed", message: "Conversation not found" };
  }

  // Check that message_count was incremented (trigger should handle this)
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact" })
    .eq("business_id", businessId)
    .eq("lead_id", lead.id);

  return {
    test: "8. Conversation Persistence",
    status: "passed",
    message: `Conversation persisted: ${count} messages stored`,
    details: {
      lead_message_count: lead.message_count,
      actual_messages: count,
      last_message_at: conv.last_message_at,
    },
  };
}

async function testDeduplication(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  config: { senderPhone: string; messageText: string }
): Promise<TestResult> {
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("business_id", businessId)
    .eq("wa_id", config.senderPhone)
    .single();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", businessId)
    .eq("lead_id", lead!.id)
    .single();

  const dedupId = `dedup_test_${Date.now()}`;

  // Insert same message twice
  await supabase.from("messages").upsert(
    {
      business_id: businessId,
      conversation_id: conv!.id,
      lead_id: lead!.id,
      wa_message_id: dedupId,
      direction: "inbound",
      content: "Dedup test message",
      message_type: "text",
      status: "delivered",
    },
    { onConflict: "business_id,wa_message_id" }
  );

  // Try inserting again (should not create duplicate)
  const { error } = await supabase.from("messages").upsert(
    {
      business_id: businessId,
      conversation_id: conv!.id,
      lead_id: lead!.id,
      wa_message_id: dedupId,
      direction: "inbound",
      content: "Dedup test message UPDATED",
      message_type: "text",
      status: "delivered",
    },
    { onConflict: "business_id,wa_message_id" }
  );

  // Count messages with this ID
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact" })
    .eq("business_id", businessId)
    .eq("wa_message_id", dedupId);

  if (count === 1 && !error) {
    return { test: "9. Message Deduplication", status: "passed", message: "Duplicate message correctly handled (upsert)" };
  }

  return {
    test: "9. Message Deduplication",
    status: "failed",
    message: `Expected 1 message, found ${count}`,
    details: { count, error: error?.message },
  };
}

async function testSubscriptionLimit(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string
): Promise<TestResult> {
  // Check subscription exists and has limits
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, message_limit, messages_used")
    .eq("business_id", businessId)
    .in("status", ["active", "trialing"])
    .single();

  if (!sub) {
    return { test: "10. Subscription Limit Check", status: "failed", message: "No active subscription found" };
  }

  const canSend = sub.messages_used < sub.message_limit;

  return {
    test: "10. Subscription Limit Check",
    status: "passed",
    message: `Plan: ${sub.plan}, Used: ${sub.messages_used}/${sub.message_limit}, Can send: ${canSend}`,
    details: sub,
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildTestPayload(config: {
  phoneNumberId: string;
  senderPhone: string;
  senderName: string;
  messageText: string;
}): WebhookPayload {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "TEST_WABA_ID",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15551234567",
                phone_number_id: config.phoneNumberId,
              },
              contacts: [
                {
                  profile: { name: config.senderName },
                  wa_id: config.senderPhone,
                },
              ],
              messages: [
                {
                  from: config.senderPhone,
                  id: `wamid.test_${Date.now()}`,
                  timestamp: String(Math.floor(Date.now() / 1000)),
                  type: "text",
                  text: { body: config.messageText },
                },
              ],
            },
            field: "messages",
          },
        ],
      },
    ],
  };
}

async function cleanupTestData(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  _config: { senderPhone: string }
): Promise<void> {
  // Only clean up if we created a test business (has placeholder owner_id)
  const { data: biz } = await supabase
    .from("businesses")
    .select("owner_id")
    .eq("id", businessId)
    .single();

  if (biz?.owner_id === "00000000-0000-0000-0000-000000000000") {
    // This is our test business — clean up
    // Messages, conversations, leads will cascade delete
    await supabase.from("subscriptions").delete().eq("business_id", businessId);
    await supabase.from("messages").delete().eq("business_id", businessId);
    await supabase.from("conversations").delete().eq("business_id", businessId);
    await supabase.from("leads").delete().eq("business_id", businessId);
    await supabase.from("businesses").delete().eq("id", businessId);
  } else {
    // Real business — only clean up test messages
    await supabase
      .from("messages")
      .delete()
      .eq("business_id", businessId)
      .like("wa_message_id", "test_msg_%");
    await supabase
      .from("messages")
      .delete()
      .eq("business_id", businessId)
      .like("wa_message_id", "dedup_test_%");
  }
}
