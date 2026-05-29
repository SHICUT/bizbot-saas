import { createAdminClient } from "@/lib/supabase/admin";
import type { AIAction, AIResponse } from "./types";

/**
 * Action Executor
 *
 * After the AI generates a response with actions, this module
 * executes those actions against the database.
 *
 * Actions are fire-and-forget — they don't block the reply.
 * If an action fails, we log it but still send the reply.
 */
export async function executeActions(
  response: AIResponse,
  businessId: string,
  leadId: string,
  conversationId: string
): Promise<void> {
  const supabase = createAdminClient();

  for (const action of response.actions) {
    try {
      switch (action.type) {
        case "book_appointment":
          await executeBookAppointment(supabase, action, businessId, leadId);
          break;

        case "update_lead":
          await executeUpdateLead(supabase, action, leadId);
          break;

        case "qualify_lead":
          await executeQualifyLead(supabase, action, leadId);
          break;

        case "escalate":
          await executeEscalation(supabase, action, businessId, leadId, conversationId);
          break;

        case "send_follow_up":
          await executeScheduleFollowUp(supabase, action, businessId, leadId);
          break;
      }
    } catch (error) {
      console.error(`[ActionExecutor] Failed to execute ${action.type}:`, error);
      // Don't throw — other actions should still execute
    }
  }
}

// ─── Action Implementations ─────────────────────────────────────────────────

async function executeBookAppointment(
  supabase: ReturnType<typeof createAdminClient>,
  action: Extract<AIAction, { type: "book_appointment" }>,
  businessId: string,
  leadId: string
): Promise<void> {
  const { details } = action;

  const { error } = await supabase.from("appointments").insert({
    business_id: businessId,
    lead_id: leadId,
    title: details.title,
    service: details.service,
    scheduled_at: details.scheduledAt,
    duration_minutes: details.durationMinutes,
    end_at: new Date(
      new Date(details.scheduledAt).getTime() + details.durationMinutes * 60000
    ).toISOString(),
    notes: details.notes || null,
    status: "confirmed",
    booked_by: "ai",
    booked_via: "whatsapp",
  });

  if (error) {
    console.error("[ActionExecutor] Failed to book appointment:", error);
    return;
  }

  // Update lead status to qualified (they booked!)
  await supabase
    .from("leads")
    .update({ status: "qualified" })
    .eq("id", leadId);

  console.log(`[ActionExecutor] Appointment booked for lead ${leadId}: ${details.title}`);
}

async function executeUpdateLead(
  supabase: ReturnType<typeof createAdminClient>,
  action: Extract<AIAction, { type: "update_lead" }>,
  leadId: string
): Promise<void> {
  const { data } = action;
  const updates: Record<string, unknown> = {};

  // Update direct fields
  if (data.name) updates.name = data.name;
  if (data.email) updates.email = data.email;

  // Store other info in metadata
  const metadataUpdates: Record<string, unknown> = {};
  if (data.preferredService) metadataUpdates.preferred_service = data.preferredService;
  if (data.budget) metadataUpdates.budget = data.budget;
  if (data.notes) metadataUpdates.notes = data.notes;

  if (Object.keys(metadataUpdates).length > 0) {
    // Merge with existing metadata
    const { data: lead } = await supabase
      .from("leads")
      .select("metadata")
      .eq("id", leadId)
      .single();

    updates.metadata = {
      ...(lead?.metadata as Record<string, unknown> || {}),
      ...metadataUpdates,
    };
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from("leads").update(updates).eq("id", leadId);
    console.log(`[ActionExecutor] Updated lead ${leadId}:`, Object.keys(updates));
  }
}

async function executeQualifyLead(
  supabase: ReturnType<typeof createAdminClient>,
  action: Extract<AIAction, { type: "qualify_lead" }>,
  leadId: string
): Promise<void> {
  const { result } = action;

  await supabase
    .from("leads")
    .update({
      score: result.score,
      status: result.status,
      metadata: {
        qualification_reasoning: result.reasoning,
        qualified_at: new Date().toISOString(),
      },
    })
    .eq("id", leadId);

  console.log(`[ActionExecutor] Lead ${leadId} qualified: score=${result.score}, status=${result.status}`);
}

async function executeEscalation(
  supabase: ReturnType<typeof createAdminClient>,
  action: Extract<AIAction, { type: "escalate" }>,
  businessId: string,
  leadId: string,
  conversationId: string
): Promise<void> {
  // 1. Pause AI for this conversation
  await supabase
    .from("conversations")
    .update({ is_ai_active: false })
    .eq("id", conversationId);

  // 2. Mark lead as needing attention
  await supabase
    .from("leads")
    .update({
      metadata: {
        escalated: true,
        escalation_reason: action.reason,
        escalated_at: new Date().toISOString(),
      },
    })
    .eq("id", leadId);

  // 3. Log audit event
  await supabase.from("audit_log").insert({
    business_id: businessId,
    action: "ai_escalation",
    resource_type: "conversation",
    resource_id: conversationId,
    details: {
      reason: action.reason,
      lead_id: leadId,
    },
  });

  console.log(`[ActionExecutor] Escalated conversation ${conversationId}: ${action.reason}`);

  // In production: send push notification / SMS to business owner
}

async function executeScheduleFollowUp(
  supabase: ReturnType<typeof createAdminClient>,
  action: Extract<AIAction, { type: "send_follow_up" }>,
  businessId: string,
  leadId: string
): Promise<void> {
  // Store follow-up as an automation rule execution
  // In production, this would be handled by a cron job or queue
  const followUpAt = new Date(
    Date.now() + action.delay_hours * 60 * 60 * 1000
  ).toISOString();

  await supabase.from("leads").update({
    metadata: {
      follow_up_scheduled: true,
      follow_up_at: followUpAt,
      follow_up_context: action.message,
    },
  }).eq("id", leadId);

  console.log(
    `[ActionExecutor] Follow-up scheduled for lead ${leadId} at ${followUpAt}`
  );

  // TODO: In production, add to a scheduled job queue (cron/BullMQ)
  // that sends the follow-up message at the specified time
}
