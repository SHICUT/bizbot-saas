import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/knowledge — Fetch all business knowledge
 * POST /api/knowledge — Save business knowledge (services, plans, FAQs, profile)
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase.from("businesses").select("*").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const [services, plans, faqs] = await Promise.all([
    adminSupabase.from("business_services").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
    adminSupabase.from("business_plans").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
    adminSupabase.from("business_faqs").select("*").eq("business_id", business.id).eq("is_active", true).order("sort_order"),
  ]);

  return NextResponse.json({
    business: {
      name: business.name,
      owner_name: business.owner_name,
      type: business.type,
      description: business.description,
      phone: business.phone,
      whatsapp_number: business.whatsapp_number,
      email: business.email || business.contact_email,
      website: business.website,
      address: business.address,
      city: business.city,
      state: business.state,
      google_maps_link: business.google_maps_link,
      business_hours: business.business_hours,
    },
    services: services.data || [],
    plans: plans.data || [],
    faqs: faqs.data || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json();
  const { section, data } = body;

  switch (section) {
    case "profile":
      await adminSupabase.from("businesses").update({
        name: data.name, owner_name: data.owner_name, description: data.description,
        phone: data.phone, whatsapp_number: data.whatsapp_number,
        contact_email: data.email, website: data.website,
        address: data.address, city: data.city, state: data.state,
        google_maps_link: data.google_maps_link,
      }).eq("id", business.id);
      break;

    case "hours":
      await adminSupabase.from("businesses").update({ business_hours: data }).eq("id", business.id);
      break;

    case "services":
      // Delete old, insert new
      await adminSupabase.from("business_services").delete().eq("business_id", business.id);
      if (data.length > 0) {
        await adminSupabase.from("business_services").insert(
          data.map((s: { name: string; description?: string; price?: string; duration?: string }, i: number) => ({
            business_id: business.id, name: s.name, description: s.description || null,
            price: s.price || null, duration: s.duration || null, sort_order: i,
          }))
        );
      }
      break;

    case "plans":
      await adminSupabase.from("business_plans").delete().eq("business_id", business.id);
      if (data.length > 0) {
        await adminSupabase.from("business_plans").insert(
          data.map((p: { name: string; price: string; duration?: string; features?: string[]; is_popular?: boolean }, i: number) => ({
            business_id: business.id, name: p.name, price: p.price,
            duration: p.duration || "month", features: p.features || [],
            is_popular: p.is_popular || false, sort_order: i,
          }))
        );
      }
      break;

    case "faqs":
      await adminSupabase.from("business_faqs").delete().eq("business_id", business.id);
      if (data.length > 0) {
        await adminSupabase.from("business_faqs").insert(
          data.map((f: { question: string; answer: string; category?: string }, i: number) => ({
            business_id: business.id, question: f.question, answer: f.answer,
            category: f.category || "general", sort_order: i,
          }))
        );
      }
      break;
  }

  // Rebuild business_context from structured data for AI
  await rebuildBusinessContext(adminSupabase, business.id);

  return NextResponse.json({ success: true });
}

/**
 * Rebuilds the business_context text field from structured data.
 * This is what the AI reads when generating responses.
 */
async function rebuildBusinessContext(supabase: ReturnType<typeof createAdminClient>, businessId: string) {
  const { data: biz } = await supabase.from("businesses").select("*").eq("id", businessId).single();
  const { data: services } = await supabase.from("business_services").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order");
  const { data: plans } = await supabase.from("business_plans").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order");
  const { data: faqs } = await supabase.from("business_faqs").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order");

  if (!biz) return;

  let context = `Business: ${biz.name}\n`;
  if (biz.owner_name) context += `Owner: ${biz.owner_name}\n`;
  if (biz.description) context += `About: ${biz.description}\n`;
  context += "\n";

  // Contact
  context += "Contact Information:\n";
  if (biz.phone) context += `- Phone: ${biz.phone}\n`;
  if (biz.whatsapp_number) context += `- WhatsApp: ${biz.whatsapp_number}\n`;
  if (biz.contact_email || biz.email) context += `- Email: ${biz.contact_email || biz.email}\n`;
  if (biz.website) context += `- Website: ${biz.website}\n`;
  context += "\n";

  // Location
  if (biz.address || biz.city) {
    context += "Location:\n";
    if (biz.address) context += `- Address: ${biz.address}\n`;
    if (biz.city) context += `- City: ${biz.city}${biz.state ? ", " + biz.state : ""}\n`;
    if (biz.google_maps_link) context += `- Google Maps: ${biz.google_maps_link}\n`;
    context += "\n";
  }

  // Hours
  if (biz.business_hours) {
    context += "Working Hours:\n";
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const hours = biz.business_hours as Record<string, { open: string; close: string; closed: boolean }>;
    days.forEach((d, i) => {
      const h = hours[d];
      if (h && !h.closed) context += `- ${dayNames[i]}: ${h.open} - ${h.close}\n`;
      else context += `- ${dayNames[i]}: Closed\n`;
    });
    context += "\n";
  }

  // Services
  if (services && services.length > 0) {
    context += "Services Offered:\n";
    services.forEach((s) => {
      context += `- ${s.name}`;
      if (s.price) context += ` — ${s.price}`;
      if (s.duration) context += ` (${s.duration})`;
      if (s.description) context += ` — ${s.description}`;
      context += "\n";
    });
    context += "\n";
  }

  // Plans
  if (plans && plans.length > 0) {
    context += "Membership/Pricing Plans:\n";
    plans.forEach((p) => {
      context += `- ${p.name}: ${p.price}/${p.duration}`;
      const features = p.features as string[];
      if (features && features.length > 0) context += ` (Includes: ${features.join(", ")})`;
      if (p.is_popular) context += " ⭐ Most Popular";
      context += "\n";
    });
    context += "\n";
  }

  // FAQs
  if (faqs && faqs.length > 0) {
    context += "Frequently Asked Questions:\n";
    faqs.forEach((f) => {
      context += `Q: ${f.question}\nA: ${f.answer}\n\n`;
    });
  }

  // Important instruction
  context += "\nIMPORTANT: If you don't have information about something the customer asks, say: \"I don't have that information yet. Please contact us directly.\" NEVER make up information.\n";

  await supabase.from("businesses").update({ business_context: context.trim() }).eq("id", businessId);
}
