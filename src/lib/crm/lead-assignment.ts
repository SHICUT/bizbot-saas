/**
 * Lead Assignment Engine
 *
 * Strategies:
 * 1. Round Robin — Equally distribute among active team members
 * 2. Budget Based — Match lead budget to specialist
 * 3. Location Based — Match lead location to area specialist
 * 4. Project Based — Match lead's interested project to specialist
 * 5. Manual — Explicit assignment by owner/manager
 *
 * Called automatically when:
 * - New lead arrives via WhatsApp/website/Instagram
 * - Lead is manually reassigned
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface AssignmentResult {
  assigned: boolean;
  memberId?: string;
  memberName?: string;
  strategy: string;
  reason?: string;
}

/**
 * Auto-assign a lead to the best team member.
 * Tries strategies in order: project → budget → location → round-robin
 */
export async function assignLead(
  businessId: string,
  leadId: string,
  leadMetadata?: Record<string, unknown>
): Promise<AssignmentResult> {
  const supabase = createAdminClient();

  // Get active team members
  const { data: members } = await supabase
    .from("team_members")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("leads_assigned");

  if (!members || members.length === 0) {
    return { assigned: false, strategy: "none", reason: "No active team members" };
  }

  const meta = leadMetadata || {};

  // Strategy 1: Project-based (if lead has property interest)
  if (meta.property_type || meta.project) {
    const match = findSpecialist(members, "project", String(meta.project || meta.property_type || ""));
    if (match) {
      await createAssignment(supabase, businessId, leadId, match.id as string, "project", `Matched project/type: ${meta.project || meta.property_type}`);
      return { assigned: true, memberId: match.id as string, memberName: match.name as string, strategy: "project" };
    }
  }

  // Strategy 2: Budget-based
  if (meta.budget) {
    const match = findSpecialist(members, "budget", String(meta.budget));
    if (match) {
      await createAssignment(supabase, businessId, leadId, match.id as string, "budget", `Budget match: ${meta.budget}`);
      return { assigned: true, memberId: match.id as string, memberName: match.name as string, strategy: "budget" };
    }
  }

  // Strategy 3: Location-based
  if (meta.location) {
    const match = findSpecialist(members, "location", String(meta.location));
    if (match) {
      await createAssignment(supabase, businessId, leadId, match.id as string, "location", `Location match: ${meta.location}`);
      return { assigned: true, memberId: match.id as string, memberName: match.name as string, strategy: "location" };
    }
  }

  // Strategy 4: Round-robin (fallback — least leads assigned)
  const rrMember = members[0]; // Already sorted by leads_assigned ASC
  await createAssignment(supabase, businessId, leadId, rrMember.id as string, "round_robin", "Round-robin distribution");
  return { assigned: true, memberId: rrMember.id as string, memberName: rrMember.name as string, strategy: "round_robin" };
}

/**
 * Manually assign a lead to a specific team member.
 */
export async function manualAssignLead(
  businessId: string,
  leadId: string,
  memberId: string,
  assignedBy: string = "manual"
): Promise<AssignmentResult> {
  const supabase = createAdminClient();

  // Deactivate current assignment
  await supabase.from("lead_assignments")
    .update({ is_active: false })
    .eq("lead_id", leadId)
    .eq("is_active", true);

  // Get member name
  const { data: member } = await supabase.from("team_members").select("name").eq("id", memberId).single();

  await createAssignment(supabase, businessId, leadId, memberId, assignedBy, "Manual assignment");

  return { assigned: true, memberId, memberName: member?.name || "Unknown", strategy: assignedBy };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

function findSpecialist(
  members: Array<Record<string, unknown>>,
  specType: string,
  value: string
): Record<string, unknown> | null {
  const lower = value.toLowerCase();

  for (const member of members) {
    const specs = (member.specializations || []) as string[];
    for (const spec of specs) {
      const [type, specValue] = spec.split(":");
      if (type === specType && specValue && lower.includes(specValue.toLowerCase())) {
        return member;
      }
    }
  }
  return null;
}

async function createAssignment(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  leadId: string,
  memberId: string,
  strategy: string,
  reason: string
) {
  // Deactivate any existing active assignment
  await supabase.from("lead_assignments")
    .update({ is_active: false })
    .eq("lead_id", leadId)
    .eq("is_active", true);

  // Create new assignment
  await supabase.from("lead_assignments").insert({
    business_id: businessId,
    lead_id: leadId,
    assigned_to: memberId,
    assigned_by: strategy,
    assignment_reason: reason,
  });

  // Update member stats
  await supabase.from("team_members").update({
    last_assigned_at: new Date().toISOString(),
  }).eq("id", memberId);

  // Increment leads_assigned
  const { data: memberData } = await supabase.from("team_members")
    .select("leads_assigned").eq("id", memberId).single();
  if (memberData) {
    await supabase.from("team_members")
      .update({ leads_assigned: (memberData.leads_assigned || 0) + 1 })
      .eq("id", memberId);
  }
}
