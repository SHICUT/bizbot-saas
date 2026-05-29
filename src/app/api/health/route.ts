import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/health
 *
 * Health check endpoint for monitoring.
 * Returns system status and dependency health.
 *
 * Used by:
 * - Uptime monitoring (UptimeRobot, Better Uptime)
 * - Load balancer health checks
 * - CI/CD deployment verification
 */
export async function GET() {
  const checks: Record<string, { status: "ok" | "error"; latency?: number; error?: string }> = {};

  // 1. Database check (uses a simple query that works even without migrations)
  const dbStart = Date.now();
  try {
    const supabase = createAdminClient();
    // Try the businesses table first (normal operation)
    const { error } = await supabase.from("businesses").select("id").limit(1);
    if (error && (error.code === "42P01" || error.message.includes("schema cache"))) {
      // Table doesn't exist yet — but connection works
      checks.database = {
        status: "ok",
        latency: Date.now() - dbStart,
        error: "Connected (migrations not yet applied)",
      };
    } else {
      checks.database = {
        status: error ? "error" : "ok",
        latency: Date.now() - dbStart,
        ...(error && { error: error.message }),
      };
    }
  } catch (e) {
    checks.database = { status: "error", latency: Date.now() - dbStart, error: String(e) };
  }

  // 2. Environment check
  const requiredEnvVars = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ];
  const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);
  checks.environment = {
    status: missingEnvVars.length === 0 ? "ok" : "error",
    ...(missingEnvVars.length > 0 && { error: `Missing: ${missingEnvVars.join(", ")}` }),
  };

  // 3. Overall status
  const allOk = Object.values(checks).every((c) => c.status === "ok");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "dev",
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
