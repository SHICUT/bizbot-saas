import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/analytics/alerts
 * Returns missed lead alerts + knowledge gap warnings
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id, name, description, business_context, business_hours, address, phone")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ alerts: [], gaps: [] });

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    // Missed leads: hot/warm leads with no recent outbound message
    const { data: missedLeads } = await admin
      .from("leads")
      .select("id, name, phone, lead_temperature, score, status, created_at, last_message_at")
      .eq("business_id", business.id)
      .in("status", ["new", "contacted", "qualified"])
      .in("lead_temperature", ["hot", "warm"])
      .lt("last_message_at", oneHourAgo)
      .order("score", { ascending: false })
      .limit(10);

    const alerts = (missedLeads || []).map((lead) => {
      const lastMsg = lead.last_message_at ? new Date(lead.last_message_at) : new Date(lead.created_at);
      const hoursSince = Math.floor((now.getTime() - lastMsg.getTime()) / (1000 * 60 * 60));
      let urgency: "critical" | "high" | "medium" = "medium";
      if (hoursSince >= 72) urgency = "critical";
      else if (hoursSince >= 24) urgency = "high";

      return {
        id: lead.id,
        name: lead.name || "Unknown",
        phone: lead.phone,
        temperature: lead.lead_temperature,
        score: lead.score,
        hoursSinceLastContact: hoursSince,
        urgency,
        message: hoursSince >= 72
          ? `No response for ${Math.floor(hoursSince / 24)} days`
          : hoursSince >= 24
          ? `No response for ${Math.floor(hoursSince / 24)} day${hoursSince >= 48 ? "s" : ""}`
          : `No response for ${hoursSince} hour${hoursSince > 1 ? "s" : ""}`,
      };
    });

    // Knowledge gaps
    const gaps: { field: string; severity: "high" | "medium" | "low" }[] = [];
    if (!business.name) gaps.push({ field: "Business Name", severity: "high" });
    if (!business.description && (!business.business_context || business.business_context.length < 50)) {
      gaps.push({ field: "Business Description", severity: "high" });
    }
    if (!business.phone) gaps.push({ field: "Phone Number", severity: "medium" });
    if (!business.address) gaps.push({ field: "Location/Address", severity: "medium" });
    if (!business.business_hours) gaps.push({ field: "Working Hours", severity: "medium" });

    // Check services/plans
    const [svcCount, planCount, faqCount] = await Promise.all([
      admin.from("business_services").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("business_plans").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("business_faqs").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    ]);

    if ((svcCount.count || 0) === 0) gaps.push({ field: "Services/Menu", severity: "high" });
    if ((planCount.count || 0) === 0) gaps.push({ field: "Pricing/Plans", severity: "high" });
    if ((faqCount.count || 0) === 0) gaps.push({ field: "FAQs", severity: "low" });

    return NextResponse.json({ alerts, gaps });
  } catch (err) {
    console.error("[Analytics Alerts] Error:", err);
    return NextResponse.json({ alerts: [], gaps: [] });
  }
}
