import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * GET /api/admin/health — System health check
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const checks: Array<{ name: string; status: "healthy" | "warning" | "offline"; responseMs: number; message: string }> = [];

  // Database check
  const dbStart = Date.now();
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("businesses").select("id", { count: "exact", head: true });
    const dbMs = Date.now() - dbStart;
    if (error) {
      checks.push({ name: "Database", status: "warning", responseMs: dbMs, message: error.message });
    } else {
      checks.push({ name: "Database", status: dbMs > 2000 ? "warning" : "healthy", responseMs: dbMs, message: dbMs > 2000 ? "Slow response" : "Connected" });
    }
  } catch {
    checks.push({ name: "Database", status: "offline", responseMs: Date.now() - dbStart, message: "Connection failed" });
  }

  // Supabase Auth check
  const authStart = Date.now();
  try {
    const { error } = await supabase.auth.getUser();
    const authMs = Date.now() - authStart;
    checks.push({ name: "Supabase Auth", status: error ? "warning" : "healthy", responseMs: authMs, message: error ? error.message : "Working" });
  } catch {
    checks.push({ name: "Supabase Auth", status: "offline", responseMs: Date.now() - authStart, message: "Auth service unavailable" });
  }

  // Gemini AI check
  const aiStart = Date.now();
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    checks.push({ name: "AI (Gemini)", status: "healthy", responseMs: Date.now() - aiStart, message: "API key configured" });
  } else {
    checks.push({ name: "AI (Gemini)", status: "offline", responseMs: 0, message: "GEMINI_API_KEY not set" });
  }

  // WhatsApp API check (verify token exists)
  const waToken = process.env.WHATSAPP_VERIFY_TOKEN;
  checks.push({
    name: "WhatsApp Webhook",
    status: waToken ? "healthy" : "warning",
    responseMs: 0,
    message: waToken ? "Verify token configured" : "WHATSAPP_VERIFY_TOKEN not set",
  });

  // Payment (Razorpay) check
  const rzpKey = process.env.RAZORPAY_KEY_ID;
  checks.push({
    name: "Payments",
    status: rzpKey ? "healthy" : "warning",
    responseMs: 0,
    message: rzpKey ? "Razorpay configured" : "Payment keys not set",
  });

  const overall = checks.every((c) => c.status === "healthy") ? "healthy" : checks.some((c) => c.status === "offline") ? "offline" : "warning";

  return NextResponse.json({ overall, checks, timestamp: new Date().toISOString() });
}
