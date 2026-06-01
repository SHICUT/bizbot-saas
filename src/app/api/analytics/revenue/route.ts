import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/analytics/revenue
 * AI Revenue Attribution + Conversion Funnel
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // Parallel queries for funnel data
    const [leadsRes, appointmentsRes, messagesRes, convertedRes] = await Promise.all([
      admin.from("leads").select("id, status, lead_temperature, source, score, estimated_value, created_at")
        .eq("business_id", business.id),
      admin.from("appointments").select("id, status, service_price, source, created_at")
        .eq("business_id", business.id),
      admin.from("messages").select("id, is_ai_generated, created_at", { count: "exact" })
        .eq("business_id", business.id)
        .eq("is_ai_generated", true),
      admin.from("leads").select("id, estimated_value")
        .eq("business_id", business.id)
        .eq("status", "converted"),
    ]);

    const leads = leadsRes.data || [];
    const appointments = appointmentsRes.data || [];
    const aiMessages = messagesRes.count || 0;
    const converted = convertedRes.data || [];

    // This month's data
    const monthLeads = leads.filter((l) => l.created_at >= monthStart);
    const monthAppointments = appointments.filter((a) => a.created_at >= monthStart);
    const completedAppointments = appointments.filter((a) => a.status === "completed");

    // AI-generated leads (source = whatsapp or instagram, meaning AI handled them)
    const aiLeads = leads.filter((l) => l.source === "whatsapp" || l.source === "instagram");
    const aiLeadsThisMonth = aiLeads.filter((l) => l.created_at >= monthStart);

    // AI booked appointments
    const aiAppointments = appointments.filter((a) => a.source === "ai" || a.source === "whatsapp");

    // Revenue
    const totalRevenue = converted.reduce((sum, l) => sum + (l.estimated_value || 0), 0);
    const appointmentRevenue = completedAppointments.reduce((sum, a) => sum + (a.service_price || 0), 0);

    // Conversion funnel
    const funnel = {
      totalLeads: leads.length,
      contacted: leads.filter((l) => l.status !== "new").length,
      qualified: leads.filter((l) => l.status === "qualified" || l.status === "converted").length,
      appointmentsBooked: appointments.length,
      appointmentsCompleted: completedAppointments.length,
      converted: converted.length,
      conversionRate: leads.length > 0 ? Math.round((converted.length / leads.length) * 100) : 0,
    };

    // AI attribution
    const aiAttribution = {
      aiGeneratedLeads: aiLeads.length,
      aiGeneratedLeadsThisMonth: aiLeadsThisMonth.length,
      aiBookedAppointments: aiAppointments.length,
      aiConversions: aiLeads.filter((l) => l.status === "converted").length,
      aiGeneratedRevenue: aiLeads.filter((l) => l.status === "converted").reduce((sum, l) => sum + (l.estimated_value || 0), 0),
      aiMessages,
      aiResponseRate: leads.length > 0 ? Math.round((aiLeads.length / leads.length) * 100) : 0,
    };

    // Monthly stats
    const monthly = {
      leads: monthLeads.length,
      appointments: monthAppointments.length,
      revenue: totalRevenue,
      appointmentRevenue,
    };

    return NextResponse.json({ funnel, aiAttribution, monthly });
  } catch (err) {
    console.error("[Analytics Revenue] Error:", err);
    return NextResponse.json({ error: "Failed to load analytics" }, { status: 500 });
  }
}
