/**
 * CRM Pipeline — Stage Management
 *
 * Stages represent the sales journey from first contact to close.
 * Leads move between stages via the pipeline UI or AI automation.
 *
 * Architecture is modular — the stage definitions, movement logic,
 * and history tracking are separated so a drag-and-drop UI (e.g. @dnd-kit)
 * can be added later without touching this logic.
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Pipeline Stage Definitions ─────────────────────────────────────────────

export interface PipelineStage {
  id: string;
  label: string;
  color: string;      // tailwind color token
  icon: string;       // emoji
  order: number;
  description: string;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: "new", label: "New Lead", color: "blue", icon: "🆕", order: 0, description: "Just arrived, not yet contacted" },
  { id: "contacted", label: "Contacted", color: "indigo", icon: "📞", order: 1, description: "First contact made" },
  { id: "qualified", label: "Qualified", color: "purple", icon: "✅", order: 2, description: "Requirements confirmed, budget known" },
  { id: "site_visit_scheduled", label: "Site Visit Scheduled", color: "amber", icon: "📅", order: 3, description: "Visit date confirmed" },
  { id: "site_visit_done", label: "Site Visit Done", color: "orange", icon: "🏠", order: 4, description: "Visited the property" },
  { id: "negotiation", label: "Negotiation", color: "pink", icon: "🤝", order: 5, description: "Discussing terms & pricing" },
  { id: "converted", label: "Booked", color: "emerald", icon: "🎉", order: 6, description: "Deal closed, booking done" },
  { id: "lost", label: "Lost", color: "gray", icon: "❌", order: 7, description: "Did not convert" },
];

export function getStageById(id: string): PipelineStage | undefined {
  return PIPELINE_STAGES.find((s) => s.id === id);
}

// ─── Stage Movement ─────────────────────────────────────────────────────────

export interface MoveResult {
  success: boolean;
  fromStage: string;
  toStage: string;
  leadId: string;
  error?: string;
}

/**
 * Move a lead to a new pipeline stage.
 * Records the transition in lead timeline.
 */
export async function moveLeadToStage(
  businessId: string,
  leadId: string,
  newStage: string,
  movedBy: string = "manual",
  reason?: string
): Promise<MoveResult> {
  const supabase = createAdminClient();

  // Validate stage exists
  const stage = getStageById(newStage);
  if (!stage) {
    return { success: false, fromStage: "", toStage: newStage, leadId, error: "Invalid stage" };
  }

  // Get current lead status
  const { data: lead } = await supabase
    .from("leads")
    .select("status, metadata")
    .eq("id", leadId)
    .eq("business_id", businessId)
    .single();

  if (!lead) {
    return { success: false, fromStage: "", toStage: newStage, leadId, error: "Lead not found" };
  }

  const fromStage = lead.status;
  if (fromStage === newStage) {
    return { success: true, fromStage, toStage: newStage, leadId }; // No-op
  }

  // Update lead status
  const metadata = (lead.metadata || {}) as Record<string, unknown>;
  metadata[`stage_${newStage}_at`] = new Date().toISOString();
  if (newStage === "lost" && reason) metadata.lost_reason = reason;

  await supabase.from("leads").update({
    status: newStage,
    metadata,
    last_message_at: new Date().toISOString(),
  }).eq("id", leadId);

  // Record in timeline (if lead_timeline table exists)
  await supabase.from("lead_timeline").insert({
    business_id: businessId,
    lead_id: leadId,
    event_type: "stage_change",
    description: `Pipeline: ${fromStage} → ${newStage}${reason ? ` (${reason})` : ""}`,
    metadata: { from: fromStage, to: newStage, moved_by: movedBy, reason },
  }).then(() => {}, () => {}); // Non-critical

  return { success: true, fromStage, toStage: newStage, leadId };
}

/**
 * Get pipeline summary — lead counts and values per stage.
 */
export async function getPipelineSummary(businessId: string): Promise<Array<{
  stage: PipelineStage;
  count: number;
  value: number;
}>> {
  const supabase = createAdminClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("status, metadata")
    .eq("business_id", businessId);

  const stageMap: Record<string, { count: number; value: number }> = {};
  for (const stage of PIPELINE_STAGES) {
    stageMap[stage.id] = { count: 0, value: 0 };
  }

  for (const lead of leads || []) {
    const stage = lead.status || "new";
    if (stageMap[stage]) {
      stageMap[stage].count++;
      const meta = (lead.metadata || {}) as Record<string, unknown>;
      const budget = meta.budget as string | undefined;
      if (budget) {
        const value = parseBudgetValue(budget);
        if (value) stageMap[stage].value += value;
      }
    }
  }

  return PIPELINE_STAGES.map((stage) => ({
    stage,
    count: stageMap[stage.id]?.count || 0,
    value: stageMap[stage.id]?.value || 0,
  }));
}

function parseBudgetValue(budget: string): number {
  const lower = budget.toLowerCase().replace(/,/g, "");
  const croreMatch = lower.match(/(\d+\.?\d*)\s*(crore|cr)/);
  if (croreMatch) return parseFloat(croreMatch[1]) * 10000000;
  const lakhMatch = lower.match(/(\d+\.?\d*)\s*(lakh|lac|l)/);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;
  const numMatch = lower.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1]);
  return 0;
}
