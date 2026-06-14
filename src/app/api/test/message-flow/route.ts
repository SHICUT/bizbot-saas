import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/test/message-flow
 *
 * Traces the ENTIRE message reply pipeline step by step.
 * Identifies exactly where the flow breaks.
 * Requires authentication (must be logged in).
 */
export async function GET() {
  const steps: Array<{ step: string; status: "pass" | "fail" | "warn"; detail: string; ms?: number }> = [];
  const start = Date.now();

  try {
    // Step 1: Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      steps.push({ step: "1. Authentication", status: "fail", detail: "Not logged in" });
      return NextResponse.json({ steps, verdict: "FAIL at Step 1" });
    }
    steps.push({ step: "1. Authentication", status: "pass", detail: `User: ${user.email}` });

    // Step 2: Business lookup
    const admin = createAdminClient();
    const { data: business, error: bizErr } = await admin
      .from("businesses")
      .select("id, name, type, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_connected, ai_enabled, ai_tone, ai_language, business_context, is_active")
      .eq("owner_id", user.id)
      .single();

    if (bizErr || !business) {
      steps.push({ step: "2. Business Lookup", status: "fail", detail: `Error: ${bizErr?.message || "No business found"}` });
      return NextResponse.json({ steps, verdict: "FAIL at Step 2" });
    }
    steps.push({ step: "2. Business Lookup", status: "pass", detail: `${business.name} (${business.id.substring(0, 8)})` });

    // Step 3: WhatsApp connection
    if (!business.whatsapp_phone_number_id) {
      steps.push({ step: "3. WhatsApp phone_number_id", status: "fail", detail: "NULL — Go to Settings → Connect WhatsApp" });
      return NextResponse.json({ steps, verdict: "FAIL at Step 3: phone_number_id not set" });
    }
    steps.push({ step: "3. WhatsApp phone_number_id", status: "pass", detail: business.whatsapp_phone_number_id });

    if (!business.whatsapp_access_token) {
      steps.push({ step: "4. WhatsApp access_token", status: "fail", detail: "NULL — token not saved" });
      return NextResponse.json({ steps, verdict: "FAIL at Step 4: access_token missing" });
    }
    const tokenPreview = business.whatsapp_access_token.substring(0, 15) + `... (${business.whatsapp_access_token.length} chars)`;
    steps.push({ step: "4. WhatsApp access_token", status: "pass", detail: tokenPreview });

    if (!business.whatsapp_connected) {
      steps.push({ step: "5. whatsapp_connected flag", status: "warn", detail: "false — but token exists, may still work" });
    } else {
      steps.push({ step: "5. whatsapp_connected flag", status: "pass", detail: "true" });
    }

    // Step 6: AI enabled
    if (!business.ai_enabled) {
      steps.push({ step: "6. AI Enabled", status: "fail", detail: "ai_enabled = false — AI will not reply" });
      return NextResponse.json({ steps, verdict: "FAIL at Step 6: AI is disabled" });
    }
    steps.push({ step: "6. AI Enabled", status: "pass", detail: `tone=${business.ai_tone}, lang=${business.ai_language}` });

    // Step 7: Business context
    const contextLen = business.business_context?.length || 0;
    if (contextLen < 30) {
      steps.push({ step: "7. Business Context (Knowledge)", status: "warn", detail: `Only ${contextLen} chars — AI may give generic replies. Fill Knowledge Base.` });
    } else {
      steps.push({ step: "7. Business Context (Knowledge)", status: "pass", detail: `${contextLen} chars of context loaded` });
    }

    // Step 8: Subscription / message limit
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan, status, message_limit, messages_used, current_period_end")
      .eq("business_id", business.id)
      .in("status", ["active", "trialing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!sub) {
      steps.push({ step: "8. Subscription", status: "fail", detail: "No active subscription — AI blocked" });
      return NextResponse.json({ steps, verdict: "FAIL at Step 8: No subscription" });
    }

    const isExpired = sub.current_period_end && new Date(sub.current_period_end) < new Date();
    if (isExpired) {
      steps.push({ step: "8. Subscription", status: "fail", detail: `Expired on ${sub.current_period_end}` });
      return NextResponse.json({ steps, verdict: "FAIL at Step 8: Subscription expired" });
    }

    if (sub.messages_used >= sub.message_limit) {
      steps.push({ step: "8. Subscription", status: "fail", detail: `Limit reached: ${sub.messages_used}/${sub.message_limit}` });
      return NextResponse.json({ steps, verdict: "FAIL at Step 8: AI reply limit reached" });
    }
    steps.push({ step: "8. Subscription", status: "pass", detail: `${sub.plan} | ${sub.messages_used}/${sub.message_limit} used | ${sub.status}` });

    // Step 9: AI Provider
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (!groqKey && !geminiKey && !openaiKey) {
      steps.push({ step: "9. AI Provider Keys", status: "fail", detail: "No AI keys set (GROQ_API_KEY, GEMINI_API_KEY, OPENAI_API_KEY)" });
      return NextResponse.json({ steps, verdict: "FAIL at Step 9: No AI provider configured" });
    }
    const providers = [groqKey && "Groq", geminiKey && "Gemini", openaiKey && "OpenAI"].filter(Boolean);
    steps.push({ step: "9. AI Provider Keys", status: "pass", detail: `Available: ${providers.join(", ")}` });

    // Step 10: Test Groq API
    if (groqKey) {
      const t0 = Date.now();
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: "Say hi" }], max_tokens: 10 }),
        });
        const ms = Date.now() - t0;
        if (res.ok) {
          const data = await res.json();
          steps.push({ step: "10. Groq API Test", status: "pass", detail: `Response: "${data.choices?.[0]?.message?.content}" (${ms}ms)`, ms });
        } else {
          const err = await res.json().catch(() => ({}));
          steps.push({ step: "10. Groq API Test", status: "fail", detail: `HTTP ${res.status}: ${err?.error?.message || "Unknown"}`, ms });
        }
      } catch (e) {
        steps.push({ step: "10. Groq API Test", status: "fail", detail: `Exception: ${e instanceof Error ? e.message : String(e)}` });
      }
    } else {
      steps.push({ step: "10. Groq API Test", status: "warn", detail: "Skipped — GROQ_API_KEY not set" });
    }

    // Step 11: Test WhatsApp Send API (dry — just validate token)
    const t1 = Date.now();
    try {
      const waRes = await fetch(`https://graph.facebook.com/v23.0/${business.whatsapp_phone_number_id}`, {
        headers: { Authorization: `Bearer ${business.whatsapp_access_token}` },
      });
      const ms = Date.now() - t1;
      if (waRes.ok) {
        const waData = await waRes.json();
        steps.push({ step: "11. WhatsApp Token Validation", status: "pass", detail: `Phone: ${waData.display_phone_number || waData.id} (${ms}ms)`, ms });
      } else {
        const waErr = await waRes.json().catch(() => ({}));
        steps.push({ step: "11. WhatsApp Token Validation", status: "fail", detail: `HTTP ${waRes.status}: ${waErr?.error?.message || "Token invalid/expired"}`, ms });
      }
    } catch (e) {
      steps.push({ step: "11. WhatsApp Token Validation", status: "fail", detail: `Exception: ${e instanceof Error ? e.message : String(e)}` });
    }

    // Final verdict
    const failures = steps.filter((s) => s.status === "fail");
    const warnings = steps.filter((s) => s.status === "warn");
    const totalMs = Date.now() - start;

    const verdict = failures.length > 0
      ? `FAIL — ${failures.length} issue(s): ${failures.map((f) => f.step).join(", ")}`
      : warnings.length > 0
        ? `PASS WITH WARNINGS — ${warnings.length} warning(s)`
        : "ALL CHECKS PASSED ✓";

    return NextResponse.json({ steps, verdict, totalMs, failures: failures.length, warnings: warnings.length });

  } catch (err) {
    steps.push({ step: "UNEXPECTED", status: "fail", detail: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ steps, verdict: "UNEXPECTED ERROR" });
  }
}
