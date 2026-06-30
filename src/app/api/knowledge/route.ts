import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Knowledge API — Universal Business Knowledge Engine
 *
 * FALLBACK STRATEGY:
 * - business_services / business_plans / business_faqs tables → Primary storage
 * - businesses.business_context JSONB → Fallback when tables don't exist
 *
 * This ensures EVERY section saves successfully regardless of migration state.
 */

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (bizErr || !business) {
    console.error("[Knowledge GET] Business lookup failed:", bizErr?.message || "no data", "| User:", user.id);
    // Try a minimal query as fallback
    const { data: minBiz } = await admin.from("businesses").select("id, name, type, phone, email, address, city, state, business_hours, business_context").eq("owner_id", user.id).single();
    if (!minBiz) {
      return NextResponse.json({ error: "No business found", business: null }, { status: 404 });
    }
    // Return minimal business data
    return NextResponse.json({
      business: { name: minBiz.name || "", type: minBiz.type || "other", phone: minBiz.phone || "", email: minBiz.email || "", address: minBiz.address || "", city: minBiz.city || "", state: minBiz.state || "", business_hours: minBiz.business_hours || null, owner_name: "", whatsapp_number: "", website: "", google_maps_link: "", description: "" },
      services: [], trainers: [], facilities: [], plans: [], faqs: [],
    });
  }

  // Try structured tables first, gracefully fall back to JSONB
  let servicesData: unknown[] = [];
  let trainersData: unknown[] = [];
  let facilitiesData: unknown[] = [];
  let plansData: unknown[] = [];
  let faqsData: unknown[] = [];

  try {
    const [svcAll, pln, faq] = await Promise.all([
      admin.from("business_services").select("*").eq("business_id", business.id).order("sort_order"),
      admin.from("business_plans").select("*").eq("business_id", business.id).order("sort_order"),
      admin.from("business_faqs").select("*").eq("business_id", business.id).order("sort_order"),
    ]);

    const allSvc = svcAll.data || [];
    servicesData = allSvc.filter((s) => !s.category || s.category === "service");
    trainersData = allSvc.filter((s) => s.category === "trainer");
    facilitiesData = allSvc.filter((s) => s.category === "facility");
    const admissionsData_t = allSvc.filter((s) => s.category === "admission");
    const documentsData_t = allSvc.filter((s) => s.category === "document");
    const transportData_t = allSvc.filter((s) => s.category === "transport");
    const uniformData_t = allSvc.filter((s) => s.category === "uniform");
    plansData = pln.data || [];
    faqsData = faq.data || [];

    return NextResponse.json({
      business: {
        name: business.name || "",
        owner_name: business.owner_name || "",
        type: business.type || "other",
        description: business.description || "",
        phone: business.phone || "",
        whatsapp_number: business.whatsapp_number || "",
        email: business.contact_email || business.email || "",
        website: business.website || "",
        address: business.address || "",
        city: business.city || "",
        state: business.state || "",
        google_maps_link: business.google_maps_link || "",
        business_hours: business.business_hours || null,
      },
      services: servicesData,
      trainers: trainersData,
      facilities: facilitiesData,
      admissions: admissionsData_t,
      documents: documentsData_t,
      transport: transportData_t,
      uniform: uniformData_t,
      plans: plansData,
      faqs: faqsData,
    });
  } catch {
    // Tables don't exist — try to load from knowledge_json or business_context JSON
    const kj = business.knowledge_json as Record<string, unknown> | null;
    if (kj) {
      servicesData = (kj.services as unknown[]) || [];
      trainersData = (kj.trainers as unknown[]) || [];
      facilitiesData = (kj.facilities as unknown[]) || [];
      plansData = (kj.plans as unknown[]) || [];
      faqsData = (kj.faqs as unknown[]) || [];
    } else if (business.business_context) {
      // Try parsing business_context as JSON (fallback storage)
      try {
        if (business.business_context.startsWith("{")) {
          const parsed = JSON.parse(business.business_context);
          servicesData = (parsed.services as unknown[]) || [];
          trainersData = (parsed.trainers as unknown[]) || [];
          facilitiesData = (parsed.facilities as unknown[]) || [];
          plansData = (parsed.plans as unknown[]) || [];
          faqsData = (parsed.faqs as unknown[]) || [];
        }
      } catch { /* not JSON — it's plain text context, ignore */ }
    }
  }

  return NextResponse.json({
    business: {
      name: business.name || "",
      owner_name: business.owner_name || "",
      type: business.type || "other",
      description: business.description || "",
      phone: business.phone || "",
      whatsapp_number: business.whatsapp_number || "",
      email: business.contact_email || business.email || "",
      website: business.website || "",
      address: business.address || "",
      city: business.city || "",
      state: business.state || "",
      google_maps_link: business.google_maps_link || "",
      business_hours: business.business_hours || null,
    },
    services: servicesData,
    trainers: trainersData,
    facilities: facilitiesData,
    admissions: [],
    documents: [],
    transport: [],
    uniform: [],
    plans: plansData,
    faqs: faqsData,
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business, error: bizErr } = await admin
    .from("businesses")
    .select("id, knowledge_json")
    .eq("owner_id", user.id)
    .single();

  if (bizErr || !business) {
    console.error("[Knowledge POST] Business not found for user:", user.id, "| Error:", bizErr?.message);
    return NextResponse.json({ error: "Unable to save. Please refresh the page and try again." }, { status: 404 });
  }

  const body = await request.json();
  const { section, data } = body;

  console.log("[Knowledge POST] section:", section, "| biz:", business.id.substring(0, 8));

  switch (section) {
    case "profile": {
      await saveProfileFields(admin, business.id, data);
      break;
    }
    case "hours": {
      const { error } = await admin.from("businesses").update({ business_hours: data }).eq("id", business.id);
      if (error) return NextResponse.json({ error: "Failed to save hours: " + error.message }, { status: 500 });
      break;
    }
    case "services": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      await saveListSection(admin, business, "services", items, "business_services", mapServiceRow);
      break;
    }
    case "trainers": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      // Store trainers as services with a category tag
      const rows = items.map((item, i) => mapServiceRow({ ...(item as Record<string, unknown>), category: "trainer" }, business.id, i));
      await saveListSectionWithCategory(admin, business, "trainer", rows);
      break;
    }
    case "facilities": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      const rows = items.map((item, i) => mapServiceRow({ ...(item as Record<string, unknown>), category: "facility" }, business.id, i));
      await saveListSectionWithCategory(admin, business, "facility", rows);
      break;
    }
    case "admissions": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      const rows = items.map((item, i) => mapServiceRow({ ...(item as Record<string, unknown>), category: "admission" }, business.id, i));
      await saveListSectionWithCategory(admin, business, "admission", rows);
      break;
    }
    case "documents": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      const rows = items.map((item, i) => mapServiceRow({ ...(item as Record<string, unknown>), category: "document" }, business.id, i));
      await saveListSectionWithCategory(admin, business, "document", rows);
      break;
    }
    case "transport": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      const rows = items.map((item, i) => mapServiceRow({ ...(item as Record<string, unknown>), category: "transport" }, business.id, i));
      await saveListSectionWithCategory(admin, business, "transport", rows);
      break;
    }
    case "uniform": {
      const items = (data as unknown[]).filter((s: unknown) => (s as Record<string, string>).name?.trim());
      const rows = items.map((item, i) => mapServiceRow({ ...(item as Record<string, unknown>), category: "uniform" }, business.id, i));
      await saveListSectionWithCategory(admin, business, "uniform", rows);
      break;
    }
    case "plans": {
      const items = (data as unknown[]).filter((p: unknown) => (p as Record<string, string>).name?.trim());
      await saveListSection(admin, business, "plans", items, "business_plans", mapPlanRow);
      break;
    }
    case "faqs": {
      const items = (data as unknown[]).filter((f: unknown) => (f as Record<string, string>).question?.trim());
      await saveListSection(admin, business, "faqs", items, "business_faqs", mapFaqRow);
      break;
    }
    case "notes": {
      // Notes saved directly to business_context field
      const { error } = await admin.from("businesses").update({ business_context: String(data || "") }).eq("id", business.id);
      if (error) return NextResponse.json({ error: "Failed to save notes: " + error.message }, { status: 500 });
      break;
    }
    default:
      return NextResponse.json({ error: `Unknown section: ${section}` }, { status: 400 });
  }

  // Rebuild AI context from all saved data
  try {
    await rebuildBusinessContext(admin, business.id);
  } catch (e) {
    console.warn("[Knowledge POST] Context rebuild failed (non-fatal):", e);
  }

  return NextResponse.json({ success: true });
}

// ─── Profile Save (with safe fallback) ───────────────────────────────────────

async function saveProfileFields(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  data: Record<string, unknown>
) {
  // Always-safe columns from migration 001
  const safe: Record<string, unknown> = {};
  if (data.name !== undefined) safe.name = String(data.name || "").trim() || null;
  if (data.type !== undefined) safe.type = data.type || "other";
  if (data.phone !== undefined) safe.phone = String(data.phone || "").trim() || null;
  if (data.address !== undefined) safe.address = String(data.address || "").trim() || null;
  if (data.city !== undefined) safe.city = String(data.city || "").trim() || null;
  if (data.state !== undefined) safe.state = String(data.state || "").trim() || null;

  // Extended columns from migration 005/013
  const extended: Record<string, unknown> = {};
  if (data.owner_name !== undefined) extended.owner_name = String(data.owner_name || "").trim() || null;
  if (data.whatsapp_number !== undefined) extended.whatsapp_number = String(data.whatsapp_number || "").trim() || null;
  if (data.website !== undefined) extended.website = String(data.website || "").trim() || null;
  if (data.google_maps_link !== undefined) extended.google_maps_link = String(data.google_maps_link || "").trim() || null;
  if (data.description !== undefined) extended.description = String(data.description || "").trim() || null;

  // Email: try contact_email first, also update email for backwards compat
  if (data.email !== undefined) {
    const emailVal = String(data.email || "").trim() || null;
    extended.contact_email = emailVal;
    safe.email = emailVal;
  }

  // Try full save first
  const { error } = await admin.from("businesses").update({ ...safe, ...extended }).eq("id", businessId);

  if (error) {
    console.warn("[Knowledge POST] Full profile save failed, trying safe-only:", error.message);
    // Fallback: only migration 001 columns
    const { error: safeErr } = await admin.from("businesses").update(safe).eq("id", businessId);
    if (safeErr) {
      throw new Error("Failed to save profile: " + safeErr.message);
    }
  }
}

// ─── List Section Save (with JSONB fallback) ─────────────────────────────────

type MapFn = (item: Record<string, unknown>, businessId: string, index: number) => Record<string, unknown>;

async function saveListSection(
  admin: ReturnType<typeof createAdminClient>,
  business: { id: string; knowledge_json: unknown },
  key: string,
  items: unknown[],
  tableName: string,
  mapRow: MapFn
) {
  // Try structured table first
  try {
    await admin.from(tableName).delete().eq("business_id", business.id);

    if (items.length > 0) {
      const rows = items.map((item, i) => mapRow(item as Record<string, unknown>, business.id, i));
      const { error: insertErr } = await admin.from(tableName).insert(rows);

      if (insertErr) {
        console.warn(`[Knowledge POST] ${tableName} insert failed:`, insertErr.message, "— using JSONB fallback");
        await saveToJsonFallback(admin, business, key, items);
      }
    }
  } catch (e) {
    // Table doesn't exist — use JSONB fallback
    console.warn(`[Knowledge POST] ${tableName} not available:`, e, "— using JSONB fallback");
    await saveToJsonFallback(admin, business, key, items);
  }
}

/**
 * Save categorized items (trainers, facilities) without touching other categories
 */
async function saveListSectionWithCategory(
  admin: ReturnType<typeof createAdminClient>,
  business: { id: string; knowledge_json: unknown },
  category: string,
  rows: Record<string, unknown>[]
) {
  try {
    await admin.from("business_services").delete().eq("business_id", business.id).eq("category", category);
    if (rows.length > 0) {
      const { error } = await admin.from("business_services").insert(rows);
      if (error) throw error;
    }
  } catch {
    // Fallback to JSON storage
    await saveToJsonFallback(admin, business, category + "s", rows);
  }
}

async function saveToJsonFallback(
  admin: ReturnType<typeof createAdminClient>,
  business: { id: string; knowledge_json: unknown },
  key: string,
  items: unknown[]
) {
  // Try knowledge_json column first
  const existing = (business.knowledge_json as Record<string, unknown>) || {};
  const updated = { ...existing, [key]: items };

  const { error } = await admin.from("businesses").update({ knowledge_json: updated }).eq("id", business.id);

  if (error) {
    // knowledge_json column doesn't exist — use business_context as JSON storage
    console.warn(`[Knowledge POST] knowledge_json column missing. Storing ${key} in business_context as JSON.`);

    // Load current business_context, try to parse as JSON, or start fresh
    const { data: biz } = await admin.from("businesses").select("business_context").eq("id", business.id).single();
    let contextJson: Record<string, unknown> = {};
    try {
      if (biz?.business_context?.startsWith("{")) {
        contextJson = JSON.parse(biz.business_context);
      }
    } catch { /* not JSON, start fresh */ }

    contextJson[key] = items;

    const { error: ctxErr } = await admin.from("businesses")
      .update({ business_context: JSON.stringify(contextJson) })
      .eq("id", business.id);

    if (ctxErr) {
      console.error(`[Knowledge POST] Final fallback failed:`, ctxErr.message);
      throw new Error(`Cannot save ${key}. Database columns missing. Please run migration 013.`);
    }
  }
}

// ─── Row Mappers ─────────────────────────────────────────────────────────────

function mapServiceRow(item: Record<string, unknown>, businessId: string, index: number) {
  return {
    business_id: businessId,
    name: String(item.name || ""),
    description: item.description ? String(item.description) : null,
    price: item.price ? String(item.price) : null,
    duration: item.duration ? String(item.duration) : null,
    category: item.category ? String(item.category) : "service",
    is_active: true,
    sort_order: index,
  };
}

function mapPlanRow(item: Record<string, unknown>, businessId: string, index: number) {
  return {
    business_id: businessId,
    name: String(item.name || ""),
    price: String(item.price || ""),
    duration: String(item.duration || "month"),
    features: Array.isArray(item.features) ? item.features : [],
    is_popular: Boolean(item.is_popular),
    is_active: true,
    sort_order: index,
  };
}

function mapFaqRow(item: Record<string, unknown>, businessId: string, index: number) {
  return {
    business_id: businessId,
    question: String(item.question || ""),
    answer: String(item.answer || ""),
    category: String(item.category || "general"),
    is_active: true,
    sort_order: index,
  };
}

// ─── Context Rebuild ─────────────────────────────────────────────────────────

async function rebuildBusinessContext(admin: ReturnType<typeof createAdminClient>, businessId: string) {
  const { data: biz } = await admin.from("businesses").select("*").eq("id", businessId).single();
  if (!biz) return;

  let services: unknown[] = [];
  let plans: unknown[] = [];
  let faqs: unknown[] = [];

  try {
    const [svc, pln, faq] = await Promise.all([
      admin.from("business_services").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order"),
      admin.from("business_plans").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order"),
      admin.from("business_faqs").select("*").eq("business_id", businessId).eq("is_active", true).order("sort_order"),
    ]);
    services = svc.data || [];
    plans = pln.data || [];
    faqs = faq.data || [];
  } catch {
    // Load from knowledge_json or business_context JSON
    let ctx: Record<string, unknown> | null = biz.knowledge_json as Record<string, unknown> | null;
    if (!ctx && biz.business_context) {
      try {
        if (biz.business_context.startsWith("{")) ctx = JSON.parse(biz.business_context);
      } catch { /* not JSON */ }
    }
    if (ctx) {
      services = (ctx.services as unknown[]) || [];
      plans = (ctx.plans as unknown[]) || [];
      faqs = (ctx.faqs as unknown[]) || [];
    }
  }

  const lines: string[] = [];

  lines.push(`Business: ${biz.name || "Unknown"}`);
  if (biz.owner_name) lines.push(`Owner: ${biz.owner_name}`);
  if (biz.type && biz.type !== "other") lines.push(`Type: ${biz.type}`);
  if (biz.description) lines.push(`About: ${biz.description}`);
  lines.push("");

  // Contact
  const email = biz.contact_email || biz.email;
  if (biz.phone || biz.whatsapp_number || email || biz.website) {
    lines.push("Contact:");
    if (biz.phone) lines.push(`- Phone: ${biz.phone}`);
    if (biz.whatsapp_number) lines.push(`- WhatsApp: ${biz.whatsapp_number}`);
    if (email) lines.push(`- Email: ${email}`);
    if (biz.website) lines.push(`- Website: ${biz.website}`);
    lines.push("");
  }

  // Location
  if (biz.address || biz.city) {
    lines.push("Location:");
    if (biz.address) lines.push(`- Address: ${biz.address}`);
    if (biz.city) lines.push(`- City: ${biz.city}${biz.state ? ", " + biz.state : ""}`);
    if (biz.google_maps_link) lines.push(`- Google Maps: ${biz.google_maps_link}`);
    lines.push("");
  }

  // Hours
  if (biz.business_hours) {
    lines.push("Hours:");
    const days = ["mon","tue","wed","thu","fri","sat","sun"];
    const names = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
    const h = biz.business_hours as Record<string, { open: string; close: string; closed: boolean }>;
    days.forEach((d, i) => {
      const day = h[d];
      lines.push(`- ${names[i]}: ${day?.closed ? "Closed" : `${day?.open || "09:00"} - ${day?.close || "21:00"}`}`);
    });
    lines.push("");
  }

  // Services
  if (services.length > 0) {
    const regularSvc = (services as Array<Record<string, unknown>>).filter((s) => !s.category || s.category === "service");
    const admissionItems = (services as Array<Record<string, unknown>>).filter((s) => s.category === "admission");
    const documentItems = (services as Array<Record<string, unknown>>).filter((s) => s.category === "document");
    const transportItems = (services as Array<Record<string, unknown>>).filter((s) => s.category === "transport");
    const uniformItems = (services as Array<Record<string, unknown>>).filter((s) => s.category === "uniform");
    const trainerItems = (services as Array<Record<string, unknown>>).filter((s) => s.category === "trainer");
    const facilityItems = (services as Array<Record<string, unknown>>).filter((s) => s.category === "facility");

    if (regularSvc.length > 0) {
      lines.push("Services:");
      regularSvc.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.price) line += ` — ${item.price}`;
        if (item.duration) line += ` (${item.duration})`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }

    if (admissionItems.length > 0) {
      lines.push("Admissions:");
      admissionItems.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }

    if (documentItems.length > 0) {
      lines.push("Documents Required:");
      documentItems.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }

    if (transportItems.length > 0) {
      lines.push("Transport:");
      transportItems.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.price) line += ` — ${item.price}`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }

    if (uniformItems.length > 0) {
      lines.push("Uniform:");
      uniformItems.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.price) line += ` — ${item.price}`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }

    if (trainerItems.length > 0) {
      const trainerLabel = biz.type === "school" ? "Faculty:" : "Team:";
      lines.push(trainerLabel);
      trainerItems.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.price) line += ` — ${item.price}`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }

    if (facilityItems.length > 0) {
      lines.push("Facilities:");
      facilityItems.forEach((item) => {
        let line = `- ${item.name}`;
        if (item.description) line += ` — ${item.description}`;
        lines.push(line);
      });
      lines.push("");
    }
  }

  // Plans
  if (plans.length > 0) {
    lines.push("Pricing/Plans:");
    plans.forEach((p) => {
      const item = p as Record<string, unknown>;
      let line = `- ${item.name}: ${item.price}/${item.duration || "month"}`;
      const feats = item.features as string[];
      if (feats?.length) line += ` (${feats.join(", ")})`;
      if (item.is_popular) line += " ⭐";
      lines.push(line);
    });
    lines.push("");
  }

  // FAQs
  if (faqs.length > 0) {
    lines.push("FAQs:");
    faqs.forEach((f) => {
      const item = f as Record<string, unknown>;
      lines.push(`Q: ${item.question}`);
      lines.push(`A: ${item.answer}`);
      lines.push("");
    });
  }

  lines.push("Note: If information is unavailable, say so honestly. Never make up details.");

  await admin.from("businesses").update({ business_context: lines.join("\n").trim() }).eq("id", businessId);
}
