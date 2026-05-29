import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { N8nCallbackPayload } from "@/lib/automations/types";

/**
 * POST /api/webhooks/n8n
 *
 * Callback endpoint for n8n workflows.
 * After n8n executes a workflow (sends a message, updates a record),
 * it calls back here to report the result.
 *
 * This allows us to:
 * - Track which automations succeeded/failed
 * - Update records based on workflow results
 * - Log automation analytics
 */
export async function POST(request: NextRequest) {
  // Verify n8n webhook secret
  const secret = request.headers.get("x-webhook-secret");
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as N8nCallbackPayload;

  if (!body.workflow_id || !body.event_type) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Log the automation execution
  await supabase.from("audit_log").insert({
    action: "automation_executed",
    resource_type: "automation",
    details: {
      workflow_id: body.workflow_id,
      execution_id: body.execution_id,
      event_type: body.event_type,
      status: body.status,
      result: body.result,
    },
  });

  // Handle specific callback types
  if (body.status === "error") {
    console.error(
      `[n8n Callback] Workflow ${body.workflow_id} failed:`,
      body.result?.error
    );
  }

  return NextResponse.json({ received: true });
}
