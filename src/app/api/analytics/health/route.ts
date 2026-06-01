import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/analytics/health
 * Business Health Score (0-100)
 * Factors: Knowledge quality, response speed, lead conversion, appointment rate
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("*, subscriptions(status, messages_used, message_limit)")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ score: 0, factors: [] });

    // Factor 1: Knowledge Base Quality (0-30 points)
    let knowledgeScore = 0;
    if (business.name) knowledgeScore += 5;
    if (business.description) knowledgeScore += 5;
    if (business.business_context && business.business_context.length > 100) knowledgeScore += 10;
    if (business.business_hours) knowledgeScore += 5;
    if (business.address || business.city) knowledgeScore += 5;

    // Factor 2: Response Quality (0-25 points) — based on AI message count
    const { count: aiMsgCount } = await admin
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("business_id", business.id)
      .eq("is_ai_generated", true);

    let responseScore = 0;
    if ((aiMsgCount || 0) > 100) responseScore = 25;
    else if ((aiMsgCount || 0) > 50) responseScore = 20;
    else if ((aiMsgCount || 0) > 10) responseScore = 15;
    else if ((aiMsgCount || 0) > 0) responseScore = 10;

    // Factor 3: Lead Response Speed (0-20 points)
    const { data: recentLeads } = await admin
      .from("leads")
      .select("created_at, first_message_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(20);

    let speedScore = 0;
    if (recentLeads && recentLeads.length > 0) {
      const respondedLeads = recentLeads.filter((l) => l.first_message_at);
      const responseRate = respondedLeads.length / recentLeads.length;
      speedScore = Math.round(responseRate * 20);
    } else {
      speedScore = 10; // No leads yet, neutral score
    }

    // Factor 4: Appointment Conversion (0-25 points)
    const [leadsCount, completedApts] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "completed"),
    ]);

    let conversionScore = 0;
    const totalLeads = leadsCount.count || 0;
    const totalCompleted = completedApts.count || 0;
    if (totalLeads > 0) {
      const rate = totalCompleted / totalLeads;
      if (rate >= 0.3) conversionScore = 25;
      else if (rate >= 0.2) conversionScore = 20;
      else if (rate >= 0.1) conversionScore = 15;
      else if (rate > 0) conversionScore = 10;
    } else {
      conversionScore = 10; // Neutral
    }

    const totalScore = knowledgeScore + responseScore + speedScore + conversionScore;

    const factors = [
      { name: "Knowledge Base", score: knowledgeScore, max: 30, tip: knowledgeScore < 25 ? "Add more business details, services, and FAQs" : null },
      { name: "AI Response Quality", score: responseScore, max: 25, tip: responseScore < 20 ? "Connect WhatsApp to start AI conversations" : null },
      { name: "Lead Response Speed", score: speedScore, max: 20, tip: speedScore < 15 ? "Respond to leads faster or enable AI auto-reply" : null },
      { name: "Appointment Conversion", score: conversionScore, max: 25, tip: conversionScore < 15 ? "Follow up with leads and book more appointments" : null },
    ];

    const grade = totalScore >= 85 ? "Excellent" : totalScore >= 70 ? "Good" : totalScore >= 50 ? "Average" : "Needs Work";

    return NextResponse.json({ score: totalScore, grade, factors });
  } catch (err) {
    console.error("[Analytics Health] Error:", err);
    return NextResponse.json({ error: "Failed to calculate health score" }, { status: 500 });
  }
}
