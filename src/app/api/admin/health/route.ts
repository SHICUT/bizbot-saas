import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * GET /api/admin/health — Comprehensive system health check
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  type Check = { name: string; status: "healthy" | "warning" | "offline"; responseMs: number; message: string; category: string };
  const checks: Check[] = [];

  // ─── Database ───
  const dbStart = Date.now();
  try {
    const { count, error } = await admin.from("businesses").select("id", { count: "exact", head: true });
    const ms = Date.now() - dbStart;
    checks.push({ name: "Database", status: error ? "warning" : ms > 3000 ? "warning" : "healthy", responseMs: ms, message: error ? error.message : `${count} businesses • ${ms}ms`, category: "core" });
  } catch { checks.push({ name: "Database", status: "offline", responseMs: Date.now() - dbStart, message: "Connection failed", category: "core" }); }

  // ─── Supabase Auth ───
  const authStart = Date.now();
  try {
    const { error } = await supabase.auth.getUser();
    const ms = Date.now() - authStart;
    checks.push({ name: "Supabase Auth", status: error ? "warning" : "healthy", responseMs: ms, message: error ? error.message : "Authenticated", category: "core" });
  } catch { checks.push({ name: "Supabase Auth", status: "offline", responseMs: Date.now() - authStart, message: "Auth unavailable", category: "core" }); }

  // ─── Gemini AI ───
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const aiStart = Date.now();
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`, { method: "GET" });
      const ms = Date.now() - aiStart;
      checks.push({ name: "Gemini AI", status: res.ok ? "healthy" : "warning", responseMs: ms, message: res.ok ? `API reachable • ${ms}ms` : `Status ${res.status}`, category: "ai" });
    } catch { checks.push({ name: "Gemini AI", status: "offline", responseMs: Date.now() - aiStart, message: "Cannot reach Gemini API", category: "ai" }); }
  } else {
    checks.push({ name: "Gemini AI", status: "offline", responseMs: 0, message: "GEMINI_API_KEY not configured", category: "ai" });
  }

  // ─── WhatsApp ───
  const waConnected = await admin.from("businesses").select("id", { count: "exact", head: true }).eq("whatsapp_connected", true);
  const waDisconnected = await admin.from("businesses").select("id", { count: "exact", head: true }).eq("whatsapp_connected", false);
  const lastInbound = await admin.from("messages").select("created_at").eq("direction", "inbound").order("created_at", { ascending: false }).limit(1).single();
  const lastOutbound = await admin.from("messages").select("created_at").eq("direction", "outbound").order("created_at", { ascending: false }).limit(1).single();

  const lastInTime = lastInbound.data?.created_at ? new Date(lastInbound.data.created_at) : null;
  const lastOutTime = lastOutbound.data?.created_at ? new Date(lastOutbound.data.created_at) : null;
  const waHealthy = lastInTime && (now.getTime() - lastInTime.getTime()) < 24 * 60 * 60 * 1000;

  checks.push({
    name: "WhatsApp API",
    status: (waConnected.count || 0) > 0 ? (waHealthy ? "healthy" : "warning") : "offline",
    responseMs: 0,
    message: `${waConnected.count || 0} connected • ${waDisconnected.count || 0} disconnected`,
    category: "whatsapp",
  });
  checks.push({
    name: "WhatsApp Webhook",
    status: lastInTime ? (waHealthy ? "healthy" : "warning") : "offline",
    responseMs: 0,
    message: lastInTime ? `Last inbound: ${timeAgo(lastInTime)}` : "No messages received",
    category: "whatsapp",
  });

  // ─── Payments ───
  const rzpKey = process.env.RAZORPAY_KEY_ID;
  checks.push({
    name: "Payment Gateway",
    status: rzpKey ? "healthy" : "warning",
    responseMs: 0,
    message: rzpKey ? "Razorpay configured" : "Payment keys not set",
    category: "payments",
  });

  // ─── Recent Error Counts ───
  const [failedMsgs1h, failedMsgs24h] = await Promise.all([
    admin.from("messages").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", oneHourAgo),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("status", "failed").gte("created_at", oneDayAgo),
  ]);

  const errors = {
    failedMessages1h: failedMsgs1h.count || 0,
    failedMessages24h: failedMsgs24h.count || 0,
  };

  // ─── WhatsApp Stats ───
  const whatsapp = {
    connected: waConnected.count || 0,
    disconnected: waDisconnected.count || 0,
    lastInbound: lastInTime ? lastInTime.toISOString() : null,
    lastOutbound: lastOutTime ? lastOutTime.toISOString() : null,
  };

  // ─── Overall ───
  const overall = checks.every((c) => c.status === "healthy") ? "healthy" : checks.some((c) => c.status === "offline") ? "offline" : "warning";

  // ─── Alerts ───
  const alerts: Array<{ level: "critical" | "high" | "medium"; message: string }> = [];
  if (checks.some((c) => c.status === "offline" && c.category === "core")) alerts.push({ level: "critical", message: "Core service offline — Database or Auth unavailable" });
  if (checks.find((c) => c.name === "Gemini AI")?.status === "offline") alerts.push({ level: "high", message: "AI service unavailable — customers won't get replies" });
  if (!waHealthy && (waConnected.count || 0) > 0) alerts.push({ level: "high", message: "No WhatsApp messages in 24h — webhook may be disconnected" });
  if (errors.failedMessages1h > 5) alerts.push({ level: "medium", message: `${errors.failedMessages1h} failed messages in the last hour` });

  return NextResponse.json({ overall, checks, errors, whatsapp, alerts, timestamp: now.toISOString() });
}

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
