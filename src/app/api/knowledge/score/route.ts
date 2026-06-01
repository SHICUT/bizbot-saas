import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/knowledge/score
 * Returns AI readiness score based on how complete the business knowledge is.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase.from("businesses").select("*").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ score: 0, sections: [] });

  const [services, plans, faqs, media] = await Promise.all([
    adminSupabase.from("business_services").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
    adminSupabase.from("business_plans").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
    adminSupabase.from("business_faqs").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
    adminSupabase.from("business_media").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("is_active", true),
  ]);

  const sections = [
    { name: "Business Profile", score: (business.name && business.type && business.type !== "other") ? 100 : business.name ? 50 : 0 },
    { name: "Description", score: business.description ? 100 : business.business_context ? 70 : 0 },
    { name: "Contact Info", score: (business.phone || business.email) ? 100 : 0 },
    { name: "Location", score: business.address ? 100 : business.city ? 50 : 0 },
    { name: "Working Hours", score: business.business_hours ? 100 : 0 },
    { name: "Services", score: (services.count || 0) >= 3 ? 100 : (services.count || 0) >= 1 ? 60 : 0 },
    { name: "Pricing/Plans", score: (plans.count || 0) >= 2 ? 100 : (plans.count || 0) >= 1 ? 50 : 0 },
    { name: "FAQs", score: (faqs.count || 0) >= 5 ? 100 : (faqs.count || 0) >= 2 ? 60 : (faqs.count || 0) >= 1 ? 30 : 0 },
    { name: "Media", score: (media.count || 0) >= 3 ? 100 : (media.count || 0) >= 1 ? 50 : 0 },
    { name: "WhatsApp", score: business.whatsapp_connected ? 100 : 0 },
  ];

  const overall = Math.round(sections.reduce((sum, s) => sum + s.score, 0) / sections.length);

  return NextResponse.json({ score: overall, sections });
}
