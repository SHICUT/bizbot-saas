/**
 * WhatsApp E2E Test Runner
 *
 * Run: npx tsx scripts/test-whatsapp-e2e.ts
 *
 * Prerequisites:
 * - App running locally (npm run dev)
 * - .env.local configured with Supabase credentials
 * - Database migrations applied
 *
 * Optional:
 * - GEMINI_API_KEY set (for AI response test)
 * - Real WhatsApp credentials (for send test)
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const CRON_SECRET = process.env.CRON_SECRET || "";

interface TestResult {
  test: string;
  status: "passed" | "failed" | "skipped";
  message: string;
  details?: unknown;
}

async function runTests() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║     WhatsApp E2E Test Suite — BizBot AI                 ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const results: TestResult[] = [];

  // Test 1: Health Check
  console.log("⏳ Test 1: Health Check...");
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    const data = await res.json();
    if (res.ok && data.status === "healthy") {
      results.push({ test: "Health Check", status: "passed", message: `Status: ${data.status}` });
      console.log("  ✅ PASSED — App is healthy");
    } else {
      results.push({ test: "Health Check", status: "failed", message: JSON.stringify(data) });
      console.log("  ❌ FAILED —", data);
    }
  } catch (e) {
    results.push({ test: "Health Check", status: "failed", message: `Cannot reach ${BASE_URL}` });
    console.log(`  ❌ FAILED — Cannot reach ${BASE_URL}. Is the dev server running?`);
    printSummary(results);
    process.exit(1);
  }

  // Test 2: Webhook Verification (GET)
  console.log("⏳ Test 2: Webhook Verification...");
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "test-verify-token";
  try {
    const res = await fetch(
      `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=test_challenge_123`
    );
    const text = await res.text();
    if (res.ok && text === "test_challenge_123") {
      results.push({ test: "Webhook Verification", status: "passed", message: "Challenge returned correctly" });
      console.log("  ✅ PASSED — Challenge returned");
    } else {
      results.push({ test: "Webhook Verification", status: "failed", message: `Got: ${text}` });
      console.log("  ❌ FAILED — Expected challenge, got:", text);
    }
  } catch (e) {
    results.push({ test: "Webhook Verification", status: "failed", message: String(e) });
    console.log("  ❌ FAILED —", e);
  }

  // Test 3: Webhook Verification (wrong token)
  console.log("⏳ Test 3: Webhook Rejects Bad Token...");
  try {
    const res = await fetch(
      `${BASE_URL}/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG_TOKEN&hub.challenge=test`
    );
    if (res.status === 403) {
      results.push({ test: "Webhook Rejects Bad Token", status: "passed", message: "403 returned for invalid token" });
      console.log("  ✅ PASSED — 403 for bad token");
    } else {
      results.push({ test: "Webhook Rejects Bad Token", status: "failed", message: `Got status ${res.status}` });
      console.log("  ❌ FAILED — Expected 403, got:", res.status);
    }
  } catch (e) {
    results.push({ test: "Webhook Rejects Bad Token", status: "failed", message: String(e) });
    console.log("  ❌ FAILED —", e);
  }

  // Test 4: Webhook POST (valid payload)
  console.log("⏳ Test 4: Webhook Accepts Valid Payload...");
  try {
    const payload = {
      object: "whatsapp_business_account",
      entry: [{
        id: "TEST_WABA",
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { display_phone_number: "15551234567", phone_number_id: "TEST_PHONE_ID" },
            contacts: [{ profile: { name: "Test User" }, wa_id: "919999999999" }],
            messages: [{
              from: "919999999999",
              id: `wamid.test_${Date.now()}`,
              timestamp: String(Math.floor(Date.now() / 1000)),
              type: "text",
              text: { body: "Hello test" },
            }],
          },
          field: "messages",
        }],
      }],
    };

    const res = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (res.ok && data.status === "received") {
      results.push({ test: "Webhook Accepts Payload", status: "passed", message: "200 OK, status: received" });
      console.log("  ✅ PASSED — Payload accepted");
    } else {
      results.push({ test: "Webhook Accepts Payload", status: "failed", message: JSON.stringify(data) });
      console.log("  ❌ FAILED —", data);
    }
  } catch (e) {
    results.push({ test: "Webhook Accepts Payload", status: "failed", message: String(e) });
    console.log("  ❌ FAILED —", e);
  }

  // Test 5: Webhook POST (invalid payload)
  console.log("⏳ Test 5: Webhook Rejects Invalid Payload...");
  try {
    const res = await fetch(`${BASE_URL}/api/webhooks/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: "invalid", entry: [] }),
    });

    if (res.status === 400) {
      results.push({ test: "Webhook Rejects Invalid", status: "passed", message: "400 for invalid payload" });
      console.log("  ✅ PASSED — Invalid payload rejected");
    } else {
      results.push({ test: "Webhook Rejects Invalid", status: "failed", message: `Got status ${res.status}` });
      console.log("  ❌ FAILED — Expected 400, got:", res.status);
    }
  } catch (e) {
    results.push({ test: "Webhook Rejects Invalid", status: "failed", message: String(e) });
    console.log("  ❌ FAILED —", e);
  }

  // Test 6: Protected Route (no auth)
  console.log("⏳ Test 6: Protected Routes Require Auth...");
  try {
    const res = await fetch(`${BASE_URL}/api/auth/me`);
    if (res.status === 401 || res.status === 302) {
      results.push({ test: "Protected Routes", status: "passed", message: `Returns ${res.status} without auth` });
      console.log(`  ✅ PASSED — Returns ${res.status} without auth`);
    } else {
      results.push({ test: "Protected Routes", status: "failed", message: `Got ${res.status}` });
      console.log("  ❌ FAILED — Expected 401/302, got:", res.status);
    }
  } catch (e) {
    results.push({ test: "Protected Routes", status: "failed", message: String(e) });
    console.log("  ❌ FAILED —", e);
  }

  // Test 7: Cron Endpoint (with secret)
  console.log("⏳ Test 7: Cron Endpoint Auth...");
  if (CRON_SECRET) {
    try {
      const res = await fetch(`${BASE_URL}/api/cron/follow-ups`, {
        headers: { Authorization: `Bearer ${CRON_SECRET}` },
      });
      const data = await res.json();
      if (res.ok) {
        results.push({ test: "Cron Auth", status: "passed", message: "Cron endpoint accessible with secret" });
        console.log("  ✅ PASSED — Cron accessible with secret");
      } else {
        results.push({ test: "Cron Auth", status: "failed", message: JSON.stringify(data) });
        console.log("  ❌ FAILED —", data);
      }
    } catch (e) {
      results.push({ test: "Cron Auth", status: "failed", message: String(e) });
      console.log("  ❌ FAILED —", e);
    }
  } else {
    results.push({ test: "Cron Auth", status: "skipped", message: "CRON_SECRET not set" });
    console.log("  ⏭️  SKIPPED — CRON_SECRET not set");
  }

  // Test 8: Full E2E (if database is connected)
  console.log("⏳ Test 8: Full E2E Pipeline...");
  try {
    const res = await fetch(`${BASE_URL}/api/test/whatsapp-e2e`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(CRON_SECRET && { Authorization: `Bearer ${CRON_SECRET}` }),
      },
      body: JSON.stringify({
        message_text: "What are your gym membership prices?",
        skip_ai: true,
      }),
    });
    const data = await res.json();

    if (res.ok) {
      results.push({ test: "Full E2E Pipeline", status: "passed", message: data.summary, details: data.results });
      console.log(`  ✅ PASSED — ${data.summary} (${data.duration_ms}ms)`);
    } else if (res.status === 403) {
      results.push({ test: "Full E2E Pipeline", status: "skipped", message: "Not in dev mode and no CRON_SECRET" });
      console.log("  ⏭️  SKIPPED — Not in dev mode");
    } else {
      results.push({ test: "Full E2E Pipeline", status: "failed", message: data.summary || data.error, details: data.results });
      console.log(`  ❌ FAILED — ${data.summary || data.error}`);
      if (data.results) {
        for (const r of data.results) {
          if (r.status === "failed") {
            console.log(`     └─ ${r.test}: ${r.message}`);
          }
        }
      }
    }
  } catch (e) {
    results.push({ test: "Full E2E Pipeline", status: "failed", message: String(e) });
    console.log("  ❌ FAILED —", e);
  }

  printSummary(results);
}

function printSummary(results: TestResult[]) {
  const passed = results.filter((r) => r.status === "passed").length;
  const failed = results.filter((r) => r.status === "failed").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  console.log("\n══════════════════════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log("══════════════════════════════════════════════════════════");

  if (failed > 0) {
    console.log("\n  Failed tests:");
    for (const r of results.filter((r) => r.status === "failed")) {
      console.log(`    ❌ ${r.test}: ${r.message}`);
    }
    console.log("");
    process.exit(1);
  } else {
    console.log("\n  ✅ All tests passed!\n");
    process.exit(0);
  }
}

runTests();
