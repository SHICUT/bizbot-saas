import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/knowledge/score
 * Returns AI readiness score from ACTUAL saved database records.
 * Resilient to missing migration tables — falls back to knowledge_json.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("*").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ score: 0, sections: [] });

  // Count items from structured tables AND JSON fallback (use maximum of both)
  let svcCount = 0, planCount = 0, faqCount = 0, mediaCount = 0;

  // Source 1: Try structured tables
  try {
    const [services, plans, faqs, media] = await Promise.all([
      admin.from("business_services").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("business_plans").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("business_faqs").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("business_media").select("id", { count: "exact", head: true }).eq("business_id", business.id),
    ]);
    svcCount = services.count || 0;
    planCount = plans.count || 0;
    faqCount = faqs.count || 0;
    mediaCount = media.count || 0;
  } catch (e) {
    console.log("[Readiness] Tables query failed (may not exist):", e);
  }

  // Source 2: Also check business_context JSON (use max of both sources)
  try {
    let kj: Record<string, unknown[]> | null = null;
    if (business.knowledge_json) {
      kj = business.knowledge_json as Record<string, unknown[]>;
    } else if (business.business_context?.startsWith("{")) {
      kj = JSON.parse(business.business_context);
    }
    if (kj) {
      svcCount = Math.max(svcCount, Array.isArray(kj.services) ? kj.services.length : 0);
      planCount = Math.max(planCount, Array.isArray(kj.plans) ? kj.plans.length : 0);
      faqCount = Math.max(faqCount, Array.isArray(kj.faqs) ? kj.faqs.length : 0);
      mediaCount = Math.max(mediaCount, Array.isArray(kj.media) ? kj.media.length : 0);
    }
  } catch { /* JSON parse failed */ }

  console.log(`[Readiness] Business: ${business.id?.substring(0, 8)} | Services: ${svcCount} | Plans: ${planCount} | FAQs: ${faqCount} | Media: ${mediaCount}`);

  // Contact info: check all possible columns
  const hasContact = !!(business.phone || business.email || business.contact_email);
  const hasEmail = !!(business.email || business.contact_email);

  const sections = [
    {
      name: "Business Profile",
      score: (business.name && business.type && business.type !== "other") ? 100 : business.name ? 50 : 0,
    },
    {
      name: "Description",
      score: business.description ? 100 : business.business_context ? 50 : 0,
    },
    {
      name: "Contact Info",
      score: (hasContact && hasEmail) ? 100 : hasContact ? 60 : 0,
    },
    {
      name: "Location",
      score: business.address ? 100 : business.city ? 50 : 0,
    },
    {
      name: "Working Hours",
      score: business.business_hours ? 100 : 0,
    },
    {
      name: "Services",
      score: svcCount >= 3 ? 100 : svcCount >= 1 ? 60 : 0,
    },
    {
      name: "Pricing/Plans",
      score: planCount >= 2 ? 100 : planCount >= 1 ? 50 : 0,
    },
    {
      name: "FAQs",
      score: faqCount >= 5 ? 100 : faqCount >= 2 ? 60 : faqCount >= 1 ? 30 : 0,
    },
    {
      name: "Media",
      score: mediaCount >= 3 ? 100 : mediaCount >= 1 ? 50 : 0,
    },
    {
      name: "WhatsApp",
      score: business.whatsapp_connected ? 100 : 0,
    },
  ];

  const overall = Math.round(sections.reduce((sum, s) => sum + s.score, 0) / sections.length);

  return NextResponse.json({ score: overall, sections });
}
